'use strict';

exports.app = {
	"recheckInterval": 60,						// in minutes
  "workers": 100,	                	// Will fire up to this many workers. Default: 100
	"refreshTime": 700,								// time between checks for workers in ms. Default: 1000 ms
	"workerTime": 700									// time a up-to-date worker takes in ms. Default: 700 ms
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
	// leave "" if no API key
	"ipstack": "1e6413ffc498da144fcb700053cdcd43",
	"ipify": "at_gECZ6Iyrz216kJ2PZlknIHLnHJLGM",
	"ipgeolocation": "c7af257b02124170bb52c6834f449bd9"
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
