// Readable stream. Discovers all file paths inside storage folder.

'use strict';

var Readable = require('stream').Readable;
var util = require('util');
var jetpack = require('fs-jetpack');
var Q = require('q');

var Lister = function (basePath) {
    Readable.call(this, { objectMode: true });
    this._basePath = basePath;
    this._subdirsToGo = null;
    this._pathsToGive = [];
};

util.inherits(Lister, Readable);

Lister.prototype._loadMorePaths = function () {
    var deferred = Q.defer();
    var that = this;

    var listNextSubdir = function () {
        if (that._subdirsToGo.length === 0) {
            // No more directories to list!
            deferred.reject('endOfPaths');
        } else {
            var subdir = that._subdirsToGo.pop();
            var path = jetpack.path(that._basePath, subdir);
            jetpack.listAsync(path)
            .then(function (filenames) {
                // Generate absolute paths from filenames.
                that._pathsToGive = filenames.map(function (filename) {
                    return jetpack.path(path, filename);
                });
                if (that._pathsToGive.length > 0) {
                    // Yep. We have paths. Done!
                    deferred.resolve();
                } else {
                    // This directory was apparently empty. Go for next one.
                    listNextSubdir();
                }
            });
        }
    };

    if (this._subdirsToGo === null) {
        jetpack.listAsync(this._basePath)
        .then(function (dirs) {
            that._subdirsToGo = dirs;
            listNextSubdir();
        });
    } else {
        listNextSubdir();
    }

    return deferred.promise;
};

Lister.prototype._read = function() {
    if (this._pathsToGive.length > 0) {
        this.push(this._pathsToGive.pop());
    } else {
        var that = this;
        this._loadMorePaths()
        .then(function () {
            that.push(that._pathsToGive.pop());
        })
        .catch(function (err) {
            if (err === 'endOfPaths') {
                that.push(null);
            }
        });
    }
};

module.exports = Lister;
