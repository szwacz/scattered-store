// Readable stream. Gives one by one all items from collection passed during construction.

'use strict';

var Readable = require('stream').Readable;
var util = require('util');

var Giver = function (itemsToGive) {
    Readable.call(this, { objectMode: true });
    this._itemsToGive = itemsToGive;
};

util.inherits(Giver, Readable);

Giver.prototype._read = function() {
    var item = this._itemsToGive.pop();
    if (item) {
        this.push(item);
    } else {
        this.push(null);
    }
};

module.exports = Giver;
