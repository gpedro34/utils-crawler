'use strict';

const path = require('path');
const rfs = require('rotating-file-stream');
const fs = require('fs');

const config = require('./../../config/defaults').logger;
// ensure log directory exists
let logDirectory = path.join(__dirname.slice(0, __dirname.indexOf('lib')), 'data');
logDirectory = path.join(logDirectory, 'logs');
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory)

// Options for rotating write stream
let options = {
  path: logDirectory
};
if(config.interval){
  // rotates by interval (not recommended - will create a bunch of files at once because each worker will fire an order to rotate)
  options.interval = config.interval;
}
if(config.size){
  options.size = config.size;           // rotates if exceeds size per file
}
if(config.maxSize){
  options.maxSize = config.maxSize;     // Holds up to 'maxSize' of log files
}
if(config.maxFiles){
  options.maxFiles = config.maxFiles;   // Holds up to 'maxFiles' log files
}
if(config.compress){
  options.compress = 'gzip';   // compress rotated files
}

// Handle rotating write stream
const accessLogStream = rfs(config.name+'.log', options)
accessLogStream.on('error', err => {
    // here are reported blocking errors
    // once this event is emitted, the stream will be closed as well
    console.log('A blocking error occured. Error:');
    console.error(err);
});
accessLogStream.on('removed', (filename, number) => {
    // rotation job removed the specified old rotated file
    let res = 'Removed '+filename+' to ';
    if(number){
      res += 'not exceed max log files kept!';
    } else {
      res += 'not exceed max size per log file!';
    }
    console.log(res);
});
accessLogStream.on('rotation', () => {
    // rotation job started
    console.log('Initiating logs rotation...')
});
accessLogStream.on('rotated', filename => {
    // rotation job completed with success producing given filename
    console.log(`Finished rotating the logs (${filename})!`);
});
accessLogStream.on('warning', err => {
    // here are reported non blocking errors
    console.log('A non blocking error occured. Error:');
    console.error(err);
});

module.exports = accessLogStream;
