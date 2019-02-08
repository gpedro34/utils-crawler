'use strict';

const assert = require('assert');
const cluster = require('cluster');
const exit = require('exit');

const defaults = require('./config/defaults');

assert(cluster.isMaster);
console.log(`Master (${process.pid}) is booting...`);

const WORKERS = process.env.WORKERS || defaults.app.workers;

process.on('SIGINT', () => {
	console.log(`Master (${process.pid}) exiting...`);
	cluster.disconnect(() => {
		console.log(`Master Closed`);
    exit(0)
	});
});

cluster.setupMaster({exec: 'worker.js'});
cluster.on('exit', (worker, code, signal) => {
	if(code === 0 && signal === null){
		console.log(`Relaunching worker (${worker.process.pid})`)
		cluster.fork();
	} else {
		console.log(`Worker (${worker.process.pid}) exited (${code}/${signal})`);
	}
});
let i = 0;
const int = setInterval(()=>{
	if(i < WORKERS-1){
		console.log('Launching worker '+i);
		cluster.fork();
		i++;
	} else {
		console.log('Landed here!')
		clearInterval(int);
	}
}, 10000)
cluster.fork();

console.log(`Master (${process.pid}) up and running`);
