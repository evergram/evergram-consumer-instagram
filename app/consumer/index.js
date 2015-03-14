/**
 * @author Josh Stuart <joshstuartx@gmail.com>.
 */

var Q = require('q');
var common = require('evergram-common');
var aws = common.aws;
var config = require('../config');
var instagram = common.instagram;
var User = common.models.User;

/**
 * A consumer that handles all of the consumers
 *
 * @constructor
 */
function Consumer() {

}

Consumer.prototype.consume = function () {
    var deferred = Q.defer();
    var resolve = function () {
        deferred.resolve();
    };

    /**
     * Query SQS to get a message
     */
    aws.sqs.getMessage(aws.sqs.QUEUES.INSTAGRAM, {WaitTimeSeconds: config.sqs.waitTime}).then(function (results) {
        if (!!results[0].Body && !!results[0].Body.id) {
            var id = results[0].Body.id;
            /**
             * Find the user
             */
            User.findOne({'_id': id}, function (err, user) {
                if (user != null) {
                    var dateRun = new Date();

                    console.log('getting images');
                    /**
                     * Get the printable images, delete the message from SQS and
                     * save the user with the last run and in queue flag.
                     */
                    instagram.manager.findPrintablePosts(user)
                    .then(function (images) {
                        console.log('Got images', images);

                        instagram.manager.saveImages(images)
                        .then(function () {
                            console.log('saved images');
                            deleteMessageFromQueue(results[0]).then(function () {
                                user.jobs.instagram.lastRunOn = dateRun;
                                user.jobs.instagram.inQueue = false;
                                user.save(resolve);
                            });
                        });
                    }, function () {
                        //if there's an error delete and resolve
                        deleteMessageFromQueue(results[0]).then(resolve);
                    });
                } else {
                    deleteMessageFromQueue(results[0]).then(resolve);
                }
            });
        } else {
            resolve();
        }
    }, function (err) {
        console.log('No images');
        /**
         * No messages or error, so just resolve and we'll check again
         */
        resolve();
    });

    return deferred.promise;
};

function deleteMessageFromQueue(result) {
    return aws.sqs.deleteMessage(aws.sqs.QUEUES.INSTAGRAM, result);
}

/**
 * Expose
 * @type {ConsumerService}
 */
module.exports = exports = new Consumer;