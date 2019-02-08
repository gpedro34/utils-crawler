'use strict';

exports.app = {
	"recheckInterval": 10,					// in minutes
  "workers": 1,                // default 5
}
// MariaDB connection configuration
exports.mariadb = {
	"host": "localhost",
	"port": 3306,
	"name": "brs_crawler",
	"user": "brs_crawler",
	"pass": "brs_crawler"
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

exports.tests = {
  "brs":{
    "publicWallet": "localhost:8125",
    "p2pWallet": "wallet.burst-alliance.org:8123"
  },
  "location":{
    "IPv4ToTest": "75.100.126.227",
    "IPv6ToTest": "[2001:19f0:4400:432c:5400:1ff:fe35:2641]"
  },
  "ssl":{
		"valid": "https://wallet.burst-alliance.org",
		"validWithPort": "https://wallet.burst-alliance.org",
		"ipMismatch": "wrong.host.badssl.com",
		"invalid": "wp12278930.mail.server-he.de",
		"notFound": "aaaa.com",
		"expired": "expired.badssl.com",
  }

}
