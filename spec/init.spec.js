"use strict";

describe('initialization', function () {

    var scatteredStore = require('..');
    var utils = require('./specUtils');

    beforeEach(utils.beforeEach);
    afterEach(utils.afterEach);

    it('throws if storage directory path not specified', function () {
        expect(function () {
            scatteredStore.create();
        }).toThrow(new Error('Path to storage directory not specified.'));
    });

});
