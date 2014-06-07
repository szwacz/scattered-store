"use strict";

var os = require('os');
var scatteredStore = require('..');
var jetpack = require('fs-jetpack');

var path = os.tmpdir() + '/scattered-store-benchmark';

var numberOfOperations = 5000;

var store;
var startTime;
var keys = [];
var testObj = {
    name: "John Doe",
    age: 123,
    born: new Date(),
    likes: ['apple', 'banana']
};

function generateKey() {
    var key = "key" + keys.length.toString();
    keys.push(key);
    return key;
}

function start(message) {
    process.stdout.write(message);
    startTime = Date.now();
}

function stop() {
    var endTime = Date.now();
    var duration = (endTime - startTime) / 1000;
    var opsPerSec = Math.round(numberOfOperations / duration);
    console.log(opsPerSec + " ops/s");
}

// clean before benchmark
jetpack.dir(path, { exists: false });

console.log('Testing scattered-store performance.');

scatteredStore.create(path)
.then(function (createdStore) {
    store = createdStore;
    
    start('Write speed... ');
    
    for (var i = 0; i < numberOfOperations; i += 1) {
        store.set(generateKey(), testObj)
    }
    
    // order of operations is preserved,
    // so we know that after finish of this one all are finished
    return store.set(generateKey(), testObj);
})
.then(function () {
    
    stop(); 
    start('Read speed... ');
    
    for (var i = 0; i < keys.length; i += 1) {
        store.get(keys[i])
    }
    
    return store.get("none");
})
.then(function () {
    
    stop();
    start('Deletion speed... ');
    
    for (var i = 0; i < keys.length; i += 1) {
        store.del(keys[i])
    }
    
    return store.del("none");
})
.then(function () {
    
    stop();
    
    // clean after benchmark
    jetpack.dir(path, { exists: false });
});
