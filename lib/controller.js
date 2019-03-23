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
exports.checks = async (peer, isOld) => {
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
    peer.address = peerAddress[0].address;
  }
  let domain = utils.normalizeDomain(peer.address);
  if(domain.indexOf('[') >= 0 && domain.indexOf(']') > domain.indexOf('[')){
    domain = domain.slice(1, domain.indexOf(']'));
  }
  const isIP = require('net').isIP(domain);
  switch(isIP){
    case 4:
    case 6:
      await ipCheck(peer, isOld);
      break;
    case 0:
      await domainCheck(peer, isOld);
      break;
  }
}
// Run this if peer address is domain - with SSL checking
const domainCheck = async (peer, isOld) => {
  let hash, ipHash;
  // logger('domainCheck Peer: ', peer);
  // Resolve domain to IP
  const domain = utils.normalizeDomain(peer.address);
  // logger('normalized domain: ', domain);
  [peer.ip] = await Promise.all([dnsPromise(domain)]);
  logger('IP: ', peer.ip);
  if(typeof peer.ip !== 'string' || peer.ip === 'NOT FOUND'){
    ipHash = await db.checks.updateIP(peer.id, 'NOT FOUND', null, null, isOld);
    // Update SSL status code to INVALID(1)
    hash = await db.checks.updateSSLStatus(peer.id);
    // Update location info
    await db.checks.updateLocData({city: 'N/A', country: 'N/A', region: 'N/A', lat: 'N/A', long: 'N/A'}, peer, hash);
    // Update Public wallet info
    await db.checks.updatePub({isPublicAPI: false}, peer);
  } else {
    ipHash = await db.checks.updateIP(peer.id, peer.ip, null, null, isOld);
    let resSSL;
    try{
      resSSL = await ssl('https://'+domain);
    } catch (err) {
      logger('Errored performing ssl check ('+domain+'): ', err);
    } finally {
      if(resSSL){
        // logger('resSSL: ', resSSL)
        hash = await db.checks.updateSSL(resSSL, peer.id);
      } else {
        hash = await db.checks.updateSSLStatus(peer.id);
      }
      await locationHandler(peer, hash);
      await publicWalletHandler(peer);
    }
  }
  return;
}
// Run this if peer address is IPv4 or IPv6 - no SSL checking
const ipCheck = async (peer, isOld) => {
  // logger('ipCheck Peer: ', peer);
  peer.ip = utils.withoutPort(peer.address);
  const ipHash = await db.checks.updateIP(peer.id, peer.ip, null, null, isOld);
  // Update SSL status code to INVALID(1)
  const hash = await db.checks.updateSSLStatus(peer.id);
  // Update Location info
  await locationHandler(peer, hash);
  // Update Public Wallet API info
  await publicWalletHandler(peer);
  return;
}
// Handle location checks
const locationHandler = async (peer, hash) => {
  // Save Location checks
  const resLoc = await location(peer.ip);
  // logger('resLoc: ', resLoc);
  const resId = await db.checks.updateLocData(resLoc, peer, hash);
  return;
}
// Handle Public Wallet checks
const publicWalletHandler = async (peer) => {
  // Save Public Wallet checks
  const resPub = await self.walletAPICheck(utils.normalizeAPIPort(peer.address));
  // logger('resPub: ', resPub);
  await db.checks.updatePub(resPub, peer);
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
