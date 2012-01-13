
<img src="https://github.com/flatiron/resourceful/raw/master/resourceful.png" />

# Synopsis
A storage agnostic resource-oriented ODM for building prototypical models with validation and sanitization.

# Motivation
How often have you found yourself writing Model code in your application? Pretty often? Good! Unlike other "Object-Document Mappers" `resourceful` tries to only focus on two things:

 - A simple API for defining custom Model prototypes with validation. No sugar is required to instantiate prototypes defined by resourceful.

 - Define an extensibility model for databases to provide CRUD functionality to Models along with custom query, filtering or updating specific to that specific implementation (Mongo, CouchDB, Redis, etc).

# Status

[![Build Status](https://secure.travis-ci.org/flatiron/resourceful.png)](http://travis-ci.org/flatiron/resourceful)

# Features
* Data Validation
* Simplified Data Model Management
* [Storage Engine Extensible](#engines)
* [Simplified Cache Control](#cache)

# Installation

``` bash 
$ [sudo] npm install resourceful
```

# Usage

## Simple case

``` js
var resourceful = require('resourceful');

var Creature = resourceful.define('creature', function () {
  //
  // Specify a storage engine
  //
  this.use('couchdb');
  
  //
  // Specify some properties with validation
  //
  this.string('diet');
  this.bool('vertebrate');
  this.array('belly');

  //
  // Specify timestamp properties
  //
  this.timestamps();
});

//
// Now that the `Creature` prototype is defined
// we can add custom logic to be available on all instances
//
Creature.prototype.feed = function (food) {
  this.belly.push(food);
};
```

## Defining resources
Here's the simplest of resources:

``` js
var Creature = resourceful.define('creature');
```

The returned `Creature` object is a *resource constructor*, in other words, a *function*. Now let's add some properties to this constructor:

``` js
Creature.string('diet');
Creature.bool('vertebrate');
Creature.array('belly');
Creature.object('children');

// Are equivalent to
Creature.property('diet'); // Defaults to String
Creature.property('vertebrate', Boolean);
Creature.property('belly', Array);
Creature.property('children', Object);
```

And add a method to the prototype:

``` js
Creature.prototype.feed = function (food) {
  this.belly.push(food);
};
```

Now lets instantiate a Creature, and feed it:

``` js
var wolf = new(Creature)({
  diet:      'carnivore',
  vertebrate: true
});

wolf.feed('squirrel');
console.dir(wolf.belly);
```

You can also define resources this way:

``` js
var Creature = resourceful.define('creature', function () {
  this.string('diet');
  this.bool('vertebrate');
  this.array('belly');

  this.prototype.feed = function (food) {
    this.belly.push(food);
  };
});
```

## Defining properties with Resource.property
Lets define a *legs* property, which is the number of legs the creature has:

``` js
Creature.number('legs');
```

Note that this form is equivalent:

``` js
Creature.property('legs', Number);
/* or */
Creature.property('legs', 'number');
```

If we wanted to constrain the possible values the property could take, we could pass in an object as the last parameter:

``` js
Creature.number('legs', {
  required: true,

  minimum: 0,
  maximum: 8,

  assert: function (val) {
    return val % 2 === 0;
  }
});
```

Now resourceful won't let `Creature` instances be saved unless the *legs* property has a value between `0` and `8`, and is *even*,

This style is also valid for defining properties:

``` js
Creature.number('legs')
        .required()
        .minimum(0)
        .maximum(8)
        .assert(function (val) { return val % 2 === 0 });
```

If we want to access and modify an already defined property, we can do it this way:

``` js
Creature.schema.properties['legs'].maximum(6);
```

<a name="engines"></a>
## Engines (saving and fetching resources)
By default, resourceful uses an in-memory engine. If we would like our resources to be persistent, we must use another engine, for example CouchDB.

Engines are used for exposing different storage backends to resourceful. Resourceful currently has two bundled engines:

* couchdb
* memory

Engines can be specified when defining a resource with `this.use`:

```js
var Creature = resource.define('creature', function () {
  
  this.use('couchdb', {
    uri: 'http://example.jesusabdullah.net'
  });

  /*
  
      //
      // alternately
      //
      this.use('memory');

      //
      // or, supposing `Engine` is defined as a resourceful engine:
      //
      this.use(Engine, {
        'uri': 'file:///tmp/datastore'
      });

  */

});
```

## Using the CouchDB engine
First, one must create a CouchDB database for resourceful to use. One way to do this is to use Futon, located by default at [http://localhost:5984/_utils/](http://localhost:5984/_utils/). In this example, we name the database **myResourcefulDB**.

Next, let resourceful know to use use this particular CouchDB database.

``` js
var resourceful = require('resourceful');

resourceful.use('couchdb', {database: 'myResourcefulDB'});
```

## Saving and fetching resources (engine agnostic)
Assuming we have already defined a ''Wolf'' resource with name, age, and fur properties, we can fetch and save wolf resources like this:

``` js
Wolf.create({ name: 'Wolverine', age: 68 }, function (err, wolf) {
  if (err) { throw new(Error)(err) }

  console.log(wolf); // { _id: 42, resource: 'wolf', name: 'Wolverine', age: 68 }

  wolf.age++;
  wolf.save(function (err) {
    if (!err) {
      console.log('happy birthday ' + wolf.name + '!');
    }
  });
});

Wolf.get(42, function (err, wolf) {
  if (err) { throw new(Error)(err) }

  wolf.update({ fur: 'curly' }, function (e, wolf) {
    console.log(wolf.fur); // "curly"
  });
});
```

<a name="cache"></a>
## Engine caching
Resourceful comes with a helper for managing an in-memory cache of your documents. This helps increase the speed of resourceful by avoiding extraneous interactions with the back-end.

Unlike engines, caches have a completely synchronous API. This is acceptable since the calls are short and usually occur inside an asynchronously-executing procedure.

## History
Resourceful's first engine was the couchdb engine, which was built using cradle. As such, the design of resourceful's engines is somewhat inferred from the design of couchdb itself. In particular, engine prototypes are often named and designed after http verbs, status reporting follows http status code conventions, and engines can be designed around stored views.

That said: The memory engine, as it needs to do much less, can be considered to have the most minimal api possible for an engine, with a few exceptions.

Both pieces of code are more-or-less self-documenting.

# API

## Resource Constructor
These methods are available on all user-defined resource constructors, as well as on the default `resourceful.Resource` constructor.

* `Resource.get(id, [callback])`: Fetch a resource by *id*.
* `Resource.update(id, properties, [callback])`: Update a resource with properties.
* `Resource.destroy(id, [callback])`: Destroy a resource by *id*.
* `Resource.all([callback])`: Fetches all resources of this type.
* `Resource.find(properties, [callback])`: Find all resources of this type which satisfy `obj` conditions
* `Resource.save(inst, [callback])`: Saves the specified resource instance `inst` by overwriting all properties. 
* `Resource.create(properties, [callback])`: Creates a new instance of the Resource with the specified `properties`
* `Resource.new(properties)`: Instantiates a new instance of the Resource with the `properties`

## Resource Instance Methods

* `Resource.prototype.save([callback])`
* `Resource.prototype.update(properties, [callback])`
* `Resource.prototype.destroy([callback])`
* `Resource.prototype.reload([callback])`

## Engine Constructor
In general, it is safe to attach instance methods to your new engine. For example, `memory.js` keeps a counter (called `this.counter`) for creating new documents without a specified name.

```js
var engine = new Engine({
  uri: 'protocol://path/to/database'
});
```

At a minimum, the constructor should:

### Interpret the 'uri' argument
The 'uri' argument should be treated as a unique ID to your particular data store. For example, this is a couchdb uri for the couchdb store.

In most cases the uri argument will correspond to a database url, but that's not always true. In the case of "memory", it's simply a legal javascript object property name.

### Initialize a store
A constructed engine should, in some way or another, initialize a connection to its data store. For couchdb, this means opening a new connection object with cradle and attaching it as `this.connection`. However, this isn't a good fit for all cases; the memory store, for example, simply creates a new property to a "stores" object if `stores["storeName"]` doesn't exist.

## Engine Instance Members

### protocol
Resourceful will parse out the "couchdb" from the protocol and attempt to use an included resource with that string as its `resource.protocol`.

For third-party engines this may not seem critical but it's good practice to include anyway, for the purposes of inspection if nothing else.

```js
Engine.prototype.protocol = 'file';
```

The protocol method sets the protocol member is used by resourceful to add syntactic sugar such that you may do:

```js
Resource.connect('couchdb://example.nodejitsu.com');
```

## Engine Instance Methods
Resourceful allows flexibility in some prototype methods, but not in others. Authors are encouraged to add prototype methods that feel natural to expose; for instance, the couchdb engine exposes `this.prototype.head` for sending http HEAD requests.

### request()
Unlike some of the other prototype methods, `request` does not have to follow any particular contract, as it's used by your engine internally to encapsulate an asynchronous request to your particular datastore.

```js
this.request(function () {

  var update = key in this.store;
  this.store[key] = val;
  callback(null, resourceful.mixin({ status: update ? 200 : 201 }, val));
});
```

In the case of the memory datastore, this simply involves a process.nextTick helper:

```js
Memory.prototype.request = function (fn) {

  var self = this;

  process.nextTick(function () {
    fn.call(self);
  });
};
```

In the couchdb engine, requests look more like:

```
this.request('post', doc, function (e, res) {

  if (e) {
    return callback(e);
  }

  res.status = 201;
  callback(null, resourceful.mixin({}, doc, res));
});
```

An engine should expose the request interface that feels most natural given the transport. However, there are some conventions to follow:

1. `this.request` should be asynchronous.
2. The callback should set 'this' to be the same context as outside the callback

### save()
Because the engines api was written with couchdb in mind, 'doc' should include an appropriate http status under `doc.status`. 

`save` can be implemented using a combination of 'head', 'put' and 'post', as in the case of the couchdb engine. However, in the memory engine case `put` is an alias to `save` and `update` is implemented separately. See below: **head**, **put** and **update**. The following pattern should be followed across all engines:

```js
engine.save('key', value, function (err, doc) {

  if (err) {
    throw err;
  }

  if (doc.status == 201) {
    // Will be 201 instead of 200 if the document is created instead of modified
    console.log('New document created!');
  }

  console.log(doc);
});
```

### put()
`put` is typically used to represent operations that update or modify the database without creating new resources. However, it is acceptable to alias the 'save' method and allow for the creation of new resources.

Because the engines api was written with couchdb in mind, 'doc' should include an appropriate http status under `doc.status`. The expected status is '201'. See below: **post**. This pattern should be followed across all engines:

```js
engine.put('key', value, function (err, doc) {

  if (err) {
    throw err;
  }

  if (doc.status === 201) {
    console.log('Document updated!');
  }
  else {
    throw new Error('Document did not update.');
  }

  console.log(doc);
});
```

### post()
### create()
This pattern should be followed across all engines for implementations of these methods. However, they are *optional*. The memory engine defines `Engine.prototype.load` instead. For instance:

```js
engine.create('key', value, function (err, doc) {

  if (err) {
    throw err;
  }

  if (doc.status === 201) {
    console.log('Document updated!');
  }
  else {
    throw new Error('Status: '+doc.status);
  }

  console.log(doc);
});
```

`post` is typically used to represent operations that create new resources without modifying or updating existing ones. `create` should be implemented as an alias for `post`.

Because the engines api was written with couchdb in mind, 'doc' should include an appropriate http status under `doc.status`. The expected status is '201'.

### load()
This method is *optional* and is used to more or less replace the "create" and "post" methods along with "put" and "save".

```js
//
// Example with the memory transport
//
var memory = new Memory();

memory.load([ { 'foo': 'bar' }, { 'bar': 'baz' }]);
```

In the above example, each object passed to memory.load is loaded as a new document. This approach is useful in cases where you already have a javascript representation of your store (as in the case of memory) and don't need to interact with a remote api as in the case of couchdb.

### update()
`update` is used to modify existing resources by copying enumerable properties from the update object to the existing object (often called a "mixin" and implemented in javascript in `resourceful.mixin` and `utile.mixin`). Besides the mixin process (meaning your stored object won't lose existing properties), `update` is synonymous with `put`, and in fact uses `put` internally in the case of both the couchdb and memory engines.

Because the engines api was written with couchdb in mind, 'doc' should include an appropriate http status under `doc.status`. The expected status is '201', as with `put`. This pattern should be followed across all engines:

```js
engine.put('key', { 'foo': 'bar' }, function (err, doc) {

  if (err) {
    throw err;
  }

  if (doc.status === 201) {
    console.log('Document updated!');
  }
  else {
    throw new Error('Document did not update.');
  }

  console.log(doc); // doc.foo should now be bar

});
```

### get()
This pattern should be followed across all engines:

```js
engine.get('key', function (err, doc) {

  if (err) {
    if (err.status === 404) {
      console.log('Document was not there!');
    }

    throw err;
  }

  console.log(doc);
});
```

### destroy()
`destroy` is used to delete existing resources. 

Because the engines api was written with couchdb in mind, 'doc' should include an appropriate http status under `doc.status`. The expected status is '204', which stands for 'successfully deleted'. This pattern should be followed across all engines:

```js
engine.get('key', function (err, doc) {

  if (err) {
    throw err;
  }

  //
  // "status" should be the only property on `doc`.
  //
  if (doc.status !== 204) {
    throw new Error('Status: '+doc.status);
  }

  console.log('Successfully destroyed document.');
});
```

### find()
`find` is a shorthand for finding resources which in some cases can be implemented as a special case of `filter`, as with memory here:

```js
Memory.prototype.find = function (conditions, callback) {

  this.filter(function (obj) {
    return Object.keys(conditions).every(function (k) {
      return conditions[k] ===  obj[k];
    });
  }, callback);
};
```

This pattern should be followed across all engines:

```js
engine.find({ 'foo': 'bar' }, function (err, docs) {

  if (err) {
    throw err;
  }

  //
  // docs[0].foo === 'bar'
  //

});
```

The couchdb version, however, uses special logic as couchdb uses temporary and stored views.

```

  IMPORTANT NOTE
  --------------

  `CouchDB.prototype.find` uses a temporary view. This is useful while testing but is slow and bad practice on a production couch. Please use `CouchDB.prototype.filter` instead.

```

### filter()
The semantics of 'filter' vary slightly depending on the engine. The semantics of `filter()`, like those of `request()`, should reflect the particular idioms of the underlying transport.

```js
//
// Example used with a Memory engine
//
engine.filter(filterfxn, function (err, docs) {

  if (err) {
    throw err;
  }

  //
  // returned docs filtered by "filter"
  //

});
```

The "memory" case simply applies a function against the store's documents. In contrast, the couchdb engine exposes an api for using stored mapreduce functions on the couch:

```js
//
// Example used with a Couchdb engine
//
engine.filter("view", params, function (err, docs) {

  if (err) {
    throw err;
  }

  //
  // returned docs filtered using the "view" mapreduce function on couch.
  //

});
```

### sync()
`Engine.prototype.sync` is used to sync "design document" information with the database if necessary. This is specific to couchdb; for the 'memory' transport there is no conception of (or parallel to) a design document.

```js
engine.sync(factory, function (err) {

  if (err) {
    throw err;
  }
});
```

In the case where there is no doc or "stored procedures" of any kind to upload to the database, this step can be simplified to:

```js
Engine.prototype.sync = function (factory, callback) {

  process.nextTick(function () { callback(); });
};
```

## Cache Constructor
This creates a new in-memory cache for your engine. The cache is automatically populated by resourceful. This means that you don't need to actually use the cache directly for many operations. In fact, the memory engine doesn't explicitly use resourceful.Cache at all.

```js
var resourceful = require('resourceful');

var cache = new Cache();
```

## Cache Instance Methods
`resourceful.Cache` has the following prototypes for interacting with the in-memory cache:

* `Cache.prototype.get(id)`: Attempt to 'get' a cached document.
* `Cache.prototype.put(id, doc)`: Attempt to 'put' a document into the cache.
* `Cache.prototype.update(id, doc)`: Attempt to update a document in the cache. *This means that it will attempt to merge your old and new document instead of overwriting the old with the new!*
* `Cache.prototype.clear(id)`: Attempts to remove a document from the cache. Document 'overwriting' may be achieved with call to `.clear` followed by a call to `.put`.
* `Cache.prototype.has(id)`: Checks to see if a given document is in the cache or not.

The couchdb engine explicity uses resourceful.Cache in two places, both in cases where fetching the document is prohibitive and can be avoided. The couchdb engine checks the cache for the object with which to merge new data before uploading:

```js
Couchdb.prototype.update = function (id, doc, callback) {

  return this.cache.has(id) 
    ? this.put(id, resourceful.mixin({}, this.cache.get(id).toJSON(), doc), callback)
    : this.request('merge', id, doc, callback);
};
```

`object.toJSON` is a misnomer; Instead of returning json, `.toJSON()` returns a cloned object. This method is named as such because it's [detected and used by JSON.stringify](https://developer.mozilla.org/en/JSON#toJSON\(\)_method).

The couchdb engine checks the cache for the object it wants to destroy:

```js
if (this.cache.has(id)) {

  args.splice(1, -1, this.cache.get(id)._rev);
  return this.request.apply(this, ['remove'].concat(args));
}
```

In the above snippet (just a small part of the entire function), the couchdb engine uses the cache to get revision data without doing a GET.

# Tests
All tests are written with [vows][0] and should be run with [npm][1]:

```bash
  $ npm test
```

[0]: http://vowsjs.org
[1]: http://npmjs.org

# License
Copyright 2012 Nodejitsu, Inc.

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

