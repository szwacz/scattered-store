// Readable stream. Gives one by one all items from collection passed during construction.

const Readable = require('stream').Readable;
const util = require('util');

const Giver = function (itemsToGive) {
  Readable.call(this, { objectMode: true });
  this._itemsToGive = itemsToGive;
};

util.inherits(Giver, Readable);

Giver.prototype._read = function () {
  const item = this._itemsToGive.pop();
  if (item) {
    this.push(item);
  } else {
    this.push(null);
  }
};

module.exports = Giver;
