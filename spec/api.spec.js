"use strict";

describe('api', function () {

    var scatteredStore = require('..');
    var utils = require('./utils');
    var pathUtil = require('path');
    var jetpack = require('fs-jetpack');

    beforeEach(utils.beforeEach);
    afterEach(utils.afterEach);

    var testDir = pathUtil.resolve(utils.workingDir, 'test');

    it('writes and reads object', function (done) {
        var store;
        var key = "ąż"; // utf8 test
        var value = {
            a: "ąćłźż", // utf8 test
            now: new Date() // can handle date object
        };
        scatteredStore.create(testDir)
        .then(function (createdStore) {
            store = createdStore;
            return store.set(key, value);
        })
        .then(function () {
            return store.get(key);
        })
        .then(function (valueFromStore) {
            expect(valueFromStore).toEqual(value);
            done();
        });
    });
    
    it('writes and reads array', function (done) {
        var store;
        var key = "a";
        var value = [1, 2, 3];
        scatteredStore.create(testDir)
        .then(function (createdStore) {
            store = createdStore;
            return store.set(key, value);
        })
        .then(function () {
            return store.get(key);
        })
        .then(function (valueFromStore) {
            expect(valueFromStore).toEqual(value);
            done();
        });
    });
    
    it('writes and reads binary data', function (done) {
        var store;
        var key = "a";
        var value = new Buffer([123]);
        scatteredStore.create(testDir)
        .then(function (createdStore) {
            store = createdStore;
            return store.set(key, value);
        })
        .then(function () {
            return store.get(key);
        })
        .then(function (valueFromStore) {
            expect(Buffer.isBuffer(valueFromStore)).toBe(true);
            expect(valueFromStore[0]).toBe(123);
            expect(valueFromStore.length).toBe(1);
            done();
        });
    });
    
    it("returns null if key doesn't exist", function (done) {
        var store;
        var key = "a";
        scatteredStore.create(testDir)
        .then(function (createdStore) {
            store = createdStore;
            return store.get(key);
        })
        .then(function (valueFromStore) {
            expect(valueFromStore).toBe(null);
            done();
        });
    });
    
    it('can delete value for a key', function (done) {
        var store;
        var key = "a";
        var value = { a: "a" };
        scatteredStore.create(testDir)
        .then(function (createdStore) {
            store = createdStore;
            return store.set(key, value);
        })
        .then(function () {
            return store.del(key);
        })
        .then(function () {
            return store.get(key);
        })
        .then(function (valueFromStore) {
            expect(valueFromStore).toBe(null);
            done();
        });
    });
    
    describe('edge cases', function () {
        
        it("can write empty object", function (done) {
            var store;
            var key = "a";
            var value = {};
            scatteredStore.create(testDir)
            .then(function (createdStore) {
                store = createdStore;
                return store.set(key, value);
            })
            .then(function () {
                return store.get(key);
            })
            .then(function (valueFromStore) {
                expect(valueFromStore).toEqual({});
                done();
            });
        });
        
        it("can write empty array", function (done) {
            var store;
            var key = "a";
            var value = [];
            scatteredStore.create(testDir)
            .then(function (createdStore) {
                store = createdStore;
                return store.set(key, value);
            })
            .then(function () {
                return store.get(key);
            })
            .then(function (valueFromStore) {
                expect(valueFromStore).toEqual([]);
                done();
            });
        });
        
        it("can write buffer of length 0", function (done) {
            var store;
            var key = "a";
            var value = new Buffer(0);
            scatteredStore.create(testDir)
            .then(function (createdStore) {
                store = createdStore;
                return store.set(key, value);
            })
            .then(function () {
                return store.get(key);
            })
            .then(function (valueFromStore) {
                expect(Buffer.isBuffer(valueFromStore)).toBe(true);
                expect(valueFromStore.length).toBe(0);
                done();
            });
        });
        
        it("attempt to delete non-existent key does nothing", function (done) {
            scatteredStore.create(testDir)
            .then(function (createdStore) {
                return createdStore.del('none');
            })
            .then(function () {
                done();
            });
        });
        
    });
    
    describe('unexpected behaviour prevention', function () {
        
        it("throws if key of length 0", function (done) {
            var value = { a: "a" };
            var err = new Error('Unsupported key type.');
            scatteredStore.create(testDir)
            .then(function (store) {
                expect(function () {
                    store.get('');
                }).toThrow(err);
                
                expect(function () {
                    store.set('', value);
                }).toThrow(err);
                
                done();
            });
        });
        
        it("throws if key of different type than string", function (done) {
            var value = { a: "a" };
            var err = new Error('Unsupported key type.');
            scatteredStore.create(testDir)
            .then(function (store) {
                
                expect(function () {
                    store.get(null);
                }).toThrow(err);
                expect(function () {
                    store.get(123);
                }).toThrow(err);
                expect(function () {
                    store.get({});
                }).toThrow(err);
                
                expect(function () {
                    store.set(null, value);
                }).toThrow(err);
                expect(function () {
                    store.set(123, value);
                }).toThrow(err);
                expect(function () {
                    store.set({}, value);
                }).toThrow(err);
                
                done();
            });
        });
        
        it("throws if value is of unsupported type", function (done) {
            var err = new Error('Unsupported value type.');
            scatteredStore.create(testDir)
            .then(function (store) {
                
                expect(function () {
                    store.set("a", null);
                }).toThrow(err);
                expect(function () {
                    store.set("a", 1);
                }).toThrow(err);
                
                done();
            });
        });
    
    });
    
    describe('concurrency', function () {
        
        it('does only one operation at a time, puts concurrent operations in the queue', function (done) {
            var store;
            var key = "a";
            var value1 = { a: "a" };
            var value2 = { b: "b" };
            var value3 = { c: "c" };
            scatteredStore.create(testDir)
            .then(function (createdStore) {
                store = createdStore;
                
                var order = 0;
                
                store.set(key, value1);
                store.get(key)
                .then(function (value) {
                    expect(value).toEqual(value1);
                    order += 1;
                    expect(order).toBe(1);
                });
                
                store.set(key, value2);
                store.get(key)
                .then(function (value) {
                    expect(value).toEqual(value2);
                    order += 1;
                    expect(order).toBe(2);
                });
                store.get(key)
                .then(function (value) {
                    expect(value).toEqual(value2);
                    order += 1;
                    expect(order).toBe(3);
                });
                
                store.set(key, value3);
                store.get(key)
                .then(function (value) {
                    expect(value).toEqual(value3);
                    order += 1;
                    expect(order).toBe(4);
                    done();
                });
                
                expect(order).toBe(0);
            });
        });
        
    });

});
