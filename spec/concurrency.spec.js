/* eslint-env jasmine */

const pathUtil = require('path');
const scatteredStore = require('..');
const utils = require('./utils');

describe('concurrency', () => {
  beforeEach(utils.beforeEach);
  afterEach(utils.afterEach);

  const testDir = pathUtil.resolve(utils.workingDir, 'test');

  it('does only one operation at a time, puts concurrent operations in queue', (done) => {
    const key = 'a';
    const value1 = { a: 'a' };
    const value2 = { b: 'b' };
    const value3 = { c: 'c' };

    const store = scatteredStore.create(testDir);
    let order = 0;

    store.set(key, value1);
    store.get(key)
    .then((value) => {
      expect(value).toEqual(value1);
      order += 1;
      expect(order).toBe(1);
    });

    store.set(key, value2);
    store.get(key)
    .then((value) => {
      expect(value).toEqual(value2);
      order += 1;
      expect(order).toBe(2);
    });
    store.get(key)
    .then((value) => {
      expect(value).toEqual(value2);
      order += 1;
      expect(order).toBe(3);
    });

    store.set(key, value3);
    store.get(key)
    .then((value) => {
      expect(value).toEqual(value3);
      order += 1;
      expect(order).toBe(4);
      done();
    });

    expect(order).toBe(0);
  });
});
