var events = require('events'),
    common = require('./common'),
    init = require('./init');

var Resourceful = module.exports = function (options) {
  if (!(this instanceof Resourceful)) return new Resourceful(options);

  this.env = options.env || 'development';
  this.autoMigrate = true;
  this.resources = {};
  // TODO: Add Resource back when we have decoupled it from using the singleton
  // resourceful.Resource   = require('./resource').Resource;
  this.engines = require('./engines');
  this.connection = options.connection || new this.engines.Memory();
  this.deferredRelationships = {};

  //
  // Default resource I guess?
  //
  this.resources.Resource = this.define('resource');
  //
  // Functions that I guess we'll just throw on the instance for now
  // TODO:maybe not do this because its pretty meh
  //
  this.uuid = require('node-uuid');
  this.typeof = common.typeOf;
  this.mixin = common.mixin;
  this.clone = common.clone;
  this.async = common.async;
  this.capitalize = common.capitalize;
  this.pluralize = common.pluralize;
  this.lowerize = common.lowerize;
  this.render = common.render;

  this.init = init;
};

//
// Select a storage engine
//
Resourceful.prototype.use = function (engine, options) {
  if (typeof(engine) === "string") {
    engine = common.capitalize(engine);

    if (resourceful.engines[engine]) {
      this.engine = resourceful.engines[engine];
    }
    else {
      throw new Error("unrecognised engine: " + engine);
    }
  }
  else if (typeof engine === 'function') {
    this.engine = engine;
  }
  else {
    throw new Error("invalid engine ");
  }

  this.key = this.engine.key || 'id';
  this.connect(options || {});

  return this;
};

//
// Connect to the resource's storage engine, or one specified by the URI protocol
//
Resourceful.prototype.connect = function (/* [uri], [port], [options] */) {
  var args = Array.prototype.slice.call(arguments),
      options = {},
      resourceful = this
      protocol,
      engine,
      m;

  args.forEach(function (a) {
    switch (typeof(a)) {
      case 'number': options.port = parseInt(a, 10); break;
      case 'string': options.uri  = a; break;
      case 'object': options      = a; break;
    }
  });

  // Extract the optional 'protocol' if we haven't already selected an engine
  // ex: "couchdb://127.0.0.1" would have "couchdb" as it's protocol.

  if (!this.engine) {
    if (m = options.uri && options.uri.match(/^([a-z]+):\/\//)) {
      protocol = common.capitalize(m[1]);

      if (resourceful.engines[protocol]) {
        engine = resourceful.engines[protocol];
      }
      else {
        throw new Error("unrecognised engine: " + engine);
      }
    }
  }
  else {
    engine = this.engine;
  }

  this.connection = new(engine)(options);

  return this;
};

//
// Default Factory for creating new resources.
//
Resourceful.prototype.define = function (name, definition) {
  if ((typeof name === "function" || typeof name === 'object') && !definition) {
    definition = name;
    name = definition.name;
  }

  var resourceful = this;

  if (name) {
    name = common.capitalize(name);
  }
  else {
    // Use the next available resource name
    for (var i = 0; !name || (name in resourceful.resources); i++) {
      name = 'Resource' + i;
    }
  }

  var Factory = function Factory (attrs) {
    var self = this;

    resourceful.Resource.call(this);

    Object.defineProperty(this, '_properties', {
      value: {},
      enumerable: false
    });

    Object.keys(Factory.properties).forEach(function (k) {
      self._properties[k] = Factory.properties[k]['default'];
    });

    this._properties.resource = name;

    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        self._properties[k] = attrs[k];
      });
    }

    //
    // Resource.method definitions
    //
    // TODO: add ID lookup here for instance methods
    for (var m in Factory) {
      if(typeof Factory[m] !== 'undefined' && Factory[m].type === "method") {
        if(typeof this[m] !== 'undefined') {
          throw new Error(m + ' is a reserved word on the Resource instance');
        }
        this[m] = Factory[m];
        this[m].type = "method" ;
        this[m].required = false;
      }
    }
    Object.keys(this._properties).forEach(function (k) {
      resourceful.defineProperty(self, k, Factory.schema.properties[k]);
    });
  };

  //
  // Setup inheritance
  //
  Factory.__proto__ = resourceful.Resource;
  Factory.prototype.__proto__ = resourceful.Resource.prototype;

  //
  // Setup intelligent defaults for various properties
  // in the Resource Factory.
  //
  Factory.resource  = name;
  Factory.lowerResource = common.lowerize(name);

  Factory.views     = {};
  Factory._children = [];
  Factory._parents  = [];

  Factory.schema = {
    name: name,
    properties: {
      id: {
        type: 'any',
        required: false
      }
    },
    links: []
  };

  Factory.hooks = {
    before: {},
    after:  {}
  };

  ['get', 'save', 'update', 'create', 'destroy'].forEach(function (m) {
    Factory.hooks.before[m] = [];
    Factory.hooks.after[m]  = [];
  });

  Factory.emitter = new events.EventEmitter();

  Object.keys(events.EventEmitter.prototype).forEach(function (k) {
    Factory[k] = function () {
      return Factory.emitter[k].apply(Factory.emitter, arguments);
    };
  });

  Factory.on('error', function (err) {
    // Maybe use actual error handler depending. This isnt fatal
    // TODO: make resourceful an event emitter and proxy errors
  });

  if (typeof definition === 'object') {
    // Use definition as schema
    Factory.define(definition);
  } else {
    (definition || function () {}).call(Factory);
  }

  Factory.init();

  // Add this resource to the set of resources resourceful knows about
  this.register(name, Factory);

  //
  // Check to see if any defferred relationships from previously loaded resources relate to this resource
  //
  if(typeof resourceful.deferredRelationships[Factory.resource] !== 'undefined') {
    //
    // For every deferredRelationship we find to our current resource, call it!
    //
    resourceful.deferredRelationships[Factory.resource].forEach(function(r){
      resourceful.resources[r].parent(Factory.resource);
    });
  }

  return Factory;
};

Resourceful.prototype.defineProperty = function (obj, property, schema) {
  var resourceful = this;

  schema = schema || {};

  // Call setter if needed
  if (schema.set) {
    obj.writeProperty(property, obj.readProperty(property), schema.set);
  }

  // Sanitize defaults and per-creation properties
  if (schema.sanitize) {
    var val = obj.readProperty(property);
    if (val !== undefined) {
      obj.writeProperty(property, schema.sanitize(val));
    }
  }

  Object.defineProperty(obj, property, {
    get: function () {
      return this.readProperty(property, schema.get);
    },
    set: schema.sanitize ? function (val) {
      return this.writeProperty(property, schema.sanitize(val), schema.set);
    } : function (val) {
      return this.writeProperty(property, val, schema.set);
    },
    enumerable: true
  });

  if (typeof obj[property] === 'undefined') {
    obj[property] = init(obj, property, schema);
  }
};

//
// Adds the Factory to the set of known resources
//
Resourceful.prototype.register = function (name, Factory) {
  return this.resources[name] = Factory;
};

//
// Removes the name from the set of known resources;
//
Resourceful.prototype.unregister = function (name) {
  delete this.resources[name];
};

Resourceful.prototype.instantiate = function (obj) {
  var instance, Factory, id, resourceful = this;

  Factory = resourceful.resources[this.resource];

  id = obj[this.key];

  if (id && this.connection.cache.has(id)) {
    obj = this.connection.cache.get(id);
  }

  if (Factory) {
    // Don't instantiate an already instantiated object
    if (obj instanceof Factory) { return obj; }
    else {
      instance = new Factory(obj);
      instance.isNewRecord = false;
      return instance;
    }
  } else {
    throw new Error("unrecognised resource '" + obj.resource + "'");
  }
};
