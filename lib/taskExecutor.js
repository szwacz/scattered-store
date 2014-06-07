"use strict";

var entriesManager = require('./entriesManager');

module.exports.create = function (storageDir) {
    
    var em = entriesManager.create(storageDir);
    
    function runTask (task) {
        
        var tasksMap = {
            "set": function () {
                return em.set(task.key, task.value);
            },
            "get": function () {
                return em.get(task.key);
            },
            "del": function () {
                return em.del(task.key);
            }
        };
        
        tasksMap[task.type]()
        .then(task.deferred.resolve, task.deferred.reject);
    }
    
    return {
        runTask: runTask
    };
};
