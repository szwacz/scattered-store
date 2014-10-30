"use strict";

describe('initialization', function () {

    var scatteredStore = require('..');
    var utils = require('./utils');
    var pathUtil = require('path');
    var jetpack = require('fs-jetpack');

    beforeEach(utils.beforeEach);
    afterEach(utils.afterEach);

    var testDir = pathUtil.resolve(utils.workingDir, 'test');

    it('rejects if storage directory path not specified', function (done) {
        scatteredStore.create()
        .catch(function (err) {
            expect(err.message).toEqual('Path to storage directory not specified.');
            done();
        });
    });
    
    it('rejects if storage directory path empty', function (done) {
        scatteredStore.create('')
        .catch(function (err) {
            expect(err.message).toEqual('Path to storage directory not specified.');
            done();
        });
    });
    
    it('rejects if storage path is a file', function (done) {
        var anyFile = pathUtil.resolve(utils.workingDir, 'any.txt');
        jetpack.file(anyFile);
        scatteredStore.create(anyFile)
        .catch(function (err) {
            expect(err.message).toEqual('Given path is a file, but directory required.');
            done();
        });
    });

    it("creates storage directory if it doesn't exist", function (done) {
        expect(jetpack.exists(testDir)).toBe(false);
        scatteredStore.create(testDir)
        .then(function () {
            expect(jetpack.exists(testDir)).toBe('dir');
            done();
        });
    });

});
