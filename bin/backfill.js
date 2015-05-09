/**
 * Module dependencies
 */
process.env.TZ = 'UTC';

var q = require('q');
var _ = require('lodash');
var moment = require('moment');
var common = require('evergram-common');
var logger = common.utils.logger;
var userManager = common.user.manager;
var consumer = require('../app/consumer');
var printManager = common.print.manager;

//init db
common.db.connect();

//var options = {criteria: {'instagram.username': 'joshystuart'}};
var options = {
    criteria: {
        active: true,
        signupComplete: true,
        'instagram.authToken': {
            $exists: true
        }
    }
};

//backfill
userManager.findAll(options).then(function(users) {
    var processUsers = [];
    _.forEach(users, function(user) {
        processUsers.push(user);
    });

    var current = 0;
    var process = function() {
        logger.info('Processing ' + current);
        if (!!processUsers[current]) {
            processImagesSetsForUser(processUsers[current]).
                then(function() {
                    logger.info('Done processing ' + current);
                }).
                fail(function(err) {
                    logger.error('Failed ' + current, err);
                }).
                done(function() {
                    current++;
                    if (current < processUsers.length) {
                        process();
                    } else {
                        logger.info('Done processing all');
                    }
                });
        }
    };

    process();
});

function processImagesSetsForUser(user) {
    var deferreds = [];
    var numberOfPeriods = user.getCurrentPeriod();
    logger.info(user.getUsername() + ' has ' + numberOfPeriods + ' periods');

    if (numberOfPeriods >= 0) {
        var periods = new Array(numberOfPeriods + 1);

        _.forEach(periods, function(period, i) {
            var deferred = q.defer();
            deferreds.push(deferred.promise);

            processImageSet(user, i).then(function() {
                deferred.resolve();
            });
        });
    }

    return q.all(deferreds);
}

function processImageSet(user, i) {
    var deferred = q.defer();

    var startDate = moment(user.getPeriodStartDate(i));
    var startDate1 = moment(startDate).subtract(1, 'days');
    var startDate2 = moment(startDate).add(1, 'days');

    logger.info('Checking ' + i + ' period ' + startDate1.format() + ' : ' + startDate2.format());

    printManager.find({
        criteria: {
            'user._id': user._id.toString(),
            startDate: {
                $gte: startDate1.toDate(),
                $lt: startDate2.toDate()
            }
        }
    }).
        then(function(imageSet) {
            if (!imageSet) {
                imageSet = printManager.getNewPrintableImageSet(user, i);
            }

            consumer.processPrintableImageSet(user, imageSet).
                then(function(newImageSet) {
                    if (newImageSet.period !== user.getCurrentPeriod()) {
                        newImageSet.isReadyForPrint = true;
                        newImageSet.isPrinted = true;
                        newImageSet.save();
                    }

                    logger.info('Completed new');
                    deferred.resolve();
                }).
                fail(function(err) {
                    logger.error(err);
                    deferred.resolve();
                }).
                done();
        });

    return deferred.promise;
}