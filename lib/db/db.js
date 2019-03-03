'use strict';

const exit = require('exit');

const utils = require('./../utils');
const logger = utils.logger;
const control = require('./../controller');
const defaults = require('./../../config/defaults');
const SSL_CODES = require('./../ssl').SSL_CODES;
const BLOCK_REASONS = {
	NOT_BLOCKED: 0,
	ILLEGAL_ADDRESS: 1,
};
const SCAN_RESULT = {
	SUCCESS: 0,
	UNKNOWN: 1,
	TIMEOUT: 2,
	REFUSED: 3,
	REDIRECT: 4,
	EMPTY_RESPONSE: 5,
	INVALID_RESPONSE: 6,
};

class Checks {
  constructor(db) {
		this.db = db;
	}
  /* Search from a table:
       table = table to search from
       prop = column from table to search
       id = value to match in column
       extra ex. -> 'AND (last_scanned IS NULL OR TIMESTAMPDIFF(MINUTE, last_scanned, NOW()) > ?)'
			 extraData = Array with data to include
			 order = 'ASC'(anything-true) or 'DESC'(empty - false)
			 orderProp = prop to order it from */
  async queryDB(table, prop, id, extra, extraData, order, orderProp, show='*') {
		// Query construction
		let query = 'SELECT '+show+' from '+table+' ';
		query += 'WHERE '+prop+' = ? ';
		if(extra){
			query += ' '+extra+' ';
		}
		query += 'ORDER BY '+orderProp+' '+order+' ';
		let arr = [];
		arr.push(id);
		extraData.forEach(el=>{
			arr.push(el);
		});
		// DB connection
		const dbc = await this.db.getConnection();
		let ob = [];
		try {
			await dbc.beginTransaction();
			// logger(query)
			// logger(arr)
      const [res] = await dbc.execute(query, arr);
			await dbc.commit();
			// Output Validation
      for(let a = 0; a < res.length; a++){
        if(table === 'scan_platforms'){
          ob.push({
            id: res[a].id,
            platform: res[a].platform
          });
        } else if (table === 'scan_versions') {
          ob.push({
            id: res[a].id,
            version: res[a].version
          });
        } else if (table === 'scans'){
          res[a].result = SCAN_RESULT[res[a].result];
          ob.push({
            id: res[a].id,
            peerId: res[a].peer_id,
            timestamp: res[a].ts,
            result: res[a].result,
            rtt: res[a].rtt,
            versionId: res[a].version_id,
            platformId: res[a].platform_id,
            peersCount: res[a].peers_count,
            blockHeight: res[a].block_height
          });
        } else if (table === 'peers'){
          ob.push({
            id: res[a].id,
            address: res[a].address,
            blocked: res[a].blocked,
            discovered: res[a].first_seen,
            lastSeen: res[a].last_seen,
            lastScanned: res[a].last_scanned
          });
        } else if (table === 'checks'){
					ob.push({
						id: res[a].id,
						peerId: res[a].peer_id,
						blocked: res[a].blocked,
						ip: res[a].ip,
						country: res[a].country,
						city: res[a].city,
						lat: res[a].lat,
						lon: res[a].lon,
						sslId: res[a].ssl_id,
						api: res[a].api,
						lastScanned: res[a].last_scanned
					})
				} else if (table === 'ssl_checks'){
					ob.push({
						sslId: res[a].ssl_id,
						peerId: res[a].peer_id,
						ssl_status: res[a].ssl_status,
						ssl_from: res[a].ssl_from,
						ssl_to: res[a].ssl_to,
						ssl_remaining_days: res[a].ssl_remaining_days
					})
				}
      }
    } catch(err){
			// Errors
      logger('Errored', err);
    } finally {
			// release connection and return results
  		dbc.release();
      return ob;
  	}
  }
	// Updates SSL fields (for domains)
	async updateSSL(resSSL, id){
		let query =  'INSERT ssl_checks (';
		let arr = [];
		switch(resSSL.status){
			case SSL_CODES.VALID:
				resSSL.validFrom = new Date(resSSL.validFrom);
				resSSL.validTo = new Date(resSSL.validTo);
				query += 'ssl_from, ssl_to, ssl_status, last_scanned, peer_id) VALUES (?,?,?,NOW(),?) ';
				arr.push(resSSL.validFrom);
				arr.push(resSSL.validTo);
				arr.push(resSSL.status);
				arr.push(id);
				break;
			case SSL_CODES.EXPIRED:
				resSSL.validTo = new Date(resSSL.expiredSince);
				query += 'ssl_to, ssl_status, last_scanned, peer_id) VALUES (?,?,NOW(),?) ';
				arr.push(resSSL.validTo);
				arr.push(resSSL.status);
				arr.push(id);
				break;
			case SSL_CODES.IP_MISMATCH:
				resSSL.validFrom = new Date(resSSL.certFrom);
				resSSL.validTo = new Date(resSSL.certTo);
				query += 'ssl_from, ssl_to, ssl_status, last_scanned, peer_id) VALUES (?,?,?,NOW(),?) ';
				arr.push(resSSL.validFrom);
				arr.push(resSSL.validTo);
				arr.push(resSSL.status);
				arr.push(id);
				break;
			case SSL_CODES.NOT_FOUND:
			case SSL_CODES.INVALID:
				query += 'ssl_status, last_scanned, peer_id) VALUES (?,NOW(),?) ';
				arr.push(resSSL.status);
				arr.push(id);
				break;
		}
		query += 'ON DUPLICATE KEY UPDATE ';
		switch(resSSL.status){
			case SSL_CODES.VALID:
			case SSL_CODES.IP_MISMATCH:
				query += 'ssl_from = ?, ';
				arr.push(resSSL.validFrom);
			case SSL_CODES.EXPIRED:
				query += 'ssl_to = ?, ';
				arr.push(resSSL.validTo);
			case SSL_CODES.NOT_FOUND:
			case SSL_CODES.INVALID:
				query += 'ssl_status = ?, last_scanned = NOW()';
				arr.push(resSSL.status);
		}
		const dbc = await this.db.getConnection();
		try{
			await dbc.beginTransaction();
			await dbc.execute(query, arr);
			logger('Updated SSL details of peer with ID: '+id);
			await dbc.commit();
		} catch(err){
			logger('Errored updating checks table with ssl info where peerId = '+id);
			logger('Query: ', query);
			logger('arr: ', arr);
			logger('Error: ', err);
		} finally {
			dbc.release();
		}
	}
	// Updates SSL status (for IPs)
	async updateSSLStatus(id){
		const query =  'INSERT ssl_checks '
									+'(peer_id, ssl_status, last_scanned) VALUES (?, ?, NOW()) '
									+'ON DUPLICATE KEY UPDATE '
									+'ssl_status = ?, '
									+'last_scanned = NOW() ';
		try{
			const res = await this.db.execute(query, [id, SSL_CODES.INVALID, SSL_CODES.INVALID]);
			logger('Updated SSL status to INVALID on peer with ID: '+id);
			return;
		} catch(err){
			logger('Errored updating ssl status info where peerId = '+id);
			logger('Query: ', query);
			logger('Error: ', err);
		}
	}
	// Updates IP
	async updateIP(id, ip){
		const query =  'UPDATE checks '
									+'SET ip = ?, '
											+'last_scanned = NOW()'
									+'WHERE peer_id = ?';
		try{
			await this.db.execute(query, [ip, id]);
			logger('Updated IP and Timestamp on peer with ID: '+id);
			return;
		} catch(err){
			logger('Errored updating IP and Timestamp where peerId = '+id);
			logger('Query: ', query);
			logger('Error: ', err);
		}
	}
	// Blocks peer
	async blockPeer(id){
		const query =  'UPDATE checks '
									+'SET blocked = ? '
									+'WHERE peer_id = ?';
		try{
			await this.db.execute(query, [BLOCK_REASONS.ILLEGAL_ADDRESS, id]);
			logger('Blocked peer with ID: '+id);
			return;
		} catch(err){
			logger('Errored blocking peer with id:'+id);
			logger('Query: ', query);
			logger('Arr: ', [BLOCK_REASONS.ILLEGAL_ADDRESS, id]);
			logger('Error: ', err);
		}
	}
	// Updates Public Wallet Information
	async updatePub(resPub, id){
		if(resPub.isPublicAPI === false){
			// Not public
			resPub.apiPort = 0;
		}
		const query = ''
		+'UPDATE checks '
		+'SET api = ? '
		+'WHERE peer_id = ?';
		try{
			const updateRes = await this.db.execute(query, [resPub.apiPort, id]);
			logger('Updated Public wallet details of peer with ID: '+id);
		} catch(err){
			logger('Errored updating checks table with public wallet info where peerId = '+id);
			logger('Query: ', query);
			logger('Error: ', err);
		}
	}
	// Updates Location data
	async updateLocData(resLoc, id, ip){
		if(resLoc){
			if(!resLoc.country){
				resLoc.country = 'N/A';
			}
			if(!resLoc.city){
				resLoc.city = 'N/A';
			}
		} else {
			resLoc = {
				country : 'N/A',
				city : 'N/A'
			}
		}
		const query = 'INSERT loc_checks (country_city) '
								+ 'VALUES (?) ON DUPLICATE KEY UPDATE '
								+ 'country_city = ?';
		try{
			await this.db.execute(query, [resLoc.country+', '+resLoc.city, resLoc.country+', '+resLoc.city]);
			logger('Updated Location data for '+resLoc.country+', '+resLoc.city);
			this.updateLoc(resLoc, id, ip);
		} catch(err){
			logger('Errored updating Location data for '+resLoc.country+', '+resLoc.city);
			logger('Query: ', query);
			logger('Error: ', err);
		}
	}
	// Updates location fields
	async updateLoc(resLoc, id, ip){
		const dbc = await this.db.getConnection();
		const query = ''
		+'UPDATE checks '
		+'SET loc_id = (SELECT loc_id from loc_checks where country_city = ?), '
				+'ip = ?, '
				+'ssl_id = (SELECT ssl_id from ssl_checks where peer_id = ?), '
				+'last_scanned = NOW() '
		+'WHERE peer_id = ?';
		let updateRes;
		try{
			await dbc.beginTransaction();
			updateRes = await dbc.execute(query, [
				resLoc.country+', '+resLoc.city,
				ip,
				id,
				id
			]);
			await dbc.commit();
			logger('Updated location details of peer with ID: '+id);
		} catch(err){
			logger('Errored updating checks table with location info where peerId = '+id);
			logger('Query: ', query);
			logger('arr: ', [
				resLoc.country+', '+resLoc.city,
				ip,
				id,
				id
			]);
			logger('Error: ', err);
		} finally {
			dbc.release();
			return updateRes;
		}
	}
  // tasks handler
  async listTodo(rescanInterval) {
		const allIn = await this.queryDB(
			'checks',
			'blocked',
			BLOCK_REASONS.NOT_BLOCKED,
			'AND (ip IS NULL OR TIMESTAMPDIFF(MINUTE, last_scanned, NOW()) > ?)',
			[rescanInterval],
			'ASC',
			'last_scanned'
		);
		if(allIn[0]){
			logger('Tasks from peers already in DB: '+allIn.length);
			await this.updateIP(allIn[0].peerId, ' ');
			await control.checks(allIn[0]);
			// Signal Peers Updated
			exit(210);
		} else {
			const block = await this.queryDB(
				'checks',
				'ip',
				'NOT FOUND',
				'AND (blocked = ? AND TIMESTAMPDIFF(MINUTE, last_scanned, NOW()) > ?)',
				[0, 10],
				'ASC',
				'id'
			);
			const allPeers = await this.queryDB(
				'peers',
				'blocked',
				BLOCK_REASONS.NOT_BLOCKED,
				'',
				[],
				'ASC',
				'id'
			);
			const allBlocked = await this.queryDB(
						'peers',
						'blocked',
						BLOCK_REASONS.ILLEGAL_ADDRESS,
						'',
						[],
						'ASC',
						'id'
					);
			const allErrored = await this.queryDB(
				'checks',
				'blocked',
				BLOCK_REASONS.NOT_BLOCKED,
				'AND (ip IS NOT NULL AND (loc_id IS NULL OR ssl_id IS NULL OR api IS NULL))',
				[],
				'ASC',
				'last_scanned'
			);
			if(block[0]){
				logger('Peers to block: '+block.length);
				utils.asyncForEach(block, async (el)=>{
					await this.blockPeer(el.peerId);
					if(el === allErrored[allErrored.length-1]){
						// Signal Peers Blocked
						exit(240);
					}
				})
			} else if(allErrored[0]){
				logger('Errored checks: '+allErrored.length);
				utils.asyncForEach(allErrored, async (el)=>{
					await this.updateIP(el.peerId, null);
					if(el === allErrored[allErrored.length-1]){
						// Signal Peers Corrected
						exit(230);
					}
				})
			} else if(allBlocked[0]){
				// logger('Blocked peers: '+allBlocked.length);
				const dbc = await this.db.getConnection();
				let wrote = false;
				try {
					await dbc.beginTransaction();
					let countSwitch = 0;
					await utils.asyncForEach(allBlocked, async (el)=>{
						if(typeof el.blocked === 'undefined'){
							el.blocked = 1;
						}
						const res = await dbc.execute(''
							+'SELECT * FROM checks '
							+'WHERE peer_id = ?'
						,[el.id]);
						if(!res[0].peer_id){
							try{
								const peer = await dbc.execute(''
									+'INSERT checks (peer_id, blocked) '
									+'VALUES (?, ?)'
								, [el.id, el.blocked]);
								await dbc.execute(''
									+'INSERT ssl_checks (peer_id) '
									+'VALUES (?)'
								, [el.id]);
								if(el === allBlocked[allBlocked.length-1]){
									logger('Wrote '+allBlocked.length+' new blocked peers to DB!');
									wrote = true;
								}
							} catch(err) {
								if(err.code !== 'ER_DUP_ENTRY'){
									// Not yet in checks table
									logger('Errored: ', err);
								}
							}
						}
						await dbc.commit();
					});
				} catch (err) {
					if(err.code !== 'ER_DUP_ENTRY'){
						// Not yet in checks table
						logger(err);
					}
				} finally {
					dbc.release();
					if(wrote){
						// Signal Peers Added
						exit(220);
					}
				}
			} else if(allPeers[0]){
				// logger('Unblocked peers: '+allPeers.length);
				const dbc = await this.db.getConnection();
				let wrote = false;
				try {
					await dbc.beginTransaction();
					let countSwitch = 0;
					await utils.asyncForEach(allPeers, async (el)=>{
						if(typeof el.blocked === 'undefined'){
							el.blocked = 0;
						}
						const res = await dbc.execute(''
							+'SELECT * FROM checks '
							+'WHERE peer_id = ?'
						,[el.id]);
						if(!res[0].peer_id){
							try{
								const peer = await this.db.execute(''
								  +'INSERT checks (peer_id, blocked) '
									+'VALUES (?, ?)'
								, [el.id, el.blocked]);
								await dbc.execute(''
								  +'INSERT ssl_checks (peer_id) '
									+'VALUES (?)'
								, [el.id]);
								if(el === allPeers[allPeers.length-1]){
									logger('Wrote '+allPeers.length+' new peers to DB!');
									wrote = true;
								}
							} catch(err) {
								if(err.code !== 'ER_DUP_ENTRY'){
									// Not yet in checks table
									logger(err);
								}
							}
						}
					});
					await dbc.commit();
				} catch (err) {
					logger(err)
				} finally {
					dbc.release();
					if(wrote){
						// Signal Peers Added
						exit(220);
					}
				}
			} else {
				// Signal Up to Date
				exit(200);
			}
		}
	}
}

module.exports = Checks;
