/**
 * Expose
 */

module.exports = {
    //seconds, 1hr default
    userNextRunDelay: 60 * 60,
    sqs: {
        //seconds
        waitTime: 20
    },

    //seconds
    retryWaitTime: 60,
    track: false
};
