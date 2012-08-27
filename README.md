<img src="https://github.com/flatiron/resourceful/raw/master/resourceful.png" />

# Synopsis

 - Isomorphic Resource engine for JavaScript
 - Resources are business logic wrapped in prototypical models with schema and validation
 - Resources support several data-providers
   - Memory
   - File-System
   - CouchDB
   - MongoDB
   - REST
   - socket.io

# Status

[![Build Status](https://secure.travis-ci.org/flatiron/resourceful.png?branch=master)](http://travis-ci.org/flatiron/resourceful)

# Features
* Data Validation
* Simplified Data Model Management
* [Relationships](#relationships)
* [Data Provider Extensible](#engines)
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
<a name="engines"></a>

# Engines 

### Documentation

 * [Engines Usage](https://github.com/flatiron/resourceful/wiki/Engines-Usage)
 * [Engine Constructor](https://github.com/flatiron/resourceful/wiki/Engine-Constructor)
 * [Engine Caching](https://github.com/flatiron/resourceful/wiki/Engine-Caching)

# API

## Resource Constructor Methods
These methods are available on all user-defined resource constructors, as well as on the default `resourceful.Resource` constructor.

* `Resource.get(id, [callback])`: Fetch a resource by `id`.
* `Resource.update(id, properties, [callback])`: Update a resource with properties.
* `Resource.destroy(id, [callback])`: Destroy a resource by `id`.
* `Resource.all([callback])`: Fetches all resources of this type.
* `Resource.find(properties, [callback])`: Find all resources of this type which satisfy `obj` conditions.
* `Resource.save(inst, [callback])`: Saves the specified resource instance `inst` by overwriting all properties.
* `Resource.create(properties, [callback])`: Creates a new instance of the Resource with the specified `properties`.
* `Resource.new(properties)`: Instantiates a new instance of the Resource with the `properties`.

## Resource Instance Methods

* `Resource.prototype.save([callback])`
* `Resource.prototype.update(properties, [callback])`
* `Resource.prototype.destroy([callback])`
* `Resource.prototype.reload([callback])`

## Relationship Constructor Methods
These methods are available on all user-defined resource constructors which are in a relationship

* `Parent.children(id, [callback])`: Fetches all the children for the specified `id`.
* `Parent.createChild(id, properties, [callback])`: Create a child for `id` with the specified `properties`.
* `Child.byParent(id, [callback])`: Fetches all the children for the parent given by `id`.

## Relationship Instance Methods

* `Parent.prototype.children([callback])`
* `Parent.prototype.createChild(properties, [callback])`
* `Child.prototype.parent([callback])`: Fetches the parent of the given child instance.

<a name="relationships"></a>
# Relational Resources

Resourceful supports a simple `Resource.parent` API, supports one-one, one-many, and many-many relationships.

### Documentation

 * [Relational Resources](https://github.com/flatiron/resourceful/wiki/Relational-Resources)

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
