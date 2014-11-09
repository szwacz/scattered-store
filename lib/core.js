"use strict";

var Q = require('q');
var PassThrough = require('stream').PassThrough;
var persistence = require('./persistence');

var examineKey = function (key) {
    if (persistence.isValidKey(key) === false) {
        throw new Error('Unsupported key type');
    }
};

var examineKeyList = function (list) {
    if (Array.isArray(list)) {
        var areValuesOk = list.reduce(function (previousValue, currentValue) {
            if (previousValue === false || persistence.isValidKey(currentValue) === false) {
                return false;
            }
            return true;
        }, true);
        if (areValuesOk) {
            return;
        }
    }
    throw new Error('Malformed array of keys');
};

module.exports.create = function (storageDirPath, callback) {
    
    // ---------------------------------------------
    // Initialization
    
    var readyToWork = false;
    callback = callback || function () {};
    
    var pers = persistence.create(storageDirPath, function (err) {
        if (err) {
            callback(err);
        } else {
            readyToWork = true;
            callback();
            runNextTask();
        }
    });
    
    // ---------------------------------------------
    // Queue of tasks
    
    var tasks = [];
    var waitingForIdle = [];
    var runningTask = null;
    
    var runNextTask = function () {
        if (!readyToWork || runningTask !== null) {
            return;
        }
        if (tasks.length === 0) {
            // All tasks executed, so entering "idle" mode.
            informAllWaitingForIdle();
            return;
        }
        
        runningTask = tasks.shift();
        var asyncInterface = runningTask.fn.apply(null, runningTask.args);
        switch (runningTask.fn.asyncInterfaceType) {
            case 'stream':
                asyncInterface.pipe(runningTask.stream);
                asyncInterface.on('end', function () {
                    runningTask = null;
                    runNextTask();
                });
                break;
            case 'promise':
                asyncInterface.then(function () {
                    runningTask.deferred.resolve.apply(null, arguments);
                })
                .catch(function () {
                    runningTask.deferred.reject.apply(null, arguments);
                })
                .finally(function () {
                    runningTask = null;
                    runNextTask();
                });
                break;
        }
    };
    
    var addToQueue = function (fn, args) {
        var ret;
        var task = {
            fn: fn,
            args: args,
        };
        
        if (fn.asyncInterfaceType === 'stream') {
            task.stream = new PassThrough({ objectMode: true });
            ret = task.stream;
        } else {
            task.deferred = Q.defer();
            ret = task.deferred.promise;
        }
        
        tasks.push(task);
        
        runNextTask();
        
        return ret;
    };
    
    var informAllWaitingForIdle = function () {
        while (waitingForIdle.length > 0) {
            waitingForIdle.pop().resolve();
        }
    };
    
    // ---------------------------------------------
    // API
    
    var get = function (key) {
        examineKey(key);
        return addToQueue(pers.get, [key]);
    };
    
    var getMany = function (keys) {
        examineKeyList(keys);
        return addToQueue(pers.getMany, [keys]);
    };
    
    var getAll = function () {
        return addToQueue(pers.getAll, []);
    };
    
    var set = function (key, value) {
        examineKey(key);
        return addToQueue(pers.set, [key, value]);
    };
    
    var del = function (key) {
        examineKey(key);
        return addToQueue(pers.del, [key]);
    };
    
    var whenIdle = function () {
        var deferred = Q.defer();
        waitingForIdle.push(deferred);
        runNextTask();
        return deferred.promise; 
    };
    
    return {
        set: set,
        get: get,
        getMany: getMany,
        getAll: getAll,
        delete: del,
        whenIdle: whenIdle,
    };
};
