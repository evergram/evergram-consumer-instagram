'use strict';
/**
 * Module dependencies.
 */

var devConfig = require('./env/development');
var testConfig = require('./env/test');
var prodConfig = require('./env/production');

/**
 * Expose
 */

function Config() {
    return {
        development: devConfig,
        test: testConfig,
        production: prodConfig
    }[process.env.NODE_ENV || 'development'];
}

module.exports = exports = new Config();
