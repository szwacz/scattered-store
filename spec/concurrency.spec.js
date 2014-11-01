"use strict";

describe('concurrency', function () {
    
    var _ = require('underscore');
    var pathUtil = require('path');
    var jetpack = require('fs-jetpack');
    var scatteredStore = require('..');
    var utils = require('./utils');

    beforeEach(utils.beforeEach);
    afterEach(utils.afterEach);

    var testDir = pathUtil.resolve(utils.workingDir, 'test');
    
    it('does only one operation at a time, puts concurrent operations in queue', function (done) {
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
