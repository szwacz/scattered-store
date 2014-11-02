// Transform stream. Gets the path to file and returns content of this file processed with decoderFn.

'use strict';

var Transform = require('stream').Transform;
var util = require('util');
var jetpack = require('fs-jetpack');

var Reader = function (decoderFn) {
    Transform.call(this, { objectMode: true });
    this._decoderFn = decoderFn;
};

util.inherits(Reader, Transform);

Reader.prototype._transform = function (path, encoding, done) {
    var that = this;
    
    jetpack.readAsync(path, 'buf', { safe: true })
    .then(function (buf) {
        that.push(that._decoderFn(buf));
        done();
    });
};

module.exports = Reader;
