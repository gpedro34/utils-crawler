'use strict';

const fs = require('fs');

const self = require('./utils');

const BRS_DEFAULT_PEER_PORT = 8123;
const BRS_DEFAULT_API_PORT = 8125;

// normalizes domains as ['sub.'['sub.']]'domain.com' for SSL checking (returns No http/https/ports)
exports.normalizeDomain = (peerUrl) => {
  let end = peerUrl.indexOf(':', peerUrl.indexOf('/'));
	if(end < 0){
		end = peerUrl.length;
	}
  if (peerUrl.indexOf('[') >= 0){ //IPv6
    const begin = peerUrl.indexOf('[');
    end = peerUrl.indexOf(':', peerUrl.indexOf(']'));
    if(end < 0){
      end = peerUrl.length;
    }
    return peerUrl.slice(begin, end)
  } else if(peerUrl.indexOf('https://') >= 0){
		return peerUrl.slice(8, end);
	} else if(peerUrl.indexOf('http://') >= 0){
		return peerUrl.slice(7, end);
	} else {
		return peerUrl.slice(0, end);
	}
}
// normalizes peer URL (domain+port)
// if no port or port === 8125 set p2p port to 8123
exports.normalizePeer = (peer) => {
  let port = self.getPort(peer);
  if(port === undefined || Number(port) <= 0){
    return self.normalizeDomain(peer)+':'+BRS_DEFAULT_PEER_PORT;
  } else if(Number(port) === 8125) {
    return self.normalizeDomain(peer)+':'+BRS_DEFAULT_PEER_PORT;
  } else {
    return self.normalizeDomain(peer)+':'+port;
  }
};
/* normalizes API URL (domain+port)
  if no port in url set default api port (8125)
  if port === 8123 then port = 8125 */
exports.normalizeAPIPort = (peer) => {
  let port = self.getPort(peer);
  if(Number(port) === BRS_DEFAULT_PEER_PORT){
    port = BRS_DEFAULT_API_PORT;
  }
  if(port === undefined || Number(port) <= 0){
    return self.normalizeDomain(peer)+':'+BRS_DEFAULT_API_PORT;
  } else {
    return self.normalizeDomain(peer)+':'+port;
  }
};
// Parses the port from a given domain or IP
exports.getPort = (ip) => {
  if(ip.indexOf('[') >= 0 && ip.indexOf(']', ip.indexOf('[')) > 0){
    if(ip.indexOf(':', ip.indexOf(']')) >= 6){
  		return ip.slice(ip.indexOf(':', ip.indexOf(']'))+1, ip.length);
  	} else {
  		return undefined;
  	}
  } else if(ip.indexOf('http') >= 0){
    if(ip.indexOf(':', ip.indexOf('/')) >= 6){
  		return ip.slice(ip.indexOf(':', ip.indexOf('/'))+1, ip.length);
  	} else {
  		return undefined;
  	}
  } else {
    if(ip.indexOf(':', 6) >= 6){
  		return ip.slice(ip.indexOf(':', 6)+1, ip.length);
  	} else {
  		return undefined;
  	}
  }
}
// removes port from a given domain or IP
exports.withoutPort = (ip) => {
  if(ip.indexOf('[') >= 0){
    return ip.slice(0, ip.indexOf(':', ip.indexOf(']')));
  } else if(ip.indexOf('http')>= 0){
    return ip.slice(0, ip.indexOf(':', ip.indexOf('/')));
  } else {
    return ip.slice(0, ip.indexOf(':'));
  }
}
// Helper method for making forEach's ASYNC
exports.asyncForEach = async (array, callback) => {
	for (let index = 0; index < array.length; index++) {
		await callback(array[index], index, array);
	}
}
// util to read files
exports.readFileTrim = (file) => {
	if (fs.existsSync(file)) {
		return fs.readFileSync(file,'utf8').trim();
	}
	return null;
};
