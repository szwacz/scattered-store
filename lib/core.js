"use strict";

var Q = require('q');
var taskExecutor = require('./taskExecutor');
var entriesManager = require('./entriesManager');

function examineKey(key) {
    if (entriesManager.isValidKey(key) === false) {
        throw new Error('Unsupported key type.');
    }
}

module.exports = function (storageDirPath) {
    
    var executor = taskExecutor.create(storageDirPath);
    
    // ---------------------------------------------
    // Queue of tasks
    
    var tasks = [];
    var runningTask = null;
    
    function runNextTask() {
        if (runningTask !== null || tasks.length === 0) {
            return;
        }
        runningTask = tasks.shift();
        runningTask.deferred.promise.then(taskDone, taskDone);
        executor.runTask(runningTask);
    }
    
    function taskDone() {
        runningTask = null;
        runNextTask();
    }
    
    function addToQueue(task) {
        task.deferred = Q.defer();
        tasks.push(task);
        
        runNextTask();
        
        return task.deferred.promise;
    }
    
    // ---------------------------------------------
    // API
    
    function get(key) {
        examineKey(key);
        
        return addToQueue({
            type: "get",
            key: key
        });
    }
    
    function set(key, value) {
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
    }
    
    function del(key) {
        examineKey(key);
        
        return addToQueue({
            type: "del",
            key: key
        });
    }
    
    return {
        get: get,
        set: set,
        del: del
    };
};
