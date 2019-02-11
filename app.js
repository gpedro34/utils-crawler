'use strict';

const assert = require('assert');
const cluster = require('cluster');

const exit = require('exit');

const chalk = require('chalk');

const defaults = require('./config/defaults');
const WORKERS = process.env.WORKERS || defaults.app.workers;

// Master (controller for the workers)
assert(cluster.isMaster);
console.log(chalk.bold.black.bgYellow(`Master with PID ${process.pid} is booting...`));
process.on('SIGINT', () => {
	console.log(chalk.bold.black.bgYellow(`Master with PID ${process.pid} exiting!`));
	cluster.disconnect(() => {
		console.log(chalk.bold.black.bgYellow(`Master with PID ${process.pid} exited!`));
    exit(0)
	});
});
console.log(chalk.bold.black.bgYellow(`Master with PID ${process.pid} is up and running!`));

// Launches setup worker for the cluster
cluster.setupMaster({exec: 'worker.js'});
let workersOn = 1;
console.log(chalk.bold.black.bgGreen(`Launching workers...`));
cluster.fork();
const int = setInterval(()=>{
	if(workersOn < WORKERS){
		workersOn++;
		// console.log(chalk.underline.bold.black.bgGreen(`Launching worker (${workersOn}/${WORKERS})...`));
		cluster.fork();
	}
}, 100);
cluster.on('exit', (worker, code, signal) => {
	// console.log(`signal: ${signal}`)
	if(code === 0 && signal === null){
		console.log(chalk.bold.black.bgGreen(`Worker with PID ${worker.process.pid} finished his work. Respawning...`));
		workersOn--;
	} else if(code === 1 && signal === null){
		console.log(chalk.bold.white.bgRed(`Something went wrong... Worker with PID ${worker.process.pid} exited. Respawning...`));
		workersOn--;
	} else {
		console.error(chalk.bold.black.bgGrey(`Worker with PID ${worker.process.pid} exited (${code}/${signal})!`));
	}
});
