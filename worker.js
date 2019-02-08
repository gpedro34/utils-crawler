'use strict';

const utils = require('./lib/utils');
const dbFunc = require('./lib/db');

const defaults = require('./config/defaults');
const RECHECK_INTERVAL = process.env.RECHECK_INTERVAL || defaults.app.recheckInterval;

const db = require('mysql2/promise').createPool({
	host: process.env.DB_HOST || defaults.mariadb.host,
	port: process.env.DB_PORT || defaults.mariadb.port,
	user: process.env.DB_USER || defaults.mariadb.user,
	password: process.env.DB_PASS || utils.readFileTrim(__dirname + '/.db.passwd') || defaults.mariadb.pass,
	database: process.env.DB_NAME || defaults.mariadb.name,
	connectionLimit: 3,
	//supportBigNumbers: true,
});
const checks = new dbFunc(db);

let a = 0;
const scanLoop = setInterval(async () => {
	await checks.listTodo(RECHECK_INTERVAL, a);
  a++;
}, 3000);


// Resolve domain and checks SSL
const domainCheck = async (domain) => {
  let port = utils.getPort(domain);
  if(port === undefined){
    port = 0;
  }
  let ob, res, resSSL, resLoc, ip;
  domain = utils.withoutPort(domain);
  // Checks if wallet is public
  try{
    resW = await brs.callBRS(domain, brs.BRS_API_REQUESTS.TIME)
  } catch(err){
    // API is not public
    ob = {
      isPublicAPI: false
    }
  }


  try{
    resSSL = await checkSSL(domain, port);
  } catch(err){
    // Unreachable domain on designated port
    ob = {
      isPublic: false
    };
  } finally {
    try{
      resLoc = await location.locate(domain);
    } catch(err){
      console.log('Something went wrong. Report Exception 50 at https://github.com/gpedro34/BURST-NetX/issues/new?assignees=&labels=&template=bug_report.md&title=');
      console.log(err)
    }
    if(!resSSL || resSSL.error){
      // Invalid SSL
      ob = {
        ip: domain,
        ssl: 'Invalid',
        api: Number(port),
        p2p: Number(brs.BRS_DEFAULT_PEER_PORT),
        city: resLoc.city,
        country: resLoc.country,
        region: resLoc.region
      };
    } else if(resSSL.days_remaining <= 0){
      ob = {
        ip: domain,
        ssl: 'Expired',
        api: Number(port),
        p2p: Number(brs.BRS_DEFAULT_PEER_PORT),
        city: resLoc.city,
        country: resLoc.country,
        region: resLoc.region
      };
    } else if(resSSL.valid !== 'valid'){
      ob = {
        ip: domain,
        ssl: 'Certificate with IP mismatches',
        api: Number(port),
        p2p: Number(brs.BRS_DEFAULT_PEER_PORT),
        city: resLoc.city,
        country: resLoc.country,
        region: resLoc.region
      };
    } else {
      // Valid SSL
      ob = {
        ip: domain,
        ssl: 'Valid',
        api:  Number(port),
        p2p: Number(brs.BRS_DEFAULT_PEER_PORT),
        city: resLoc.city,
        country: resLoc.country,
        region: resLoc.region
      };
    }
    return ob;
  }

}
