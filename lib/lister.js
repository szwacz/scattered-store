// Readable stream. Discovers all file paths inside storage folder.

'use strict';

var Readable = require('stream').Readable;
var util = require('util');
var jetpack = require('fs-jetpack');
var Q = require('q');

var Lister = function (basePath) {
    Readable.call(this, { objectMode: true });
    this._basePath = basePath;
    this._pathsToGive = [];
};

util.inherits(Lister, Readable);

Lister.prototype._ensureBaseDirListed = function () {
    var deferred = Q.defer();
    var that = this;
    
    if (this._subdirsInBaseDir === undefined) {
        jetpack.listAsync(this._basePath)
        .then(function (dirs) {
            that._subdirsInBaseDir = dirs;
            deferred.resolve();
        });
    } else {
        deferred.resolve();
    }
    
    return deferred.promise;
};

Lister.prototype._ensureWeHavePathToGive = function () {
    var deferred = Q.defer();
    var that = this;
    
    this._ensureBaseDirListed()
    .then(function () {
        if (that._pathsToGive.length > 0) {
            deferred.resolve();
        } else if (that._subdirsInBaseDir.length > 0) {
            var subdir = that._subdirsInBaseDir.pop();
            var path = jetpack.path(that._basePath, subdir);
            jetpack.listAsync(path)
            .then(function (filenames) {
                that._pathsToGive = filenames.map(function (filename) {
                    return jetpack.path(path, filename);
                });
                deferred.resolve();
            });
        } else {
            deferred.reject('endOfPaths');
        }
    });
    
    return deferred.promise;
};

Lister.prototype._read = function() {
    var that = this;
    
    this._ensureWeHavePathToGive()
    .then(function () {
        that.push(that._pathsToGive.pop());
    })
    .catch(function (err) {
        if (err === 'endOfPaths') {
            that.push(null);
        }
    });
};

module.exports = Lister;
