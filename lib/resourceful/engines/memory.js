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
      tmp[e._id] = e;
    });
    data = tmp;
  }

  this.store = data;

  // Update cache
  if (this.uri) {
    exports.stores[this.uri] = data;
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
    val._id = key;
  }

  // Forces key to be a string
  key += '';
  val._id += '';

  this.request(function () {
    var update = key in this.store;
    this.store[key] = val;
    callback(null, resourceful.mixin({ status: update ? 200 : 201 }, val));
  });
};

Memory.prototype.put = function () {
  this.save.apply(this, arguments);
};

Memory.prototype.update = function (key, obj, callback) {
  this.put(key, resourceful.mixin({}, this.store[key], obj), callback);
};

Memory.prototype.get =  function (key, callback) {
  this.request(function () {
    key = key.toString();
    return key in this.store ?
        callback(null, this.store[key])
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
  var self = this;

  this.request(function () {
    var results = [];
    Object.keys(self.store).forEach(function (key) {
      var obj = self.store[key];
      Object.keys(conditions).forEach(function (k) {
        if (conditions[k] === obj[k]) {
          results.push(obj);
        }
      });
    });
    callback(null, results);
  });
}

Memory.prototype.filter = function (name, data) {
  var self = this,
      map = typeof data.filter === 'function' ? data.filter : data.filter.map;

  map = new Function([
    'return (function (_doc, emit) {',
    '  (' + map.toString() + ')(_doc)',
    '})'
  ].join('\n'));

  data.resource[name] = function (callback) {
    var results = [];

    //
    // Mimic CouchDB's view API.
    //
    function emit(id, doc) {
      results.push(self.store[doc._id]);
    }

    self.request(function () {
      Object.keys(self.store).forEach(function (key) {
        map()(self.store[key], emit);
      });
      callback(null, results);
    });
  };
};

Memory.prototype.sync = function (factory, callback) {
  process.nextTick(function () { callback(); });
};
