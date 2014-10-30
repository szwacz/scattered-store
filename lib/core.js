"use strict";

var Q = require('q');
var taskExecutor = require('./task_executor');
var entriesManager = require('./entries_manager');

var examineKey = function (key) {
    if (entriesManager.isValidKey(key) === false) {
        throw new Error('Unsupported key type.');
    }
};

module.exports = function (storageDirPath) {
    
    var executor = taskExecutor.create(storageDirPath);
    
    // ---------------------------------------------
    // Queue of tasks
    
    var tasks = [];
    var runningTask = null;
    
    var runNextTask = function () {
        if (runningTask !== null || tasks.length === 0) {
            return;
        }
        runningTask = tasks.shift();
        runningTask.deferred.promise.then(taskDone, taskDone);
        executor.runTask(runningTask);
    };
    
    var taskDone = function () {
        runningTask = null;
        runNextTask();
    };
    
    var addToQueue = function (task) {
        task.deferred = Q.defer();
        tasks.push(task);
        
        runNextTask();
        
        return task.deferred.promise;
    };
    
    // ---------------------------------------------
    // API
    
    var get = function (key) {
        examineKey(key);
        
        return addToQueue({
            type: "get",
            key: key
        });
    };
    
    var set = function (key, value) {
        examineKey(key);
        
        var supportedValueType = false;
        if (value !== null && typeof value === 'object') {
            supportedValueType = true;
        } else if (Buffer.isBuffer(value)) {
            supportedValueType = true;
        }
        if (!supportedValueType) {
            throw new Error('Unsupported value type.');
        }
        
        return addToQueue({
            type: "set",
            key: key,
            value: value
        });
    };
    
    var del = function (key) {
        examineKey(key);
        
        return addToQueue({
            type: "del",
            key: key
        });
    };
    
    return {
        get: get,
        set: set,
        del: del,
    };
};
