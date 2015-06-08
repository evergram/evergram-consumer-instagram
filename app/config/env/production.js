'use strict';
/**
 * Expose
 */

module.exports = {
    //seconds, 10mins default
    userNextRunDelay: process.env.USER_NEXT_RUN_DELAY || 600,
    sqs: {
        //seconds
        waitTime: process.env.SQS_WAIT_TIME || 20,
        visibilityTime: process.env.SQS_VISIBILITY_TIME || 20
    },
    track: process.env.TRACK_TAGGING || true
};
