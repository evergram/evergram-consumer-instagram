/**
 * Module dependencies.
 */

var _ = require('lodash');
var common = require('evergram-common');
var instagram = common.instagram;
var userManager = common.user.manager;
var PrintableImageSet = common.models.PrintableImageSet;
var printManager = common.print.manager;
var logger = common.utils.logger;
var consumer = require('./app/consumer');

//init db
common.db.connect();

var username = 'mstrsscat';
var options = {criteria: {'instagram.username': username}};
//var options = {};


userManager.find(options).then(function (user) {
    if (user) {
        console.log('Found: ', user.getUsername());

        consumer.processReadyForPrintImageSet(user).
        then(function () {
            /**
             * process the current images
             */
            logger.info('Starting current images for ' + user.getUsername());

            return consumer.processCurrentImageSet(user);
        }).
        /**
         * Save the user with a new last run and in queue state.
         */
        then(function () {
            logger.info('Updating user ' + user.getUsername() + ' with next run on: ');

            //user.jobs.instagram.lastRunOn = dateRun;
            //user.jobs.instagram.nextRunOn = nextRun;
            //user.jobs.instagram.inQueue = false;
            //
            //userManager.update(user);
        });
    }
});