/**
 * Module dependencies
 */
process.env.TZ = 'UTC';

var q = require('q');
var _ = require('lodash');
var common = require('evergram-common');
var logger = common.utils.logger;
var userManager = common.user.manager;
var consumer = require('../app/consumer');

//init db
common.db.connect();

var options = {criteria: {'instagram.username': 'nellieward'}};
//var options = {};

//backfill
userManager.findAll(options).then(function(users) {
    var processUsers = [];
    _.forEach(users, function(user) {
        processUsers.push(user);
    });

    var current = 0;
    var process = function() {
        logger.info('Processing ' + current);

        consumer.getImages(processUsers[current]).then(function() {
            logger.info('Done processing ' + current);
            current++;
            if (current < processUsers.length) {
                process();
            } else {
                logger.info('Done processing all');
            }
        });
    };

    process();
});