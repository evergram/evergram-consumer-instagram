/**
 * Module dependencies.
 */

var common = require('evergram-common');
var aws = common.aws;
var instagram = common.instagram;
var User = common.models.User;

function receiveMessages() {
    User.findOne({'username': 'joshstuartx'}, function (err, user) {
        if (user != null) {
            instagram.manager.findPrintablePosts(user)
            .then(function (images) {
                instagram.manager.saveImages(images);
            });
        }
    });
}
receiveMessages();

//init db
common.db.connect();

