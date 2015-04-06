/**
 * @author Josh Stuart <joshstuartx@gmail.com>.
 */

var _ = require('lodash');
var common = require('evergram-common');
var logger = common.utils.logger;
var trackingManager = common.tracking.manager;

/**
 * A tracking manager that handles all tracking events for the instagram consumer
 *
 * @constructor
 */
function TrackingManager() {

}

TrackingManager.prototype.trackTaggedImages = function (user, imageSet, images) {
    var event = 'Tagged Instagram Images';
    var total = 0;
    var owned = 0;
    var other = 0;

    _.forEach(images, function (image) {
        if (!imageSet.containsImage('instagram', image)) {
            total++;
            if (image.isOwner) {
                owned++;
            } else {
                other++;
            }
        }
    });

    logger.info('Tracking ' + event + ' for ' + user.getUsername());

    return trackingManager.trackEvent(user, event, {
        'Instagram Username': user.instagram.username,
        'User Period': user.getPeriodFromStartDate(imageSet.startDate),
        'Total Images Tagged': total,
        'Total Owned Images Tagged': owned,
        'Total Other Images Tagged': other
    });
};

/**
 * Expose
 * @type {TrackingManagerService}
 */
module.exports = exports = new TrackingManager;