"use strict";

module.exports.create = function (storageDir, options) {

    if (typeof storageDir !== 'string' || storageDir.length === 0) {
        throw new Error('Path to storage directory not specified.');
    }

};
