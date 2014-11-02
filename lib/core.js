"use strict";

var Q = require('q');
var PassThrough = require('stream').PassThrough;
var persistence = require('./persistence');

var examineKey = function (key) {
    if (persistence.isValidKey(key) === false) {
        throw new Error('Unsupported key type.');
    }
};

module.exports = function (storageDirPath) {
    
    // ---------------------------------------------
    // Queue of tasks
    
    var tasks = [];
    var runningTask = null;
    var pers = persistence.create(storageDirPath);
    
    var runNextTask = function () {
        if (runningTask !== null || tasks.length === 0) {
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
    
    // ---------------------------------------------
    // API
    
    var get = function (key) {
        examineKey(key);
        return addToQueue(pers.get, [key]);
    };
    
    var set = function (key, value) {
        examineKey(key);
        return addToQueue(pers.set, [key, value]);
    };
    
    var del = function (key) {
        examineKey(key);
        return addToQueue(pers.del, [key]);
    };
    
    var all = function () {
        return addToQueue(pers.all, []);
    };
    
    return {
        get: get,
        set: set,
        del: del,
        all: all,
    };
};
