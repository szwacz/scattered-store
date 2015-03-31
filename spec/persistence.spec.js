"use strict";

describe('persistence', function () {

    var _ = require('underscore');
    var pathUtil = require('path');
    var jetpack = require('fs-jetpack');
    var scatteredStore = require('..');
    var utils = require('./utils');

    beforeEach(utils.beforeEach);
    afterEach(utils.afterEach);

    var testDir = pathUtil.resolve(utils.workingDir, 'test');

    it('persists data in "Git Objects" like structure', function (done) {
        var store = scatteredStore.create(testDir);
        store.set('abc', '123')
        .then(function () {
            // Key 'abc' hashed with sha1: 'a9993e364706816aba3e25717850c26c9cd0d89d'
            var path = jetpack.path(testDir, 'a9', '993e364706816aba3e25717850c26c9cd0d89d');
            expect(jetpack.exists(path)).toBe('file');
            done();
        });
    });

    it('getAll can deal with empty subdirectories inside storage directory', function (done) {
        // Manually add empty subdirectory. It could happen if
        // we deleted all items from there.
        jetpack.dir(testDir + '/af');

        var count = 0;
        var store = scatteredStore.create(testDir);
        store.set('abc', '123')
        .then(function () {
            var stream = store.getAll();
            stream.on('readable', function () {
                var itemFromStore = stream.read();
                if (itemFromStore !== null) {
                    expect(itemFromStore).toEqual({ key: 'abc', value: '123' });
                    count += 1;
                }
            });
            stream.on('end', function () {
                expect(count).toBe(1);
                done();
            });
        });
    });

});
