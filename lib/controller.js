'use strict';

const exit = require('exit');

const brs = require('./brs');
const location = require('./location').locate;
const ssl = require('./ssl').checkSSL;
const dnsPromise = require('./dns').dnsPromise;
const utils = require('./utils');
const logger = utils.logger;
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
  let domain = utils.normalizeDomain(peer.address);
  if(domain.indexOf('[') >= 0 && domain.indexOf(']') > domain.indexOf('[')){
    domain = domain.slice(1, domain.indexOf(']'));
  }
  const isIP = require('net').isIP(domain);
  switch(isIP){
    case 4:
    case 6:
      await ipCheck(peer);
      break;
    case 0:
      await domainCheck(peer);
      break;
  }
}
// Run this if peer address is domain - with SSL checking
const domainCheck = async (peer) => {
  // logger('domainCheck Peer: ', peer);
  // Resolve domain to IP
  const domain = utils.normalizeDomain(peer.address);
  // logger('normalized domain: ', domain);
  [peer.ip] = await Promise.all([dnsPromise(domain)]);
  if(typeof peer.ip !== 'string' || peer.ip === 'NOT FOUND'){
    logger('IP: ', peer.ip);
    await db.checks.updateIP(peer.id, peer.ip);
    // Update SSL status code to INVALID(1)
    await db.checks.updateSSLStatus(peer.id);
    // Update Public wallet info
    await db.checks.updatePub({isPublicAPI: false}, peer.id);
    // Update location info
    await db.checks.updateLoc({city: null, country:null, region:null, lat: null, long: null}, peer.id, peer.ip);
  } else {
    // logger('IP: ', peer.ip);
    await db.checks.updateIP(peer.id, peer.ip);
    const resSSL = await ssl('https://'+domain);
    // logger('resSSL: ', resSSL)
    await db.checks.updateSSL(resSSL, peer.id);
    await locationHandler(peer);
    await publicWalletHandler(peer);
  }
  return;
}
// Run this if peer address is IPv4 or IPv6 - no SSL checking
const ipCheck = async (peer) => {
  // logger('ipCheck Peer: ', peer);
  peer.ip = utils.withoutPort(peer.address);
  await db.checks.updateIP(peer.id, peer.ip);
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
  // logger('resLoc: ', resLoc);
  await db.checks.updateLoc(resLoc, peer.id, peer.ip);
  return;
}
// Handle Public Wallet checks
const publicWalletHandler = async (peer) => {
  // Save Public Wallet checks
  const resPub = await self.walletAPICheck(utils.normalizeAPIPort(peer.address));
  // logger('resPub: ', resPub);
  await db.checks.updatePub(resPub, peer.id);
  return;
}
// Checks if wallet has Public API
exports.walletAPICheck = async (domain) => {
  let port = utils.getPort(domain);
  if(port === undefined){
    port = 80;
    domain += ':'+port;
  }
  let ob;
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
