'use strict';

const utils = require('./../utils');
// Defaults
const defaults = require('./../../config/defaults');
// DB connection
const dbFunc = require('./db');
const db = require('mysql2/promise').createPool({
	host: process.env.DB_HOST || defaults.mariadb.host,
	port: process.env.DB_PORT || defaults.mariadb.port,
	user: process.env.DB_USER || defaults.mariadb.user,
	password: process.env.DB_PASS || utils.readFileTrim(__dirname + '/.db.passwd') || defaults.mariadb.pass,
	database: process.env.DB_NAME || defaults.mariadb.name,
	connectionLimit: 30,
	//supportBigNumbers: true,
});
exports.checks = new dbFunc(db);

module.export = db;
