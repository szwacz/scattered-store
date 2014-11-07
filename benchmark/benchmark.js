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

// clean before benchmark
jetpack.dir(path, { exists: false });

console.log('Testing scattered-store performance: ' + numberOfOperations +
            ' items, ' + (itemSize / 1024) + 'KB each, ' +
            Math.round(numberOfOperations * itemSize / (1024 * 1024)) +
            'MB combined.');

var store = scatteredStore.create(path, function (err) {
    if (!err) {
        run();
    }
});

var run = function () {
    
    start('set...');
    
    for (var i = 0; i < numberOfOperations; i += 1) {
        store.set(generateKey(), testObj)
    }
    
    // order of operations is preserved,
    // so we know that after finish of this one all are finished
    store.set(generateKey(), testObj)
    .then(function () {
        
        stop(); 
        start('get...');
        
        for (var i = 0; i < keys.length; i += 1) {
            store.get(keys[i])
        }
        
        return store.get("none");
    })
    .then(function () {
        
        stop(); 
        start('getAll...');
        
        var deferred = Q.defer();
        
        var stream = store.getAll()
        .on('readable', function () {
            stream.read();
        })
        .on('end', deferred.resolve);
        
        return deferred.promise;
    })
    .then(function () {
        
        stop();
        start('delete...');
        
        for (var i = 0; i < keys.length; i += 1) {
            store.delete(keys[i])
        }
        
        return store.delete("none");
    })
    .then(function () {
        
        stop();
        
        // clean after benchmark
        jetpack.dir(path, { exists: false });
    });
};