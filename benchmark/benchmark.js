/* eslint no-console:off */

const os = require('os');
const Q = require('q');
const _ = require('underscore');
const jetpack = require('fs-jetpack');

const scatteredStore = require('..');
const path = `${os.tmpdir()}/scattered-store-benchmark`;
let store;

const itemsTotal = 100000;
const readsPerTest = 10000;
const itemSize = 1000 * 25;

let keys = [];
const testObj = new Buffer(itemSize);

const generateKey = () => {
  const key = `key${keys.length.toString()}`;
  keys.push(key);
  return key;
};

const start = (message, totalOps) => {
  const startTime = Date.now();
  let doneOps = 0;
  let currPerc;

  const progress = (moreDone) => {
    doneOps += moreDone;
    const perc = Math.floor((doneOps / totalOps) * 100);
    if (currPerc !== perc) {
      currPerc = perc;
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(`${message} [${currPerc}%]`);
    }
  };

  const stop = () => {
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    const opsPerSec = Math.round(totalOps / duration);
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    console.log(`${message} ${opsPerSec} items/s`);
  };

  progress(0);

  return {
    progress,
    stop,
  };
};

const prepare = () => {
  const deferred = Q.defer();

  jetpack.remove(path);

  console.log('Testing scattered-store performance: '
    + `${itemsTotal} items ${itemSize / 1000}KB each, `
    + `${((itemsTotal * itemSize) / (1000 * 1000 * 1000)).toFixed(1)}GB combined.`);

  store = scatteredStore.create(path, (err) => {
    if (err) {
      console.log(err);
      deferred.reject();
    } else {
      deferred.resolve();
    }
  });

  return deferred.promise;
};

const testSet = () => {
  const test = start('set', itemsTotal);
  const deferred = Q.defer();
  const oneMore = () => {
    if (keys.length < itemsTotal) {
      store.set(generateKey(), testObj)
      .then(() => {
        test.progress(1);
        oneMore();
      });
    } else {
      test.stop();
      // After finished insertion shuffle keys array to simulate
      // random access to stored entries.
      keys = _.shuffle(keys);
      deferred.resolve();
    }
  };
  oneMore();
  return deferred.promise;
};

const testGet = () => {
  const test = start('get', readsPerTest);
  const deferred = Q.defer();
  let i = 0;
  const oneMore = () => {
    if (i < readsPerTest) {
      store.get(keys[i])
      .then(() => {
        test.progress(1);
        oneMore();
      });
    } else {
      test.stop();
      deferred.resolve();
    }
    i += 1;
  };
  oneMore();
  return deferred.promise;
};

const testGetMany = () => {
  const test = start('getMany', readsPerTest);
  const deferred = Q.defer();
  const stream = store.getMany(keys.slice(0, readsPerTest))
  .on('readable', () => {
    stream.read();
    test.progress(1);
  })
  .on('error', deferred.reject)
  .on('end', () => {
    test.stop();
    deferred.resolve();
  });
  return deferred.promise;
};

const testGetAll = () => {
  const test = start('getAll', keys.length);
  const deferred = Q.defer();
  const stream = store.getAll()
  .on('readable', () => {
    stream.read();
    test.progress(1);
  })
  .on('end', () => {
    test.stop();
    deferred.resolve();
  });
  return deferred.promise;
};

const testDelete = () => {
  const test = start('delete', keys.length);
  const deferred = Q.defer();
  let i = 0;
  const oneMore = () => {
    if (i < keys.length) {
      store.delete(keys[i])
      .then(() => {
        test.progress(1);
        oneMore();
      });
    } else {
      test.stop();
      deferred.resolve();
    }
    i += 1;
  };
  oneMore();
  return deferred.promise;
};

const clean = () => {
  jetpack.remove(path);
};

prepare()
.then(testSet)
.then(testGet)
.then(testGetMany)
.then(testGetAll)
.then(testDelete)
.then(clean);
