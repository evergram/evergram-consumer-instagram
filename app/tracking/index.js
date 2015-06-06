'use strict';
/**
 * @author Josh Stuart <joshstuartx@gmail.com>.
 */

var _ = require('lodash');
var q = require('q');
var moment = require('moment');
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
TrackingManager.prototype.trackTaggedImages = function(user, imageSet, images) {
    var deferreds = [];
    var event = 'Tagged a photo';

    logger.info('Tracking ' + event + ' for ' + user.getUsername());

    _.forEach(images, function(image) {
        if (!imageSet.containsImage('instagram', image)) {
            var deferred = trackingManager.trackEvent(user, event, {
                service: 'instagram',
                owner: image.owner,
                type: image.isOwner ? 'own' : 'friends',
                isHistorical: moment(image.createdOn).isBefore(user.signupCompletedOn),
                link: image.metadata.link,
                image: image.src.raw,
                tag: image.tag,
                action: image.action,
                period: user.getPeriodFromStartDate(imageSet.startDate),
                createdOn: moment(image.createdOn).toDate(),
                taggedOn: moment(image.taggedOn).toDate()
            }, image.taggedOn);

            deferreds.push(deferred);
        }
    });

    return q.all(deferreds);
};

/**
 * Expose
 * @type {TrackingManagerService}
 */
module.exports = exports = new TrackingManager();
