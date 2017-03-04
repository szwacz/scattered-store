// Readable stream. Discovers all file paths inside storage folder.

const Readable = require('stream').Readable;
const util = require('util');
const jetpack = require('fs-jetpack');
const Q = require('q');

const Lister = function (basePath) {
  Readable.call(this, { objectMode: true });
  this._basePath = basePath;
  this._subdirsToGo = null;
  this._pathsToGive = [];
};

util.inherits(Lister, Readable);

Lister.prototype._loadMorePaths = function () {
  const deferred = Q.defer();

  const listNextSubdir = () => {
    if (this._subdirsToGo.length === 0) {
      // No more directories to list!
      deferred.reject('endOfPaths');
    } else {
      const subdir = this._subdirsToGo.pop();
      const path = jetpack.path(this._basePath, subdir);
      jetpack.listAsync(path)
      .then((filenames) => {
        // Generate absolute paths from filenames.
        this._pathsToGive = filenames.map((filename) => {
          return jetpack.path(path, filename);
        });
        if (this._pathsToGive.length > 0) {
          // Yep. We have paths. Done!
          deferred.resolve();
        } else {
          // This directory was apparently empty. Go for next one.
          listNextSubdir();
        }
      });
    }
  };

  if (this._subdirsToGo === null) {
    jetpack.listAsync(this._basePath)
    .then((dirs) => {
      this._subdirsToGo = dirs;
      listNextSubdir();
    });
  } else {
    listNextSubdir();
  }

  return deferred.promise;
};

Lister.prototype._read = function () {
  if (this._pathsToGive.length > 0) {
    this.push(this._pathsToGive.pop());
  } else {
    this._loadMorePaths()
    .then(() => {
      this.push(this._pathsToGive.pop());
    })
    .catch((err) => {
      if (err === 'endOfPaths') {
        this.push(null);
      }
    });
  }
};

module.exports = Lister;
