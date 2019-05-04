'use strict';

exports.app = {
	// Will fire up to this many workers if needed. Default: 50
	workers: 50,
	// time between helpers spawning (in ms). Default: 500 ms
	spawnCooldown: 500,
	// max time to let an errored record to be in DB (in minutes). Default: 5 min
	errorDetectionCooldown: 5,
	// time between rechecking a blocked peer (in hours). Default: 24 hours
	blockedPeersCooldown: 24,
	// time between checks for downed workers (in ms). Default: 250 ms
	refreshTime: 250,
	// up-to-date confirmation cooldown (in seconds). Default: 30 sec
	updRecheckTime: 30,
	// time between information re-check (in hours). Default: 12 hours
	recheckInterval: 1
};
// MariaDB connection configuration
exports.mariadb = {
	host: 'localhost',
	port: 3306,
	name: 'brs_crawler',
	user: 'utils_crawler',
	pass: 'utils_crawler',
	retries: 20
};
// BRS related Configurations
exports.brs = {
	// Default 10 sec - Timeout of API calls to BRS
	timeout: 10000,
	// userAgent for BRS API calls
	// Can be used to test how different wallets talk to each other
	userAgent: 'BRS/9.9.9',
	peerPort: 8123, // Default peer port (default 8123)
	apiPort: 8125 // Default api port (default 8125)
};
// IP Location Providers related Configurations
exports.locationProviders = {
	blacklistCooldown: 10, // Default: 10 minutes
	/* Defaults:
		db-ip.com (free key) 		- up to 1000 API calls/day (may fail a lot of times)
		ipapi.co (without key)  - up to 1000 API calls/day (may fail a lot of times)
	 	ipdata.co (without key) - very few per hour
	 	ipinfo.io (without key) - very few per hour */
	// leave an empty array ([]) if no API key
	// 1500 calls/day:
	//best one
	ipdata: [],
	//good
	ipgeolocation: ['c7af257b02124170bb52c6834f449bd9'],
	// 1000 calls/day:
	// very good
	ipinfo: ['8d963a71f723e9'],
	// 1000 calls/month:
	ipify: [], // incomplete intel and not many calls in free mode
	// 10000 calls/month:
	ipstack: [], // very few api calls in free mode
	// Paid plan
	dbip: [] // not tested with real API key but should work
};
// Tests related Configurations
exports.tests = {
	brs: {
		publicWallet: 'wallet.starburst.pink:8125',
		publicWalletWithSSL: 'wallet1.burstforum.net:2083',
		p2pWallet: 'wallet.burst-alliance.org:8123'
	},
	location: {
		IPv4ToTest: '75.100.126.227',
		IPv6ToTest: '[2a01:4f8:160:1012:0:0:0:2]'
	},
	ssl: {
		valid: 'https://wallet.burst-alliance.org',
		validWithPort: 'https://wallet.burst-alliance.org',
		ipMismatch: 'wrong.host.badssl.com',
		invalid: 'wp12278930.mail.server-he.de',
		notFound: 'aaaa.com',
		expired: 'expired.badssl.com'
	},
	utils: {
		domain: 'wallet.burst-alliance.org:8125',
		IPv4: '75.100.126.227:8125',
		IPv6: '[2001:19f0:4400:432c:5400:1ff:fe35:2641]:8125'
	}
};
// Logging to file configurations
exports.logger = {
	// Refer to https://www.npmjs.com/package/rotating-file-stream
	log: true, // true to log to ./data/logs/ folder
	interval: false, // Use s,m,h,d,M for time units - (false to disable)
	size: '100K', // Use B,K,M,G for size units (Single file) - (false to disable)
	compress: false, // true/false for gzip compression
	maxSize: '10M', // Use B,K,M,G for size units (Entire folder) - (false to disable)
	maxFiles: false, // Max number of log files to keep - (false to disable)
	name: 'utils-crawler' // Personalized files name to help with regex and wildcards
};
