'use strict';

// Defaults
const defaults = require('./config/defaults');
const RECHECK_INTERVAL =
	process.env.RECHECK_INTERVAL * 60 || defaults.app.recheckInterval * 60;
// DB connection
const { checks } = require('./lib/db/connection');
// Fire work
(async () => {
	// logger.info(`${process.pid} => Sucessfully booted!`);
	await checks.listTodo(RECHECK_INTERVAL);
})();
