"use strict";

var jetpack = require('fs-jetpack');
var pathUtil = require('path');
var os = require('os');

jasmine.getEnv().defaultTimeoutInterval = 500;

// Work in default temporary location for this OS.
var workingDir = pathUtil.join(os.tmpdir(), 'scattered-store-test');

module.exports.workingDir = workingDir;

module.exports.beforeEach = function () {
    // Ensure working directory exists and is empty.
    jetpack.dir(workingDir, { empty: true });
};

module.exports.afterEach = function () {
    // Delete working directory.
    jetpack.dir(workingDir, { exists: false });
};
