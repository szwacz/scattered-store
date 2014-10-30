"use strict";

var Q = require('q');
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
        runningTask.fn.apply(null, runningTask.args)
        .then(function () {
            runningTask.deferred.resolve.apply(null, arguments);
        })
        .catch(function () {
            runningTask.deferred.reject.apply(null, arguments);
        })
        .finally(function () {
            runningTask = null;
            runNextTask();
        });
    };
    
    var addToQueue = function (fn, args) {
        var task = {
            deferred: Q.defer(),
            fn: fn,
            args: args,
        }
        tasks.push(task);
        
        runNextTask();
        
        return task.deferred.promise;
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
    
    var each = function (fn) {
        return addToQueue(pers.each, [fn]);
    };
    
    return {
        get: get,
        set: set,
        del: del,
        each: each,
    };
};
