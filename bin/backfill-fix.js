/**
 * Module dependencies
 */
process.env.TZ = 'UTC';

var q = require('q');
var _ = require('lodash');
var moment = require('moment');
var common = require('evergram-common');
var logger = common.utils.logger;
var userManager = common.user.manager;
var consumer = require('../app/consumer');
var printManager = common.print.manager;

//init db
common.db.connect();

//var options = {criteria: {'instagram.username': 'jacq1313'}};
var options = {
    criteria: {
        $or: [
            {
                'instagram.username': 'obrien.kimberley.a'
            },
            {
                'instagram.username': 'messyhall'
            },
            {
                'instagram.username': 'virginiacarlson'
            },
            {
                'instagram.username': 'jacq1313'
            },
            {
                'instagram.username': 'hannaholo'
            },
            {
                'instagram.username': 'dbillingham'
            },
            {
                'instagram.username': 'libbygude'
            },
            {
                'instagram.username': 'idontdrinkcoffee'
            },
            {
                'instagram.username': 'bethanyclare6'
            },
            {
                'instagram.username': 'smetski'
            },
            {
                'instagram.username': 'luisa_vasta'
            }
        ]
    }
};

//backfill
userManager.findAll(options).then(function(users) {
    var processUsers = [];
    _.forEach(users, function(user) {
        processUsers.push(user);
    });

    var current = 0;
    var process = function() {
        logger.info('Processing ' + current);
        consumer.processReadyForPrintImageSet(processUsers[current]).then(function() {
            logger.info('Done processing ' + current);
            current++;
            if (current <= processUsers.length) {
                process();
            } else {
                logger.info('Done processing all');
            }
        });
    };

    process();
});