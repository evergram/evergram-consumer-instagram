/**
 * Module dependencies
 */
process.env.TZ = 'UTC';

var q = require('q');
var _ = require('lodash');
var common = require('evergram-common');
var logger = common.utils.logger;
var printManager = common.print.manager;
var userManager = common.user.manager;
var consumer = require('../app/consumer');
var moment = require('moment');

//init db
common.db.connect();

var options = {criteria: {'instagram.username': 'louisekimmcclelland'}};
var start_date = "2016-05-17 14:00:00.000Z";
var end_date = "2016-06-17 14:00:00.000Z";



// get images for specific user and date range
userManager.findAll(options).then(function(users) {
    var processUsers = [];
    _.forEach(users, function(user) {
        logger.info('user found ' + user.instagram.username);
        processUsers.push(user);
    });

    var current = 0;
    var run = function() {
        logger.info('Processing ' + processUsers[current].instagram.username);

        var query = {
            criteria: { 
                $and: [
                    { "user.instagram.username" : processUsers[current].instagram.username },
                    { startDate: {$eq: moment(start_date)} },
                    { endDate: {$eq: moment(end_date)} }
                ]
            }
        };

        logger.info('Query: ' + JSON.stringify(query));

        // get imageset for startdate provided
        printManager.find(query).then(function(printableImageSet) {

            // not found? create a new one
            if (!printableImageSet) {

                // calculate period
                var period_start = moment(new Date(start_date));
                var signupCompletedOn = moment(processUsers[current].signupCompletedOn);
                var period = period_start.diff(signupCompletedOn, 'months');

                logger.info('period = ' + period);

                printableImageSet = printManager.getNewPrintableImageSet(processUsers[current], period);
            }

            // then find and save images for this user & imageset
            logger.info('Imageset for ' + processUsers[current].instagram.username + ' for period ' + printableImageSet.period);
            return consumer.processPrintableImageSet(processUsers[current], printableImageSet);

        }).then(function(){
            logger.info('Done processing ' + current);
            current++;
            if (current < processUsers.length) {
                run();
            } else {
                logger.info('Done processing all');
                process.exit(0);
            }
        }).fail(function(err) {
            logger.error(err);
            process.exit(1);
        });
    };

    run();

});