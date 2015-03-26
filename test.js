/**
 * Module dependencies.
 */

var common = require('evergram-common');
var instagram = common.instagram;
var User = common.models.User;
var PrintableImageSet = common.models.PrintableImageSet;
var printManager = common.print.manager;

//init db
common.db.connect();

var username = 'richard_obrien';

User.findOne({'instagram.username': username}, function (err, user) {
    if (user) {
        console.log('Found: ', user.getUsername());

        printManager.findCurrentByUser(user)
        .then(function (printableImageSet) {
            if (printableImageSet == null) {
                userPrintableImageSet = printManager.getNewPrintableImageSet(user);
            } else {
                userPrintableImageSet = printableImageSet;
            }

            console.log('Getting printable images for:', user.instagram.username);
            /**
             * If we are a new user we won't put any date restrictions on the query
             */
            if (user.isInFirstPeriod()) {
                console.log(user.getUsername(), 'is in their first period');
                return instagram.manager.findPrintableImagesByUser(user);
            } else {
                console.log(user.getUsername(), 'is in their', userPrintableImageSet.date);
                return instagram.manager.findPrintableImagesByUser(user, userPrintableImageSet.date);
            }
        })
        /**
         * Get the printable images for the user and add them to the printable set
         */
        .then(function (images) {
            console.log('Found ' + images.length + ' images');
        });
    }
});