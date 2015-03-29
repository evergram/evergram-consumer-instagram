/**
 * Module dependencies.
 */

var _ = require('lodash');
var common = require('evergram-common');
var instagram = common.instagram;
var userManager = common.user.manager;
var PrintableImageSet = common.models.PrintableImageSet;
var printManager = common.print.manager;
var consumer = require('./app/consumer');

//init db
common.db.connect();

var username = 'obrien.kimberley.a';
//var options = {criteria: {'instagram.username': username}};
var options = {};

userManager.findAll(options).then(function (users) {
    _.forEach(users, function (user) {
        if (user) {
            console.log('Found: ', user.getUsername());

            consumer.processReadyForPrintImageSet(user);
        }
    });
});

//userManager.find({criteria: {'instagram.username': username}}).then(function (user) {
//    if (user) {
//        console.log('Found: ', user.getUsername());
//
//        consumer.processReadyForPrintImageSet(user).then(function () {
//        //    return consumer.processCurrentImageSet(user);
//        //}).then(function () {
//            console.log('Completed: ', user.getUsername());
//        });
//
//consumer.processCurrentImageSet(user).then(function () {
//    console.log('Completed: ', user.getUsername());
//});
//
//printManager.findCurrentByUser(user)
//.then(function (printableImageSet) {
//    if (printableImageSet == null) {
//        userPrintableImageSet = printManager.getNewPrintableImageSet(user);
//    } else {
//        userPrintableImageSet = printableImageSet;
//    }
//
//    console.log('Getting printable images for:', user.instagram.username);
//    /**
//     * If we are a new user we won't put any date restrictions on the query
//     */
//    if (user.isInFirstPeriod()) {
//        console.log(user.getUsername(), 'is in their first period');
//        return instagram.manager.findPrintableImagesByUser(user);
//    } else {
//        console.log(user.getUsername(), 'is in their', userPrintableImageSet.date);
//        return instagram.manager.findPrintableImagesByUser(user, userPrintableImageSet.date);
//    }
//})
///**
// * Get the printable images for the user and add them to the printable set
// */
//.then(function (images) {
//    console.log('Found ' + images.length + ' images');
//});
//
//
//    }
//});