'use strict';

const {lookup} = require('lookup-dns-cache');
const exit = require('exit');

const brs = require('./brs');
const location = require('./location').locate;
const ssl = require('./ssl').checkSSL;
const utils = require('./utils');
const db = require('./db/connection');
const self = require('./controller');

// Controls checks flow
exports.checks = async (peer) => {
  if(peer.peerId){
    peer.id = peer.peerId
  }
  if(!peer.address){
    const peerAddress = await db.checks.queryDB(
      'peers',
      'id',
      peer.id,
      '',
      [],
      'ASC',
      'id'
    );
    peer = peerAddress[0];
  }

  const isIP = require('net').isIP(utils.normalizeDomain(peer.address));
  switch(isIP){
    case 4:
    case 6:
      await ipCheck(peer);
      break;
    case 0:
      domainCheck(peer);
      break;
  }
}
// Run this if peer address is domain - with SSL checking
const domainCheck = (peer) => {
  console.log(peer);
  // Resolve domain to IP
  let done = false;
  lookup(utils.normalizeDomain(peer.address), {family: 4, all:false}, async (error, address, family) => {
    console.log('Not printing this one');
     if(!error){
       console.log('Resolved IP: ', address)
       peer.ip = address;
       const resSSL = await ssl('https://'+utils.normalizeDomain(peer.address));
       await db.checks.updateSSL(resSSL, peer.id);
       await locationHandler(peer);
       await publicWalletHandler(peer);
       done = true;
     } else {
       console.error(error);
     }
  });
  setInterval(()=>{
    if(done === true){
      exit(0);
    }
  },10)
}
// Run this if peer address is IPv4 or IPv6 - no SSL checking
const ipCheck = async (peer) => {
  console.log(peer);
  peer.ip = utils.withoutPort(peer.address);
  // Update SSL status code to INVALID(1)
  await db.checks.updateSSLStatus(peer.id);
  // Update Location info
  await locationHandler(peer);
  // Update Public Wallet API info
  await publicWalletHandler(peer);
  return;
}
// Handle location checks
const locationHandler = async (peer) => {
  // Save Location checks
  const resLoc = await location(peer.ip);
  await db.checks.updateLoc(resLoc, peer.id, peer.ip);
  return;
}
// Handle Public Wallet checks
const publicWalletHandler = async (peer) => {
  // Save Public Wallet checks
  const resPub = await self.walletAPICheck(utils.normalizeAPIPort(peer.address));
  await db.checks.updatePub(resPub, peer.id);
  return;
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
