// Parallel transform stream. Gets the path to file and returns content of this file processed with decoderFn.

'use strict';

var Transform = require('stream').Transform;
var util = require('util');
var jetpack = require('fs-jetpack');

var ParallelReader = function(maxParallel, decodeDataFn) {
    Transform.call(this, {
        highWaterMark: maxParallel,
        objectMode: true
    });
    this._running = 0;
    this._maxParallel = maxParallel;
    this._decodeDataFn = decodeDataFn;
};

util.inherits(ParallelReader, Transform);

ParallelReader.prototype._transform = function(item, enc, callback) {
    var path;
    var that = this;
    this._running += 1;
    
    if (typeof item === 'string') {
        // Given item is just path to file
        path = item;
    } else {
        // Given item is an object with pair "key, path"
        path = item.path;
    }
    
    jetpack.readAsync(path, 'buf', { safe: true })
    .then(function (buf) {
        that._running -= 1;
        
        if (Buffer.isBuffer(buf)) {
            that.push(that._decodeDataFn(buf));
        } else {
            // There is no such key in datastore
            that.push({ key: item.key, value: null });
        }
        
        if (callback) {
            callback();
        }
        
        if (that._running === 0 && that._done) {
            that._done();
        }
    }); 
    
    if (this._running < this._maxParallel) {
        callback();
        callback = null;
    }
};

ParallelReader.prototype._flush = function(callback) {
    if (this._running === 0) {
        callback();
    } else {
        this._done = callback;
    }
};

module.exports = ParallelReader;