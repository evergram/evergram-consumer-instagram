/**
 * Module dependencies.
 */

var common = require('evergram-common');
var logger = common.utils.logger;
var config = require('./config');
var consumer = require('./consumer');

//init db
common.db.connect();

function run() {
    logger.info('-------------------------------------------------------------------');
    logger.info('Checking Instagram queue');
    consumer.consume().then(function () {
        logger.info('Completed checking Instagram queue');
        setTimeout(run, config.retryWaitTime * 1000);
        logger.info('Waiting ' + config.retryWaitTime + ' seconds before next check');
    });
}

//kick off the process
run();