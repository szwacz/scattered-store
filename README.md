scattered-store
===============

Dead simple key-value store for large datasets in Node.js.

### In what cases can it be useful?
- For some reason you can't or don't want to use serious database engine.
- For archiving data (you have a lot of rarely accessed data).

### How much data can it handle?
I would draw the line of sanity around 10M items in store, and max size of one item around 10MB. However only your disk size and used file system are real limitations.


# Way of storing data

Scattered-store borrows idea for storing data from [Git Objects](http://git-scm.com/book/en/v2/Git-Internals-Git-Objects). Let's say we have code:
```js
const store = scatteredStore.create('my_store'); // Name of directory where to store data
store.set('abc', 'Hello World!'); // key: 'abc', value: 'Hello World!'
```
The code above, when run will store data in file:
```
/my_store/a9/993e364706816aba3e25717850c26c9cd0d89d
```
And the algorithm went as follows:
- Key `abc` was hashed with sha1 to: `a9993e364706816aba3e25717850c26c9cd0d89d`
- The hash was then splitted into two parts:
    - First two characters (`a9`) became the name of directory where the entry ended up.
    - Remaining 38 characters (`993e364706816aba3e25717850c26c9cd0d89d`) became the name of file where data `Hello World!` has been stored.

So every entry is stored in separate file, and all files are scattered across maximum of 256 directories (two hex characters) to overcome limit of files per one directory. That's why it's called *scattered-store*.

### Pros
Every entry is stored in separate file what means...
* Implementation is very, very simple. All heavy lifting is done by file system.
* Quite linear performance with growing dataset.

### Cons
Every entry is stored in separate file what means...
* If the entry is 10 bytes of data, it still occupies whole block on disk.
* Every operation is performed as separate I/O. Can't speed things up very much with bulk inserts or reads.


# Installation

```
npm install scattered-store
```


# Usage

```js
const scatteredStore = require('scattered-store');

const store = scatteredStore.create('path/to/my/store', (err) => {
  // This is optional callback function so you can know
  // when the initialization is done.
  if (err) {
    // Oops! Something went wrong.
  } else {
    // Initialization done!
  }
});

// You don't have to wait for initialization to end before calling API methods.
// All calls will be queued and delayed automatically.
store.set('abc', 'Hello World!')
.then(() => {
  return store.get('abc');
});
.then((value) => {
  console.log(value); // Hello World!
})
```


# Supported key and value types

As **key** only strings can be used. **Value** could be everything what can be serialized to JSON and any binary data (passed as Buffer). JSON deserialization also automatically turns [ISO notation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString) strings into Date objects.


# API

## set(key, value)
Stores given `value` on given `key`. String, Object, Array and Buffer are supported as `value`.  
**Returns:** promise

```js
store.set('abc', 'Hello World!')
.then(() => {
  // Value has been stored!
});
```

## get(key)
Returns value stored on given `key`. If given `key` doesn't exist `null` is returned.  
**Returns:** promise

```js
store.get('abc')
.then((value) => {
  console.log(value); // Hello World!
});
```

## getMany(keys)
As `keys` accepts array of `key` strings, and returns all values for those keys.  
**Returns:** readable stream

```js
const stream = store.getMany(['abc', 'xyz']);
stream.on('readable', () => {
  const entry = stream.read();
  console.log(entry);
  // Every returned entry object has structure: { key: "abc", value: "Hello World!" }
  // Order of items returned through stream can't be guaranteed!
});
stream.on('end', () => {
  // All entries you asked for had been delivered.
});
```

## getAll()
Returns all data stored in database through stream (one by one).  
**Returns:** readable stream

```js
const stream = store.getAll();
stream.on('readable', () => {
  const entry = stream.read();
  console.log(entry);
  // Every returned entry object has structure: { key: "abc", value: "Hello World!" }
  // Order of items returned through stream can't be guaranteed!
});
stream.on('end', () => {
  // Everything there was in the database has been delivered.
});
```

## delete(key)
Deletes entry stored on given `key`.  
**Returns:** promise

```js
store.delete('abc')
.then(() => {
  // Value has been deleted from database!
});
```

## whenIdle()
Hook to know when all queued tasks has been executed and store is idle. Useful e.g. if you want to terminate the process, and want to make sure no dataloss will occur.  
**Returns:** promise

```js
store.whenIdle()
.then(() => {
  // Idle now.
});
```


# Performance

```
npm run benchmark
```

Here are results of this test on MacBook Pro with SSD. Tested with 10K, 100K and 1M items in store.

```
Testing scattered-store performance: 10000 items, 25KB each, 0.3GB combined.
set 2106 items/s
get 4170 items/s
getMany 7018 items/s
getAll 6817 items/s
delete 4073 items/s

Testing scattered-store performance: 100000 items, 25KB each, 2.5GB combined.
set 1926 items/s
get 3926 items/s
getMany 6671 items/s
getAll 6644 items/s
delete 3733 items/s

Testing scattered-store performance: 1000000 items, 25KB each, 25.0GB combined.
set 1255 items/s
get 1259 items/s
getMany 5139 items/s
getAll 3574 items/s
delete 1348 items/s
```
