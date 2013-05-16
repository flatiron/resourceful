var resourceful = require('../../resourceful'),
    Cache = resourceful.Cache;

exports.stores = {};
exports.caches = {};

var Memory = exports.Memory = function (options) {
  var counter = 0;
  options = options || {};
  this.uri = options.uri;

  this.increment = function () {
    return ++counter;
  };

  if (typeof(this.uri) === 'string') {
    // Application-wide store
    if (!exports.stores[this.uri]) {
      this.store = exports.stores[this.uri] = {};
      this.cache = exports.caches[this.uri] = new Cache();
    } else {
      // Use store that was created before
      this.store = exports.stores[this.uri];
      this.cache = exports.caches[this.uri];
    }
  }
  else {
    // Connection-wise store
    this.store = {};
    this.cache = new Cache();
  }
};

Memory.prototype.protocol = 'memory';

Memory.prototype.load = function (data) {
  if (data instanceof Array) {
    var tmp = {};
    data.forEach(function (e) {
      tmp[e.id] = JSON.stringify(e);
    });
    data = tmp;
  }

  this.store = data;

  // Update cache
  if (this.uri) {
    exports.stores[this.uri] = JSON.parse(JSON.stringify(this.store));
  }
  return this;
};

Memory.prototype.request = function (fn) {
  var self = this;

  process.nextTick(function () {
    fn.call(self);
  });
};

Memory.prototype.save = function (key, val, callback) {
  var args = Array.prototype.slice.call(arguments);
  var callback = args.pop(), val = args.pop();
  if (!args.length || !key) {
    key = this.increment();
    val.id = key;
  }

  // Forces key to be a string
  key += '';
  val.id += '';

  this.request(function () {
    this.store[key] = JSON.stringify(val);
    callback(null, val);
  });
};

Memory.prototype.put = function () {
  this.save.apply(this, arguments);
};

Memory.prototype.update = function (key, obj, callback) {
  var jsObj = JSON.parse(this.store[key] || "{}");
  this.put(key, resourceful.mixin({}, jsObj, obj), callback);
};

Memory.prototype.get =  function (key, callback) {
  this.request(function () {
    key = key.toString();
    return key in this.store ?
        callback(null, JSON.parse(this.store[key] || "null"))
        :
        callback({ status: 404 });
  });
};

Memory.prototype.destroy = function (key, callback) {
  this.request(function () {
    delete this.store[key];
    return callback(null, { status: 204 });
  });
};

Memory.prototype.find = function (conditions, callback) {
  var self = this,
      searchers = {};
  Object.keys(conditions).forEach(function (k) {
    searchers[k] = self._reduceFactory(conditions[k]);
  });

  this.search(function (obj) {
    return Object.keys(searchers).every(function (k) {
      return searchers[k](obj[k]);
    });
  }, callback);
};

Memory.prototype._reduceFactory = function(param) {
  if (param instanceof Array) {
    return function(value) {
      return param.indexOf(value) >= 0;
    };
  } else if (param instanceof Object) {
    if (param.key) {
      return function(value) {
        return param.key === value;
      };
    } else if (param.keys) {
      return function(value) {
        return param.keys.indexOf(value) >= 0;
      };
    } else if (param.keys().length === 0) {
      return function(value) {
        return true;
      };
    } else {
      throw new Error('Criteria object without key or keys fields');
    };
  } else {
    return function(value) {
       return param === value;
    }
  };
}

Memory.prototype.search = function (filter, callback) {
  this.request(function () {
    var result = [],
        store = this.store;

    Object.keys(this.store).forEach(function (k) {
      var obj = JSON.parse(store[k]);
      if (filter(obj)) {
        obj.id = obj.id.split('/').slice(1).join('/');
        result.push(obj);
      }
    });

    callback(null, result);
  });
};


Memory.prototype.filter = function (name, data) {
  var resource = data.resource,
      filter = data.filter,
      path = [resource._resource, name].join('/'),
      map;
  if (typeof(filter) === 'object') {
    if (filter.map) {
      // Mimic CouchDB's view API.
      map = new Function([
        'return (function (_doc, emit) {',
        '  (' + filter.map.toString() + ')(_doc)',
       '})'
      ].join('\n'));
      
      
      resource[name] = function (param, callback) {
        var results = [],
            reduce;
        if (typeof param === 'function') {
          callback = param;
          param = {};
        };
        reduce = resource.connection._reduceFactory(param);
        
        function emit(id, doc) {
          if(reduce(id)) {
            results.push(doc);
          };
        };
        
        resource.connection.request(function () {
          Object.keys(resource.connection.store).forEach(function (key) {
            map()(JSON.parse(resource.connection.store[key]), emit);
          });
          
          resource.view(path, { err: null, res: results }, callback);
        });
      };
    } else {
      // Simple object criteria (can use .find)
      resource[name] = function (callback) {
        var conditions = resourceful.mixin({}, {resource: resource._resource}, filter)
        resource.connection.find(conditions, function(err, res) {
          resource.view(path, { err: err, res: res }, callback);
        });
      };
    };
  } else if (typeof(filter) === 'function') {
    // Function which generates object criteria (can use .find)
    resource[name] = function (param, callback) {
      if (typeof param === 'function') {
        callback = param;
        param = {};
      };
      conditions = filter(param);
      conditions = resourceful.mixin({}, {resource: resource._resource}, conditions)
      resource.connection.find(conditions, function(err, res) {
        resource.view(path, { err: err, res: res }, callback);
      });
    };
  } else {
    throw new TypeError('Filter must be an object or function');
  };
};

Memory.prototype.view = function (path, opts, callback) {
  if(opts.err) {
    callback(opts.err);
  };
  callback(null, opts.res);
};

Memory.prototype.sync = function (factory, callback) {
  process.nextTick(function () { callback(); });
};
