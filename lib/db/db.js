'use strict';

const exit = require('exit');

const utils = require('./../utils');
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
			// console.log(query)
			// console.log(arr)
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
						city: res[a].city,
						region: res[a].region,
						lat: res[a].lat,
						lon: res[a].lon,
						sslId: res[a].ssl_id,
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
      console.log('Errored');
      console.log(err);
    } finally {
			// release connection and return results
  		dbc.release();
      return ob;
  	}
  }
	// Updates SSL fields (for domains)
	async updateSSL(resSSL, id){
		let query =  'UPDATE ssl_checks ';
		let arr = [];
		switch(resSSL.status){
			case SSL_CODES.VALID:
				resSSL.validFrom = new Date(resSSL.validFrom);
				resSSL.validTo = new Date(resSSL.validTo);
				query += 'SET ssl_from = ?, '
										+'ssl_to = ?, '
										+'ssl_status = ?, ';
				arr.push(resSSL.validFrom);
				arr.push(resSSL.validTo);
				arr.push(resSSL.status);
				break;
			case SSL_CODES.EXPIRED:
				resSSL.validTo = new Date(resSSL.expiredSince);
				query += 'SET ssl_to = ?, '
										+'ssl_status = ?, ';
				arr.push(resSSL.validTo);
				arr.push(resSSL.status);
				break;
			case SSL_CODES.IP_MISMATCH:
				resSSL.validFrom = new Date(resSSL.certFrom);
				resSSL.validTo = new Date(resSSL.certTo);
				query += 'SET ssl_from = ?, '
										+'ssl_to = ?, '
										+'ssl_status = ?, ';
				arr.push(resSSL.validFrom);
				arr.push(resSSL.validTo);
				arr.push(resSSL.status);
				break;
			case SSL_CODES.NOT_FOUND:
			case SSL_CODES.INVALID:
				query += 'SET ssl_status = ?, ';
				arr.push(resSSL.status);
				break;
		}
		arr.push(id);
		query += 'last_scanned = NOW() WHERE peer_id = ?';
		try{
			await this.db.execute(query, arr);
			console.log('Updated SSL details of peer with ID: '+id);
		} catch(err){
			console.log('Errored updating checks table with ssl info where peerId = '+id);
			console.log('Query: ', query);
			console.log('Error: ', err);
		} finally {
			return
		}
	}
	// Updates SSL status (for IPs)
	async updateSSLStatus(id){
		const query =  'UPDATE ssl_checks '
									+'SET ssl_status = ?, '
											+'last_scanned = NOW()'
									+'WHERE peer_id = ?';
		try{
			await this.db.execute(query, [1, id]);
			console.log('Updated SSL status to INVALID on peer with ID: '+id);
			return;
		} catch(err){
			console.log('Errored updating ssl status info where peerId = '+id);
			console.log('Query: ', query);
			console.log('Error: ', err);
		}
	}
	// Updates Public Wallet Information
	async updatePub(resPub, id){
		if(resPub.isPublicAPI === true){
			// public
			resPub.isPublicAPI = 1;
		} else {
			// Not public
			resPub.isPublicAPI = 0;
			resPub.apiPort = 0;
		}
		const query = ''
		+'UPDATE checks '
		+'SET is_public = ?, '
				+'api = ? '
		+'WHERE peer_id = ?';
		try{
			const updateRes = await this.db.execute(query, [resPub.isPublicAPI, resPub.apiPort, id]);
			console.log('Updated Public wallet details of peer with ID: '+id);
		} catch(err){
			console.log('Errored updating checks table with public wallet info where peerId = '+id);
			console.log('Query: ', query);
			console.log('Error: ', err);
		}
	}
	// Updates location fields
	async updateLoc(resLoc, id, ip){
		const dbc = await this.db.getConnection();
		const query = ''
		+'UPDATE checks '
		+'SET city = ?, '
				+'country = ?, '
				+'region = ?, '
				+'lat = ?, '
				+'lon = ?, '
				+'ip = ?, '
				+'ssl_id = (SELECT id from ssl_checks where peer_id = ?), '
				+'last_scanned = NOW()'
		+'WHERE peer_id = ?';
		let updateRes;
		try{
			await dbc.beginTransaction();
			updateRes = await dbc.execute(query, [
				resLoc.city,
				resLoc.country,
				resLoc.region,
				resLoc.lat,
				resLoc.long,
				ip,
				id,
				id
			]);
			await dbc.commit();
			console.log('Updated location details of peer with ID: '+id);
		} catch(err){
			console.log('Errored updating checks table with location info where peerId = '+id);
			console.log('Query: ', query);
			console.log('Error: ', err);
		} finally {
			dbc.release();
			return updateRes;
		}
	}
  // tasks handler
  async listTodo(rescanInterval) {
		try{
			const allIn = await this.queryDB(
				'checks',
				'blocked',
				BLOCK_REASONS.NOT_BLOCKED,
				'AND (city IS NULL OR TIMESTAMPDIFF(MINUTE, last_scanned, NOW()) > ?)',
				[rescanInterval],
				'ASC',
				'peer_id'
			);
			console.log('Tasks from peers already in DB: ', allIn.length);
			if(allIn[0]){
				await control.checks(allIn[0]);
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
				console.log('Unblocked peers to add to DB: ', allPeers.length);
				if(allPeers[0]){
					const dbc = await this.db.getConnection();
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
									const peer = await dbc.execute(''
									  +'INSERT checks (peer_id, blocked) '
										+'VALUES (?, ?)'
									, [el.id, el.blocked]);
									await dbc.execute(''
									  +'INSERT ssl_checks (peer_id) '
										+'VALUES (?)'
									, [el.id]);
									if(el === allPeers[allPeers.length-1]){
										console.log('Wrote '+allPeers.length+' new peers to DB!');
									}
								} catch(err) {
									if(err.code){
										switch(err.code){
											case 'ER_DUP_ENTRY':
												// Already in checks table
										}
									}
								} finally {
									if(countSwitch === 0){
										countSwitch = 1;
										// Fire checks
										await control.checks(el)
									}
								}
							}
							await dbc.commit();
						});
					} catch (err) {
						console.log(err)
					} finally {
						dbc.release();
					}
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
					console.log('Blocked peers to add to DB: ', allPeers.length);
					if(allBlocked[0]){
						// There are peers to scan from peers table (add them to table and start checks)
						const dbc = await this.db.getConnection();
						try {
							await dbc.beginTransaction();
							let countSwitch = 0;
							await utils.asyncForEach(allPeers, async (el)=>{
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
										if(el === allPeers[allPeers.length-1]){
											console.log('Wrote '+allBlocked.length+' new blocked peers to DB!');
										}
									} catch(err) {
										if(err.code){
											switch(err.code){
												case 'ER_DUP_ENTRY':
													// Already in checks table
											}
										}
									} finally {
										if(countSwitch === 0){
											countSwitch = 1;
											// Fire checks
											await control.checks(el)
										}
									}
								}
								await dbc.commit();
							});
						} catch (err) {
							console.log(err);
						} finally {
							dbc.release();
						}
					} else {
						console.log('All up to date!')
					}
				}
			}
		} catch (err) {
			console.error(err)
		} finally {
			exit(0);
		}
	}
}

module.exports = Checks;
