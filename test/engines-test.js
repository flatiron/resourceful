var path = require('path')
  , assert = require('assert')
  , fs = require('fs')
  , vows = require('vows')
  , macros = require('./macros')
  , fixtures = require('./fixtures')
  , resourceful = require('../lib/resourceful');

//
// Load resourceful engines for testing from /engines/ folder
//
var engines = fs.readdirSync(path.join(__dirname, 'engines')).map(function (e) { return require('./engines/' + e.slice(0,-3)); });

//
// For every engine, we'll need to create a new resources,
// that each connect to the respective engine
//
var resources = {};

engines.forEach(function (e) {
  //
  // Create a new object to hold resources which will be defined in macros
  //
  resources[e] = {};

  vows.describe('resourceful/engines/' + e.name)
  .addBatch(macros.defineResources(e, resources)).addBatch({
    'In database "test"': {
      topic: function () {
        return null;
      },
      "an Resource.all() request": {
        topic: function () {
          resources[e].Author.all(this.callback);
        },
        "should respond with an array of all records": function (err, obj) {
          console.dir(obj);
          assert.isNull(err);
          assert.isArray(obj);
          assert.equal(obj.length, 3);
          assert.equal(obj[0].id, 'bob');
          assert.equal(obj[1].id, 'mat');
          assert.equal(obj[2].id, 'tim');
        }
      }
    }
  }).addBatch({
    'In database "test"': {
      topic: function () {
        return null;
      },
      "a Resource.get() request": {
        "when successful": {
          topic: function () {
            resources[e].Author.get("bob", this.callback);
          },
          "should respond with a Resource instance": function (err, obj) {
            assert.isNull(err);
            assert.isObject(obj);
            assert.instanceOf(obj, resourceful.Resource);
            assert.equal(obj.constructor, resources[e].Author);
          },
          "should respond with the right object": function (err, obj) {
            assert.isNull(err);
            assert.equal(obj.id, 'bob');
            assert.equal(obj.age, 35);
            assert.equal(obj.hair, 'black');
            assert.equal(obj.resource, 'Author');
          },
          "should not be a new record": function (err, obj) {
            assert.isNull(err);
            assert.isFalse(obj.isNewRecord);
          }
        },
        "when unsuccessful": {
          topic: function () {
            resources[e].Author.get("david", this.callback);
          },
          "should respond with an error": function (err, obj) {
            assert.equal(err.status, 404);
            assert.isUndefined(obj);
          }
        }
      }
    }
  }).addBatch({
    'In database "test"': {
      topic: function () {
        return null;
      },
      "a Resource.create() request": {
        topic: function () {
          resources[e].Author.create({id: 'han', age: 30, hair: 'red'}, this.callback);
        },
        "should return the newly created object": function (err, obj) {
          assert.isNull(err);
          assert.strictEqual(obj.constructor, resources[e].Author);
          assert.instanceOf(obj, resources[e].Author);
          assert.equal(obj.id, 'han');
          assert.equal(obj.age, 30);
          assert.equal(obj.hair, 'red');
          assert.equal(obj.resource, 'Author');
        },
        "should not be a new record": function (err, obj) {
          assert.isNull(err);
          assert.isFalse(obj.isNewRecord);
        },
        "should create the record in the db": {
          topic: function () {
            resources[e].Author.get('han', this.callback);
          },
          "should respond with a Resource instance": function (err, obj) {
            assert.isNull(err);
            assert.isObject(obj);
            assert.instanceOf(obj, resourceful.Resource);
            assert.equal(obj.constructor, resources[e].Author);
          },
          "should respond with the right object": function (err, obj) {
            assert.isNull(err);
            assert.equal(obj.id, 'han');
            assert.equal(obj.age, 30);
            assert.equal(obj.hair, 'red');
            assert.equal(obj.resource, 'Author');
          },
          "should not be a new record": function (err, obj) {
            assert.isNull(err);
            assert.isFalse(obj.isNewRecord);
          }
        }
      }
    }
  }).addBatch({
    'In database "test"': {
      topic: function () {
        return null;
      },
      "a diffirent Resource.create() request with the same id": {
        topic: function () {
          resources[e].Creature.create({id: 'han'}, this.callback);
        },
        "should return the newly created object": function (err, obj) {
          assert.isNull(err);
          assert.strictEqual(obj.constructor, resources[e].Creature);
          assert.instanceOf(obj, resources[e].Creature);
          assert.equal(obj.id, 'han');
          assert.equal(obj.resource, 'Creature');
        },
        "should not be a new record": function (err, obj) {
          assert.isNull(err);
          assert.isFalse(obj.isNewRecord);
        },
        "should create the record in the db": {
          topic: function () {
            resources[e].Creature.get('han', this.callback);
          },
          "should respond with a Resource instance": function (err, obj) {
            assert.isNull(err);
            assert.isObject(obj);
            assert.instanceOf(obj, resourceful.Resource);
            assert.equal(obj.constructor, resources[e].Creature);
          },
          "should respond with the right object": function (err, obj) {
            assert.isNull(err);
            assert.equal(obj.id, 'han');
            assert.equal(obj.resource, 'Creature');
          },
          "should not be a new record": function (err, obj) {
            assert.isNull(err);
            assert.isFalse(obj.isNewRecord);
          }
        }
      }
    }
  }).addBatch({
    'In database "test"': {
      topic: function () {
        return null;
      },
      "and a Resource.destroy() request": {
        topic: function () {
          resources[e].Author.destroy('han', this.callback);
        },
        "should be successful": function (err, obj) {
          assert.isNull(err);
        },
        "and Resource.get() the destroyed object": {
          topic: function () {
            resources[e].Author.get('han', this.callback);
          },
          "should respond with an error": function (err, obj) {
            assert.equal(err.status, 404);
            assert.isUndefined(obj);
          }
        }
      }
    }
  }).addBatch({
    "Instantiating a new instance": {
      topic: function () {
        return resources[e].Author.new({id: 'han', age: 30, hair: 'red'});
      },
      "should be a new record": function (obj) {
        assert.isTrue(obj.isNewRecord);
      },
      "should not be in the db": {
        topic: function () {
          resources[e].Author.get('han', this.callback);
        },
        "should respond with an error": function (err, obj) {
          assert.equal(err.status, 404);
          assert.isUndefined(obj);
        }
      }
    }
  }).addBatch({
    "Instantiating a new instance": {
      topic: function () {
        return resources[e].Author.new({id: 'han', age: 30, hair: 'red'});
      },
      "should be a new record": function (obj) {
        assert.isTrue(obj.isNewRecord);
      },
      "a Resource.prototype.save() request": {
        topic: function (obj) {
          obj.save(this.callback);
        },
        "should respond with a Resource instance": function (err, obj) {
          assert.isNull(err);
          assert.isObject(obj);
          assert.instanceOf(obj, resourceful.Resource);
          assert.equal(obj.constructor, resources[e].Author);
        },
        "should respond with the right object": function (err, obj) {
          assert.isNull(err);
          assert.equal(obj.id, 'han');
          assert.equal(obj.age, 30);
          assert.equal(obj.hair, 'red');
          assert.equal(obj.resource, 'Author');
        },
        "should not be a new record": function (err, obj) {
          assert.isNull(err);
          assert.isFalse(obj.isNewRecord);
        },
        "should create the object in db": {
          topic: function () {
            resources[e].Author.get('han', this.callback);
          },
          "should respond with a Resource instance": function (err, obj) {
            assert.isNull(err);
            assert.isObject(obj);
            assert.instanceOf(obj, resourceful.Resource);
            assert.equal(obj.constructor, resources[e].Author);
          },
          "should respond with the right object": function (err, obj) {
            assert.isNull(err);
            assert.equal(obj.id, 'han');
            assert.equal(obj.age, 30);
            assert.equal(obj.hair, 'red');
            assert.equal(obj.resource, 'Author');
          },
          "should not be a new record": function (err, obj) {
            assert.isNull(err);
            assert.isFalse(obj.isNewRecord);
          }
        }
      }
    }
  }).addBatch({
    'In database "test"': {
      topic: function () {
        return null;
      },
      "a Resource.find() request": {
        "when successful": {
          topic: function () {
            resources[e].Author.find({ hair: "black" }, this.callback);
          },
          "should respond with an array of length 2": function (err, obj) {
            assert.isNull(err);
            assert.equal(obj.length, 2);
          },
          "should respond with an array of Resource instances": function (err, obj) {
            assert.isNull(err);
            assert.isArray(obj);
            assert.instanceOf(obj[0], resourceful.Resource);
            assert.instanceOf(obj[1], resourceful.Resource);
            assert.equal(obj[0].id, 'bob');
            assert.equal(obj[0].age, 35);
            assert.equal(obj[0].hair, 'black');
            assert.equal(obj[0].resource, 'Author');
            assert.equal(obj[1].id, 'mat');
            assert.equal(obj[1].age, 29);
            assert.equal(obj[1].hair, 'black');
            assert.equal(obj[1].resource, 'Author');
          },
          "should not be a new record": function (err, obj) {
            assert.isNull(err);
            assert.isFalse(obj[0].isNewRecord);
            assert.isFalse(obj[1].isNewRecord);
          }
        },
        "when unsuccessful": {
          topic: function () {
            resources[e].Author.find({ hair: "blue" }, this.callback);
          },
          "should respond with an empty array": function (err, obj) {
            assert.isNull(err);
            assert.isArray(obj);
            assert.equal(obj.length, 0);
          }
        }
      }
    }
  }).addBatch({
    'In database "test"': {
      topic: function () {
        resources[e].Author.get('bob', this.callback);
      },
      "it should have 'bob' object": function (err, obj) {
        assert.isNull(err);
        assert.equal(obj.id, 'bob');
        assert.equal(obj.age, 35);
        assert.equal(obj.hair, 'black');
        assert.equal(obj.resource, 'Author');
      },
      "should not be a new record": function (err, obj) {
        assert.isNull(err);
        assert.isFalse(obj.isNewRecord);
      },
      "a Resource.update() request when successful": {
        topic: function () {
          resources[e].Author.update('bob', { age: 31 }, this.callback);
        },
				"should not crash when not passed a callback": function (err, obj) {
					resources[e].Author.update('mat', { age: 35, hair: 'brown' });
				},
			"should respond with a Resource instance": function (err, obj) {
				assert.isNull(err);
				assert.isObject(obj);
				assert.instanceOf(obj, resourceful.Resource);
				assert.equal(obj.constructor, resources[e].Author);
			},
        "should respond with the right object": function (err, obj) {
          assert.isNull(err);
          assert.equal(obj.id, 'bob');
          assert.equal(obj.age, 31);
          assert.equal(obj.hair, 'black');
          assert.equal(obj.resource, 'Author');
        },
        "should not be a new record": function (err, obj) {
          assert.isNull(err);
          assert.isFalse(obj.isNewRecord);
        },
        "should update the object in db": {
          topic: function () {
            resources[e].Author.get('bob', this.callback);
          },
          "should respond with a Resource instance": function (err, obj) {
            assert.isNull(err);
            assert.isObject(obj);
            assert.instanceOf(obj, resourceful.Resource);
            assert.equal(obj.constructor, resources[e].Author);
          },
          "should respond with the right object": function (err, obj) {
            assert.isNull(err);
            assert.equal(obj.id, 'bob');
            assert.equal(obj.age, 31);
            assert.equal(obj.hair, 'black');
            assert.equal(obj.resource, 'Author');
          },
          "should not be a new record": function (err, obj) {
            assert.isNull(err);
            assert.isFalse(obj.isNewRecord);
          }
        }
      }
    }
  }).addBatch({
    'In database "test"': {
      topic: function () {
        resources[e].Author.get('bob', this.callback);
      },
      "it should have 'bob' object": function (err, obj) {
        assert.isNull(err);
        assert.equal(obj.id, 'bob');
        assert.equal(obj.age, 31);
        assert.equal(obj.hair, 'black');
        assert.equal(obj.resource, 'Author');
      },
      "should not be a new record": function (err, obj) {
        assert.isNull(err);
        assert.isFalse(obj.isNewRecord);
      },
      "a Resource.save() request when successful": {
        topic: function (obj) {
          obj.age = 35;
          resources[e].Author.save(obj, this.callback);
        },
        "should respond with a Resource instance": function (err, obj) {
          assert.isNull(err);
          assert.isObject(obj);
          assert.instanceOf(obj, resourceful.Resource);
          assert.equal(obj.constructor, resources[e].Author);
        },
        "should respond with the right object": function (err, obj) {
          assert.isNull(err);
          assert.equal(obj.id, 'bob');
          assert.equal(obj.age, 35);
          assert.equal(obj.hair, 'black');
          assert.equal(obj.resource, 'Author');
        },
        "should not be a new record": function (err, obj) {
          assert.isNull(err);
          assert.isFalse(obj.isNewRecord);
        },
        "should update the object in db": {
          topic: function () {
            resources[e].Author.get('bob', this.callback);
          },
          "should respond with a Resource instance": function (err, obj) {
            assert.isNull(err);
            assert.isObject(obj);
            assert.instanceOf(obj, resourceful.Resource);
            assert.equal(obj.constructor, resources[e].Author);
          },
          "should respond with the right object": function (err, obj) {
            assert.isNull(err);
            assert.equal(obj.id, 'bob');
            assert.equal(obj.age, 35);
            assert.equal(obj.hair, 'black');
            assert.equal(obj.resource, 'Author');
          },
          "should not be a new record": function (err, obj) {
            assert.isNull(err);
            assert.isFalse(obj.isNewRecord);
          }
        }
      }
    }
  }).addBatch({
    'In database "test"': {
      topic: function () {
        resources[e].Author.get('bob', this.callback);
      },
      "it should have 'bob' object": function (err, obj) {
        assert.isNull(err);
        assert.equal(obj.id, 'bob');
        assert.equal(obj.age, 35);
        assert.equal(obj.hair, 'black');
        assert.equal(obj.resource, 'Author');
      },
      "should not be a new record": function (err, obj) {
        assert.isNull(err);
        assert.isFalse(obj.isNewRecord);
      },
      "a Resource.prototype.save() request": {
        topic: function (obj) {
          obj.age = 31;
          obj.hair = 'red';
          obj.save(this.callback);
        },
        "should respond with a Resource instance": function (err, obj) {
          assert.isNull(err);
          assert.isObject(obj);
          assert.instanceOf(obj, resourceful.Resource);
          assert.equal(obj.constructor, resources[e].Author);
        },
        "should respond with the right object": function (err, obj) {
          assert.isNull(err);
          assert.equal(obj.id, 'bob');
          assert.equal(obj.age, 31);
          assert.equal(obj.hair, 'red');
          assert.equal(obj.resource, 'Author');
        },
        "should not be a new record": function (err, obj) {
          assert.isNull(err);
          assert.isFalse(obj.isNewRecord);
        },
        "should save the object in db": {
          topic: function () {
            resources[e].Author.get('bob', this.callback);
          },
          "should respond with a Resource instance": function (err, obj) {
            assert.isNull(err);
            assert.isObject(obj);
            assert.instanceOf(obj, resourceful.Resource);
            assert.equal(obj.constructor, resources[e].Author);
          },
          "should respond with the right object": function (err, obj) {
            assert.isNull(err);
            assert.equal(obj.id, 'bob');
            assert.equal(obj.age, 31);
            assert.equal(obj.hair, 'red');
            assert.equal(obj.resource, 'Author');
          },
          "should not be a new record": function (err, obj) {
            assert.isNull(err);
            assert.isFalse(obj.isNewRecord);
          }
        }
      }
    }
  }).addBatch({
    'In database "test"': {
      topic: function () {
        resources[e].Author.get('bob', this.callback);
      },
      "it should have 'bob' object": function (err, obj) {
        assert.isNull(err);
        assert.equal(obj.id, 'bob');
        assert.equal(obj.age, 31);
        assert.equal(obj.hair, 'red');
        assert.equal(obj.resource, 'Author');
      },
      "should not be a new record": function (err, obj) {
        assert.isNull(err);
        assert.isFalse(obj.isNewRecord);
      },
      "a Resource.prototype.update() request": {
        topic: function (obj) {
          obj.update({ age: 35, hair: 'black' }, this.callback);
        },
				"should not crash when not passed a callback": function (err, obj) {
					obj.update({ age: 35, hair: 'black' });
				},
        "should respond with a Resource instance": function (err, obj) {
          assert.isNull(err);
          assert.isObject(obj);
          assert.instanceOf(obj, resourceful.Resource);
          assert.equal(obj.constructor, resources[e].Author);
        },
        "should respond with the right object": function (err, obj) {
          assert.isNull(err);
          assert.equal(obj.id, 'bob');
          assert.equal(obj.age, 35);
          assert.equal(obj.hair, 'black');
          assert.equal(obj.resource, 'Author');
        },
        "should not be a new record": function (err, obj) {
          assert.isNull(err);
          assert.isFalse(obj.isNewRecord);
        },
        "should update the object in db": {
          topic: function () {
            resources[e].Author.get('bob', this.callback);
          },
          "should respond with a Resource instance": function (err, obj) {
            assert.isNull(err);
            assert.isObject(obj);
            assert.instanceOf(obj, resourceful.Resource);
            assert.equal(obj.constructor, resources[e].Author);
          },
          "should respond with the right object": function (err, obj) {
            assert.isNull(err);
            assert.equal(obj.id, 'bob');
            assert.equal(obj.age, 35);
            assert.equal(obj.hair, 'black');
            assert.equal(obj.resource, 'Author');
          },
          "should not be a new record": function (err, obj) {
            assert.isNull(err);
            assert.isFalse(obj.isNewRecord);
          }
        }
      }
    }
  }).addBatch({
    'In database "test"': {
      topic: function () {
        resources[e].Author.get('han', this.callback);
      },
      "a Resource.prototype.destroy() request": {
        topic: function (obj) {
          obj.destroy(this.callback);
        },
        "should be successful": function (err, obj) {
          assert.isNull(err);
        },
        "should delete the object in db": {
          topic: function (obj) {
            resources[e].Author.get('han', this.callback);
          },
          "should be missing": function (err, obj) {
            assert.equal(err.status, 404);
          }
        }
      }
    }
  }).addBatch({
    'In database "test"': {
      topic: function () {
        resources[e].Author.get('bob', this.callback);
      },
      "a Resource.prototype.reload() request": {
        topic: function (obj) {
          obj.reload(this.callback);
        },
        "should respond with a Resource instance": function (err, obj) {
          assert.isNull(err);
          assert.isObject(obj);
          assert.instanceOf(obj, resourceful.Resource);
          assert.equal(obj.constructor, resources[e].Author);
        },
        "should respond with the right object": function (err, obj) {
          assert.isNull(err);
          assert.equal(obj.id, 'bob');
          assert.equal(obj.age, 35);
          assert.equal(obj.hair, 'black');
          assert.equal(obj.resource, 'Author');
        },
        "should not be a new record": function (err, obj) {
          assert.isNull(err);
          assert.isFalse(obj.isNewRecord);
        }
      }
    }
  }).addBatch({
    "Creating object without 'id'": {
      topic: function () {
        resources[e].Author.create({ age: 51, hair: 'white' }, this.callback);
      },
      "should be successful": function (err, obj) {
        assert.isNull(err);
        assert.notEqual(obj.id, undefined);
        assert.equal(obj.age, 51);
        assert.equal(obj.hair, 'white');
        assert.equal(obj.resource, 'Author');
      }
    }
  }).addBatch(multipleGet(e)).export(module);
});

function multipleGet(e) {
  if (e.name == 'memory') return {};
  return {
    "Getting multiple objects from ids when one object isn't found": {
      topic: function () {
        resources[e].Author.get(['bob', 'pun', 'tim'], this.callback);
      },
      "should be successful": function (err, obj) {
        assert.isNull(err);
        assert.equal(obj.length, 3);
        assert.equal(obj[0].id, 'bob');
        assert.equal(obj[1] || null, null);
        assert.equal(obj[2].id, 'tim');
      }
    }
  };
};
