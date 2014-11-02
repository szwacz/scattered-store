scattered-store
===============

Dead simple key-value store for large datasets.


# Way of storing data

Scattered-store borrows idea for storing data from [Git Objects](http://git-scm.com/book/en/v2/Git-Internals-Git-Objects). Let's say we have code:
```js
scatteredStore.create('my_store') // Name of directory where to store data
.then(function (store) {
    store.set('abc', 'Hello World!'); // key: 'abc', value: 'Hello World!'
});
```
The code above stored data in file:
```
/my_store/a9/993e364706816aba3e25717850c26c9cd0d89d
```
And the algorithm went as follows:
- Key 'abc' was hashed with sha1 to: `a9993e364706816aba3e25717850c26c9cd0d89d`
- The hash was then splitted into two parts:
    - First two characters (`a9`) became the name of directory where the entry ended up.
    - Remaining 38 characters (`993e364706816aba3e25717850c26c9cd0d89d`) became the name of file where data `Hello World!` has been stored.

So every entry is stored in separate file, and all files are scattered across maximum of 256 directories (two hex characters) to overcome limit of files per one directory. That's why it's *scattered-store*.

## Pros
Every entry is stored in separate file what means:
* Implementation is very, very simple. All heavy lifting is done by file system.
* Dataset can safely grow to ridiculous sizes.

## Cons
Every entry is stored in separate file what means:
* If your entry is 10 bytes of data, it still occupies whole block on disk.
* Every operation is a separate I/O. Not much room for performance improvements with batch tasks.


# Installation

```
npm install scattered-store
```


# Usage

```js
var scatteredStore = require('scattered-store');
var store;

scatteredStore.create('path/to/my_store') // Path to directory where to store data
.then(function (_store_) {
    // Initiation success!
    store = _store_;
    return store.set('abc', 'Hello World!');
})
.then(function () {
    return store.get('abc');
});
.then(function (value) {
    console.log(value); // Hello World!
})
```


# API

TODO


# Performance

TODO
