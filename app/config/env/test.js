/**
 * Expose
 */

module.exports = {
    //seconds, 10mins default
    userNextRunDelay: 600,
    sqs: {
        //seconds
        waitTime: 20,
        visibilityTime: 120
    },
    track: false
};
