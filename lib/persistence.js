"use strict";

var Q = require('q');
var crypto = require('crypto');
var jetpack = require('fs-jetpack');
var ItemGiver = require('./giver');
var DirLister = require('./lister');
var ParallelReader = require('./reader');

var newLineCode = 10; // '\n' character

var dateParser = function (key, value) {
    var reISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;
    if (typeof value === 'string') {
        if (reISO.exec(value)) {
            return new Date(value);
        }
    }
    return value;
};

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

module.exports.create = function (storageDir, callback) {
    
    // ----------------------------------------------
    // Initialization
    
    if (typeof storageDir !== 'string' || storageDir === '') {
        callback(new Error('Path to storage directory not specified'));
    } else {
        storageDir = jetpack.cwd(storageDir);
        // First check if directory exists
        storageDir.existsAsync('.')
        .then(function (exists) {
            if (exists === 'file') {
                callback(new Error('Given path is a file, but directory is required for scattered-store to work'));
            } else if (exists === 'dir') {
                // Directory already exists, so just start
                callback();
            } else {
                // Directory doesn't exist, so create it
                storageDir.dirAsync('.')
                .then(function () {
                    callback();
                })
                .catch(callback);
            }
        })
        .catch(callback);
    }
    
    // ----------------------------------------------
    // Utils
    
    var transformKeyToFilePath = function (key) {
        var sha = crypto.createHash('sha1');
        sha.update(key);
        var hex = sha.digest('hex');
        var dir = hex.substring(0, 2);
        var file = hex.substring(2);
        return storageDir.path(dir, file);
    };
    
    // ----------------------------------------------
    // Actions on storage
    
    var set = function (key, value) {
        var filePath = transformKeyToFilePath(key);
        var buf = encodeForStorage(key, value);
        return storageDir.writeAsync(filePath, buf, { safe: true });
    };
    set.asyncInterfaceType = 'promise';
    
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
    get.asyncInterfaceType = 'promise';
    
    var del = function (key) {
        var deferred = Q.defer();
        var filePath = transformKeyToFilePath(key);
        storageDir.removeAsync(filePath)
        .then(function () {
            deferred.resolve();
        });
        return deferred.promise;
    };
    del.asyncInterfaceType = 'promise';
    
    var getMany = function (keys) {
        var filePaths = keys.map(function (key) {
            return {
                key: key,
                path: transformKeyToFilePath(key),
            };
        });
        var giver = new ItemGiver(filePaths);
        var reader = new ParallelReader(8, decodeFromStorage);
        
        giver.pipe(reader);
        
        return reader;
    };
    getMany.asyncInterfaceType = 'stream';
    
    var getAll = function () {
        var lister = new DirLister(storageDir.path());
        var reader = new ParallelReader(8, decodeFromStorage);
        
        lister.pipe(reader);
        
        return reader;
    };
    getAll.asyncInterfaceType = 'stream';
    
    return {
        set: set,
        get: get,
        getMany: getMany,
        getAll: getAll,
        del: del,
    };
};
