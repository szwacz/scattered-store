"use strict";

var os = require('os');
var Q = require('q');
var jetpack = require('fs-jetpack');

var scatteredStore = require('..');
var store;
var path = os.tmpdir() + '/scattered-store-benchmark';

var itemsTotal = 100000;
var readsPerTest = 10000;
var itemSize = 1000 * 10;

var keys = [];
var testObj = new Buffer(itemSize);

var generateKey = function () {
    var key = "key" + keys.length.toString();
    keys.push(key);
    return key;
}

var start = function (message, totalOps) {
    var startTime = Date.now();
    var doneOps = 0;
    var currPerc;

    var progress = function (moreDone) {
        doneOps += moreDone;
        var perc = Math.floor(doneOps / totalOps * 100);
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
        var opsPerSec = Math.round(totalOps / duration);
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

    console.log('Testing scattered-store performance: ' + itemsTotal +
                ' items, ' + (itemSize / 1000) + 'KB each, ' +
                (itemsTotal * itemSize / (1000 * 1000 * 1000)).toFixed(1) +
                'GB combined.');

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
    var test = start('set', itemsTotal);
    var deferred = Q.defer();
    var oneMore = function () {
        if (keys.length < itemsTotal) {
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
    var test = start('get', readsPerTest);
    var deferred = Q.defer();
    var i = 0;
    var oneMore = function () {
        if (i < readsPerTest) {
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

var testGetMany = function () {
    var test = start('getMany', readsPerTest);
    var deferred = Q.defer();
    var stream = store.getMany(keys.slice(0, readsPerTest))
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

var testGetAll = function () {
    var test = start('getAll', keys.length);
    var deferred = Q.defer();
    var stream = store.getAll()
    .on('readable', function () {
        stream.read();
        test.progress(1);
    })
    .on('end', function () {
        test.stop();
        deferred.resolve();
    });
    return deferred.promise;
};

var testDelete = function () {
    var test = start('delete', keys.length);
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
.then(testGetMany)
.then(testGetAll)
.then(testDelete)
.then(clean);
