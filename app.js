'use strict';

const assert = require('assert');
const cluster = require('cluster');
const exit = require('exit');

const logger = require('./lib/logger/logger');
const defaults = require('./config/defaults');
const WORKERS = process.env.WORKERS || defaults.app.workers;
const REFRESH_TIME = process.env.REFRESH_TIME || defaults.app.refreshTime;
const UPD_RECHECK_TIME = 29250/30*process.env.UPD_RECHECK_TIME || 29250/30*defaults.app.updRecheckTime;
const SPAWN_COOLDOWN = process.env.SPAWN_COOLDOWN || defaults.app.spawnCooldown;

// Master (controller for the workers)
assert(cluster.isMaster);
logger.info(`Master (${process.pid}) booting!`);
process.on('SIGINT', () => {
	logger.info(`Master (${process.pid}) exiting!`);
	clearInterval(int);
	cluster.disconnect(() => {
		logger.info(`Master (${process.pid}) exited!`);
    exit(0);
	});
});
logger.info(`Master (${process.pid}) up and running!`);

// Launches setup worker for the cluster
const STATES = {
	UPD: 'up to date',
	UPDATE: 'updating',
	UPDATE_SPAWN: 'spawning helpers'
}
let controller = {
	state: STATES.UPD
}
cluster.setupMaster({
	exec: 'worker.js',
 	args:[
		"--env.RECHECK_INTERVAL=", process.env.RECHECK_INTERVAL
	]
});
let workersOn = 1;
logger.info(`Launching workers...`);
// Spawn main worker
cluster.fork();
let firstTime = false;
let updInt;
// Handles closing of workers
cluster.on('exit', (worker, code, signal) => {
	// Worker controller refresher
	if(code !== 200 && code !== 210 && code !== 220 && code !== 230 && code !== 240 && code !== 1) {
		logger.info(`${worker.process.pid} => Something went wrong... Code:${code} / Signal:${signal}`);
	}
	switch(code){
		case 210:
			logger.info(`${worker.process.pid} => Peer updated!`);
			break;
		case 220:
			logger.info(`${worker.process.pid} => Peer added!`);
			break;
		case 230:
			logger.info(`${worker.process.pid} => Peers corrected!`);
			break;
		case 240:
			logger.info(`${worker.process.pid} => Peers unblocked!`);
			break;
		case 200:
			logger.info(`${worker.process.pid} => Up to date!`);
			break;
	}
	let controlInt;
	switch(code){
		case 210:
		case 220:
		case 230:
		case 240:
			if(controller.state !== STATES.UPDATE_SPAWN){
				if(controller.state === STATES.UPD){
					firstTime = true;
				}
				controller.state = STATES.UPDATE;
			}
			break;
		case 200:
			controller.state = STATES.UPD;
			if(!updInt || updInt._idleTimeout < 0){
				updInt = setInterval(()=>{
					if(controller.state === STATES.UPD){
						controller.state = STATES.UPDATE;
					}
					firstTime = true;
					clearInterval(updInt);
				}, UPD_RECHECK_TIME);
			}
	}
	workersOn--;
});

// Worker spawning
const int = setInterval(()=>{
	// logger.info(`State: ${controller.state}`);
	// logger.info(`firstTime: ${firstTime}`);
	if(controller.state === STATES.UPDATE){
		if (workersOn === 0 || firstTime) {
			if(workersOn === 0){
				// logger.info(`Workers: ${workersOn}`);
				// Respawn main worker
				// logger.info('Respawning main worker...');
				cluster.fork();
				workersOn++;
			}
			setTimeout(()=>{firstTime = false;},REFRESH_TIME)
		} else if(WORKERS - workersOn > 0 && !firstTime){
			// logger.info(`Workers: ${workersOn}`);
			controller.state = STATES.UPDATE_SPAWN;
			// Spawn worker helpers when there is work to be done
			const spawnInt = setInterval(()=>{
				if(WORKERS - workersOn > 0 && controller.state === STATES.UPDATE_SPAWN){
					// logger.info(`Spawning helper(${workersOn+1})...`);
					cluster.fork();
					workersOn++;
				} else {
					controller.state = STATES.UPD;
					clearInterval(spawnInt)
				}
			}, SPAWN_COOLDOWN);
		}
	}
}, REFRESH_TIME);
