/* eslint-env jasmine */

const _ = require('underscore');
const pathUtil = require('path');
const scatteredStore = require('..');
const utils = require('./utils');

describe('api', () => {
  beforeEach(utils.beforeEach);
  afterEach(utils.afterEach);

  const testDir = pathUtil.resolve(utils.workingDir, 'test');

  describe('get & set', () => {
    it('writes and reads string', (done) => {
      const key = 'ąż'; // utf8 test
      const value = 'ąćłźż'; // utf8 test
      const store = scatteredStore.create(testDir);
      store.set(key, value)
      .then(() => {
        return store.get(key);
      })
      .then((valueFromStore) => {
        expect(valueFromStore).toEqual(value);
        done();
      });
    });

    it('writes and reads object', (done) => {
      const key = 'ąż'; // utf8 test
      const value = {
        a: 'ąćłźż', // utf8 test
        now: new Date(), // can handle date object
      };
      const store = scatteredStore.create(testDir);
      store.set(key, value)
      .then(() => {
        return store.get(key);
      })
      .then((valueFromStore) => {
        expect(valueFromStore).toEqual(value);
        done();
      });
    });

    it('writes and reads array', (done) => {
      const key = 'a';
      const value = [1, 2, 3];
      const store = scatteredStore.create(testDir);
      store.set(key, value)
      .then(() => {
        return store.get(key);
      })
      .then((valueFromStore) => {
        expect(valueFromStore).toEqual(value);
        done();
      });
    });

    it('writes and reads binary data', (done) => {
      const key = 'a';
      const value = new Buffer([123]);
      const store = scatteredStore.create(testDir);
      store.set(key, value)
      .then(() => {
        return store.get(key);
      })
      .then((valueFromStore) => {
        expect(Buffer.isBuffer(valueFromStore)).toBe(true);
        expect(valueFromStore[0]).toBe(123);
        expect(valueFromStore.length).toBe(1);
        done();
      });
    });

    it("returns null if key doesn't exist", (done) => {
      const key = 'a';
      const store = scatteredStore.create(testDir);
      store.get(key)
      .then((valueFromStore) => {
        expect(valueFromStore).toBe(null);
        done();
      });
    });

    it('throws if key of length 0', (done) => {
      const value = { a: 'a' };
      const err = new Error('Unsupported key type');
      const store = scatteredStore.create(testDir, () => {
        done();
      });

      expect(() => {
        store.get('');
      }).toThrow(err);

      expect(() => {
        store.set('', value);
      }).toThrow(err);
    });

    it('throws if key of different type than string', (done) => {
      const value = { a: 'a' };
      const err = new Error('Unsupported key type');
      const store = scatteredStore.create(testDir, () => {
        done();
      });

      expect(() => {
        store.get(null);
      }).toThrow(err);
      expect(() => {
        store.get(123);
      }).toThrow(err);
      expect(() => {
        store.get({});
      }).toThrow(err);

      expect(() => {
        store.set(null, value);
      }).toThrow(err);
      expect(() => {
        store.set(123, value);
      }).toThrow(err);
      expect(() => {
        store.set({}, value);
      }).toThrow(err);
    });
  });

  describe('delete', () => {
    it('can delete value for a key', (done) => {
      const key = 'a';
      const value = { a: 'a' };
      const store = scatteredStore.create(testDir);
      store.set(key, value)
      .then(() => {
        return store.delete(key);
      })
      .then(() => {
        return store.get(key);
      })
      .then((valueFromStore) => {
        expect(valueFromStore).toBe(null);
        done();
      });
    });

    it('attempt to delete non-existent key does nothing', (done) => {
      scatteredStore.create(testDir)
      .delete('none')
      .then(() => {
        done();
      });
    });
  });

  describe('getMany', () => {
    it('throws if different argument than array passed', (done) => {
      const err = new Error('Malformed array of keys');
      const store = scatteredStore.create(testDir, () => {
        done();
      });

      expect(() => {
        store.getMany();
      }).toThrow(err);
      expect(() => {
        store.getMany('abc');
      }).toThrow(err);
      expect(() => {
        store.getMany(['abc', 123]);
      }).toThrow(err);
    });

    it('terminates gracefully when empty collection passed', (done) => {
      scatteredStore.create(testDir)
      .getMany([])
      .on('end', () => {
        done();
      })
      .resume();
    });

    it('gives back entries with passed keys', (done) => {
      let count = 0;
      const dataset = [
        { key: 'a', value: '1' },
        { key: 'c', value: '3' },
      ];

      const store = scatteredStore.create(testDir);
      store.set('b', '2'); // Should not be returned, although is in collection.
      store.set(dataset[0].key, dataset[0].value);
      store.set(dataset[1].key, dataset[1].value)
      .then(() => {
        const stream = store.getMany(['a', 'c']);
        stream.on('readable', () => {
          const itemFromStore = stream.read();
          if (itemFromStore !== null) {
            const item = _.findWhere(dataset, itemFromStore);
            expect(item).toBeDefined();
            count += 1;
          }
        });
        stream.on('end', () => {
          expect(count).toBe(dataset.length);
          done();
        });
      });
    });

    it('gives null for nonexistent key', (done) => {
      let deliveredItem;
      const store = scatteredStore.create(testDir);
      const stream = store.getMany(['nonexistent']);
      stream.on('readable', () => {
        const data = stream.read();
        if (data !== null) {
          deliveredItem = data;
          expect(deliveredItem).toEqual({ key: 'nonexistent', value: null });
        }
      });
      stream.on('end', () => {
        expect(deliveredItem).toBeDefined();
        done();
      });
    });
  });

  describe('getAll', () => {
    it('terminates gracefully when store empty', (done) => {
      scatteredStore.create(testDir)
      .getAll()
      .on('end', () => {
        done();
      })
      .resume();
    });

    it('iterates through all stored entries', (done) => {
      let count = 0;
      const dataset = [
        { key: 'a', value: '1' },
        { key: 'b', value: '2' },
        { key: 'c', value: '3' },
      ];

      const store = scatteredStore.create(testDir);
      store.set(dataset[0].key, dataset[0].value);
      store.set(dataset[1].key, dataset[1].value);
      store.set(dataset[2].key, dataset[2].value)
      .then(() => {
        const stream = store.getAll();
        stream.on('readable', () => {
          const itemFromStore = stream.read();
          if (itemFromStore) {
            const item = _.findWhere(dataset, itemFromStore);
            expect(item).toBeDefined();
            count += 1;
          }
        });
        stream.on('end', () => {
          expect(count).toBe(dataset.length);
          done();
        });
      });
    });
  });

  describe('write edge cases', () => {
    it('can write empty string', (done) => {
      const key = 'a';
      const value = '';
      const store = scatteredStore.create(testDir);
      store.set(key, value)
      .then(() => {
        return store.get(key);
      })
      .then((valueFromStore) => {
        expect(valueFromStore).toEqual(value);
        done();
      });
    });

    it('can write empty object', (done) => {
      const key = 'a';
      const value = {};
      const store = scatteredStore.create(testDir);
      store.set(key, value)
      .then(() => {
        return store.get(key);
      })
      .then((valueFromStore) => {
        expect(valueFromStore).toEqual({});
        done();
      });
    });

    it('can write empty array', (done) => {
      const key = 'a';
      const value = [];
      const store = scatteredStore.create(testDir);
      store.set(key, value)
      .then(() => {
        return store.get(key);
      })
      .then((valueFromStore) => {
        expect(valueFromStore).toEqual([]);
        done();
      });
    });

    it('can write buffer of length 0', (done) => {
      const key = 'a';
      const value = new Buffer(0);
      const store = scatteredStore.create(testDir);
      store.set(key, value)
      .then(() => {
        return store.get(key);
      })
      .then((valueFromStore) => {
        expect(Buffer.isBuffer(valueFromStore)).toBe(true);
        expect(valueFromStore.length).toBe(0);
        done();
      });
    });
  });

  describe('preventing data loss', () => {
    it('whenIdle fires when all tasks done', (done) => {
      let setCallbackFired = false;
      const store = scatteredStore.create(testDir);
      store.set('abc', '123')
      .then(() => {
        setCallbackFired = true;
      });
      store.whenIdle()
      .then(() => {
        expect(setCallbackFired).toBe(true);
        done();
      });
    });

    it('whenIdle is called if already idle', (done) => {
      const store = scatteredStore.create(testDir, () => {
        // Wait for next event loop, to make sure nothing at all is happening.
        setTimeout(() => {
          store.whenIdle()
          .then(() => {
            done();
          });
        }, 0);
      });
    });
  });
});
