'use strict';

const assert = require('assert');
const cluster = require('cluster');
const exit = require('exit');
const chalk = require('chalk');

const defaults = require('./config/defaults');
const WORKERS = process.env.WORKERS || defaults.app.workers;
const REFRESH_TIME = process.env.REFRESH_TIME || defaults.app.refreshTime;
const WORKER_TIME = process.env.WORKER_TIME || defaults.app.workerTime;

// Master (controller for the workers)
assert(cluster.isMaster);
console.log(chalk.bold.black.bgYellow(`Master with PID ${process.pid} is booting...`));
process.on('SIGINT', () => {
	console.log(chalk.bold.black.bgYellow(`Master with PID ${process.pid} exiting!`));
	cluster.disconnect(() => {
		console.log(chalk.bold.black.bgYellow(`Master with PID ${process.pid} exited!`));
    exit(0);
	});
});
console.log(chalk.bold.black.bgYellow(`Master with PID ${process.pid} is up and running!`));

// Launches setup worker for the cluster
cluster.setupMaster({exec: 'worker.js'});
let workersOn = 1;
console.log(chalk.bold.black.bgGreen(`Launching workers...`));
cluster.fork();
// Worker launcher
const int = setInterval(()=>{
	let count = WORKERS - workersOn;
	if(count > 0){
		cluster.fork();
		workersOn++;
		count--;
		setTimeout(()=>{
			if(count === WORKERS){
				for(count; count > 0; count--){
					cluster.fork();
					workersOn++;
				}
			}
		}, WORKER_TIME);
	}
}, REFRESH_TIME);
// Handles closing of workers
cluster.on('exit', (worker, code, signal) => {
	if(code === 210 && signal === null){
		console.log(chalk.bold.black.bgWhite(`Peers updated! PID ${worker.process.pid} finished his work.`));
	} else if(code === 200 && signal === null){
		console.log(chalk.bold.black.bgWhite(`All up to Date! PID ${worker.process.pid} exited.`));
	} else {
		console.error(chalk.bold.red.bgWhite(`Something went wrong... PID ${worker.process.pid} exited.`));
	}
	console.log(chalk.bold.black.bgGreen(`Workers on: ${workersOn}`));
	workersOn--;
});
