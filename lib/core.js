const Q = require('q');
const PassThrough = require('stream').PassThrough;
const persistence = require('./persistence');

const examineKey = (key) => {
  if (persistence.isValidKey(key) === false) {
    throw new Error('Unsupported key type');
  }
};

const examineKeyList = (list) => {
  if (Array.isArray(list)) {
    const areValuesOk = list.reduce((previousValue, currentValue) => {
      if (previousValue === false || persistence.isValidKey(currentValue) === false) {
        return false;
      }
      return true;
    }, true);
    if (areValuesOk) {
      return;
    }
  }
  throw new Error('Malformed array of keys');
};

module.exports.create = (storageDirPath, cb) => {
  const callback = cb || function () {};
  const tasks = [];
  const waitingForIdle = [];
  let readyToWork = false;
  let runningTask = null;

  const informAllWaitingForIdle = function () {
    while (waitingForIdle.length > 0) {
      waitingForIdle.pop().resolve();
    }
  };

  const runNextTask = function () {
    if (!readyToWork || runningTask !== null) {
      return;
    }
    if (tasks.length === 0) {
      // All tasks executed, so entering "idle" mode.
      informAllWaitingForIdle();
      return;
    }

    runningTask = tasks.shift();
    const asyncInterface = runningTask.fn.apply(null, runningTask.args);
    switch (runningTask.fn.asyncInterfaceType) {
      case 'stream':
        asyncInterface.pipe(runningTask.stream);
        asyncInterface.on('end', () => {
          runningTask = null;
          runNextTask();
        });
        break;
      case 'promise':
        asyncInterface.then(function () {
          runningTask.deferred.resolve.apply(null, arguments);
        })
        .catch(function () {
          runningTask.deferred.reject.apply(null, arguments);
        })
        .finally(() => {
          runningTask = null;
          runNextTask();
        });
        break;
      default:
        throw new Error('Unknown interface');
    }
  };

  const addToQueue = function (fn, args) {
    let ret;
    const task = {
      fn,
      args,
    };

    if (fn.asyncInterfaceType === 'stream') {
      task.stream = new PassThrough({ objectMode: true });
      ret = task.stream;
    } else {
      task.deferred = Q.defer();
      ret = task.deferred.promise;
    }

    tasks.push(task);

    runNextTask();

    return ret;
  };

  // ---------------------------------------------
  // Initialization

  const pers = persistence.create(storageDirPath, (err) => {
    if (err) {
      callback(err);
    } else {
      readyToWork = true;
      callback();
      runNextTask();
    }
  });

  // ---------------------------------------------
  // API

  const get = function (key) {
    examineKey(key);
    return addToQueue(pers.get, [key]);
  };

  const getMany = function (keys) {
    examineKeyList(keys);
    return addToQueue(pers.getMany, [keys]);
  };

  const getAll = function () {
    return addToQueue(pers.getAll, []);
  };

  const set = function (key, value) {
    examineKey(key);
    return addToQueue(pers.set, [key, value]);
  };

  const del = function (key) {
    examineKey(key);
    return addToQueue(pers.del, [key]);
  };

  const whenIdle = function () {
    const deferred = Q.defer();
    waitingForIdle.push(deferred);
    runNextTask();
    return deferred.promise;
  };

  return {
    set,
    get,
    getMany,
    getAll,
    delete: del,
    whenIdle,
  };
};
