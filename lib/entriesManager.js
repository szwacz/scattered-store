"use strict";

var Q = require('q');
var crypto = require('crypto');
var pathUtil = require('path');
var jetpack = require('fs-jetpack');

var newLineCode = 10;

function encodeForStorage(key, value) {
    
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
    var fileHeader = new Buffer(fileHeaderStr + '\n');
    
    return Buffer.concat([fileHeader, data]);
}

function decodeFromStorage(buf) {
    // extract the file header
    var i = 0;
    while (i < buf.length) {
        if (buf[i] === newLineCode) {
            break;
        }
        i += 1;
    }
    var fileHeaderBuf = buf.slice(0, i);
    var fileHeader = JSON.parse(fileHeaderBuf.toString());
    
    var dataBuf = buf.slice(i + 1); // skip the new line character, and the rest is data
    
    if (fileHeader.type === 'binary') {
        return dataBuf;
    }
    
    return JSON.parse(dataBuf.toString(), JSON.dateParser);
}

module.exports.isValidKey = function (key) {
    return typeof key === 'string';
}

module.exports.create = function (storageDir) {
    
    function transformKeyToFilePath(key) {
        var sha = crypto.createHash('sha1');
        sha.update(key);
        var hex = sha.digest('hex');
        var dir = hex.substring(0, 2);
        var file = hex.substring(2);
        return pathUtil.resolve(storageDir, dir, file);
    }
    
    function set(key, value) {
        var filePath = transformKeyToFilePath(key);
        var buf = encodeForStorage(key, value);
        return jetpack.writeAsync(filePath, buf, { safe: true });
    }
    
    function get(key) {
        var deferred = Q.defer();
        var filePath = transformKeyToFilePath(key);
        jetpack.readAsync(filePath, 'buf', { safe: true })
        .then(function (buf) {
            var value = decodeFromStorage(buf);
            deferred.resolve(value);
        }, function (err) {
            if (err.code === 'ENOENT') {
                // if there is no file treat it as no value for given key, and return null
                deferred.resolve(null);
            } else {
                deferred.reject(err);
            }
        });
        return deferred.promise;
    }
    
    function del(key) {
        var filePath = transformKeyToFilePath(key);
        return jetpack.removeAsync(filePath, { safe: true });
    }
    
    return {
        set: set,
        get: get,
        del: del
    };
}

// -----------------------------------------------
// Utils

JSON.dateParser = function (key, value) {
    var reISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*))(?:Z|(\+|-)([\d|:]*))?$/;
    if (typeof value === 'string') {
        if (reISO.exec(value)) {
            return new Date(value);
        }
    }
    return value;
};
