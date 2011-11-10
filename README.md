# resourceful

A storage agnostic resource-oriented ODM for building prototypical models with validation and sanitization.

## Example

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
    this.property('diet'); // Defaults to String
    this.property('vertebrate', Boolean);
    this.property('belly', Array);
  });
  
  //
  // Now that the `Creature` prototype is defined
  // we can add custom logic to be available on all instances
  //
  Creature.prototype.feed = function (food) {
    this.belly.push(food);
  };
```

## Motivation
How often have you found yourself writing Model code in your application? Pretty often? Good! Unlike other "Object-Document Mappers" `resourceful` tries to only focus on two things:

1. A simple API for defining custom Model prototypes with validation. **No special sugar is required to instantiate prototypes defined by resourceful.**
2. Define an extensibility model for databases to provide CRUD functionality to Models along with custom query, filtering or updating specific to that specific implementation (Mongo, CouchDB, Redis, etc).

## API Documentation

### Defining resources

Here's the simplest of resources:

``` js
  var Creature = resourceful.define('creature');
```

The returned `Creature` object is a *resource constructor*, in other words, a *function*. Now let's add some properties to this constructor:

``` js
  Creature.property('diet'); // Defaults to String
  Creature.property('vertebrate', Boolean);
  Creature.property('belly', Array);
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
    diet:      'carnivor',
    vertebrate: true
  });
  
  wolf.feed('squirrel');
  console.dir(wolf.belly);
```

You can also define resources this way:

``` js
  var Creature = resourceful.define('creature', function () {
    this.property('diet');
    this.property('vertebrate', Boolean);
    this.property('belly', Array);

    this.prototype.feed = function (food) {
      this.belly.push(food);
    };
  });
```

### Defining properties with Resource.property

Lets define a *legs* property, which is the number of legs the creature has:

``` js
  Creature.property('legs', Number);
```

Note that this form is equivalent:

``` js
  Creature.property('legs', 'number');
```

If we wanted to constrain the possible values the property could take, we could pass in an object as the last parameter:

``` js
  Creature.property('legs', Number, {
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
  Creature.property('legs', Number)
          .required()
          .minimum(0)
          .maximum(8)
          .assert(function (val) { return val % 2 === 0 });
```

If you want to access and modify an already defined property, you can do it this way:

``` js
    Creature.properties['legs'].maximum(6);
```

### Saving and fetching resources

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

### Resource constructor methods

These methods are available on all user-defined resource constructors, as well as on the default `resourceful.Resource` constructor. In other "classy" languages these can be thought of as Class methods.

* `Resource.get(id, [callback])`: Fetch a resource by *id*.
* `Resource.update(id, properties, [callback])`: Update a resource with properties.
* `Resource.destroy(id, [callback])`: Destroy a resource by *id*.
* `Resource.all([callback])`: Fetches all resources of this type.
* `Resource.save(inst, [callback])`: Saves the specified resource instance `inst` by overwriting all properties. 
* `Resource.create(properties, [callback])`: Creates a new instance of the Resource with the specified `properties`

### Resource prototype methods

These are the *prototype* methods, available on resource instances created with the `new` operator. In other "classy" languages these can be thought of as Instance methods

* `Resource.prototype.save([callback])`
* `Resource.prototype.update(properties, [callback])`
* `Resource.prototype.destroy([callback])`
* `Resource.prototype.reload([callback])`

## Installation

### Installing npm (node package manager)
``` bash
  $ curl http://npmjs.org/install.sh | sh
```

### Installing resourceful
``` bash 
  $ [sudo] npm install resourceful
```

## Tests
All tests are written with [vows][0] and should be run with [npm][1]:

``` bash
  $ npm test
```

#### Author: [Alexis Sellier](http://cloudhead.io), [Charlie Robbins](http://nodejitsu.com)
#### Contributors: [Fedor Indutny](http://github.com/indutny), [Bradley Meck](http://github.com/bmeck)
#### License: Apache 2.0

[0]: http://vowsjs.org
[1]: http://npmjs.org

