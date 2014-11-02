// Parallel transform stream. Gets the path to file and returns content of this file processed with decoderFn.

'use strict';

var Transform = require('stream').Transform;
var util = require('util');
var jetpack = require('fs-jetpack');

var ParallelReader = function(maxParallel, decoderFn) {
    Transform.call(this, {
        highWaterMark: maxParallel,
        objectMode: true
    });
    this._running = 0;
    this._maxParallel = maxParallel;
    this._decoderFn = decoderFn;
};

util.inherits(ParallelReader, Transform);

ParallelReader.prototype._transform = function(path, enc, callback) {
    var that = this;
    this._running += 1;
    
    jetpack.readAsync(path, 'buf', { safe: true })
    .then(function (buf) {
        that._running -= 1;
        
        that.push(that._decoderFn(buf));
        
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