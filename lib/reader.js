// Parallel transform stream. Gets the path to file and returns content of this file processed with decoderFn.

'use strict';

var transform = require('parallel-transform');
var jetpack = require('fs-jetpack');

module.exports = function (decoderFn) {
    return transform(5, { objectMode: true }, function(path, done) {
        jetpack.readAsync(path, 'buf', { safe: true })
        .then(function (buf) {
            done(null, decoderFn(buf));
        }); 
    });
};