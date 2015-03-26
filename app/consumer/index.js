/**
 * @author Josh Stuart <joshstuartx@gmail.com>.
 */

var q = require('q');
var moment = require('moment');
var common = require('evergram-common');
var aws = common.aws;
var config = require('../config');
var instagram = common.instagram;
var print = common.print;
var User = common.models.User;

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
    aws.sqs.getMessage(aws.sqs.QUEUES.INSTAGRAM, {WaitTimeSeconds: config.sqs.waitTime}).then(function (results) {
        if (!!results[0].Body && !!results[0].Body.id) {
            var message = results[0];
            var id = message.Body.id;

            /**
             * Find the user
             */
            User.findOne({'_id': id}, function (err, user) {
                if (user != null) {
                    var userImages = [];
                    var userPrintableImageSet;
                    var dateRun = new Date();

                    /**
                     * Getting an existing printable image set, or create a new one.
                     */
                    print.manager.findCurrentByUser(user)
                    .then(function (printableImageSet) {
                        if (printableImageSet == null) {
                            userPrintableImageSet = print.manager.getNewPrintableImageSet(user);
                        } else {
                            userPrintableImageSet = printableImageSet;
                        }

                        console.log('Getting printable images for:', user.instagram.username);
                        /**
                         * If we are a new user we won't put any date restrictions on the query
                         */
                        if (user.isInFirstPeriod()) {
                            return instagram.manager.findPrintableImagesByUser(user);
                        } else {
                            return instagram.manager.findPrintableImagesByUser(user, userPrintableImageSet.date);
                        }
                    }, resolve)
                    /**
                     * Get the printable images for the user and add them to the printable set
                     */
                    .then(function (images) {
                        console.log('Found ' + images.length + ' images for:', user.instagram.username);

                        //add the new images
                        userPrintableImageSet.addImages('instagram', images);
                        //save to db
                        return print.manager.save(userPrintableImageSet);
                    }, resolve)
                    /**
                    * Remove the message from the queue.
                    */
                    .then(function (printableImageSet) {
                        console.log('Saved images for: ', user.instagram.username);
                        return deleteMessageFromQueue(message);
                    }, resolve)
                    /**
                    * Save the user with a new last run and in queue state.
                    */
                    .then(function () {
                        var nextRun = getNextRunDate(dateRun);
                        console.log('Updating user ' + user.instagram.username + ' with next run on:', nextRun);
                        user.jobs.instagram.lastRunOn = dateRun;
                        user.jobs.instagram.nextRunOn = nextRun;
                        user.jobs.instagram.inQueue = false;
                        user.save(resolve);
                    }, resolve);
                } else {
                    deleteMessageFromQueue(results[0]).then(resolve);
                }
            });
        } else {
            console.log('No messages on queue');
            resolve();
        }
    }, function (err) {
        console.log('No messages on queue');
        /**
         * No messages or error, so just resolve and we'll check again
         */
        resolve();
    });

    return deferred.promise;
};

function getNextRunDate(dateRun) {
    return new Date(moment(dateRun).add(config.userNextRunDelay, 'seconds'));
}

function deleteMessageFromQueue(result) {
    return aws.sqs.deleteMessage(aws.sqs.QUEUES.INSTAGRAM, result);
}

/**
 * Expose
 * @type {ConsumerService}
 */
module.exports = exports = new Consumer;