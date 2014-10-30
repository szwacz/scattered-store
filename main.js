"use strict";

var Q = require('q');
var jetpack = require('fs-jetpack');
var core = require('./lib/core');

module.exports.create = function (storageDirPath) {
    var deferred = Q.defer();
    
    var done = function() {
        deferred.resolve(core(storageDirPath));
    };
    
    if (typeof storageDirPath !== 'string' || storageDirPath.length === 0) {
        deferred.reject(new Error('Path to storage directory not specified.'));
    } else {
        // First check if directory exists
        jetpack.existsAsync(storageDirPath)
        .then(function (exists) {
            if (exists === 'file') {
                deferred.reject(new Error('Given path is a file, but directory is required for scattered-store to work.'));
            } else if (exists === 'dir') {
                // Directory already exists, so just start
                done();
            } else {
                // Directory doesn't exist, so create it
                jetpack.dirAsync(storageDirPath)
                .then(function () {
                    done();
                }, deferred.reject);
            }
        }, deferred.reject);
    }
    
    return deferred.promise;
};
