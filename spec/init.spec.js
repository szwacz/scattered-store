/* eslint-env jasmine */

const scatteredStore = require('..');
const utils = require('./utils');
const pathUtil = require('path');
const jetpack = require('fs-jetpack');

describe('initialization', () => {
  beforeEach(utils.beforeEach);
  afterEach(utils.afterEach);

  const testDir = pathUtil.resolve(utils.workingDir, 'test');

  it('rejects if storage directory path not specified', (done) => {
    scatteredStore.create(undefined, (err) => {
      expect(err.message).toEqual('Path to storage directory not specified');
      done();
    });
  });

  it('rejects if storage directory path empty', (done) => {
    scatteredStore.create('', (err) => {
      expect(err.message).toEqual('Path to storage directory not specified');
      done();
    });
  });

  it('rejects if storage path is a file', (done) => {
    const anyFile = pathUtil.resolve(utils.workingDir, 'any.txt');
    jetpack.file(anyFile);
    scatteredStore.create(anyFile, (err) => {
      expect(err.message).toEqual('Given path is a file, but directory is required for scattered-store to work');
      done();
    });
  });

  it("creates storage directory if it doesn't exist", (done) => {
    expect(jetpack.exists(testDir)).toBe(false);
    scatteredStore.create(testDir, (err) => {
      expect(err).toBeUndefined();
      expect(jetpack.exists(testDir)).toBe('dir');
      done();
    });
  });
});
