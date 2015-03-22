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

var josh = '550e124a1b352fe6209b74a5';
var luisa = '550ce83feb09674d27237923';

User.findOne({'_id': josh}, function (err, user) {
    if (user) {
        var userImages = [];
        instagram.manager.findPrintableImagesByUser(user)
        .then(function (images) {
            //get all printable images
            userImages = images;
            console.log(images.length);
        //    return printManager.findCurrentByUser(user);
        //}).then(function (printableImageSet) {
        //    if (printableImageSet == null) {
        //        printableImageSet = printManager.getNewPrintableImageSet(user);
        //    }
        //    printManager.addImagesToSet(printableImageSet.instagram, userImages);
        //    return printManager.save(printableImageSet);
        //}).then(function (printableImageSet) {

        });
    }
});