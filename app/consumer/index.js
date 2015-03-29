/**
 * @author Josh Stuart <joshstuartx@gmail.com>.
 */

var q = require('q');
var _ = require('lodash');
var moment = require('moment');
var config = require('../config');
var common = require('evergram-common');
var logger = common.utils.logger;
var sqs = common.aws.sqs;
var instagramManager = common.instagram.manager;
var printManager = common.print.manager;
var userManager = common.user.manager;

/**
 * A consumer that handles all of the consumers
 *
 * @constructor
 */
function Consumer() {

}

Consumer.prototype.consume = function () {
    var deferred = q.defer();
    var resolve = function () {
        deferred.resolve();
    };

    /**
     * Query SQS to get a message
     */
    sqs.getMessage(sqs.QUEUES.INSTAGRAM, {WaitTimeSeconds: config.sqs.waitTime}).
    then(function (results) {
        if (!!results[0].Body && !!results[0].Body.id) {
            var message = results[0];
            var id = message.Body.id;

            /**
             * Find the user
             */
            userManager.find({criteria: {'_id': id}}).then((function (user) {
                if (user != null) {
                    var dateRun = new Date();

                    /**
                     * process any previous image sets that haven't been closed out
                     */
                    this.processReadyForPrintImageSet(user).
                    then((function () {
                        /**
                         * process the current images
                         */
                        return this.processCurrentImageSet(user);
                    }).bind(this)).
                    /**
                     * Delete the message from the queue
                     */
                    then(function () {
                        return deleteMessageFromQueue(results[0]);
                    }).
                    /**
                     * Save the user with a new last run and in queue state.
                     */
                    then(function () {
                        var nextRun = getNextRunDate(dateRun);
                        logger.info('Updating user ' + user.getUsername() + ' with next run on: ' + nextRun);

                        user.jobs.instagram.lastRunOn = dateRun;
                        user.jobs.instagram.nextRunOn = nextRun;
                        user.jobs.instagram.inQueue = false;
                        user.save(resolve);
                    }, resolve);
                } else {
                    deleteMessageFromQueue(results[0]).then(resolve);
                }
            }).bind(this));
        } else {
            logger.info('No messages on queue');
            resolve();
        }
    }, function (err) {
        logger.info('No messages on queue');
        /**
         * No messages or error, so just resolve and we'll check again
         */
        resolve();
    });

    return deferred.promise;
};

/**
 * This is the current period image set
 */
Consumer.prototype.processCurrentImageSet = function (user) {
    return printManager.findCurrentByUser(user).
    then((function (imageSet) {
        if (imageSet == null) {
            imageSet = printManager.getNewPrintableImageSet(user);
        }
        logger.info('Getting current printable images for ' + user.getUsername());

        return this.processPrintableImageSet(user, imageSet);
    }).bind(this));
}

/**
 * These are image sets that are past their period, but have not
 * yet been marked as "ready for print"
 *
 * //TODO refactor this beast because it is only really needed due to legacy users.
 */
Consumer.prototype.processReadyForPrintImageSet = function (user) {
    var deferred = q.defer();

    var numberOfPeriods = user.getCurrentPeriod();
    if (numberOfPeriods > 0) {
        printManager.findAllPreviousNotReadyForPrintByUser(user).
        then((function (imageSets) {
            var imageDeferreds = [];

            if (!!imageSets && imageSets.length > 0) {
                logger.info('Getting previous ready for print images for ' + user.getUsername());

                /**
                 * We do one final fetch on images to make sure we haven't missed any
                 * and then set ready for print.
                 */
                _.forEach(imageSets, (function (imageSet) {
                    var imageDeferred = q.defer();
                    imageDeferreds.push(imageDeferred.promise);

                    imageSet.isReadyForPrint = true;
                    this.processPrintableImageSet(user, imageSet).
                    then(function () {
                        imageDeferred.resolve();
                    });
                }).bind(this));

                q.all(imageDeferreds).
                then(deferred.resolve);
            } else {
                //TODO remove this once we no longer have legacy
                var imageDeferred = q.defer();
                imageDeferreds.push(imageDeferred.promise);

                /**
                 * Check to see if this is the first time.
                 */
                printManager.findAllByUser(user).then((function (imageSets) {
                    logger.info('Getting previous period for ' + user.getUsername());

                    if (!imageSets || imageSets.length == 0) {
                        var imageSet = printManager.getNewPrintableImageSet(user, numberOfPeriods - 1);
                        imageSet.isReadyForPrint = true;
                        this.processPrintableImageSet(user, imageSet).
                        then(function () {
                            imageDeferred.resolve();
                        });
                    } else {
                        imageDeferred.resolve();
                    }
                }).bind(this));
            }

            q.all(imageDeferreds).
            then(function () {
                logger.info('Completed getting previous ready for print sets for ' + user.getUsername());

                deferred.resolve();
            });
        }).bind(this));
    } else {
        deferred.resolve();
    }

    return deferred.promise;
};

/**
 * Finds and saves images for the passed user and image set.
 *
 * @param user
 * @param printableImageSet
 * @returns {*}
 */
Consumer.prototype.processPrintableImageSet = function (user, printableImageSet) {
    var printableImagesPromise;

    /**
     * If we are a new user we won't put any date restrictions on the query
     */
    if (user.isInFirstPeriod()) {
        logger.into('Running ' + user.getUsername() + ' from the beginning of time to ' + printableImageSet.endDate);

        printableImagesPromise = instagramManager
        .findPrintableImagesByUser(user, null, printableImageSet.endDate);
    } else {
        logger.info('Running ' + user.getUsername() + ' from ' + printableImageSet.startDate + ' to ' + printableImageSet.endDate);

        printableImagesPromise = instagramManager
        .findPrintableImagesByUser(user, printableImageSet.startDate, printableImageSet.endDate);
    }

    return printableImagesPromise.
    /**
     * Get the printable images for the user and add them to the printable set
     */
    then(function (images) {
        logger.info('Found ' + images.length + ' images for ' + user.getUsername());

        /**
         * Add the new images.
         */
        printableImageSet.addImages('instagram', images);

        /**
         * Save to db.
         */
        return printManager.save(printableImageSet);
    }, function (err) {
        logger.error('There was an error when finding images for ' + user.getUsername(), err);
        resolve();
    })
};

/**
 * Gets the next run date based on the date the process was run.
 *
 * @param dateRun
 * @returns {Date}
 */
function getNextRunDate(dateRun) {
    return new Date(moment(dateRun).add(config.userNextRunDelay, 'seconds'));
}

/**
 * Convenience function to delete a message from the SQS.
 *
 * @param result
 * @returns {*}
 */
function deleteMessageFromQueue(result) {
    return sqs.deleteMessage(sqs.QUEUES.INSTAGRAM, result);
}

/**
 * Expose
 * @type {ConsumerService}
 */
module.exports = exports = new Consumer;