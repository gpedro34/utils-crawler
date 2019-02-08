'use strict';

const utils = require('./utils');
const defaults = require('./../config/defaults');
const exit = require('exit');

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
			console.log(query)
			console.log(arr)
      const [res] = await dbc.execute(query, arr);
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
          res[a].blocked = BLOCK_REASONS[res[a].blocked];
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
  // Returns Array with new Peers to scan
  async listTodo(rescanInterval, skip) {
		let peer;
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
			if(allIn[0]){
				// There are peers to scan in DB (update them and start re-checks)
				console.log('There are '+allIn.length+' peers to scan')


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
					// There are peers to scan in DB (add them to table and start checks)
					console.log('There are '+allPeers.length+' new peers to scan')


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
					if(allBlocked[0]){
						// There are peers to scan in DB (add them to table and start checks)
						console.log('There are '+allBlocked.length+' new blocked peers to scan')


					} else {
						console.log('All up to date!')
					}
				}
			}

		} catch (err) {
			console.error(err)
		}
	}

	// Sketchs
	async a(){
		try{
			if (allIn[0].length > skip) {
				const resPeer = await dbc.execute(''
		      +'SELECT id, address, blocked FROM peers '
		      +'WHERE id = ?'
		      ,[allIn[0][skip].peer_id]);
				peer = { id: resPeer[0][skip].id, address: resPeer[0][skip].address, blocked: resPeer[0][skip].blocked };
				console.log('peer: ', peer);
				const [res] = await dbc.execute(''
					+'UPDATE checks '
					+'SET last_scanned = NOW() '
					+'WHERE peer_id = ?',
				[peer.id]);
				if (res.affectedRows === 0) {
					// ignore insert errors when two workers try update the same record
					await this.db.execute(''
						+'INSERT IGNORE INTO checks '
						+'(peer_id) VALUES (?)',
					[peer.id]);
					console.log('Created peer with id: ', peer.id);
				} else {
					console.log('Updated peer with id: ', peer.id);
				}
			} else {
				const all = await dbc.execute(''
		      +'SELECT id, address, blocked FROM peers '
		      +'ORDER BY id ASC'
		      ,[]);
				console.log('all: ', all[0].length);

				if (all[0].length > skip) {
					for(let a = 0; a <= skip; a++){
						all[0].splice(0,1);
					}
					const resPeer = await dbc.execute(''
						+'SELECT peer_id FROM checks '
						+'WHERE peer_id = ? '
						+'AND (TIMESTAMPDIFF(MINUTE, last_scanned, NOW()) < ?)'
						,[all[0][0].id, rescanInterval]);
					if(resPeer[0].length <= 0){
						peer = { id: all[0][0].id, address: all[0][0].address, blocked: all[0][0].blocked };
						const [res] = await dbc.execute(''
							+'UPDATE checks '
							+'SET last_scanned = NOW() '
							+'WHERE peer_id = ?',
						[peer.id]);

						console.log(res.affectedRows)
						if (res.affectedRows === 0) {
							// ignore insert errors when two workers try update the same record
							await this.db.execute(''
								+'INSERT IGNORE INTO checks '
								+'(peer_id) VALUES (?)',
							[peer.id]);
							console.log('==>Created new peer. id: ', peer.id);
							this.checkPeer(peer);
						} else {
							console.log('==>Updated peer. id: ', peer.id);
							this.checkPeer(peer);
						}
					}
				} else {
					console.log('All up to date');
				}
			}
			await dbc.commit();
		} catch(err){
			console.log(err);
		} finally {
			dbc.release();
		}
  }
	async checkPeer(peer){
		console.log('process peer: ', peer)
		exit(0);
	}

	// Updates a column in a existing peer
  async update(peerId, column, data) {
		await this.db.execute(''
			+'UPDATE checks '
			+'SET '+column+' = ? '
			+'WHERE id = ?',
			[data, peerId]);
	}
  /* Inserts a new peer with data provided
      table = table to insert into
      columns = array of columns to insert(others will be null)
      data = array with data to include (same order as above) */
  async insert(table, columns, data) {
    let query = 'INSERT '+table+' '
              +'(';
    let indexes = []
    columns.forEach(el=>{
      if(el===columns[columns.length-1]){
          query += el+') ';
      } else{
        query += el +', ';
      }
      switch(el){
        case 'id':
        case 'ssl_id':
          indexes.push(columns.indexOf(el),1);
          columns.splice(columns.indexOf(el),1);
          break;
      }
    });
    query += 'VALUES (?) '
          +  'ON DUPLICATE KEY UPDATE '
          +  columns[0]+' = ? ';
    let values = '';
    let arr;
    data.forEach(el=>{
      if(el === data[data.length-1]){
        values += el;
        arr.push(values);
        indexes.forEach(i=>{
          data.splice(i,1);
        })
      } else {
        values += el+', ';
      }
    });
    arr.push(columns[0]);
    /* Should be:
    INSERT checks (id, peer_id, ...)
    VALUES (?) ON DUPLICATE KEY UPDATE
    (columns without id or ssl_id from this point forward)
    column0 = ?
    column1 = ?
    ... */
    console.log(query);
    console.log('data should not have id or peer_id values from this point forward')
    console.log(data)
    console.log('arr should be arr = [data, columns[0]]');
    console.log('arr = ', arr);
    let a = 0;
    columns.forEach(el=>{
      query += el+' = ? ';
      arr.push(data[a])
      a++;
    });
    console.log(query);
    console.log('arr2 =', arr);

    await this.db.execute(query,arr);
	}
}

module.exports = Checks;
