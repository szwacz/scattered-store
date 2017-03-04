const Q = require('q');
const crypto = require('crypto');
const jetpack = require('fs-jetpack');
const ItemGiver = require('./giver');
const DirLister = require('./lister');
const ParallelReader = require('./reader');

const newLineCode = 10; // '\n' character

const dateParser = function (key, value) {
  const reISO = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/;
  if (typeof value === 'string') {
    if (reISO.exec(value)) {
      return new Date(value);
    }
  }
  return value;
};

const encodeForStorage = function (key, value) {
  let type;
  let data;

  if (Buffer.isBuffer(value)) {
    type = 'binary';
    data = value;
  } else {
    type = 'json';
    data = new Buffer(JSON.stringify(value));
  }

  const fileHeaderStr = JSON.stringify({
    type,
    key,
  });
  const fileHeader = new Buffer(fileHeaderStr + String.fromCharCode(newLineCode));

  return Buffer.concat([fileHeader, data]);
};

const decodeFromStorage = function (buf) {
  // Extract file header
  let i = 0;
  while (i < buf.length) {
    if (buf[i] === newLineCode) {
      break;
    }
    i += 1;
  }
  const fileHeaderBuf = buf.slice(0, i);
  const fileHeader = JSON.parse(fileHeaderBuf.toString());

  const dataBuf = buf.slice(i + 1); // Skip the new line character...
  // ... and everything after new line is data:

  const entry = {
    key: fileHeader.key,
  };

  if (fileHeader.type === 'binary') {
    entry.value = dataBuf;
  } else {
    entry.value = JSON.parse(dataBuf.toString(), dateParser);
  }

  return entry;
};

module.exports.isValidKey = function (key) {
  if (typeof key !== 'string' || key.length === 0) {
    return false;
  }
  return true;
};

module.exports.create = function (storageDirPath, callback) {
  // ----------------------------------------------
  // Initialization

  let storageDir;

  if (typeof storageDirPath !== 'string' || storageDirPath === '') {
    callback(new Error('Path to storage directory not specified'));
  } else {
    storageDir = jetpack.cwd(storageDirPath);
    // First check if directory exists
    storageDir.existsAsync('.')
    .then((exists) => {
      if (exists === 'file') {
        callback(new Error('Given path is a file, but directory is required for scattered-store to work'));
      } else if (exists === 'dir') {
        // Directory already exists, so just start
        callback();
      } else {
        // Directory doesn't exist, so create it
        storageDir.dirAsync('.')
        .then(() => {
          callback();
        })
        .catch(callback);
      }
    })
    .catch(callback);
  }

  // ----------------------------------------------
  // Utils

  const transformKeyToFilePath = function (key) {
    const sha = crypto.createHash('sha1');
    sha.update(key);
    const hex = sha.digest('hex');
    const dir = hex.substring(0, 2);
    const file = hex.substring(2);
    return storageDir.path(dir, file);
  };

  // ----------------------------------------------
  // Actions on storage

  const set = function (key, value) {
    const filePath = transformKeyToFilePath(key);
    const buf = encodeForStorage(key, value);
    return storageDir.writeAsync(filePath, buf, { atomic: true });
  };
  set.asyncInterfaceType = 'promise';

  const get = function (key) {
    const deferred = Q.defer();
    const filePath = transformKeyToFilePath(key);
    storageDir.readAsync(filePath, 'buf')
    .then((buf) => {
      if (buf) {
        deferred.resolve(decodeFromStorage(buf).value);
      } else {
        deferred.resolve(null);
      }
    });
    return deferred.promise;
  };
  get.asyncInterfaceType = 'promise';

  const del = function (key) {
    const deferred = Q.defer();
    const filePath = transformKeyToFilePath(key);
    storageDir.removeAsync(filePath)
    .then(() => {
      deferred.resolve();
    });
    return deferred.promise;
  };
  del.asyncInterfaceType = 'promise';

  const getMany = function (keys) {
    const filePaths = keys.map((key) => {
      return {
        key,
        path: transformKeyToFilePath(key),
      };
    });
    const giver = new ItemGiver(filePaths);
    const reader = new ParallelReader(8, decodeFromStorage);

    giver.pipe(reader);

    return reader;
  };
  getMany.asyncInterfaceType = 'stream';

  const getAll = function () {
    const lister = new DirLister(storageDir.path());
    const reader = new ParallelReader(8, decodeFromStorage);

    lister.pipe(reader);

    return reader;
  };
  getAll.asyncInterfaceType = 'stream';

  return {
    set,
    get,
    getMany,
    getAll,
    del,
  };
};
