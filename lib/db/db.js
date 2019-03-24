'use strict';

const exit = require('exit');

const utils = require('./../utils');
const def = require('./../../config/defaults').app;
const logger = utils.logger;
const control = require('./../controller');
const defaults = require('./../../config/defaults');
const SSL_CODES = require('./../ssl').SSL_CODES;
const BLOCK_REASONS = {
	NOT_BLOCKED: 0,
	ILLEGAL_ADDRESS: 1,
	NEW_IP: 2,
	UNREACHABLE: 10,
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
		let arr = [];
		arr.push(id);
		if(extra){
			query += ' '+extra+' ';
			extraData.forEach(el=>{
				arr.push(el);
			});
		}
		query += 'ORDER BY '+orderProp+' '+order+' ';

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
						hash: res[a].hash,
						peerId: res[a].peer_id,
						blocked: res[a].blocked,
						ip: res[a].ip,
						sslId: res[a].ssl_id,
						api: res[a].api,
						lastScanned: res[a].last_scanned
					})
				} else if (table === 'ssl_checks'){
					ob.push({
						sslId: res[a].ssl_id,
						ssl_status: res[a].ssl_status,
						ssl_from: res[a].ssl_from,
						ssl_to: res[a].ssl_to,
						hash: res[a].hash
					})
				} else if (table === 'loc_checks'){
					ob.push({
						locId: res[a].loc_id,
						country_city: res[a].country_city
					})
				}
      }
    } catch(err){
			// Errors
      logger('Errored', err);
      logger('Query: '+query);
      logger('arr: ', arr);
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
		if(resSSL.status === SSL_CODES.EXPIRED){
			resSSL.validTo = resSSL.expiredSince;
		}
		const v = resSSL.validTo || ' ';
		const hash = require('crypto').createHash('md5').update(resSSL.status+','+v).digest('hex');
		let count = 0;
		switch(resSSL.status){
			case SSL_CODES.IP_MISMATCH:
				resSSL.validFrom = resSSL.certFrom;
				resSSL.validTo = resSSL.certTo;
			case SSL_CODES.VALID:
				resSSL.validFrom = new Date(resSSL.validFrom);
				resSSL.validTo = new Date(resSSL.validTo);
				query += 'ssl_from, ';
				arr.push(resSSL.validFrom);
				count++;
			case SSL_CODES.EXPIRED:
				if(resSSL.status === SSL_CODES.EXPIRED){
					resSSL.validTo = new Date(resSSL.validTo);
				}
				query += 'ssl_to, ';
				arr.push(resSSL.validTo);
				count++;
			case SSL_CODES.NOT_FOUND:
			case SSL_CODES.INVALID:
				query += 'ssl_status, hash) VALUES (';
				arr.push(resSSL.status);
				arr.push(hash);
				count += 2;
				for(count; count > 0; count--){
					query += '?';
					if(count > 1){
						query += ',';
					} else {
						query += ') ';
					}
				}
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
				query += 'ssl_status = ?';
				arr.push(resSSL.status);
		}
		try{
			await this.db.execute(query, arr);
			logger('Updated SSL details: '+hash);
			return hash;
		} catch(err){
			logger('Errored updating checks table with ssl info where hash = '+hash);
			logger('Query: ', query);
			logger('arr: ', arr);
			logger('Error: ', err);
		}
	}
	// Updates SSL status (for IPs)
	async updateSSLStatus(id){
		const hash = require('crypto').createHash('md5').update(SSL_CODES.INVALID+', ').digest('hex');
		const query =  'INSERT ssl_checks '
									+'(ssl_status, hash) VALUES (?, ?) '
									+'ON DUPLICATE KEY UPDATE '
									+'ssl_status = ?';
		try{
			const res = await this.db.execute(query, [SSL_CODES.INVALID, hash, SSL_CODES.INVALID]);
			logger('Updated SSL status to INVALID on peer with ID: '+id);
			return hash;
		} catch(err){
			logger('Errored updating ssl status info where peerId = '+id);
			logger('Query: ', query);
			logger('Error: ', err);
		}
	}
	// Updates IP
	async updateIP(id, ip, old, error, isOld){
		let query, arr, hash, oldHash;
		if(!error){
			hash = require('crypto').createHash('md5').update(id+','+ip).digest('hex');
			if(!old && isOld){
				const oldIps = await this.queryDB(
					'checks',
					'peer_id',
					id,
					'',
					null,
					'DESC',
					'last_scanned'
				);
				if(oldIps.length > 0 && oldIps[0].ip !== ip){
					logger('Old IPs: ', oldIps);
					utils.asyncForEach(oldIps, async(el)=>{
						oldHash = require('crypto').createHash('md5').update(id+','+el.ip).digest('hex');
						query ='UPDATE checks '
									+'SET blocked = ?, '
											+'last_scanned = NOW() '
									+'WHERE hash = ? ';
						arr = [BLOCK_REASONS.NEW_IP, oldHash];
						await this.db.execute(query, arr);
						logger('Peer '+id+' changed his IP from '+el.ip+' to '+ip+'!');
					});
				}
			}
			let blocked = BLOCK_REASONS.NOT_BLOCKED;
			if(ip === 'NOT FOUND'){
				blocked = BLOCK_REASONS.ILLEGAL_ADDRESS;
			}
			query ='INSERT checks (hash, blocked, peer_id, ip, last_scanned) VALUES (?,?,?,?,NOW()) '
						+'ON DUPLICATE KEY UPDATE '
							+'peer_id = ?, '
							+'blocked = ?, '
							+'hash = ?, '
							+'last_scanned = NOW(), '
							+'ip = ?';
			arr = [hash, blocked, id, ip, id, blocked, hash, ip];
		} else {
			oldHash = require('crypto').createHash('md5').update(id+','+old).digest('hex');
			hash = require('crypto').createHash('md5').update(id+','+null).digest('hex');
			query =  'UPDATE checks '
							+'SET ip = ?, '
									+'hash = ?, '
									+'blocked = ?, '
									+'loc_id = ?, '
									+'ssl_id = ?, '
									+'api = ? '
							+'WHERE hash = ?';
			arr = [null, hash, BLOCK_REASONS.NOT_BLOCKED, null, null, null, oldHash];
		}
		try{
			const res = await this.db.execute(query, arr);
			logger('Updated IP and Timestamp on peer with ID: '+id);
			return hash;
		} catch(err){
			logger('Errored updating IP and Timestamp where peerId = '+id);
			logger('Query: ', query);
			logger('arr: ', arr);
			logger('Error: ', err);
		}
	}
	// Updates Public Wallet Information
	async updatePub(resPub, peer){
		if(!resPub.isPublicAPI){
			// Not public
			resPub.apiPort = 0;
		}
		const query = ''
		+'UPDATE checks '
		+'SET api = ? '
		+'WHERE hash = ?';
		peer.hash = require('crypto').createHash('md5').update(peer.id+','+peer.ip).digest('hex');
		try{
			const updateRes = await this.db.execute(query, [resPub.apiPort, peer.hash]);
			logger('Updated Public wallet details of peer with hash: '+peer.hash);
		} catch(err){
			logger('Errored updating checks table with public wallet info where hash: '+peer.hash);
			logger('Query: ', query);
			logger('Error: ', err);
		}
	}
	// Updates Location data
	async updateLocData(resLoc, peer, hash){
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
			this.updateLoc(resLoc, peer, hash);
		} catch(err){
			logger('Errored updating Location data for '+resLoc.country+', '+resLoc.city);
			logger('Query: ', query);
			logger('Error: ', err);
		}
	}
	// Updates location fields
	async updateLoc(resLoc, peer, hash){
		const dbc = await this.db.getConnection();
		peer.hash = require('crypto').createHash('md5').update(peer.id+','+peer.ip).digest('hex');
		const query = ''
		+'UPDATE checks '
		+'SET loc_id = (SELECT loc_id from loc_checks where country_city = ?), '
				+'ip = ?, '
				+'ssl_id = (SELECT ssl_id from ssl_checks where hash = ?), '
				+'last_scanned = NOW() '
		+'WHERE hash = ?';
		let updateRes;
		try{
			await dbc.beginTransaction();
			updateRes = await dbc.execute(query, [
				resLoc.country+', '+resLoc.city,
				peer.ip,
				hash,
				peer.hash
			]);
			await dbc.commit();
			logger('Updated location details of peer with ID: '+id);
		} catch(err){
			logger('Errored updating checks table with location info where peerId = '+id);
			logger('Query: ', query);
			logger('arr: ', [
				resLoc.country+', '+resLoc.city,
				peer.ip,
				hash,
				peer.hash
			]);
			logger('Error: ', err);
		} finally {
			dbc.release();
			return updateRes;
		}
	}
	// Blocks Peers
	async blockPeer(peer, reason) {
		await this.db.execute(''
			+'UPDATE checks '
			+'SET blocked = ?, '
			+'last_scanned = NOW() '
			+'WHERE peer_id = ?',
		[reason, peer]);
		logger('Blocked ('+reason+') peer with ID '+peer)
	}
  // tasks handler
  async listTodo(rescanInterval) {
		const error = await this.queryDB(
			'checks',
			'blocked',
			BLOCK_REASONS.NOT_BLOCKED,
			'AND (ip IS NOT NULL AND TIMESTAMPDIFF(MINUTE, last_scanned, NOW()) > ?) AND (loc_id IS NULL OR ssl_id IS NULL OR api IS NULL)',
			[def.errorDetectionCooldown],
			'ASC',
			'last_scanned'
		);
		const unblock = await this.queryDB(
			'checks',
			'blocked',
			BLOCK_REASONS.ILLEGAL_ADDRESS,
			'AND TIMESTAMPDIFF(MINUTE, last_scanned, NOW()) > ?',
			[def.blockedPeersCooldown*3600000],
			'ASC',
			'id'
		);
		if(unblock[0] || error[0]){
			if(unblock[0]){
				let unb = 0;
				await utils.asyncForEach(unblock, async (el)=>{
					if(el.ip !== 'NOT FOUND'){
						await this.updateIP(el.peerId, el.ip);
						unb++;
					}
					if(el === unblock[unblock.length-1]){
						if(unb > 0){
							// Signal Peers Unblocked
							logger('Unblocked '+unb+' peers!');
							exit(240);
						} else {
							let errs = 0;
							if(error[0]){
								await utils.asyncForEach(error, async (el)=>{
									await this.updateIP(el.peerId, null, el.ip);
									errs++;
									if(el === error[error.length-1]){
										if(errs > 0){
											// Signal Peers Corrected
											logger('Detected and repaired '+errs+' errors in DB');
											exit(230);
										}
										// Signal Peers Corrected
										logger('Detected and repaired '+errs+' errors in DB');
										exit(230);
									}
								})
							}
						}
					}
				})
			} else {
				if(error[0]){
					let errs = 0;
					await utils.asyncForEach(error, async (el)=>{
						await this.updateIP(el.peerId, null, el.ip, true);
						errs++;
						if(el === error[error.length-1]){
							if(errs > 0){
								// Signal Peers Corrected
								logger('Detected and repaired '+errs+' errors in DB');
								exit(230);
							}
						}
					})
				}
			}
		} else {
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
				await control.checks(allIn[0], true);
				// Signal Peers Updated
				exit(210);
			} else {
				const allBlocked = await this.queryDB(
							'peers',
							'blocked',
							BLOCK_REASONS.ILLEGAL_ADDRESS,
							'',
							[],
							'ASC',
							'id'
						);
				// sync from peers table
				let wrote = false;
				if(allBlocked[0]){
					logger('Blocked peers: '+allBlocked.length);
					const dbc = await this.db.getConnection();
					try {
						await dbc.beginTransaction();
						let countSwitch = 0;
						await utils.asyncForEach(allBlocked, async (el)=>{
							if(typeof el.blocked === 'undefined'){
								el.blocked = BLOCK_REASONS.ILLEGAL_ADDRESS;
							}
							const res = await dbc.execute(''
								+'SELECT * FROM checks '
								+'WHERE peer_id = ?'
							,[el.id]);
							if(!res[0][0] && !wrote){
								try{
									await control.checks(el);
									wrote = true;
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
						} else {
							const allPeers = await this.queryDB(
								'peers',
								'blocked',
								BLOCK_REASONS.NOT_BLOCKED,
								'',
								[],
								'ASC',
								'id'
							);
							if(allPeers[0]){
								logger('Unblocked peers: '+allPeers.length);
								const dbc = await this.db.getConnection();
								try {
									await dbc.beginTransaction();
									let countSwitch = 0;
									await utils.asyncForEach(allPeers, async (el)=>{
										if(typeof el.blocked === 'undefined'){
											el.blocked = BLOCK_REASONS.ILLEGAL_ADDRESS;
										}
										const res = await dbc.execute(''
											+'SELECT * FROM checks '
											+'WHERE peer_id = ?'
										,[el.id]);
										if(!res[0][0] && !wrote){
											try{
												await control.checks(el);
												wrote = true;
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
							}
						}
					}
				} else {
					const allPeers = await this.queryDB(
						'peers',
						'blocked',
						BLOCK_REASONS.NOT_BLOCKED,
						'',
						[],
						'ASC',
						'id'
					);
					if(allPeers[0]){
						logger('Unblocked peers: '+allPeers.length);
						const dbc = await this.db.getConnection();
						try {
							await dbc.beginTransaction();
							let countSwitch = 0;
							await utils.asyncForEach(allPeers, async (el)=>{
								if(typeof el.blocked === 'undefined'){
									el.blocked = BLOCK_REASONS.ILLEGAL_ADDRESS;
								}
								const res = await dbc.execute(''
									+'SELECT * FROM checks '
									+'WHERE peer_id = ?'
								,[el.id]);
								if(!res[0][0] && !wrote){
									try{
										await control.checks(el);
										wrote = true;
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
						// Block unreachable peers
						let res = await dbc.execute(''
							+'SELECT peer_id FROM scans '
							+'WHERE block_height IS NULL AND TIMESTAMPDIFF(MINUTE, ts, NOW()) < ?'
						,[rescanInterval]);
						let arr = [];
						if(res.length <= 0){
							res = await dbc.execute(''
								+'SELECT peer_id FROM scans '
								+'WHERE block_height IS NULL'
							,[]);
						}
						let bloc = false;
						res.forEach(el=>{
							let addToArr = true;
							arr.forEach(ele=>{
								if(el === ele){
									addToArr = false;
								}
								if(addToArr && ele === arr[arr.length-1]){
									arr.push(el.peer_id);
									blockPeer(el.peer_id, BLOCK_REASONS.UNREACHABLE);
									logger('Blocked peer with ID '+el.peer_id+'. Reason: Unreachable!');
									bloc = true;
								}
							});
							if(el === res[res.length-1]){
								if(bloc){
									// Signal Peers Corrected (blocked)
									exit(230);
								} else {
									let res2 = await dbc.execute(''
										+'SELECT peer_id FROM checks '
										+'WHERE blocked = ? AND TIMESTAMPDIFF(MINUTE, last_checked, NOW()) < ?'
									,[BLOCK_REASONS.UNREACHABLE, def.blockedPeersCooldown*3600000]);
									res2.forEach(elem=>{
										blockPeer(elem.peer_id, BLOCK_REASONS.NOT_BLOCKED);
										logger('Unblocked peer with ID '+elem.peer_id+'. Reason: Cooldown time exceeded!');
										if(elem === res2[res2.length-1]){
											// Signal Peers Corrected
											exit(240);
										}
									});
								}
							}
						});
					}
				}
			}
		}
		// Signal Up to Date
		exit(200);
	}
}

module.exports = Checks;
