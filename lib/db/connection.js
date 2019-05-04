'use strict';

const exit = require('exit');

const { readFileTrim, logger } = require('./../utils');
// Defaults
const defaults = require('./../../config/defaults');
const WORKERS = process.env.WORKERS || defaults.app.workers;
// DB connection
const dbFunc = require('./db');
const retries = process.env.DB_CONN_RETRIES || defaults.mariadb.retries;
let dbRetry = retries;

const connect = () => {
	return require('mysql2/promise').createPool({
		host: process.env.DB_HOST || defaults.mariadb.host || 'localhost',
		port: process.env.DB_PORT || defaults.mariadb.port || 3306,
		user: process.env.DB_USER || defaults.mariadb.user || 'utils_crawler',
		password:
			process.env.DB_PASS ||
			readFileTrim(__dirname + '/.db.passwd') ||
			defaults.mariadb.pass ||
			'utils_crawler',
		database: process.env.DB_NAME || defaults.mariadb.name || 'brs_crawler',
		connectionLimit:
			process.env.DB_CON_LIMIT || defaults.mariadb.maxConnections || WORKERS * 3
		// supportBigNumbers: true
	});
};

let pool, connection;
const getConnection = () => {
	try {
		pool = connect();
		dbRetry = 0;
		connection = new dbFunc(pool);
		logger('Connected to MariaDB');
	} catch (err) {
		logger(
			'Failed trying to establish connection to MariaDB. Trying again in 5 seconds...'
		);
		logger(err);
		dbRetry--;
		const int = setInterval(() => {
			if (dbRetry > 0) {
				try {
					pool = connect();
					dbRetry = 0;
					connection = new dbFunc(pool);
					logger('Connected to MariaDB');
					clearInterval(int);
				} catch (err) {
					logger(
						'Failed trying to establish connection to MariaDB. Trying again in 5 seconds...'
					);
					logger(err);
					dbRetry--;
				}
			} else {
				// prettier-ignore
				logger(
					'Failed trying to establish connection to MariaDB. Tried ' + retries + ' times. Exiting!'
				);
				clearInterval(int);
				exit(500);
			}
			dbRetry--;
		}, 5000);
	}
};
getConnection();
exports.checks = connection;
