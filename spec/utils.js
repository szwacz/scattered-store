/* eslint-env jasmine */

const jetpack = require('fs-jetpack');
const pathUtil = require('path');
const os = require('os');

jasmine.getEnv().defaultTimeoutInterval = 500;

// Work in default temporary location for this OS.
const workingDir = pathUtil.join(os.tmpdir(), 'scattered-store-test');

module.exports.workingDir = workingDir;

module.exports.beforeEach = function () {
  // Ensure working directory exists and is empty.
  jetpack.dir(workingDir, { empty: true });
};

module.exports.afterEach = function () {
  // Delete working directory.
  jetpack.dir(workingDir, { exists: false });
};
