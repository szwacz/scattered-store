"use strict";

describe('api', function () {
    
    var _ = require('underscore');
    var pathUtil = require('path');
    var jetpack = require('fs-jetpack');
    var scatteredStore = require('..');
    var utils = require('./utils');

    beforeEach(utils.beforeEach);
    afterEach(utils.afterEach);

    var testDir = pathUtil.resolve(utils.workingDir, 'test');

    it('writes and reads string', function (done) {
        var key = "ąż"; // utf8 test
        var value = "ąćłźż"; // utf8 test
        var store = scatteredStore.create(testDir);
        store.set(key, value)
        .then(function () {
            return store.get(key);
        })
        .then(function (valueFromStore) {
            expect(valueFromStore).toEqual(value);
            done();
        });
    });
    
    it('writes and reads object', function (done) {
        var key = "ąż"; // utf8 test
        var value = {
            a: "ąćłźż", // utf8 test
            now: new Date() // can handle date object
        };
        var store = scatteredStore.create(testDir);
        store.set(key, value)
        .then(function () {
            return store.get(key);
        })
        .then(function (valueFromStore) {
            expect(valueFromStore).toEqual(value);
            done();
        });
    });
    
    it('writes and reads array', function (done) {
        var key = "a";
        var value = [1, 2, 3];
        var store = scatteredStore.create(testDir);
        store.set(key, value)
        .then(function () {
            return store.get(key);
        })
        .then(function (valueFromStore) {
            expect(valueFromStore).toEqual(value);
            done();
        });
    });
    
    it('writes and reads binary data', function (done) {
        var key = "a";
        var value = new Buffer([123]);
        var store = scatteredStore.create(testDir);
        store.set(key, value)
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
        var key = "a";
        var store = scatteredStore.create(testDir);
        store.get(key)
        .then(function (valueFromStore) {
            expect(valueFromStore).toBe(null);
            done();
        });
    });
    
    it('can delete value for a key', function (done) {
        var key = "a";
        var value = { a: "a" };
        var store = scatteredStore.create(testDir);
        store.set(key, value)
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
    
    describe('get all', function () {
        
        it('terminates gracefully when store empty', function (done) {
            scatteredStore.create(testDir)
            .all()
            .on('end', function () {
                done();
            })
            .resume();
        });
        
        it('iterates through all stored entries', function (done) {
            var count = 0;
            var dataset = [
                { key: "a", value: "1" },
                { key: "b", value: "2" },
                { key: "c", value: "3" },
            ];
            
            var store = scatteredStore.create(testDir);
            store.set(dataset[0].key, dataset[0].value);
            store.set(dataset[1].key, dataset[1].value);
            store.set(dataset[2].key, dataset[2].value)
            .then(function () {
                var stream = store.all();
                stream.on('readable', function () {
                    var itemFromStore = stream.read();
                    var item = _.findWhere(dataset, itemFromStore);
                    expect(item).toBeDefined();
                    count += 1;
                });
                stream.on('end', function () {
                    expect(count).toBe(dataset.length);
                    done();
                });
            });
        });
        
    });
    
    describe('edge cases', function () {
        
        it("can write empty string", function (done) {
            var key = "a";
            var value = '';
            var store = scatteredStore.create(testDir);
            store.set(key, value)
            .then(function () {
                return store.get(key);
            })
            .then(function (valueFromStore) {
                expect(valueFromStore).toEqual(value);
                done();
            });
        });
        
        it("can write empty object", function (done) {
            var key = "a";
            var value = {};
            var store = scatteredStore.create(testDir);
            store.set(key, value)
            .then(function () {
                return store.get(key);
            })
            .then(function (valueFromStore) {
                expect(valueFromStore).toEqual({});
                done();
            });
        });
        
        it("can write empty array", function (done) {
            var key = "a";
            var value = [];
            var store = scatteredStore.create(testDir);
            store.set(key, value)
            .then(function () {
                return store.get(key);
            })
            .then(function (valueFromStore) {
                expect(valueFromStore).toEqual([]);
                done();
            });
        });
        
        it("can write buffer of length 0", function (done) {
            var key = "a";
            var value = new Buffer(0);
            var store = scatteredStore.create(testDir);
            store.set(key, value)
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
            .del('none')
            .then(function () {
                done();
            });
        });
        
    });
    
    describe('unexpected behaviour prevention', function () {
        
        it("throws if key of length 0", function (done) {
            var value = { a: "a" };
            var err = new Error('Unsupported key type.');
            var store = scatteredStore.create(testDir, function () {
                done();
            })
            
            expect(function () {
                store.get('');
            }).toThrow(err);
            
            expect(function () {
                store.set('', value);
            }).toThrow(err);
        });
        
        it("throws if key of different type than string", function (done) {
            var value = { a: "a" };
            var err = new Error('Unsupported key type.');
            var store = scatteredStore.create(testDir, function () {
                done();
            });
            
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
            
        });
        
    });

});
