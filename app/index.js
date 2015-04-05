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
    logger.info('Checking Instagram queue');
    try {
        consumer.consume().then(function () {
            logger.info('Completed checking Instagram queue');
            logger.info('Waiting ' + config.retryWaitTime + ' seconds before next check');
            setTimeout(run, config.retryWaitTime * 1000);
        }).fail(function (err) {
            logger.info(err);
            logger.info('Waiting ' + config.retryWaitTime + ' seconds before next check');
            setTimeout(run, config.retryWaitTime * 1000);
        }).done();
    } catch (err) {
        logger.error(err);
    }
}

//kick off the process
run();