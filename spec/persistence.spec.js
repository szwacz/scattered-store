/* eslint-env jasmine */

const pathUtil = require('path');
const jetpack = require('fs-jetpack');
const scatteredStore = require('..');
const utils = require('./utils');

describe('persistence', () => {
  beforeEach(utils.beforeEach);
  afterEach(utils.afterEach);

  const testDir = pathUtil.resolve(utils.workingDir, 'test');

  it('persists data in "Git Objects" like structure', (done) => {
    const store = scatteredStore.create(testDir);
    store.set('abc', '123')
    .then(() => {
      // Key 'abc' hashed with sha1: 'a9993e364706816aba3e25717850c26c9cd0d89d'
      const path = jetpack.path(testDir, 'a9', '993e364706816aba3e25717850c26c9cd0d89d');
      expect(jetpack.exists(path)).toBe('file');
      done();
    });
  });

  it('getAll can deal with empty subdirectories inside storage directory', (done) => {
    // Manually add empty subdirectory. It could happen if
    // we deleted all items from there.
    jetpack.cwd(testDir).dir('af');

    let count = 0;
    const store = scatteredStore.create(testDir);
    store.set('abc', '123')
    .then(() => {
      const stream = store.getAll();
      stream.on('readable', () => {
        const itemFromStore = stream.read();
        if (itemFromStore !== null) {
          expect(itemFromStore).toEqual({ key: 'abc', value: '123' });
          count += 1;
        }
      });
      stream.on('end', () => {
        expect(count).toBe(1);
        done();
      });
    });
  });
});
