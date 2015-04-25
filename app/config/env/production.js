'use strict';
/**
 * Expose
 */

module.exports = {
    //seconds, 6hrs default
    userNextRunDelay: process.env.USER_NEXT_RUN_DELAY || 60 * 60 * 6,
    sqs: {
        //seconds
        waitTime: process.env.SQS_WAIT_TIME || 20
    },

    //seconds
    retryWaitTime: process.env.RETRY_WAIT_TIME || 60,
    track: process.env.TRACK_TAGGING || true
};
