'use strict';

/**
 * @author Josh Stuart <joshstuartx@gmail.com>.
 */

var q = require('q');
var _ = require('lodash');
var moment = require('moment');
var config = require('../config');
var common = require('evergram-common');
var logger = common.utils.logger;
var instagramManager = common.instagram.manager;
var printManager = common.print.manager;
var userManager = common.user.manager;
var trackingManager = require('../tracking');

var IMAGE_SERVICE_INSTAGRAM = 'instagram';

/**
 * A consumer that handles all of the consumers
 *
 * @constructor
 */
function Consumer() {

}

/**
 *
 * @param message
 * @returns {*}
 */
Consumer.prototype.consume = function(message) {
    var currentUser;

    /**
     * Query SQS to get a message
     */
    return getUser(message.data.id).
        then(function(user) {
            currentUser = user;
            return getImages(user);
        }).
        finally(function() {
            return cleanUp(currentUser);
        });
};

/**
 *
 * @param message
 * @param user
 */
function cleanUp(user) {
    var deferreds = [];

    if (!!user) {
        if (user.jobs.instagram.inQueue) {
            logger.info('Cleaning up user ' + user.getUsername());
            deferreds.push(updateUser(user));
        }
    }

    return q.all(deferreds);
}

/**
 * Gets a valid user for the passed id.
 *
 * @param id
 * @returns {*|promise}
 */
function getUser(id) {
    var deferred = q.defer();

    userManager.find({criteria: {_id: id}}).
        then(function(user) {
            if (user !== null) {
                deferred.resolve(user);
            } else {
                deferred.reject('Could not find a user for the id :' + id);
            }
        });

    return deferred.promise;
}

/**
 * Get all images for the user.
 *
 * @param user
 * @returns {*}
 */
function getImages(user) {
    var dateRun = new Date();

    //TODO this is just a hack for the simple plan limit.
    if (isSimpleLimitPlan(user)) {
        return processLimitedPrintImageSet(user).
            then(function() {
                /**
                 * Save the user with a new last run and in queue state.
                 */
                return updateUser(user, dateRun);
            });
    } else {
        /**
         * process any previous image sets that haven't been closed out
         */
        return processReadyForPrintImageSet(user).
            then(function() {
                /**
                 * process the current images
                 */
                return processCurrentImageSet(user);
            }).
            then(function() {
                /**
                 * Save the user with a new last run and in queue state.
                 */
                return updateUser(user, dateRun);
            });
    }
}

Consumer.prototype.getImages = getImages;

/**
 *
 * @param user
 * @param lastRun
 * @returns {promise|*|q.promise|Progress|*}
 */
function updateUser(user, lastRun) {
    if (!lastRun) {
        lastRun = new Date();
    }

    var nextRun = getNextRunDate(lastRun);

    logger.info(
        'Updating user ' +
        user.getUsername() +
        ' with next run on: ' +
        nextRun
    );

    user.jobs.instagram.lastRunOn = lastRun;
    user.jobs.instagram.nextRunOn = nextRun;
    user.jobs.instagram.inQueue = false;

    return userManager.update(user);
}

/**
 * A temp function to process image sets that are limited.
 *
 * @param user
 * @returns {*}
 */
function processLimitedPrintImageSet(user) {
    logger.info('Checking for active limited print images for ' + user.getUsername());

    return printManager.findAllByUser(user).
        then(function(imageSets) {
            var imageSet;

            if (!!imageSets && !!imageSets[0]) {
                imageSet = imageSets[0];
            } else {
                imageSet = printManager.getNewPrintableImageSet(user);
            }

            if (!imageSet.isReadyForPrint && !imageSet.isPrinted) {
                return processPrintableImageSet(user, imageSet).
                    then(function() {
                        //if there are no images left in the limit, set it ready for print.
                        if (isAtSimpleLimit(user, imageSet)) {
                            imageSet.isReadyForPrint = true;
                        }

                        return printManager.save(imageSet);
                    });
            } else {
                logger.info('There are no active limited print sets for ' + user.getUsername());
                return q.fcall(function() {
                    return true;
                });
            }
        });
}

/**
 * This is the current period image set
 */
function processCurrentImageSet(user) {
    logger.info('Starting current images for ' + user.getUsername());

    return printManager.findCurrentByUser(user).
        then(function(imageSet) {
            if (!imageSet) {
                imageSet = printManager.getNewPrintableImageSet(user);
            }

            return processPrintableImageSet(user, imageSet);
        });
}

Consumer.prototype.processCurrentImageSet = processCurrentImageSet;

/**
 * These are image sets that are past their period, but have not
 * yet been marked as "ready for print"
 *
 */
function processReadyForPrintImageSet(user) {
    var numberOfPeriods = user.getCurrentPeriod();
    logger.info(user.getUsername() + ' is in period ' + numberOfPeriods);

    if (numberOfPeriods > 0) {
        logger.info('Checking previous ready for print images for ' + user.getUsername());

        return printManager.findPreviousByUser(user).
            then(function(imageSet) {
                if (!!imageSet && !imageSet.isReadyForPrint) {
                    return processPrintableImageSet(user, imageSet).
                        then(function() {
                            //save the image set
                            //TODO move this to processPrintableImageSet so that we only save once.
                            imageSet.isReadyForPrint = true;
                            return printManager.save(imageSet);
                        });
                } else {
                    logger.info('There are no previous incomplete image sets for ' + user.getUsername());
                    return q.fcall(function() {
                        return true;
                    });
                }
            });
    } else {
        //TODO figure out a way to remove this as it's messy
        return q.fcall(function() {
            return true;
        });
    }
}

Consumer.prototype.processReadyForPrintImageSet = processReadyForPrintImageSet;

/**
 * Finds and saves images for the passed user and image set.
 *
 * @param user
 * @param printableImageSet
 * @returns {*}
 */
function processPrintableImageSet(user, printableImageSet) {
    logger.info('Getting printable images for ' + user.getUsername() + ' for the set ' + printableImageSet.startDate);

    /**
     * Get the printable images for the user and add them to the printable set
     */
    return getPrintableImages(user, printableImageSet).
        then(function(images) {
            logger.info('Found ' + images.length + ' images for ' + user.getUsername());

            /**
             * Track the images
             */
            if (images.length > 0 && (!!config.track && config.track !== 'false' && config.track !== false)) {
                trackingManager.trackTaggedImages(user, printableImageSet, images);
            }

            /**
             * Add the new images.
             */
            addImages(user, printableImageSet, images);

            logger.info('Saving image set ' + printableImageSet._id + ' for ' + user.getUsername());

            /**
             * Save to db.
             */
            return printManager.save(printableImageSet);
        });
}

Consumer.prototype.processPrintableImageSet = processPrintableImageSet;

/**
 * Get the printable images for the user and image set.
 *
 * @param user
 * @param printableImageSet
 * @returns {promise|*|q.promise}
 */
function getPrintableImages(user, printableImageSet) {
    /**
     * If we are a new user we won't put any date restrictions on the query
     */
    if (user.isInFirstPeriod() || printableImageSet.period === 0) {
        logger.info('Running ' + user.getUsername() + ' from the beginning of time to ' + printableImageSet.endDate);

        return instagramManager
            .findPrintableImagesByUser(user, null, printableImageSet.endDate);
    } else {
        logger.info(
            'Running ' +
            user.getUsername() +
            ' from ' +
            printableImageSet.startDate + ' to ' +
            printableImageSet.endDate
        );

        return instagramManager
            .findPrintableImagesByUser(user, printableImageSet.startDate, printableImageSet.endDate);
    }
}

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
 * Tests if the current user has the simple limit plan.
 *
 * @param user
 */
function isSimpleLimitPlan(user) {
    return getSimpleLimitRegex().test(user.billing.option.toUpperCase());
}

/**
 * Checks if the current image set is at it's limit.
 *
 * @param printableImageSet
 * @returns {boolean}
 */
function isAtSimpleLimit(user, printableImageSet) {
    return printableImageSet.images[IMAGE_SERVICE_INSTAGRAM].length >= getSimpleLimit(user);
}

/**
 * Gets the limit.
 *
 * @param text
 * @returns {Number}
 */
function getSimpleLimit(user) {
    var limit = parseInt(user.billing.option.toUpperCase().match(getSimpleLimitRegex())[1], 10);

    if (isNaN(limit)) {
        limit = 0;
    }

    return limit;
}

/**
 * Gets the Simple Limit regex.
 *
 * @returns {RegExp}
 */
function getSimpleLimitRegex() {
    return new RegExp(config.plans.simpleLimit);
}

/**
 * Add the found images to the image set.
 *
 * @param user
 * @param printableImageSet
 * @param images
 */
function addImages(user, printableImageSet, images) {
    if (isSimpleLimitPlan(user)) {
        var limit = getSimpleLimit(user);
        var currentNumImages = printableImageSet.images[IMAGE_SERVICE_INSTAGRAM].length;

        //double check if we aren't at the limit already
        if (!isAtSimpleLimit(user, printableImageSet)) {
            _.forEach(images, function(image) {
                //ensure that we are still below the limit, and that the image doesn't exist
                if (currentNumImages < limit && !printableImageSet.containsImage(IMAGE_SERVICE_INSTAGRAM, image)) {
                    printableImageSet.addImage(IMAGE_SERVICE_INSTAGRAM, image);
                    currentNumImages++;
                }
            });
        }
    } else {
        printableImageSet.addImages(IMAGE_SERVICE_INSTAGRAM, images);
    }
}

/**
 * Expose
 * @type {ConsumerService}
 */
module.exports = exports = new Consumer();
