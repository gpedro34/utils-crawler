'use strict';

/* eslint no-unused-vars: ["off"] */
/* eslint arrow-body-style: ["error", "always"] */

const loggerDef = require('./../../config/defaults').logger;
const logs = require('./policy');

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

const myFormat = printf(({ level, message, label, timestamp }) => {
	return `${timestamp} => ${message}`;
});

const arr = [new transports.Console()];
if (loggerDef.log) {
	arr.push(
		new transports.Stream({
			stream: logs
		})
	);
}
const logger = createLogger({
	level: 'info',
	format: format.combine(
		format.timestamp({
			format: 'YYYY-MM-DD HH:mm:ss'
		}),
		format.errors({ stack: true }),
		format.splat(),
		myFormat
	),
	transports: arr
});
module.exports = logger;
