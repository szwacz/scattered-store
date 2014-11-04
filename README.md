scattered-store
===============

Dead simple key-value store for large datasets in Node.js.


# Way of storing data

Scattered-store borrows idea for storing data from [Git Objects](http://git-scm.com/book/en/v2/Git-Internals-Git-Objects). Let's say we have code:
```js
var store = scatteredStore.create('my_store'); // Name of directory where to store data
store.set('abc', 'Hello World!'); // key: 'abc', value: 'Hello World!'
```
The code above stored data in file:
```
/my_store/a9/993e364706816aba3e25717850c26c9cd0d89d
```
And the algorithm went as follows:
- Key `abc` was hashed with sha1 to: `a9993e364706816aba3e25717850c26c9cd0d89d`
- The hash was then splitted into two parts:
    - First two characters (`a9`) became the name of directory where the entry ended up.
    - Remaining 38 characters (`993e364706816aba3e25717850c26c9cd0d89d`) became the name of file where data `Hello World!` has been stored.

So every entry is stored in separate file, and all files are scattered across maximum of 256 directories (two hex characters) to overcome limit of files per one directory. That's why it's called *scattered-store*.

## Pros
Every entry is stored in separate file what means:
* Implementation is very, very simple. All heavy lifting is done by file system.
* Dataset can safely grow to ridiculous sizes.

## Cons
Every entry is stored in separate file what means:
* If the entry is 10 bytes of data, it still occupies whole block on disk.
* Every operation is a separate I/O. Not much room for performance improvements with batch tasks.


# Installation

```
npm install scattered-store
```


# Usage

```js
var scatteredStore = require('scattered-store');

var store = scatteredStore.create('path/to/my/store', function (err) {
    if (err) {
        // Oops! Something went wrong with initialization.
    } else {
        // Initialization done!
    }
});

// You don't have to wait for initialization to be done before calling API methods.
// All calls will be queued and delayed until initialization is ready.
store.set('abc', 'Hello World!')
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

```
npm run benchmark
```
Here are results of this test on few machines for comparison:

Desktop PC (HDD 7200rpm)
```
Testing scattered-store performance: 20000 items, 50KB each, 977MB combined.
set... 2522 ops/s
get... 4471 ops/s
all... 8428 ops/s
del... 5605 ops/s
```

MacBook Pro (SSD)
```
Testing scattered-store performance: 20000 items, 50KB each, 977MB combined.
set... 1694 ops/s
get... 4018 ops/s
all... 6416 ops/s
del... 4030 ops/s 
```

Mac Mini (HDD 5400rpm)
```
Testing scattered-store performance: 20000 items, 50KB each, 977MB combined.
set... 726 ops/s
get... 3860 ops/s
all... 5071 ops/s
del... 1130 ops/s
```
