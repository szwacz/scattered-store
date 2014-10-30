"use strict";

var Q = require('q');
var crypto = require('crypto');
var pathUtil = require('path');
var jetpack = require('fs-jetpack');

var newLineCode = 10; // \n

var encodeForStorage = function (key, value) {
    var type;
    var data;
    
    if (Buffer.isBuffer(value)) {
        type = 'binary';
        data = value;
    } else {
        type = 'json';
        data = new Buffer(JSON.stringify(value));
    }
    
    var fileHeaderStr = JSON.stringify({
        type: type,
        key: key
    });
    var fileHeader = new Buffer(fileHeaderStr + String.fromCharCode(newLineCode));
    
    return Buffer.concat([fileHeader, data]);
};

var decodeFromStorage = function (buf) {
    // Extract file header
    var i = 0;
    while (i < buf.length) {
        if (buf[i] === newLineCode) {
            break;
        }
        i += 1;
    }
    var fileHeaderBuf = buf.slice(0, i);
    var fileHeader = JSON.parse(fileHeaderBuf.toString());
    
    var dataBuf = buf.slice(i + 1); // Skip the new line character...
    // ... and everything after new line is data:
    
    var entry = {
        key: fileHeader.key
    };
    
    if (fileHeader.type === 'binary') {
        entry.value = dataBuf;
    } else {
        entry.value = JSON.parse(dataBuf.toString(), dateParser);
    }
    
    return entry;
};

module.exports.isValidKey = function (key) {
    if (typeof key !== 'string' || key.length === 0) {
        return false;
    }
    return true;
};

module.exports.create = function (storageDir) {
    
    storageDir = jetpack.cwd(storageDir);
    
    var transformKeyToFilePath = function (key) {
        var sha = crypto.createHash('sha1');
        sha.update(key);
        var hex = sha.digest('hex');
        var dir = hex.substring(0, 2);
        var file = hex.substring(2);
        return storageDir.path(dir, file);
    };
    
    var set = function (key, value) {
        var filePath = transformKeyToFilePath(key);
        var buf = encodeForStorage(key, value);
        return storageDir.writeAsync(filePath, buf, { safe: true });
    };
    
    var get = function (key) {
        var deferred = Q.defer();
        var filePath = transformKeyToFilePath(key);
        storageDir.readAsync(filePath, 'buf', { safe: true })
        .then(function (buf) {
            if (buf) {
                deferred.resolve(decodeFromStorage(buf).value);
            } else {
                deferred.resolve(null);
            }
        });
        return deferred.promise;
    };
    
    var del = function (key) {
        var deferred = Q.defer();
        var filePath = transformKeyToFilePath(key);
        storageDir.removeAsync(filePath)
        .then(function () {
            deferred.resolve();
        });
        return deferred.promise;
    };
    
    var each = function (fn) {
        var deferred = Q.defer();
        
        var eachFileInSubdir = function (dirname, files) {
            var deferred = Q.defer();
            var i = 0;
            
            var goForNextFile = function () {
                var path = storageDir.path(dirname, files[i]);
                storageDir.readAsync(path, 'buf', { safe: true })
                .then(function (buf) {
                    var entry = decodeFromStorage(buf);
                    
                    fn(entry.key, entry.value);
                    
                    i += 1;
                    if (files[i] === undefined) {
                        deferred.resolve();
                    } else {
                        goForNextFile();
                    }
                });
            };
            
            if (files.length === 0) {
                deferred.resolve();
            } else {
                goForNextFile();
            }
            
            return deferred.promise;
        };
        
        var eachDir = function (dirs) {
            var deferred = Q.defer();
            var i = 0;
            
            var goForNextDir = function () {
                storageDir.listAsync(dirs[i])
                .then(function (files) {
                    return eachFileInSubdir(dirs[i], files);
                })
                .then(function () {
                    i += 1;
                    if (dirs[i] === undefined) {
                        deferred.resolve();
                    } else {
                        goForNextDir();
                    }
                });
            };
            
            if (dirs.length === 0) {
                deferred.resolve();
            } else {
                goForNextDir();
            }
            
            return deferred.promise;
        };
        
        storageDir.listAsync('.')
        .then(eachDir)
        .then(deferred.resolve);
        
        return deferred.promise;
    };
    
    return {
        set: set,
        get: get,
        del: del,
        each: each,
    };
};

// -----------------------------------------------
// Utils

var dateParser = function (key, value) {
    var reISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;
    if (typeof value === 'string') {
        if (reISO.exec(value)) {
            return new Date(value);
        }
    }
    return value;
};
