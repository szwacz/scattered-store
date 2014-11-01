// Simple concurrent file reader

'use strict';

var jetpack = require('fs-jetpack');

module.exports = function (itemCallback, doneCallback) {
    
    var maxConcurrentOps = 10;
    var runningOps = 0;
    var paths = [];
    var pathsListClosed = false;
    
    var areWeDone = function () {
        return pathsListClosed && paths.length === 0 && runningOps === 0;
    };
    
    var readOne = function (path) {
        runningOps += 1;
        
        jetpack.readAsync(path, 'buf', { safe: true })
        .then(function (buf) {
            itemCallback(buf);
            
            runningOps -= 1;
            if (areWeDone()) {
                doneCallback();
            } else {
                launchMaxOps();
            }
        });
    };
    
    var launchMaxOps = function () {
        while (paths.length > 0 && runningOps < maxConcurrentOps) {
            readOne(paths.pop());
        }
    }
    
    var addPath = function (path) {
        paths.push(path);
        launchMaxOps();
    };
    
    var noMorePathsForYou = function () {
        pathsListClosed = true;
        if (areWeDone()) {
            doneCallback();
        }
    };
    
    return {
        addPath: addPath,
        noMorePathsForYou: noMorePathsForYou,
    }
};