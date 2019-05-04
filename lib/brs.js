'use strict';

const request = require('request-promise-native');

const def = require('./../config/defaults');
const self = require('./brs');

exports.BRS_DEFAULT_PEER_PORT = def.brs.peerPort || 8123;
exports.BRS_DEFAULT_API_PORT = def.brs.apiPort || 8125;
const BRS_PROTOCOL = 'B1';

const BRS_USER_AGENT = def.brs.userAgent || 'BRS/9.9.9';
const BRS_TIMEOUT = def.brs.timeout || 10000;

exports.BRS_REQUESTS = {
	INFO: 'getInfo',
	PEERS: 'getPeers'
};
exports.BRS_API_REQUESTS = {
	TIME: 'getTime'
};
exports.BLOCK_REASONS = {
	NOT_BLOCKED: 0,
	ILLEGAL_ADDRESS: 1
};

exports.SCAN_RESULT = {
	SUCCESS: 0,
	UNKNOWN: 1,
	TIMEOUT: 2,
	REFUSED: 3,
	REDIRECT: 4
};
// if no port or equal to 8123 then port equal to 8125,otherwise keep it
// and add '/burst?requestType=' API point if check is not true
exports.normalizeAPI = (peer, check) => {
	if (peer) {
		if (
			peer.indexOf(':', peer.indexOf(']')) < 0 ||
			peer.indexOf(':', peer.indexOf('/')) < 0
		) {
			return peer + ':' + self.BRS_DEFAULT_API_PORT + '/burst?requestType=';
		} else if (
			peer.slice(peer.indexOf(':', peer.indexOf('/')) + 1) ==
			self.BRS_DEFAULT_PEER_PORT
		) {
			peer =
				peer.slice(0, peer.indexOf(':', peer.indexOf('/'))) +
				':' +
				self.BRS_DEFAULT_API_PORT;
		}
		if (!check) {
			return peer + '/burst?requestType=';
		} else {
			return peer;
		}
	} else {
		const err = new Error();
		err.message = 'You must provide a peer to normalize';
		return err;
	}
};

// Does both P2P and API requests
exports.callBRS = async (peerUrl, requestType, ssl) => {
	let method = 'POST';
	if (ssl) {
		peerUrl = 'https://' + peerUrl;
	} else {
		peerUrl = 'http://' + peerUrl;
	}
	const headers = {
		'User-Agent': BRS_USER_AGENT
	};
	let body = {
		protocol: BRS_PROTOCOL,
		requestType: requestType
	};
	Object.keys(self.BRS_API_REQUESTS).forEach(key => {
		if (self.BRS_API_REQUESTS[key] === requestType) {
			peerUrl = self.normalizeAPI(peerUrl) + requestType;
			method = 'GET';
			body = {};
		}
	});
	return request({
		method: method,
		url: peerUrl,
		timeout: BRS_TIMEOUT,
		headers: headers,
		json: true,
		body: body,
		time: true
	});
};
