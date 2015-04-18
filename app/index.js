/**
 * Module dependencies.
 */

var common = require('evergram-common');
var newrelic = require('newrelic');
var logger = common.utils.logger;
var retryWaitTime = require('./config').retryWaitTime * 1000;
var consumer = require('./consumer');

//init db
common.db.connect();

function run() {
    logger.info('Checking Instagram queue');
    try {
        consumer.consume().then(newrelic.createBackgroundTransaction('jobs:process-queue', function (message) {
            newrelic.endTransaction();
            if (!_.isEmpty(message)) {
                logger.info(message);
            }
            logger.info('Completed checking Instagram queue');
            logger.info('Waiting ' + (retryWaitTime / 1000) + ' seconds before next check');
            setTimeout(run, retryWaitTime);
        })).fail(function (err) {
            newrelic.endTransaction();
            if (!_.isEmpty(err)) {
                logger.info(err);
            }
            logger.info('Waiting ' + (retryWaitTime / 1000) + ' seconds before next check');
            setTimeout(run, retryWaitTime);
        }).done();
    } catch (err) {
        setTimeout(run, retryWaitTime);
        logger.error(err);
    }
}

//kick off the process
run();