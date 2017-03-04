// Parallel transform stream. Gets the path to file and returns
// content of this file processed with decodeDataFn.

const Transform = require('stream').Transform;
const util = require('util');
const jetpack = require('fs-jetpack');

const ParallelReader = function (maxParallel, decodeDataFn) {
  Transform.call(this, {
    highWaterMark: maxParallel,
    objectMode: true,
  });
  this._running = 0;
  this._maxParallel = maxParallel;
  this._decodeDataFn = decodeDataFn;
};

util.inherits(ParallelReader, Transform);

ParallelReader.prototype._transform = function (item, enc, cb) {
  let callback = cb;
  let path;
  const that = this;
  this._running += 1;

  if (typeof item === 'string') {
    // Given item is just path to file
    path = item;
  } else {
    // Given item is an object with pair "key, path"
    path = item.path;
  }

  jetpack.readAsync(path, 'buf')
  .then((buf) => {
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

ParallelReader.prototype._flush = function (callback) {
  if (this._running === 0) {
    callback();
  } else {
    this._done = callback;
  }
};

module.exports = ParallelReader;
