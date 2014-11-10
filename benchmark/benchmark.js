"use strict";

var os = require('os');
var Q = require('q');
var scatteredStore = require('..');
var jetpack = require('fs-jetpack');

var path = os.tmpdir() + '/scattered-store-benchmark';

var numberOfOperations = 20000;
var itemSize = 1024 * 50;

var startTime;
var keys = [];
var testObj = new Buffer(itemSize);
var store;

var generateKey = function () {
    var key = "key" + keys.length.toString();
    keys.push(key);
    return key;
}

var start = function (message) {
    process.stdout.write(message);
    startTime = Date.now();
}

var stop = function () {
    var endTime = Date.now();
    var duration = (endTime - startTime) / 1000;
    var opsPerSec = Math.round(numberOfOperations / duration);
    console.log(' ' + opsPerSec + " items/s");
}

var prepare = function () {
    var deferred = Q.defer();
    
    jetpack.dir(path, { exists: false });
    
    console.log('Testing scattered-store performance: ' + numberOfOperations +
                ' items, ' + (itemSize / 1024) + 'KB each, ' +
                Math.round(numberOfOperations * itemSize / (1024 * 1024)) +
                'MB combined.');
    
    store = scatteredStore.create(path, function (err) {
        if (err) {
            console.log(err);
            deferred.reject();
        } else {
            deferred.resolve();
        }
    });
    
    return deferred.promise;
};

var testSet = function () {
    start('set...');
    var deferred = Q.defer();
    var oneMore = function () {
        if (keys.length < numberOfOperations) {
            store.set(generateKey(), testObj).then(oneMore, deferred.reject);
        } else {
            stop();
            deferred.resolve();
        }
    }
    oneMore();
    return deferred.promise;
};

var testGet = function () {
    start('get...');
    var deferred = Q.defer();
    var i = 0;
    var oneMore = function () {
        if (i < keys.length) {
            store.get(keys[i]).then(oneMore, deferred.reject);
        } else {
            stop();
            deferred.resolve();
        }
        i += 1;
    }
    oneMore();
    return deferred.promise;
};

var testGetAll = function () {
    start('getAll...');
    var deferred = Q.defer();
    var stream = store.getAll()
    .on('readable', function () {
        stream.read();
    })
    .on('error', deferred.reject)
    .on('end', function () {
        stop();
        deferred.resolve();
    });
    return deferred.promise;
};

var testDelete = function () {
    start('delete...');
    var deferred = Q.defer();
    var i = 0;
    var oneMore = function () {
        if (i < keys.length) {
            store.delete(keys[i]).then(oneMore, deferred.reject);
        } else {
            stop();
            deferred.resolve();
        }
        i += 1;
    }
    oneMore();
    return deferred.promise;
};

var clean = function () {
    jetpack.dir(path, { exists: false });
};

prepare()
.then(testSet)
.then(testGet)
.then(testGetAll)
.then(testDelete)
.then(clean);