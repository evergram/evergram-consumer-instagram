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
        simpleLimit: '[a-zA-Z]+\\-LIMIT\\-([0-9]+)'
    },
    track: true
};
