'use strict';

const brs = require('./brs');
const utils = require('./utils');


// Manages checks of public API, domain and ssl - REDO
exports.checkNode = async (domain) => {
  let a = await self.walletAPICheck(domain);
  let res = await self.domainCheck(domain);
  // Results
  res.isPublicAPI = a.isPublicAPI;
  console.log(res)
  return res;
}


// Checks if wallet has Public API
exports.walletAPICheck = async (domain) => {
  const port = utils.getPort(domain);
  if(port === undefined){
    port = 80;
  }
  let ob, res, resSSL, ip;
  // Checks if wallet is public
  try{
    const resW = await brs.callBRS(domain, brs.BRS_API_REQUESTS.TIME);
    ob = {
      isPublicAPI: true,
      apiPort: port
    }
  } catch(err){
    ob = {
      isPublicAPI: false,
      apiPort: port
    }
  }
  return ob;
}
