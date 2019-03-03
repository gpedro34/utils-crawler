'use strict';

exports.app = {
	// Will fire this many workers when needed. Default: 100
	"workers": 5,
	// time between checks for workers in ms. Default: 250 ms
	"refreshTime": 250,
	// time between up-to-date confirmation to console. Default: 60 minutes
	"updRecheckTime": 1,
	// time between rechecks in minutes. Default: 60 minutes
	"recheckInterval": 180,
}
// MariaDB connection configuration
exports.mariadb = {
	"host": "localhost",
	"port": 3306,
	"name": "brs_crawler",
	"user": "utils_crawler",
	"pass": "utils_crawler"
};
// BRS related Configurations
exports.brs = {
  // Default 10 sec - Timeout of API calls to BRS
  "timeout": 10000,
  // userAgent for BRS API calls
  // Can be used to test how different wallets talk to each other
  "userAgent": 'BRS/9.9.9',
  "peerPort": 8123,   // Default peer port (default 8123)
  "apiPort": 8125     // Default api port (default 8125)
}

exports.locationProviders = {
/* Defaults:
		db-ip.com (free key) 		- up to 1000 API calls/day (may fail a lot of times)
		ipapi.co (without key)  - up to 1000 API calls/day (may fail a lot of times)
	 	ipdata.co (without key) - very few per hour
	 	ipinfo.io (without key) - very few per hour */
	// leave "" if no API key
	// 1500 calls/day:
	"ipgeolocation": "c7af257b02124170bb52c6834f449bd9", // good
	"ipdata": "6359909662a18444d488089677b26756feb90c9ebaa0f0cbd452e39b", // best one
	// 1000 calls/day:
	"ipinfo": "8d963a71f723e9", // very good
	// 1000 calls/month:
	"ipify": "at_gECZ6Iyrz216kJ2PZlknIHLnHJLGM", // incomplete intel and not many calls in free mode
	// 10000 calls/month:
	"ipstack": "1e6413ffc498da144fcb700053cdcd43", // very few api calls in free mode
	// Paid plan
	"dbip": "" // not tested with real API key but should work
}

exports.tests = {
  "brs":{
    "publicWallet": "localhost:8125",
    "publicWalletWithSSL": "wallet1.burstforum.net:2083",
    "p2pWallet": "wallet.burst-alliance.org:8123"
  },
  "location":{
    "IPv4ToTest": "75.100.126.227",
    "IPv6ToTest": "[2a01:4f8:160:1012:0:0:0:2]"
  },
  "ssl":{
		"valid": "https://wallet.burst-alliance.org",
		"validWithPort": "https://wallet.burst-alliance.org",
		"ipMismatch": "wrong.host.badssl.com",
		"invalid": "wp12278930.mail.server-he.de",
		"notFound": "aaaa.com",
		"expired": "expired.badssl.com",
  },
	"utils": {
		"domain": "wallet.burst-alliance.org:8125",
		"IPv4": "75.100.126.227:8125",
		"IPv6": "[2001:19f0:4400:432c:5400:1ff:fe35:2641]:8125"
	}
}

// Logging to file configurations
exports.logger = {
  // Refer to https://www.npmjs.com/package/rotating-file-stream
  "log": true,             	// true to log to ./server/logging/logs/ folder
  "interval": false,         // Use s,m,h,d,M for time units - (false to disable)
  "size": '100K',           // Use B,K,M,G for size units (Single file) - (false to disable)
  "compress": false,        // true/false for gzip compression
  "maxSize": '10M',        // Use B,K,M,G for size units (Entire folder) - (false to disable)
  "maxFiles": false,         // Max number of log files to keep - (false to disable)
  "name": 'utils-crawler'   // Personalized files name to help with regex and wildcards
}
