/**
 * Module dependencies.
 */

var common = require('evergram-common');
var config = require('./config');
var consumer = require('./consumer');

//init db
common.db.connect();

function consume() {
    log('Checking SQS: ');
    consumer.consume().then(function () {
        log('Complete: ');
        setTimeout(consume, config.retryWaitTime * 1000);
        log('Waiting '+ config.retryWaitTime + ' seconds :');
    });
}

function log(message) {
    console.log(message + (new Date()).toDateString() + ' ' + (new Date()).toTimeString());
}

//kick off the processor
consume();