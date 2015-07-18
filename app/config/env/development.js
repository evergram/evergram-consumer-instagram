'use strict';
/**
 * Expose
 */

module.exports = {
    //seconds
    userNextRunDelay: 300,
    sqs: {
        //seconds
        waitTime: 20,
        visibilityTime: 300
    },
    plans: {
        simpleLimit: {
            limit: 2,
            code: 'LIMIT50'
        }
    },
    track: false
};
