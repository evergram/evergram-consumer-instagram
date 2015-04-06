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

/**
 * Tracks tagged images.
 *
 * @param user
 * @param imageSet
 * @param images
 */
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

    if (total > 0) {
        logger.info('Tracking ' + event + ' for ' + user.getUsername());

        return trackingManager.incrementMultiple(user, {
            'Total Images Tagged': total,
            'Total Own Images Tagged': owned,
            'Total Other Images Tagged': other
        }).then(function () {
            return trackingManager.trackEvent(user, event, {
                'Instagram Username': user.instagram.username,
                'Period': user.getPeriodFromStartDate(imageSet.startDate),
                'Country': imageSet.user.address.country,
                'State': imageSet.user.address.state,
                'City': imageSet.user.address.suburb,
                'Image Set Start Date': imageSet.startDate,
                'Image Set End Date': imageSet.endDate,
                'Total Images Tagged': total,
                'Total Own Images Tagged': owned,
                'Total Other Images Tagged': other
            });
        });
    } else {
        return;
    }
};

/**
 * Expose
 * @type {TrackingManagerService}
 */
module.exports = exports = new TrackingManager;