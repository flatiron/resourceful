# resourceful



Defining resources
------------------

Here's the simplest of resources:

    var Creature = resourceful.define('creature');

The returned `Creature` object is a *resource constructor*, in other words, a *function*.

Now let's add some properties to this constructor:

    Creature.property('diet'); // Defaults to String
    Creature.property('vertebrate', Boolean);
    Creature.property('belly', Array);

And add a method to the prototype:

    Creature.prototype.feed = function (food) {
        this.belly.push(food);
    };

Now lets instantiate a Creature, and feed it:

    var wolf = new(Creature)({
        diet:      'carnivor',
        vertebrate: true
    });
    wolf.feed('squirrel');

You can also define resources this way:

    var Creature = resourceful.define('creature', function () {
        this.property('diet');
        this.property('vertebrate', Boolean);
        this.property('belly', Array);
    
        this.prototype.feed = function (food) {
            this.belly.push(food);
        };
    });

Defining properties with `Resource.property`
--------------------------------------------

`Resource.property(name, type='string', options={})`

Lets define a *legs* property, which is the number of legs the creature has:

    Creature.property('legs', Number);

Note that this form is equivalent:

    Creature.property('legs', 'number');

If we wanted to constrain the possible values the property could take,
we could pass in an object as the last parameter:

    Creature.property('legs', Number, {
        required: true,

        minimum: 0,
        maximum: 8,

        assert: function (val) {
            return val % 2 === 0;
        }
    });

Now resourceful won't let `Creature` instances be saved unless the *legs* property
has a value between `0` and `8`, and is *even*,

This style is also valid for defining properties:

    Creature.property('legs', Number)
            .required()
            .minimum(0)
            .maximum(8)
            .assert(function (val) { return val % 2 === 0 });

If you want to access and modify an already defined property, you can do it this way:

    Creature.properties['legs'].maximum(6);

Saving and fetching resources
-----------------------------

    Wolf.create({ name: 'Wolverine', age: 68 }, function (err, wolf) {
        if (err) { throw new(Error)(err) }

        console.log(wolf); // { _id: 42, resource: 'wolf', name: 'Wolverine', age: 68 }

        wolf.age ++;
        wolf.save(function (err) {
            if (!err) console.log('happy birthday ' + wolf.name + '!');
        });
    });

    Wolf.get(42, function (e, wolf) {
        if (e) { throw new(Error)(e) }

        wolf.update({ fur: 'curly' }, function (e, wolf) {
            console.log(wolf.fur); // "curly"
        });
    });

Resource constructor methods
----------------------------

These methods are available on all user-defined resource constructors,
as well as on the default `resourceful.Resource` constructor.

### `Resource.get(id, [callback])`

Fetch a resource by *id*.

### `Resource.update(id, properties, [callback])`

Update a resource with properties.

### `Resource.destroy(id, [callback])`

Destroy a resource by *id*.

### `Resource.all([callback])`

Fetches all resources of this type.

### `Resource.save(properties, [callback])`
### `Resource.create(properties, [callback])`

Resource prototype methods
--------------------------

These are the *prototype* methods, available on resource instances
created with the `new` operator.

### `Resource.prototype.save([callback])`
### `Resource.prototype.update(properties, [callback])`
### `Resource.prototype.destroy([callback])`
### `Resource.prototype.reload([callback])`
