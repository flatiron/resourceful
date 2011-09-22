var sys = require('sys'),
    events = require('events'),
    common = require('./common');

var resourceful = exports;

resourceful.env = 'development';
resourceful.resources  = {};
resourceful.Resource   = require('./resource').Resource;
resourceful.engines    = require('./engines');
resourceful.connection = new resourceful.engines.Memory();

//
// Select a storage engine
//
resourceful.use = function (engine, options) {
  if (typeof(engine) === "string") {
    if (resourceful.engines[engine]) {
      this.engine = resourceful.engines[engine];
    }
    else {
      throw new Error("unrecognised engine: %s", engine);
    }
  } else if (typeof engine === 'object') {
    this.engine = engine;
  }
  else {
    throw new Error("invalid engine");
  }

  this.connect(options || {});
  return this;
};
//
// Connect to the resource's storage engine, or one specified by the URI protocol
//
resourceful.connect = function (/* [uri], [port], [options] */) {
  var args = Array.prototype.slice.call(arguments),
      options = {},
      protocol,
      engine,
      m;

  args.forEach(function (a) {
    switch (typeof(a)) {
      case 'number': options.port = parseInt(a); break;
      case 'string': options.uri  = a;           break;
      case 'object': options      = a;           break;
    }
  });
  // Extract the optional 'protocol'
  // ex: "couchdb://127.0.0.1" would have "database" as protocol.
  if (m = options.uri && options.uri.match(/^([a-z]+):\/\//)) {
    protocol = m[1];
    options.uri = options.uri.replace(protocol + '://', '');
  }

  engine = protocol ? resourceful.engines[common.capitalize(protocol)] : resourceful.engine;
  this.connection = new(engine)(options);

  return this;
};

//
// Default Factory for creating new resources.
//
resourceful.define = function (name, definition) {
  if (typeof(name) === "function" && !definition) {
    definition = name;
    name = definition.name;
  }

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
      self._properties[k] = Factory.properties[k].default;
    });

    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        self._properties[k] = attrs[k];
      });
    }

    this._properties.resource = name;

    Object.keys(this._properties).forEach(function (k) {
      resourceful.defineProperty(self, k);
    });
  };

  //
  // Setup inheritance
  //
  Factory.__proto__           = resourceful.Resource;
  Factory.prototype.__proto__ = resourceful.Resource.prototype;

  //
  // Setup intelligent defaults for various properties
  // in the Resource Factory.
  //
  Factory.resource  = name;
  Factory.key       = '_id';
  Factory.views     = {};
  Factory._children = [];
  Factory._parents  = [];

  Factory.schema = {
    name: name,
    properties: {
      _id: { type: 'string', unique: true }
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
      return Factory['emitter'][k].apply(Factory['emitter'], arguments);
    };
  });

  Factory.on('error', function () {
    //
    // TODO: Logging
    //
  });

  (definition || function () {}).call(Factory);

  Factory.init();

  // Add this resource to the set of resources resourceful knows about
  resourceful.register(name, Factory);

  return Factory;
};

resourceful.defineProperty = function (obj, property) {
  Object.defineProperty(obj, property, {
    get: function () {
      return this.readProperty(property);
    },
    set: function (val) {
      return this.writeProperty(property, val);
    },
    enumerable: true
  });
};

//
// Adds the Factory to the set of known resources
//
resourceful.register = function (name, Factory) {
  return this.resources[name] = Factory;
};

//
// Removes the name from the set of known resources;
//
resourceful.unregister = function (name) {
  delete this.resources[name];
};

resourceful.instantiate = function (obj) {
  var instance, Factory, id;

  obj.resource = obj.resource || this.resource;
  Factory = resourceful.resources[obj.resource];

  id = obj[this.key];

  if (id && this.connection.cache.has(id)) {
    obj = this.connection.cache.get(id);
  }

  if (Factory) {
    // Don't instantiate an already instantiated object
    if (obj instanceof Factory) { return obj }
    else                        { return new(Factory)(obj) }
  } else {
    throw new(Error)("unrecognised resource '" + obj.resource + "'");
  }
};
