"use strict";

var os = require('os');
var Q = require('q');
var jetpack = require('fs-jetpack');

var scatteredStore = require('..');
var store;
var path = os.tmpdir() + '/scattered-store-benchmark';
var numberOfOperations = 100000;
var itemSize = 1024 * 10;

var keys = [];
var testObj = new Buffer(itemSize);

var generateKey = function () {
    var key = "key" + keys.length.toString();
    keys.push(key);
    return key;
}

var start = function (message) {
    var startTime = Date.now();
    var total = numberOfOperations;
    var done = 0;
    var currPerc;

    var progress = function (moreDone) {
        done += moreDone;
        var perc = Math.ceil(done / total * 100);
        if (currPerc !== perc) {
            currPerc = perc;
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(message + ' [' + currPerc + '%]');
        }
    };

    var stop = function () {
        var endTime = Date.now();
        var duration = (endTime - startTime) / 1000;
        var opsPerSec = Math.round(total / duration);
        process.stdout.clearLine();
        process.stdout.cursorTo(0);
        console.log(message + ' ' + opsPerSec + " items/s");
    };

    progress(0);

    return {
        progress: progress,
        stop: stop,
    }
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
    var test = start('set');
    var deferred = Q.defer();
    var oneMore = function () {
        if (keys.length < numberOfOperations) {
            store.set(generateKey(), testObj)
            .then(function () {
                test.progress(1);
                oneMore();
            });
        } else {
            test.stop();
            deferred.resolve();
        }
    }
    oneMore();
    return deferred.promise;
};

var testGet = function () {
    var test = start('get');
    var deferred = Q.defer();
    var i = 0;
    var oneMore = function () {
        if (i < keys.length) {
            store.get(keys[i])
            .then(function () {
                test.progress(1);
                oneMore();
            });
        } else {
            test.stop();
            deferred.resolve();
        }
        i += 1;
    }
    oneMore();
    return deferred.promise;
};

var testGetAll = function () {
    var test = start('getAll');
    var deferred = Q.defer();
    var stream = store.getAll()
    .on('readable', function () {
        stream.read();
        test.progress(1);
    })
    .on('error', deferred.reject)
    .on('end', function () {
        test.stop();
        deferred.resolve();
    });
    return deferred.promise;
};

var testDelete = function () {
    var test = start('delete');
    var deferred = Q.defer();
    var i = 0;
    var oneMore = function () {
        if (i < keys.length) {
            store.delete(keys[i])
            .then(function () {
                test.progress(1);
                oneMore();
            });
        } else {
            test.stop();
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
