var assert = require('assert'),
    vows = require('vows'),
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
        assert.isFunction(Factory.new);
        assert.isFunction(Factory.destroy);
        assert.isFunction(Factory.get);
        assert.isFunction(Factory.all);
        assert.isFunction(Factory.find);
        assert.isFunction(Factory.save);
        assert.isFunction(Factory.update);
      },
      "which can be called": {
        topic: function (Factory) {
          return new(Factory)();
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
          return new(Article)();
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
          assert.isFunction(article.reload);
        },
        "and doesn't have a value for `key`": function (article) {
          assert.isNull(article.key);
        }
      }
    }
  }
}).addVows({ // API
  "Default Resource instances": {
    topic: function () {
      return resourceful.define();
    },
    "have the `resource`, `define` and `property` methods": function (r) {
      assert.isString(r.resource);
      assert.isFunction(r.define);
      assert.isFunction(r.property);
      assert.isFunction(r.string);
      assert.isFunction(r.bool);
      assert.isFunction(r.array);
      assert.isFunction(r.number);
      assert.isFunction(r.object);
    },
    "resource should be set to 'Resource'": function (r) {
      assert.match(r.resource, /^Resource\d+/);
    },
    "the `properties` accessor returns an empty object": function (r) {
      assert.isObject(r.properties);
      assert.equal(Object.keys(r.properties).length, 1);
    },
    // Should it be a pointer to the 'id' property instead?
    "the `key` accessor is set to 'id' by default": function (r) {
      assert.equal(r.key, 'id');
    }
  }
}).addVows({ // property
  "A Resource with a couple of properties": {
    topic: function () {
      var r = resourceful.define('book');
      r.property('title').restricted();
      r.property('kind');
      return r;
    },
    "adds them to `Resource.properties`": function (r) {
      assert.equal(Object.keys(r.properties).length, 3);
      assert.include(r.properties, 'title');
      assert.include(r.properties, 'kind');
    },
    "When instantiated": {
      topic: function (R) {
        return new(R)({ title: 'The Great Gatsby', kind: 'Classic Novels' });
      },
      "should respond to toString()": function (r) {
        assert.equal(r.toString(), '{"id":null,"title":"The Great Gatsby","kind":"Classic Novels","resource":"Book"}');
      },
      "should respond to toJSON()": function (r) {
        assert.isObject(r.toJSON());
      },
      "should respond to safeJSON() without filtered properties": function (r) {
        var restricted = r.safeJSON();
        assert.isObject(restricted);

        assert.ok(!restricted.title);
        assert.ok(restricted.kind);

				assert.ok(!restricted._rev);
				assert.ok(!restricted._id);
				assert.ok(!restricted.resource);
      },
      "should return the attributes, when `Object.keys` is called": function (r) {
        var keys = Object.keys(r);
        assert.include(keys, 'title');
        assert.include(keys, 'kind');
        assert.include(keys, 'resource');
        assert.equal(keys.length, 4);
      },
      "should set the unspecified values to `undefined`": function (r) {
        assert.include(r, 'kind');
        assert.isString(r.kind);
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
    }
  },
  "A Resource with sanitized _id": {
    topic: function () {
      var r = this.r = resourceful.define();
      r.use('memory', 'memory://testx');
      r.property('id', 'string').sanitize('lower');

      new r({ id: 'AbC'}).save(this.callback);
    },
    "should be saved": {
      topic: function() {
        this.r.get('aBc', this.callback);
      },
      "and be found by non-sanitized_id": function (r) {
        assert.equal(r.id, 'abc');
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
        assert.throws(function () { p.type('unknwon'); }, TypeError);
      },
      "required": function (p) {
        p.required(true);
        assert.equal(p.property.required, true);
        assert.throws(function () { p.required(1); }, TypeError);
      },
      "unique": function (p) {
        p.unique(true);
        assert.equal(p.property.unique, true);
        assert.throws(function () { p.unique(1); }, TypeError);
      },
      "title": function (p) {
        p.title("the title");
        assert.equal(p.property.title, "the title");
        assert.throws(function () { p.title(false); }, TypeError);
      },
      "description": function (p) {
        p.description("the description");
        assert.equal(p.property.description, "the description");
        assert.throws(function () { p.title(false); }, TypeError);
      },
      "format": function (p) {
        p.format("email");
        assert.equal(p.property.format, "email");
        assert.throws(function () { p.format("unknown"); }, Error);
      },
      "storageName": function (p) {
        p.storageName("_kind");
        assert.equal(p.property.storageName, "_kind");
        assert.throws(function () { p.storageName(21); }, TypeError);
      },
      "conform": function (p) {
        p.conform(function (kind) { return kind !== "banana"; });
        assert.isFunction(p.property.conform);
        assert.throws(function () { p.conform("banana"); }, TypeError);
      },
      "lazy": function (p) {
        p.lazy(true);
        assert.equal(p.property.lazy, true);
        assert.throws(function () { p.lazy(1); }, TypeError);
      }
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
            p.sanitize('reset').sanitize('upper');
            return new this.Resource({kind: 'test'});
          },
          "and pass check": function (instance) {
            assert.equal(instance.kind, 'TEST');
          }
        },
        "sanitize('lower')": {
          topic: function (p) {
            p.sanitize('reset').sanitize('lower');
            return new this.Resource({kind: 'TEST'});
          },
          "and pass check": function (instance) {
            assert.equal(instance.kind, 'test');
          }
        },
        "sanitize('capitalize')": {
          topic: function (p) {
            p.sanitize('reset').sanitize('capitalize');
            return new this.Resource({kind: 'mexico'});
          },
          "and pass check": function (instance) {
            assert.equal(instance.kind, 'Mexico');
          }
        },
        "sanitize('pluralize')": {
          topic: function (p) {
            p.sanitize('reset').sanitize('pluralize');
            return new this.Resource({kind: 'test'});
          },
          "and pass check": function (instance) {
            assert.equal(instance.kind, 'tests');
          }
        },
        "sanitize('upper').sanitize('replace')": {
          topic: function (p) {
            p.sanitize('reset')
             .sanitize('upper')
             .sanitize('replace', /[^a-z]+/ig, '-');
            return new this.Resource({kind: 'hello world'});
          },
          "and pass check": function (instance) {
            assert.equal(instance.kind, 'HELLO-WORLD');
          }
        },
        "sanitize('replace')": {
          topic: function (p) {
            p.sanitize('reset').sanitize('replace', /[^a-z]+/g, '-');
            return new this.Resource({kind: 'hello world'});
          },
          "and pass check": function (instance) {
            assert.equal(instance.kind, 'hello-world');
          }
        },
        "sanitize('lower').sanitize('prefix')": {
          topic: function (p) {
            p.sanitize('reset').sanitize('lower').sanitize('prefix', 'a-prefix/');
            return new this.Resource({kind: 'HELLO-world'});
          },
          "and pass check": function (instance) {
            assert.equal(instance.kind, 'a-prefix/hello-world');
          }
        }
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
            p.sanitize('reset').sanitize('round');
            return new this.Resource({size: 10.5});
          },
          "and pass check": function (instance) {
            assert.equal(instance.size, 11);
          }
        },
        "sanitize(function () {...})": {
          topic: function (p) {
            p.sanitize('reset').sanitize(function (x) { return x * x; });
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
        }
      },
      "return an object which doesn't implement String 'definers'": function (p) {
        assert.isUndefined(p.pattern);
        assert.isUndefined(p.minLength);
      }
    }
  },
  "Engine can be initialised":{
    "by name": {
      "with options": {
          topic: function() {
            return function(r) {
              assert.equal(r.connection.host, "test");
              assert.equal(r.connection.port, 123);
              assert.equal(r.name, "db");
            }
          },
          "uri": function(f) {
            var r = resourceful.define();
            r.use("couchdb", { uri: "http://test:123/db" });
            f(r.connection.connection);
          },
          "uri + port": function(f) {
            var r = resourceful.define();
            r.use("couchdb", { uri: "http://test/db", port: 123 });
            f(r.connection.connection);
          },
          "uri + port + database": function(f) {
            var r = resourceful.define();
            r.use("couchdb", { uri: "http://test", database: "db", port: 123 });
            f(r.connection.connection);
          }
      },
      "or without": function() {
        resourceful.use('couchdb');
        assert.isFunction(resourceful.engine);
        assert.equal(resourceful.connection.protocol, 'couchdb');

        resourceful.use('memory');
        assert.isFunction(resourceful.engine);
        assert.equal(resourceful.connection.protocol, 'memory');
      },
    },
    "by reference": {
      "with options": {
          topic: function() {
            return function(r) {
              assert.equal(r.connection.host, "test");
              assert.equal(r.connection.port, 123);
              assert.equal(r.name, "db");
            }
          },
          "uri": function(f) {
            var r = resourceful.define();
            r.use(resourceful.engines.Couchdb, { uri: "http://test:123/db" });
            f(r.connection.connection);
          },
          "uri + port": function(f) {
            var r = resourceful.define();
            r.use(resourceful.engines.Couchdb, { uri: "http://test/db", port: 123 });
            f(r.connection.connection);
          },
          "uri + port + database": function(f) {
            var r = resourceful.define();
            r.use(resourceful.engines.Couchdb, { uri: "http://test", database: "db", port: 123 });
            f(r.connection.connection);
          }
      },
      "or without": function () {
        resourceful.use(resourceful.engines.Couchdb);
        assert.isFunction(resourceful.engine);
        assert.equal(resourceful.connection.protocol, 'couchdb');

        resourceful.use(resourceful.engines.Memory);
        assert.isFunction(resourceful.engine);
        assert.equal(resourceful.connection.protocol, 'memory');
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
    "with `object()`": {
      topic: function () {
        var r = resourceful.define();
        r.object('title');
        return r;
      },
      "should be type:'object'": function (r) {
        assert.equal(r.properties.title.type, "object");
      }
    },
    "with `string()`": {
      topic: function () {
        var r = resourceful.define();
        r.string('title', { maxLength: 16 });
        return r;
      },
      "should add an entry to `properties`": function (r) {
        assert.equal(r.properties.title.maxLength, 16);
      },
      "should be type:'string'": function (r) {
        assert.equal(r.properties.title.type, "string");
      }
    },
    "with `number()`": {
      topic: function () {
        var r = resourceful.define();
        r.number('rank', { minimum: 1 });
        return r;
      },
      "should add an entry to `properties`": function (r) {
        assert.equal(r.properties.rank.minimum, 1);
      },
      "should be type:'number'": function (r) {
        assert.equal(r.properties.rank.type, "number");
      }
    },
    "with `bool()`": {
      topic: function () {
        var r = resourceful.define();
        r.bool('active', {default: true});
        return r;
      },
      "should add an entry to `properties`": function (r) {
        assert.equal(r.properties.active.default, true);
      },
      "should be type:'boolean'": function (r) {
        assert.equal(r.properties.active.type, "boolean");
      }
    },
    "with `array()`": {
      topic: function () {
        var r = resourceful.define();
        r.array('emails', {minimum: 1});
        return r;
      },
      "should add an entry to `properties`": function (r) {
        assert.equal(r.properties.emails.minimum, 1);
      },
      "should be type:'array'": function (r) {
        assert.equal(r.properties.emails.type, "array");
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
    },
    "by chaining attribute setters with `string()`": {
      topic: function () {
        var r = resourceful.define();
        r.string('title')
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
}).export(module);


