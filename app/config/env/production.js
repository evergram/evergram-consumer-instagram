/**
 * Expose
 */

module.exports = {
    userNextRunDelay: process.env.USER_NEXT_RUN_DELAY || 60 * 60 * 6, //seconds, 6hrs default
    sqs: {
        waitTime: process.env.SQS_WAIT_TIME || 20 //seconds
    },
    retryWaitTime: process.env.RETRY_WAIT_TIME || 60, //seconds
    track: process.env.TRACK_TAGGING || true
};
