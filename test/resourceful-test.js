var path = require('path'),
    sys = require('sys'),
    assert = require('assert'),
    events = require('events'),
    http = require('http'),
    fs = require('fs'),
    vows = require('vows'),
    cradle = require('cradle'),
    resourceful = require('../lib/resourceful');

vows.describe('resourceful').addVows({
  "Resource()": {
    topic: function () {
      return resourceful.define();
    },
    "returns a Resource factory": {
      "which is a function": function (Factory) {
        assert.isFunction(Factory);
      },
      "and has the create/get/all/find methods": function (Factory) {
        assert.isFunction(Factory.create);
        assert.isFunction(Factory.destroy);
        assert.isFunction(Factory.get);
        assert.isFunction(Factory.all);
        assert.isFunction(Factory.find);
      },
      "which can be called": {
        topic: function (Factory) {
          return new(Factory);
        },
        "to return Resource instances which have prototype methods": function (resource) {
          assert.isFunction(resource.save);
          assert.isFunction(resource.update);
          assert.isFunction(resource.destroy);
          assert.isFunction(resource.reload);
        }
      }
    }
  },
  "Resource('article') with a function": {
    topic: function () {
      return resourceful.define('article', function () {
        this.data = 42;
      });
    },
    "returns an Article factory": {
      "with the resource name set": function (Article) {
        assert.equal(Article.resource, 'Article');
      },
      "and access to the `data` attribute": function (Article) {
        assert.equal(Article.data, 42);
      },
      "which can be called": {
        topic: function (Article) {
          this.constructor = Article;
          Article.prototype.data = 41;
          return new(Article);
        },
        "returning Article instances": function (article) {
          assert.isObject(article);
          assert.equal(article.constructor, this.constructor);
          assert.equal(article.data, 41);
        },
        "returning an object which inherits from Resource's prototype": function (article) {
          assert.isFunction(article.save);
          assert.isFunction(article.update);
          assert.isFunction(article.destroy);
        },
        "and doesn't have a value for `id` and `key`": function (article) {
          assert.isUndefined(article.id);
          assert.isUndefined(article.key);
        }
      }
    }
  }
}).addVows({ // API
  "Default Resource instances": {
    topic: function () {
      return resourceful.define();
    },
    "have the `resource`, `property` and `define` methods": function (r) {
      assert.isString(r.resource);
      assert.isFunction(r.property);
      assert.isFunction(r.define);
    },
    "resource should be set to 'Resource'": function (r) {
      assert.match(r.resource, /^Resource\d+/);
    },
    "the `properties` accessor returns an object with only the '_id' property": function (r) {
      assert.isObject(r.properties);
      assert.equal(Object.keys(r.properties).length, 1);
      assert.include(r.properties, '_id');
    },
    // Should it be a pointer to the 'id' property instead?
    "the `key` accessor is set to '_id' by default": function (r) {
      assert.equal(r.key, '_id');
    }
  }
}).addVows({ // property
  "A Resource with a couple of properties": {
    topic: function () {
      var r = resourceful.define('book');
      r.property('title');
      r.property('kind');
      return r;
    },
    "adds them to `Resource.properties`": function (r) {
      assert.equal(Object.keys(r.properties).length,3);
      assert.include(r.properties, 'title');
      assert.include(r.properties, 'kind');
    },
    "When instantiated": {
      topic: function (R) {
        return new(R)({ title: 'The Great Gatsby' });
      },
      "should respond to toString()": function (r) {
        assert.equal(r.toString(), '{"title":"The Great Gatsby","resource":"Book"}');
      },
      "should respond to toJSON()": function (r) {
        assert.isObject(r.toJSON());
      },
      "should return the attributes, when `Object.keys` is called": function (r) {
        var keys = Object.keys(r);
        assert.include(keys, '_id');
        assert.include(keys, 'title');
        assert.include(keys, 'kind');
        assert.include(keys, 'resource');
        assert.equal(keys.length, 4);
      },
      "should set the unspecified values to `undefined`": function (r) {
        assert.include(r, 'kind');
        assert.isUndefined(r.kind);
      }
    }
  },
  "A Resource with duplicate properties": {
    topic: function () {
      var r = resourceful.define();
      r.property('dup');
      r.property('dup');
      return r;
    },
    "only keeps the last copy": function (r) {
      assert.equal(Object.keys(r.properties).length, 2); // 'dup' & 'id'
    },
  },
  "A Resource with sanitized _id": {
    topic: function () {
      var r = this.r = resourceful.define();
      r.use('memory', 'memory://testx');
      r.property('_id', 'string').sanitize('lower');

      new r({ _id: 'AbC'}).save(this.callback);
    },
    "should be saved": {
      topic: function() {
        this.r.get('aBc', this.callback);
      },
      "and be found by non-sanitized_id": function (r) {
        console.error(r);
      }
    }
  },
  "The `property()` method": {
    topic: function () {
      this.Resource = resourceful.define();
      return this.Resource.property('kind');
    },
    "returns an object which implements": {
      "requires": function (p) {},
      "type": function (p) {
        p.type('integer');
        assert.equal(p.property.type, "integer");
        assert.throws(function () { p.type('unknwon') }, TypeError);
      },
      "required": function (p) {
        p.required(true);
        assert.equal(p.property.required, true);
        assert.throws(function () { p.required(1) }, TypeError);
      },
      "unique": function (p) {
        p.unique(true);
        assert.equal(p.property.unique, true);
        assert.throws(function () { p.unique(1) }, TypeError);
      },
      "title": function (p) {
        p.title("the title");
        assert.equal(p.property.title, "the title");
        assert.throws(function () { p.title(false) }, TypeError);
      },
      "description": function (p) {
        p.description("the description");
        assert.equal(p.property.description, "the description");
        assert.throws(function () { p.title(false) }, TypeError);
      },
      "format": function (p) {
        p.format("email");
        assert.equal(p.property.format, "email");
        assert.throws(function () { p.format("unknown") }, Error);
      },
      "storageName": function (p) {
        p.storageName("_kind");
        assert.equal(p.property.storageName, "_kind");
        assert.throws(function () { p.storageName(21) }, TypeError);
      },
      "conform": function (p) {
        p.conform(function (kind) { kind !== "banana" });
        assert.isFunction(p.property.conform);
        assert.throws(function () { p.conform("banana") }, TypeError);
      },
      "lazy": function (p) {
        p.lazy(true);
        assert.equal(p.property.lazy, true);
        assert.throws(function () { p.lazy(1) }, TypeError);
      },
    },
    "with a 'string' type": {
      topic: function () {
        this.Resource = resourceful.define();
        return this.Resource.property('kind', String);
      },
      "returns an object which implements": {
        "pattern": function (p) {},
        "minLength": function (p) {},
        "maxLength": function (p) {},
        "length": function (p) {},
        "sanitize('upper')": {
          topic: function (p) {
            p.sanitize('upper');
            return new this.Resource({kind: 'test'});
          },
          "and pass check": function (instance) {
            assert.equal(instance.kind, 'TEST');
          }
        },
        "sanitize('lower')": {
          topic: function (p) {
            p.sanitize('lower');
            return new this.Resource({kind: 'TEST'});
          },
          "and pass check": function (instance) {
            assert.equal(instance.kind, 'test');
          }
        },
        "sanitize('capitalize')": {
          topic: function (p) {
            p.sanitize('capitalize');
            return new this.Resource({kind: 'mexico'});
          },
          "and pass check": function (instance) {
            assert.equal(instance.kind, 'Mexico');
          }
        },
        "sanitize('pluralize')": {
          topic: function (p) {
            p.sanitize('pluralize');
            return new this.Resource({kind: 'test'});
          },
          "and pass check": function (instance) {
            assert.equal(instance.kind, 'tests');
          }
        },
        "sanitize('replace')": {
          topic: function (p) {
            p.sanitize('replace', /[^a-z]+/g, '-');
            return new this.Resource({kind: 'hello world'});
          },
          "and pass check": function (instance) {
            assert.equal(instance.kind, 'hello-world');
          }
        },
      }
    },
    "with a 'number' type": {
      topic: function () {
        this.Resource = resourceful.define();
        return this.Resource.property('size', Number);
      },
      "returns an object which implements": {
        "minimum": function (p) {},
        "maximum": function (p) {},
        "within": function (p) {},
        "sanitize('round')": {
          topic: function (p) {
            p.sanitize('round');
            return new this.Resource({size: 10.5});
          },
          "and pass check": function (instance) {
            assert.equal(instance.size, 11);
          }
        },
        "sanitize(function () {...})": {
          topic: function (p) {
            p.sanitize(function (x) { return x * x; });
            return new this.Resource({size: 3});
          },
          "and pass check": function (instance) {
            assert.equal(instance.size, 9);
          },
          "with changing property\'s value": {
            topic: function(instance) {
              instance.size = 30;
              return instance.size;
            },
            "and pass check": function (size) {
              assert.equal(size, 900);
            }
          }
        },
      },
      "return an object which doesn't implement String 'definers'": function (p) {
        assert.isUndefined(p.pattern);
        assert.isUndefined(p.minLength);
      }
    }
  }
}).addVows({
  "Defining a Resource schema": {
    "with `property()`": {
      topic: function () {
        var r = resourceful.define();
        r.property('title', String, { maxLength: 16 });
        r.property('description', { maxLength: 32 });
        return r;
      },
      "should add an entry to `properties`": function (r) {
        assert.equal(r.properties.title.maxLength, 16);
        assert.equal(r.properties.description.maxLength, 32);
      },
      "should default to type:'string'": function (r) {
        assert.equal(r.properties.title.type, "string");
        assert.equal(r.properties.description.type, "string");
      }
    },
    "with constructor's call": {
      topic: function () {
        var r = resourceful.define({
          properties: {
            title: {
              type: "string",
              maxLength: 16
            },
            description: {
              type: "string",
              maxLength: 32
            }
          }
        });
        return r;
      },
      "should add entries to `properties`": function (r) {
        assert.equal(r.properties.title.maxLength, 16);
        assert.equal(r.properties.description.maxLength, 32);
      }
    },
    "with `define()`": {
      topic: function () {
        var r = resourceful.define();
        r.define({
          properties: {
            title: {
              type: "string",
              maxLength: 16
            },
            description: {
              type: "string",
              maxLength: 32
            }
          }
        });
        return r;
      },
      "should add entries to `properties`": function (r) {
        assert.equal(r.properties.title.maxLength, 16);
        assert.equal(r.properties.description.maxLength, 32);
      }
    },
    "by chaining attribute setters": {
      topic: function () {
        var r = resourceful.define();
        r.property('title').type('string')
                           .maxLength(16)
                           .minLength(0);
        return r;
      },
      "should work just the same": function (r) {
        assert.equal(r.properties.title.type, "string");
        assert.equal(r.properties.title.maxLength, 16);
        assert.equal(r.properties.title.minLength, 0);
      }
    }
  }
}).addVows({ // CRUD
  "Data queries": {
    "on the Resource factory": {
      "with default Resources": {
        topic: function () {
          new(resourceful.engines.Memory)({uri: 'data-queries'}).load({
            bob: { _id: 42, age: 35, hair: 'black'},
            tim: { _id: 43, age: 16, hair: 'brown'},
            mat: { _id: 44, age: 29, hair: 'black'}
          });
          return resourceful.define('poop').connect('memory://data-queries');
        },
        "a get() request": {
          "when successful": {
            topic: function (r) {
              this.Factory = r;
              r.get("bob", this.callback);
            },
            "should respond with a Resource instance": function (e, obj) {
              assert.isObject(obj);
              assert.instanceOf(obj, resourceful.Resource);
              assert.equal(obj.constructor, this.Factory);
            },
            "should respond with the right object": function (e, obj) {
              assert.equal(obj._id, 42);
            }
          },
          "when unsuccessful": {
            topic: function (r) {
              r.get("david", this.callback);
            },
            "should respond with an error": function (e, obj) {
              assert.equal(e.status, 404);
              assert.isUndefined(obj);
            }
          }
        },
        "a find() request": {
          "when successful": {
            topic: function (r) {
              r.find({ hair: "black" }, this.callback);
            },
            "should respond with an array of length 2": function (e, obj) {
              assert.equal(obj.length, 2);
            },
            "should respond with an array of Resource instances": function (e, obj) {
              assert.isArray(obj);
              assert.instanceOf(obj[0], resourceful.Resource);
              assert.instanceOf(obj[1], resourceful.Resource);
            }
          },
          "when unsuccessful": {
            topic: function (r) { r.find({ hair: "blue" }, this.callback); },
            "should respond with an empty array": function (e, obj) {
              assert.isArray(obj);
              assert.equal(obj.length, 0);
            }
          }
        },
        "an all() request": {
          topic: function (r) {
            r.all(this.callback);
          },
          "should respond with an array of all records": function (e, obj) {
            assert.isArray(obj);
            assert.equal(obj.length, 3);
          }
        },
        "a create() request": {
          topic: function (r) {
            this.Factory = r;
            r.create({ _id: '99', age: 30, hair: 'red'}, this.callback);
          },
          "should return the newly created object": function (e, obj) {
            assert.isNull(e);
            assert.strictEqual(obj.constructor,this.Factory);
            assert.instanceOf(obj,this.Factory);
            assert.equal(obj.id,99);
          },
          "should create the record in the db": function (e, res) {
            assert.isObject(this.Factory.connection.store['99']);
            assert.equal(this.Factory.connection.store['99'].age, 30);
          }
        }
      },
      "with user Resources": {
        topic: function () {
          resourceful.resources.Article = resourceful.define('article');
          var connection = new(resourceful.engines.Memory)('articles').load({
            42: { _id: 42, title: 'on flasks', resource: 'Article'},
            43: { _id: 43, title: 'on eras',   resource: 'Article'},
            44: { _id: 44, title: 'on people', resource: 'Article'}
          });
          resourceful.resources.Article.connection = connection;
          return resourceful.resources.Article;
        },
        "a get() request": {
          topic: function (r) {
            r.get(42, this.callback);
          },
          "should respond with an Article instance": function (e, obj) {
            assert.isObject(obj);
            assert.instanceOf(obj, resourceful.resources.Article);
            assert.equal(obj.constructor, resourceful.resources.Article);
            assert.equal(obj.resource, 'Article');
          },
          "should respond with the right object": function (e, obj) {
            assert.equal(obj._id, 42);
          }
        }
      },
      "with heterogenous data": {
        topic: function () {
          resourceful.resources.Article = resourceful.define('article');
          var connection = new(resourceful.engines.Memory)('heterogenous').load({
            42:  { _id: 42, title: 'on flasks', resource: 'Article'},
            bob: { _id: 42, age: 35, hair: 'black'},
            tim: { _id: 43, age: 16, hair: 'brown'},
            44:  { _id: 44, title: 'on people', resource: 'Article'}
          });

          resourceful.resources.Article.connection = connection;
          return resourceful.resources.Article;
        },
        "an all() request": {
          topic: function (r) {
            this.Factory = r;
            r.all(this.callback);
          },
          "should respond with a mix of Resource and Article instances": function (e, obj) {
            assert.equal(obj[0].constructor, resourceful.resources.Article);
            assert.equal(obj[1].constructor, resourceful.resources.Article);
            assert.equal(obj[2].constructor, this.Factory);
            assert.equal(obj[3].constructor, this.Factory);
          }
        }
      }
    },
    "on a Resource instance": {
      "with a default resource": {
        topic: function () {
          var conn = this.connection = new(resourceful.engines.Memory)();
          this.Resource = resourceful.define(function () {
            this.connection = conn;
          });
          return new(this.Resource)({ _id: '42', name: "bob" });
        },
        "the `isNewRecord` flag should be true": function (r) {
          assert.strictEqual(r.isNewRecord, true);
        },
        "a save() query": {
          topic: function (r) {
            this.r = r;
            r.save(this.callback);
          },
          "should save the document in the store": function (res) {
            assert.include(this.Resource._connection.store, '42');
            assert.equal(this.Resource._connection.store[42].name, "bob");
          },
          "should set the `resource` attribute accordingly": function (res) {
            assert.equal(this.Resource._connection.store[42].resource,
                         this.Resource._resource);
          },
          "should set the `isNewRecord` flag to false": function () {
            assert.strictEqual(this.r.isNewRecord, false);
          },
          "and an update query": {
            topic: function (_, r) {
              r.update({ name: "bobby" }, this.callback);
            },
            "should update the document": function (res) {
              assert.equal(this.Resource._connection.store[42].name, "bobby");
            }
          }
        }
      },
      "with a user resource": {
        topic: function () {
          var conn = this.connection = new(resourceful.engines.Memory)();
          this.User = resourceful.define('user', function () {
            this.connection = conn;
          });
          return new(this.User)({ _id: '55', name: "fab" });
        },
        "a save() query": {
          topic: function (r) {
            this.r = r;
            r.save(this.callback);
          },
          "should save the document in the store": function (res) {
            assert.include(this.User._connection.store, '55');
            assert.equal(this.User._connection.store[55].name, "fab");
          },
          "should set the `resource` attribute accordingly": function (res) {
            assert.equal(this.User._connection.store[55].resource, "User");
          },
          "and an update query": {
            topic: function (_, r) {
              r.update({ name: "bobby" }, this.callback);
            },
            "should update the document": function (res) {
              assert.equal(this.User._connection.store[55].name, "bobby");
            }
          }
        }
      }
    }
  }
}).export(module);


