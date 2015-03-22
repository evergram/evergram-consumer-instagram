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
                    var dateRun = new Date();

                    console.log('getting images');

                    /**
                     * Get the printable images for the user
                     */
                    instagram.manager.findPrintableImagesByUser(user)
                    .then(function (images) {
                        //get all printable images
                        userImages = images;
                        return print.manager.findCurrentByUser(user);
                    }, resolve)
                    /**
                     * Getting an existing printable image set, or create a new one,
                     * then add the found images to it.
                     */
                    .then(function (printableImageSet) {
                        if (printableImageSet == null) {
                            printableImageSet = print.manager.getNewPrintableImageSet(user);
                        }

                        //add the new images
                        printableImageSet.addImages('instagram', userImages);

                        return print.manager.save(printableImageSet);
                    }, resolve)
                    /**
                     * Remove the message from the queue.
                     */
                    .then(function (printableImageSet) {
                        console.log('saved images');
                        return deleteMessageFromQueue(message);
                    }, resolve)
                    /**
                     * Save the user with a new last run and in queue state.
                     */
                    .then(function () {
                        user.jobs.instagram.lastRunOn = dateRun;
                        user.jobs.instagram.nextRunOn = getNextRunDate(dateRun);
                        user.jobs.instagram.inQueue = false;
                        console.log(user);
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