var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var res = mod._cached ? mod._cached : mod();
    return res;
}

require.paths = [];
require.modules = {};
require.extensions = [".js",".coffee"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        var y = cwd || '.';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = x + '/package.json';
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = Object_keys(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

require.define = function (filename, fn) {
    var dirname = require._core[filename]
        ? ''
        : require.modules.path().dirname(filename)
    ;
    
    var require_ = function (file) {
        return require(file, dirname)
    };
    require_.resolve = function (name) {
        return require.resolve(name, dirname);
    };
    require_.modules = require.modules;
    require_.define = require.define;
    var module_ = { exports : {} };
    
    require.modules[filename] = function () {
        require.modules[filename]._cached = module_.exports;
        fn.call(
            module_.exports,
            require_,
            module_,
            module_.exports,
            dirname,
            filename
        );
        require.modules[filename]._cached = module_.exports;
        return module_.exports;
    };
};

var Object_keys = Object.keys || function (obj) {
    var res = [];
    for (var key in obj) res.push(key)
    return res;
};

if (typeof process === 'undefined') process = {};

if (!process.nextTick) process.nextTick = function (fn) {
    setTimeout(fn, 0);
};

if (!process.title) process.title = 'browser';

if (!process.binding) process.binding = function (name) {
    if (name === 'evals') return require('vm')
    else throw new Error('No such module')
};

if (!process.cwd) process.cwd = function () { return '.' };

require.define("path", function (require, module, exports, __dirname, __filename) {
    function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

});

require.define("/resourceful.js", function (require, module, exports, __dirname, __filename) {
    var resourceful = exports;

resourceful.Cache          = require('./resourceful/cache').Cache;
resourceful.cache          = require('./resourceful/cache').cache;
resourceful.caches         = require('./resourceful/cache').caches;

resourceful.Resource       = require('./resourceful/resource').Resource;
resourceful.define         = require('./resourceful/core').define;
resourceful.defineProperty = require('./resourceful/core').defineProperty;
resourceful.init           = require('./resourceful/init');

resourceful.use            = require('./resourceful/core').use;
resourceful.connect        = require('./resourceful/core').connect;
resourceful.typeOf         = require('./resourceful/common').typeOf;
resourceful.connection     = require('./resourceful/core').connection;
resourceful.mixin          = require('./resourceful/common').mixin;
resourceful.clone          = require('./resourceful/common').clone;
resourceful.resources      = require('./resourceful/core').resources;
resourceful.register       = require('./resourceful/core').register;
resourceful.unregister     = require('./resourceful/core').unregister;
resourceful.engines        = require('./resourceful/engines');
resourceful.instantiate    = require('./resourceful/core').instantiate;
resourceful.capitalize     = require('./resourceful/common').capitalize;
resourceful.pluralize      = require('./resourceful/common').pluralize;
resourceful.render         = require('./resourceful/common').render;

resourceful.resources.Resource = resourceful.define('resource');

});

require.define("/resourceful/cache.js", function (require, module, exports, __dirname, __filename) {
    var resourceful = require('../resourceful');

exports.cache = true;
exports.caches = {
  stores: [],
  push: function (store) {
    return this.stores.push(store);
  },
  clear: function () {
    this.stores.forEach(function (s) { s.clear(); });
    return this;
  }
};

exports.Cache = function (options) {
  this.size = 0;
  this.store = {};

  resourceful.caches.push(this);
};

exports.Cache.prototype.get = function (id) {
  var that = this;
  if (!resourceful.cache) return;
  if (!id) { return; }
  else if (Array.isArray(id)) {
    return id.map(function (k) {
      return that.store[k.toString()];
    });
  } 
  else {
    return this.store[id.toString()];
  }
};

exports.Cache.prototype.put = function (id, obj) {
  if (!resourceful.cache) return;
  if (!this.has(id)) this.size++;
  this.store[id] = obj;
};

exports.Cache.prototype.update = function (id, obj) {
  if (!resourceful.cache) return;
  if (id in this.store) {
    for (var k in obj) {
      try { this.store[id][k] = obj[k]; }
      catch (ex) { }
    }
  }
};

exports.Cache.prototype.clear = function (id) {
  if (!resourceful.cache) return;
  if (id) {
    this.size --;
    delete(this.store[id]);
  } 
  else {
    this.size = 0;
    this.store = {};
  }
};

exports.Cache.prototype.has = function (id) {
  if (!resourceful.cache) return;
  return id in this.store;
};

});

require.define("/resourceful/resource.js", function (require, module, exports, __dirname, __filename) {
    var events = require('events'),
    util = require('util'),
    validator = require('revalidator'),
    common = require('./common'),
    definers  = require('./definers'),
    resourceful = require('../resourceful');

//
// CRUD
//
var Resource = exports.Resource = function () {
  Object.defineProperty(this, 'isNewRecord', {
      value: true, writable: true
  });
  Object.defineProperty(this, 'schema', {
      value: this.constructor.schema,
      enumerable: false,
      configurable: true
  });
};

//
// Hooks
//
Resource.after = function (event, callback) {
  this.hook(event, 'after', callback);
};

Resource.before = function (event, callback) {
  this.hook(event, 'before', callback);
};

Resource.hook = function (event, timing, callback) {
  this.hooks[timing][event] = this.hooks[timing][event] || [];
  this.hooks[timing][event].push(callback);
};

Resource.runBeforeHooks = function (method, obj, callback, finish) {
  if (method in this.hooks.before) {
    (function loop(hooks) {
      var hook = hooks.shift();

      if (hook) {
        hook(obj, function (e, obj) {
          if (e || obj) {
            if(callback) {
              callback(e, obj);
            }
          }
          else {
            loop(hooks);
          }
        });
      } else {
        finish();
      }
    })(this.hooks.before[method].slice(0));
  } else { finish(); }
};

Resource.runAfterHooks = function (method, e, obj, finish) {
  if (method in this.hooks.before) {
    (function loop(hooks) {
      var hook = hooks.shift();

      if (hook) {
        hook(e, obj, function (e, obj) {
          if (e) { finish(e, obj); }
          else   { loop(hooks); }
        });
      } else {
        finish();
      }
    })(this.hooks.after[method].slice(0));
  } else { finish(); }
};

//
// Raises the init event. Called from resourceful.define
//
Resource.init = function () {
  this.emit('init', this);
};

//
// Registers the current instance's resource with resourceful
//
Resource.register = function () {
  return resourceful.register(this.resource, this);
};

//
// Unregisters the current instance's resource from resourceful
//
Resource.unregister = function () {
  return resourceful.unregister(this.resource);
};

Resource._request = function (/* method, [key, obj], callback */) {
  var args     = Array.prototype.slice.call(arguments),
      that     = this,
      callback = args.pop(),
      method   = args.shift(),
      key      = args.shift(),
      obj      = args.shift();

  if (key) args.push(key);
  if (obj) args.push(obj.properties ? obj.properties : obj);

  this.runBeforeHooks(method, obj, callback, function () {
    args.push(function (e, result) {
      var Factory;

      if (e) {
        if (e.status >= 500) {
          throw new(Error)(e);
        } else {
          that.runAfterHooks(method, e, obj, function () {
            that.emit("error", e, obj);
            if (callback) {
              callback(e);
            }
          });
        }
      } else {
        if (Array.isArray(result)) {
          result = result.map(function (r) {
            return resourceful.instantiate.call(that, r);
          });
        } else {
          if (method === 'destroy') {
            that.connection.cache.clear(key);
          } else {
            if (result.rev) {
              // Set the revision if available, so it can be saved
              // to the cache. If we're saving a new object,
              // '_rev' won't be a member of 'resource._properties'
              // so we need to set it here so resource.toJSON() includes it.
              if (obj instanceof resourceful.Resource && !obj._rev) {
                resourceful.defineProperty(obj, '_rev');
              }
              obj._rev = result.rev;
            }

            if (method === 'save') {
              obj._id = result._id || result.id;
            }

            result = resourceful.instantiate.call(that, ['get', 'update'].indexOf(method) !== -1 ? result : obj);

            if (method === 'update') {
              // TODO: Not necessary for identity map
              that.connection.cache.update(key, obj);
            } else {
              // TODO: We only need to do this if the key doesn't exist
              that.connection.cache.put(key, result);
            }
          }
        }
        that.runAfterHooks(method, null, obj, function (e, res) {
          if (e) { that.emit('error', e); }
          else   { that.emit(method, res || result); }
          if (callback) {
            callback(e || null, result);
          }
        });
      }
    });
    that.connection[method].apply(that.connection, args);
  });
};

Resource.get = function (id, callback) {
  if (this.schema.properties._id && this.schema.properties._id.sanitize) {
    id = this.schema.properties._id.sanitize(id);
  }
  
  return id ?
    this._request('get', id, callback)
    : callback && callback(new Error('key is undefined'));
};

Resource.create = function (attrs, callback) {
  if (this._timestamps) {
    attrs.ctime = attrs.mtime = Date.now();
  }

  var that = this;
  this.runBeforeHooks("create", attrs, callback, function () {
    var instance = new(that)(attrs);

    // could happen after validate, but would unnecessarily remove the validation safety net
    that.runAfterHooks("create", null, instance, function (e, res) {
      if (e) { 
        return that.emit('error', e);
      }

      var validate = that.prototype.validate(instance, that.schema);

      if (!validate.valid) {
        that.emit('error', validate.errors);
        if (callback) {
          callback(validate.errors);
        }
        return;
      }

      instance.save(function (e, res) {
        if (res) {
          instance._id  = instance._id  || res.id;
          instance._rev = instance._rev || res.rev;
        }

        if (callback) {
          callback(e, instance);
        }
      });
    });
  });
};

Resource.save = function (obj, callback) {
  var validate = this.prototype.validate(obj, this.schema);

  if (!validate.valid) {
    return callback && callback(validate.errors);
  }

  if (this._timestamps) {
      obj.mtime = Date.now();
      if (obj.isNewRecord) obj.ctime = obj.mtime;
  }

  return this._request("save", obj.key, obj, callback);
};

Resource.destroy = function (key, callback) {
  return this._request("destroy", key, callback);
};

Resource.update = function (key, obj, callback) {
  if (this._timestamps) obj.mtime = Date.now();
  return this._request("update", key, obj, callback);
};

Resource.all = function (callback) {
  return this.find({}, callback);
};

Resource.view = function (path, params, callback) {
  return this._request("view", path, params, callback);
};

Resource.filter = function (name, options, filter) {
  if (filter === undefined) {
    filter = options;
    options = {};
  }
  
  return this._request("filter", name, { 
    options: options, 
    filter: filter, 
    resource: this 
  }, function () {});
};

Resource.find = function (conditions, callback) {
  if (typeof(conditions) !== "object") {
      throw new(TypeError)("`find` takes an object as first argument.");
  }
  conditions['resource'] = this._resource;
  return this._request("find", conditions, callback);
};

Resource.use = function () {
  return resourceful.use.apply(this, arguments);
};

Resource.connect = function () {
  return resourceful.connect.apply(this, arguments);
};

// Define getter / setter for connection property
Resource.__defineGetter__('connection', function () {
  return this._connection || resourceful.connection;
});
Resource.__defineSetter__('connection', function (val) {
  return this._connection = val;
});

// Define getter / setter for engine property
Resource.__defineGetter__('engine', function () {
  return this._engine || resourceful.engine;
});
Resource.__defineSetter__('engine', function (val) {
  return this._engine = val;
});

// Define getter / setter for resource property
Resource.__defineGetter__('resource', function () {
  return this._resource;
});
Resource.__defineSetter__('resource', function (name) {
  return this._resource = name;
});

// Define getter for properties, wraps this resources schema properties
Resource.__defineGetter__('properties', function () {
  return this.schema.properties;
});

// Define getter / setter for key property. The key property is required by CouchDB
Resource.__defineSetter__('key', function (val) { return this._key = val; });
Resource.__defineGetter__('key', function ()    { return this._key; });

Resource.__defineGetter__('children', function (name) {
  return this._children.map(function (c) { return resourceful.resources[c]; });
});
Resource.__defineGetter__('parents', function (name) {
  return this._parents.map(function (c) { return resourceful.resources[c]; });
});

//
// many-to-many
//
// user.groups = [1,2,3,4,5]
//
// new(User).groups() // -> bulk GET on user.groups property
//                    // OR linked documents view
//                    // OR cache
//                    // - Define Users.byGroup(group_id)
//
// new(Group).users() // -> Users.byGroup(this._id) // view
//
// group = {};
//
// User.child('group')
// Group.child('user');
//

//
// Factory method for defining basic behaviour
//
function relationship(factory, type, r, options) {
  var engine = factory.engine,
      rfactory,     // Resource factory/constructor
      rstring,      // Resource string
      rstringp,     // Resource pluralized string
      rstringc;     // Resource capitalized string

  if (typeof(r) === 'string') {
    rstring  = r.toLowerCase();
    rfactory = resourceful.resources[resourceful.capitalize(r)];

    // We're dealing with .child('name-of-this-resource')
    if (!rfactory && rstring === factory.resource.toLowerCase()) {
      rfactory = factory;
    }
  } else if (typeof(r) === 'function') {
    rstringc = r.resource;
    rstring = rstringc.toLowerCase();
    rfactory = r;
  } else {
    throw new(TypeError)("argument must be a string or constructor");
  }
  rstringp = resourceful.pluralize(rstring);
  rstringc = rstringc || resourceful.capitalize(rstring);

  if (factory._children.indexOf(rstringc) !== -1) return;
  if (rfactory === undefined) throw new Error("unknown resource " + rstring);

  if (type == 'child') {
    factory._children.push(rstringc);
    factory.property(rstring + '_ids', Array, { 'default': [], required: true });
    //
    // Parent.children(id, callback)
    //
    if (engine._children) {
      engine._children.call(this, factory, rstringp, rfactory);
    } else {
      factory[rstringp] = function (id, callback) {
        return rfactory['by' + factory.resource](id, callback);
      };
    }
    //
    // parent.children(callback)
    //
    factory.prototype[rstringp] = function (callback) {
      return this.constructor[rstringp](this._id, callback);
    };

    //
    // Parent.createChild(id, child, callback)
    //
    factory['create' + rstringc] = function (id, child, callback) {
      var key = factory.resource.toLowerCase() + '_id';

      if (child instanceof rfactory) {
        child[key] = id;
        child.save(callback);
      } else {
        var inheritance = {};
        inheritance[key] = id;
        child = resourceful.mixin({}, child, inheritance);
        rfactory.create(child, callback);
      }
    };

    //
    // parent.createChild(child, callback)
    //
    factory.prototype['create' + rstringc] = function (child, callback) {
      factory['create' + rstringc](this._id, child, callback);
    };

    // Notify child about new parent
    rfactory.parent(factory);
  } else {
    factory._parents.push(rstringc);

    //
    // Child.byParent(id, callback)
    //
    if (engine._byParent) {
      engine._byParent.call(engine, factory, rstringc, rfactory);
    } else {
      factory['by' + rstringc] = engine._byParent || function (id, callback) {
        var filter = {};
        filter[rstring + '_id'] = id;

        factory.find(filter, callback);
      };
    }

    //
    // child.parent(callback)
    //
    factory.prototype[rstring] = function (callback) {
      return rfactory.get(this[rstring + '_id'], callback);
    };
    factory.property(rstring + '_id', [String, null], {
      'default': null,
      required: true
    });

    // Notify parent about new child
    rfactory.child(factory);
  }
};

//
// Entity relationships
//
Resource.child = function (resource, options) {
  relationship(this, 'child', resource, options);
};

Resource.parent = function (resource, options) {
  relationship(this, 'parent', resource, options);
};

//
// Types of properties
//
Resource.string = function (name, schema) {
  return this.property(name, schema);
}

Resource.bool = function (name, schema) {
  return this.property(name, Boolean, schema);
}

Resource.array = function (name, schema) {
  return this.property(name, Array, schema);
}

Resource.number = function (name, schema) {
  return this.property(name, Number, schema);
}

Resource.property = function (name, typeOrSchema, schema) {
  var definer = {};
  var type = (function () {
    switch (Array.isArray(typeOrSchema) ? 'array' : typeof typeOrSchema) {
      case "array":
      case "string":    return typeOrSchema;
      case "function":  return typeOrSchema.name.toLowerCase();
      case "object":    schema = typeOrSchema;
      case "undefined": return "string";
      default:          throw new(Error)("Argument Error");
    }
  })();

  if (Array.isArray(type)) {
    type = type.map(function (type) {
      return typeof type === 'function' ? type.name.toLowerCase() : '' + type;
    });
  }

  schema = schema || {};
  schema.type = schema.type || type;

  this.schema.properties[name] = definer.property = schema;
  definer.name = name;

  resourceful.mixin(definer, definers.all, definers[schema.type] || {});

  return definer;
};

Resource.timestamps = function () {
  this._timestamps = true;
  this.property('ctime', 'number');
  this.property('mtime', 'number');
};

Resource.define = function (schema) {
  return resourceful.mixin(this.schema, schema);
};

//
// Synchronize a Resource's design document with the database.
//
Resource.sync = function (callback) {
  var that = this,
      id   = ["_design", this.resource].join('/');

  this.once('sync', function (d) {
    callback && callback(null, d);
  });

  if (this._synching) {
    return;
  }

  this._synching = true;
  this.connection.sync(this, function (e, design) {
    if (e) {
      // XXX how to report errors here?
      that.emit('error', e);
    }
    that._synching = false;

    that.emit('sync', design);
  });
};

Resource.prototype.validate = function(instance, schema) {
  instance || (instance = this);
  schema || (schema = this.schema || {});

  // Before we create a new resource, perform a validation based on its schema
  return validator.validate(instance._properties, {
    properties: schema.properties || {}
  });
};

//
// Prototype
//
Resource.prototype.save = function (callback) {
  var self = this;
  if (this.isValid) {
    this.constructor.save(this, function (err, res) {
      if (!err) {
        self.isNewRecord = false;
      }

      if (callback) {
        callback(err, res);
      }
    });
  }
};

Resource.prototype.update = function (obj, callback) {
  return this.constructor.update(this._id, obj, callback);
};

Resource.prototype.saveAttachment = function (name, data, callback) {
  return this.constructor.saveAttachment(this._id, this._rev, name, data, callback);
};

Resource.prototype.destroy = function (callback) {
  return this.constructor.destroy(this._id, callback);
};

Resource.prototype.reload = function (callback) {
  return this.constructor.get(this._id, callback);
};

Resource.prototype.readProperty = function (k, getter) {
  return getter ? getter.call(this, this._properties[k]) : this._properties[k];
};

Resource.prototype.writeProperty = function (k, val, setter) {
  return this._properties[k] = setter 
    ? setter.call(this, val)
    : val;
};


Resource.prototype.toJSON = function () {
  return resourceful.clone(this.properties);
};

Resource.prototype.inspect = function () {
  return util.inspect(this.properties);
};

Resource.prototype.toString = function () {
  return JSON.stringify(this.properties);
};


Resource.prototype.__defineGetter__('key', function () {
  return this[this.constructor.key];
});

Resource.prototype.__defineGetter__('id', function () {
  return this.constructor.key === '_id' ?
      this._id
      :
      undefined;
});

Resource.prototype.__defineGetter__('isValid', function () {
  return this.validate().valid;
});

Resource.prototype.__defineGetter__('properties', function () {
  return this._properties;
});

Resource.prototype.__defineSetter__('properties', function (props) {
  var self = this;
  Object.keys(props).forEach(function (k) {
    self[k] = props[k];
  });

  return props;
});

});

require.define("events", function (require, module, exports, __dirname, __filename) {
    if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.toString.call(xs) === '[object Array]'
    }
;

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = list.indexOf(listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

});

require.define("util", function (require, module, exports, __dirname, __filename) {
    // todo

});

require.define("/node_modules/revalidator/package.json", function (require, module, exports, __dirname, __filename) {
    module.exports = {"main":"./lib/revalidator"}
});

require.define("/node_modules/revalidator/lib/revalidator.js", function (require, module, exports, __dirname, __filename) {
    (function (exports) {
  exports.validate = validate;
  exports.mixin = mixin;
  
  //
  // ### function validate (object, schema, options)
  // #### {Object} object the object to validate.
  // #### {Object} schema (optional) the JSON Schema to validate against.
  // #### {Object} options (optional) options controlling the validation
  //      process. See {@link #validate.defaults) for details.
  // Validate <code>object</code> against a JSON Schema.
  // If <code>object</code> is self-describing (i.e. has a
  // <code>$schema</code> property), it will also be validated
  // against the referenced schema. [TODO]: This behaviour bay be
  // suppressed by setting the {@link #validate.options.???}
  // option to <code>???</code>.[/TODO]
  //
  // If <code>schema</code> is not specified, and <code>object</code>
  // is not self-describing, validation always passes.
  //
  // <strong>Note:</strong> in order to pass options but no schema,
  // <code>schema</code> <em>must</em> be specified in the call to
  // <code>validate()</code>; otherwise, <code>options</code> will
  // be interpreted as the schema. <code>schema</code> may be passed
  // as <code>null</code>, <code>undefinded</code>, or the empty object
  // (<code>{}</code>) in this case.
  //
  function validate(object, schema, options) {
    options = mixin({}, options, validate.defaults);
    var errors = [];

    validateObject(object, schema, options, errors);

    //
    // TODO: self-described validation
    // if (! options.selfDescribing) { ... }
    //
    
    return {
      valid: !(errors.length),
      errors: errors
    };
  };
  
  /**
   * Default validation options. Defaults can be overridden by
   * passing an 'options' hash to {@link #validate}. They can
   * also be set globally be changing the values in
   * <code>validate.defaults</code> directly.
   */
  validate.defaults = {
      /**
       * <p>
       * Enforce 'format' constraints.
       * </p><p>
       * <em>Default: <code>true</code></em>
       * </p>
       */
      validateFormats: true,
      /**
       * <p>
       * When {@link #validateFormats} is <code>true</code>,
       * treat unrecognized formats as validation errors.
       * </p><p>
       * <em>Default: <code>false</code></em>
       * </p>
       *
       * @see validation.formats for default supported formats.
       */
      validateFormatsStrict: false,
      /**
       * <p>
       * When {@link #validateFormats} is <code>true</code>,
       * also validate formats defined in {@link #validate.formatExtensions}.
       * </p><p>
       * <em>Default: <code>true</code></em>
       * </p>
       */
      validateFormatExtensions: true
  };

  /**
   * Default messages to include with validation errors.
   */
  validate.messages = {
      required:  "",
      pattern:   "",
      maximum:   "",
      minimum:   "",
      maxLength: "",
      minLength: "",
      dependencies:  "",
      unique:    ""
  };

  /**
   *
   */
  validate.formats = { 
    'email':          /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i,
    'ip-address':     /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/i, 
    'ipv6':           /^([0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}$/, 
    'date-time':      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, 
    'date':           /^\d{4}-\d{2}-\d{2}$/,
    'time':           /^\d{2}:\d{2}:\d{2}$/,
    'color':          /^#[a-z0-9]{6}|#[a-z0-9]{3}|(?:rgb\(\s*(?:[+-]?\d+%?)\s*,\s*(?:[+-]?\d+%?)\s*,\s*(?:[+-]?\d+%?)\s*\))aqua|black|blue|fuchsia|gray|green|lime|maroon|navy|olive|orange|purple|red|silver|teal|white|and yellow$/i,
    //'style':        (not supported)
    //'phone':        (not supported)
    //'uri':          (not supported)
    //'host-name':    (not supported)
    'utc-millisec':   { 
      test: function (value) { 
        return typeof(value) === 'number' && value >= 0; 
      }
    }, 
    'regex':          { 
      test: function (value) { 
        try { new RegExp(value) } 
        catch (e) { return false } 
        
        return true; 
      }
    }
  };

  /**
   *
   */
  validate.formatExtensions = { 
    'url': /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i
  };
  
  function mixin(obj) {
    var sources = Array.prototype.slice.call(arguments, 1);
    while (sources.length) {
      var source = sources.shift();
      if (!source) { continue }
      
      if (typeof(source) !== 'object') {
        throw new TypeError('mixin non-object');
      }
    
      for (var p in source) {
        if (source.hasOwnProperty(p)) {
          obj[p] = source[p];
        }
      }
    }
    
    return obj;
  };

  function validateObject(object, schema, options, errors) {
    var props;

    // see 5.2
    if (schema.properties) {
      props = schema.properties;
      for (var p in props) {
        if (props.hasOwnProperty(p)) {
          validateProperty(object, object[p], p, props[p], options, errors);
        }
      }
    }

    // see 5.3
    if (schema.patternProperties) {
      props = schema.patternProperties;
      for (var p in props) {
        if (props.hasOwnProperty(p)) {
          var re = new RegExp(p);

          // Find all object properties that are matching `re`
          for (var k in object) {
            if (object.hasOwnProperty(k) && re.exec(k) !== null) {
              validateProperty(object, object[k], p, props[p], options, errors);
            }
          }
        }
      }
    }

  };

  function validateProperty(object, value, property, schema, options, errors) {
    var format,
        valid,
        spec,
        type;

    function constrain(name, value, assert) {
      if (schema[name] !== undefined && !assert(value, schema[name])) {
        error(name, property, value, schema, errors);
      }
    }

    if (value === undefined) {
      if (schema.required && schema.type !== 'any') {
        return error('required', property, undefined, schema, errors);
      } else {
        return;
      }
    }

    if (schema.format && options.validateFormats) {
      format = schema.format;

      if (options.formatExtensions) { spec = validate.formatExtensions[format] }
      if (!spec) {
        spec = validate.formats[format];
        if (options.validateFormatsStrict) {
          return error('format', property, value, schema, errors);
        }
        
      }
      else {
        if (!spec.test(value)) {
          return error('format', property, value, schema, errors);
        }
      }
    }

    if (schema.enum && schema.enum.indexOf(value) === -1) {
      error('enum', property, value, schema, errors);
    }
    
    // Dependencies (see 5.8)
    if (typeof schema.dependencies === 'string' &&
        object[schema.dependencies] === undefined) {
      error('dependencies', property, null, schema, errors);
    }

    if (isArray(schema.dependencies)) {
      for (var i = 0, l = schema.dependencies.length; i < l; i++) {
        if (object[schema.dependencies[i]] === undefined) {
          error('dependencies', property, null, schema, errors);
        }
      }
    }

    if (typeof schema.dependencies === 'object') {
      validateObject(object, schema.dependencies, options, errors);
    }

    checkType(value, schema.type, function(err, type) {
      if (err) return error('type', property, typeof value, schema, errors);

      switch (type || (isArray(value) ? 'array' : typeof value)) {
        case 'string':
          constrain('minLength', value.length, function (a, e) { return a >= e });
          constrain('maxLength', value.length, function (a, e) { return a <= e });
          constrain('pattern',   value,        function (a, e) {
            e = typeof e === 'string'
              ? e = new RegExp(e)
              : e;
            return e.test(a)
          });
          break;
        case 'number':
          constrain('minimum',     value, function (a, e) { return a >= e });
          constrain('maximum',     value, function (a, e) { return a <= e });
          constrain('exclusiveMinimum', value, function (a, e) { return a > e });
          constrain('exclusiveMaximum', value, function (a, e) { return a < e });
          constrain('divisibleBy', value, function (a, e) { return a % e === 0 });
          break;
        case 'array':
          constrain('items', value, function (a, e) {
            for (var i = 0, l = a.length; i < l; i++) {
              validateProperty(object, a[i], property, e, options, errors);
            }
            return true;
          });
          constrain('minItems', value, function (a, e) { return a.length >= e });
          constrain('maxItems', value, function (a, e) { return a.length <= e });
          constrain('uniqueItems', value, function (a) {
            var h = {};

            for (var i = 0, l = a.length; i < l; i++) {
              var key = JSON.stringify(a[i]);
              if (h[key]) return false;
              h[key] = true;
            }

            return true;
          });
          break;
        case 'object':
          // Recursive validation
          if (schema.properties || schema.patternProperties) {
            validateObject(value, schema, options, errors);
          }
          break;
      }
    });
  };

  function checkType(val, type, callback) {
    var result = false,
        types = isArray(type) ? type : [type];

    // No type - no check
    if (type === undefined) return callback(null, type);

    // Go through available types
    // And fine first matching
    for (var i = 0, l = types.length; i < l; i++) {
      type = types[i];
      if (type === 'string' ? typeof val === 'string' :
          type === 'array' ? isArray(val) :
          type === 'object' ? val && typeof val === 'object' &&
                             !isArray(val) :
          type === 'number' ? typeof val === 'number' :
          type === 'integer' ? typeof val === 'number' && ~~val === val :
          type === 'null' ? val === null :
          type === 'boolean'? typeof val === 'boolean' :
          type === 'any' ? typeof val !== 'undefined' : false) {
        return callback(null, type);
      }
    };

    callback(true);
  };

  function error(attribute, property, actual, schema, errors) {
    var message = validate.messages && validate.messages[property] || "no default message";
    errors.push({
      attribute: attribute,
      property:  property,
      expected:  schema[attribute],
      actual:    actual,
      message:   message
    });
  };

  function isArray(value) {
    var s = typeof value;
    if (s === 'object') {
      if (value) {
        if (typeof value.length === 'number' &&
           !(value.propertyIsEnumerable('length')) &&
           typeof value.splice === 'function') {
           return true;
        }
      }
    }
    return false;
  }


})(typeof(window) === 'undefined' ? module.exports : (window.json = window.json || {}));

});

require.define("/resourceful/common.js", function (require, module, exports, __dirname, __filename) {
    /*
 * common.js: Common utility functions for resourceful.
 *
 * (C) 2011 Nodejitsu Inc.
 * MIT LICENCE
 *
 */

var common = exports;

common.mixin = function (target) {
  var objs = Array.prototype.slice.call(arguments, 1);
  objs.forEach(function (o) {
    Object.keys(o).forEach(function (k) {
      if (!o.__lookupGetter__(k)) {
        target[k] = o[k];
      }
    });
  });
  return target;
};

common.render = function (template, attributes) {
  return ['map', 'reduce', 'rereduce'].reduce(function (view, f) {
    if (template[f]) {
      view[f] = Object.keys(attributes).reduce(function (str, k) {
        var attribute = attributes[k];
        if (typeof(attribute) !== 'string') {
          attribute = JSON.stringify(attribute);
        }

        var re = new RegExp(('$' + k).replace(/([^\w\d])/g, '\\$1'), 'g');

        return str.replace(re, attribute)
                  .replace(/"/g, "'");
      }, template[f].toString().replace(/\n/g, '').replace(/\s+/g, ' '));
      return view;
    } else {
      return view;
    }
  }, {});
};

common.clone = function (object) {
  return Object.keys(object).reduce(function (obj, k) {
    obj[k] = object[k];
    return obj;
  }, {});
};

common.typeOf = function (value) {
  var derived = typeof(value);

  if (Array.isArray(value)) {
    return 'array';
  }
  else if (derived === 'object') {
    return derived ? 'object' : 'null';
  }
  else if (derived === 'function') {
    return derived instanceof RegExp ? 'regexp' : 'function';
  }

  return derived;
};

common.capitalize = function (str) {
  return str && str[0].toUpperCase() + str.slice(1);
};

common.pluralize = function (s) {
  return /s$/.test(s) ? s : s + 's';
};

});

require.define("/resourceful/definers.js", function (require, module, exports, __dirname, __filename) {
    var common = require('./common');

module.exports = {
  all: {
    define: function (attr, val /*, condition, options */) {
      var args = Array.prototype.slice.call(arguments, 2),
          condition,
          options;

      this.property[attr] = val;

      if (typeof(args[0]) === "function") {
        condition = args[0];
        options = args[1] || {};
      }
      else {
        options = args[0] || {};
      }

      if (options.message) this.property.messages[attr] = options.message;
      if (options.condition) this.property.conditions[attr] = condition;

      return this;
    },
    // TODO implement me
    dependencies: function () {},
    //
    // JSON Schema 5.1: type
    //
    type: function (val) {
      var valid = [
        'string',  'number', 'integer',
        'boolean', 'object', 'array',
        'null',    'any'
      ];

      valid = (Array.isArray(val) ? val : [val]).every(function (val) {
        return valid.indexOf(val) !== -1;
      });
      if (!valid) {
        throw new(TypeError)("invalid type.");
      }

      this.property.type = val;
      return this;
    },
    'default': function (val, condition, options) {
      if (this.property.type) {
         enforceType(val, this.property.type);
      }
      return this.define("default", val, condition, options);
    },
    //
    // JSON Schema 5.7: required
    //
    required: function (val, condition, options) {
      enforceType(val, "boolean");
      return this.define("required", val, condition, options);
    },
    unique: function (val, condition, options) {
        enforceType(val, "boolean");
        return this.define("unique", val, condition, options);
    },
    //
    // JSON Schema 5.18: title
    //
    title: function (val) {
      enforceType(val, "string");
      this.property.title = val;
      return this;
    },
    //
    // JSON Schema 5.19: description
    //
    description: function (val) {
      enforceType(val, "string");
      this.property.description = val;
      return this;
    },
    //
    // JSON Schema 5.20: format
    //
    format: function (val, condition, options) {
      var valid = [
          'date',       'time',      'utc-millisec',
          'regex',      'color',     'style',
          'phone',      'uri',       'email',
          'ip-address', 'ipv6',      'street-adress',
          'country',    'region',    'postal-code',
          'locality',   'date-time'
      ];
      if (valid.indexOf(val) === -1) {
        throw new(Error)({name:"ArgumentError"});
      }

      return this.define("format", val, condition, options);
    },
    storageName: function (val) {
      enforceType(val, "string");
      this.property.storageName = val;

      return this;
    },
    conform: function (val, condition, options) {
      enforceType(val, "function");
      return this.define("conform", val, condition, options);
    },
    lazy: function (val, condition, options) {
      enforceType(val, "boolean");
      return this.define("lazy", val, condition, options);
    }
  },
  string: {
    //
    // JSON Schema 5.14: pattern
    //
    pattern: function (val, condition, options) {
      enforceType(val, "regexp");
      return this.define("pattern", val, condition, options);
    },
    //
    // JSON Schema 5.16: minLength
    //
    minLength: function (val, condition, options) {
      enforceType(val, "number");
      return this.define("minLength", val, condition, options);
    },
    //
    // JSON Schema 5.15: maxLength
    //
    maxLength: function (val, condition, options) {
      enforceType(val, "number");
      return this.define("maxLength", val, condition, options);
    },
    //
    // Addition: Sets minLength and maxLength
    //
    length: function (val, condition, options) {
      enforceType(val, "array");
      return this.define("minLength", val[0], condition, options)
                 .define("maxLength", val[1], condition, options);
    },
    sanitize: sanitize('string', {
      upper: function (val) {
        return val.toUpperCase();
      },
      lower: function (val) {
        return val.toLowerCase();
      },
      capitalize: common.capitalize,
      pluralize: common.pluralize,
      replace: function (val, regexp, replacement) {
        return val.replace(regexp, replacement);
      }
    })
  },
  number: {
    //
    // JSON Schema 5.7: minimum
    //
    minimum: function (val, condition, options) {
      enforceType(val, "number");
      return this.define("minimum", val, condition, options);
    },
    //
    // JSON Schema 5.8: maximum
    //
    maximum: function (val, condition, options) {
      enforceType(val, "number");
      return this.define("maximum", val, condition, options);
    },
    //
    // Addition: Sets minimum and maximum
    //
    within: function (val, condition, options) {
      enforceType(val, "array");
      return this.define("minimum", val[0], condition, options)
                 .define("maximum", val[1], condition, options);
    },
    sanitize: sanitize('number', {
      round: Math.round,
      ceil: Math.ceil,
      floor: Math.floor,
      abs: Math.abs
    })
  },
  array: {
    sanitize: sanitize('array', {
      reverse: function (val) {
        return val.slice().reverse();
      }
    })
  }
};

//
// Sanitize factory
//
function sanitize(type, sanitizers) {
  return function (name) {
    // this.property(...).sanitize(functon (val) { return val; })
    if (typeof name === 'function') return this.define('sanitize', name);

    if (!sanitizers[name]) throw new Error('Unknown sanitizer: ' + name);

    // this.property(...).sanitize('sanitizer', args...)
    var args = Array.prototype.slice.call(arguments, 1),
        prop = this.name,
        sanitizer = sanitizers[name];

    return this.define('sanitize', function (val) {
      if (type === 'array' ? Array.isArray(val) : typeof val === type) {
        return sanitizer.apply(null, [val].concat(args));
      } else {
        return val;
      }
    });
  };
}

function enforceType(val, type) {
  if (common.typeOf(val) !== type) {
    throw new TypeError({ name: "ArgumentError" });
  }
}

});

require.define("/resourceful/core.js", function (require, module, exports, __dirname, __filename) {
    var util = require('util'),
    events = require('events'),
    common = require('./common'),
    init = require('./init');

var resourceful = exports;

resourceful.env = 'development';
resourceful.autoMigrate = true;
resourceful.resources  = {};
resourceful.Resource   = require('./resource').Resource;
resourceful.engines    = require('./engines');
resourceful.connection = new resourceful.engines.Memory();

//
// Select a storage engine
//
resourceful.use = function (engine, options) {
  if (typeof(engine) === "string") {
    engine = common.capitalize(engine);

    if (resourceful.engines[engine]) {
      this.engine = resourceful.engines[engine];
    }
    else {
      throw new Error("unrecognised engine: " + engine);
    }
  } 
  else if (typeof engine === 'object') {
    this.engine = engine;
  }
  else {
    throw new Error("invalid engine ");
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
      case 'number': options.port = parseInt(a, 10); break;
      case 'string': options.uri  = a; break;
      case 'object': options      = a; break;
    }
  });
  // Extract the optional 'protocol'
  // ex: "couchdb://127.0.0.1" would have "database" as protocol.
  if (m = options.uri && options.uri.match(/^([a-z]+):\/\//)) {
    protocol = m[1];
    options.uri = options.uri.replace(protocol + '://', '');
  }

  if (protocol) {
    engine = resourceful.engines[common.capitalize(protocol)];
  } 
  else {
    engine = resourceful.engine || this.engine;
  }

  this.connection = new(engine)(options);

  return this;
};

//
// Default Factory for creating new resources.
//
resourceful.define = function (name, definition) {
  if ((typeof name === "function" || typeof name === 'object') && !definition) {
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
      self._properties[k] = Factory.properties[k]['default'];
    });
    
    this._properties.resource = name;

    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        self._properties[k] = attrs[k];
      });
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
      return Factory.emitter[k].apply(Factory.emitter, arguments);
    };
  });

  Factory.on('error', function () {
    //
    // TODO: Logging
    //
  });

  if (typeof definition === 'object') {
    // Use definition as schema
    Factory.define(definition);
  } else {
    (definition || function () {}).call(Factory);
  }

  Factory.init();

  // Add this resource to the set of resources resourceful knows about
  resourceful.register(name, Factory);

  return Factory;
};

resourceful.defineProperty = function (obj, property, schema) {
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

  Factory = resourceful.resources[this.resource];

  id = obj[this.key];

  if (id && this.connection.cache.has(id)) {
    obj = this.connection.cache.get(id);
  }

  if (Factory) {
    // Don't instantiate an already instantiated object
    if (obj instanceof Factory) { return obj; }
    else                        { return new Factory(obj); }
  } else {
    throw new Error("unrecognised resource '" + obj.resource + "'");
  }
};

});

require.define("/resourceful/init.js", function (require, module, exports, __dirname, __filename) {
    
module.exports = function init(obj, property, schema) {
  if (obj[property]) {
    return obj[property];
  }
  
  return !!init.type[schema.type]
    ? init.type[schema.type](schema)
    : null;
};

module.exports.type = {
  default: function (schema) {
    //
    // TODO: Consume schema to determine default value
    //
    return undefined;
  },
  object: function (schema) {
    //
    // TODO: Consume schema to determine default value
    //
    return {};
  },
  string: function (schema) {
    //
    // TODO: Consume schema to determine default value
    //
    return undefined;
  },
  number: function (schema) {
    //
    // TODO: Consume schema to determine default value
    //
    return undefined;
  },
  array: function (schema) {
    //
    // TODO: Consume schema to determine default value
    //
    return [];
  }
};
});

require.define("/resourceful/engines.js", function (require, module, exports, __dirname, __filename) {
    /*
 * engines.js: Set of all engines `resourceful` knows about
 *
 * (C) 2010 Nodejitsu Inc.
 * MIT LICENCE
 *
 */

var fs = require('fs'),
    path = require('path'),
    common = require('./common');

var engines = exports;

if (fs.readdirSync) {
  // Backend - Setup all engines as lazy-loaded getters.
  fs.readdirSync(path.join(__dirname, 'engines')).forEach(function (file) {
    var engine = file.replace('.js', ''),
        name  = common.capitalize(engine);

    engines.__defineGetter__(name, function () {
      return require('./engines/' + engine)[name];
    });
  });
} else {
  // Frontend support for engines
  ['memory'].forEach(function (engine) {
    var name = common.capitalize(engine);

    engines.__defineGetter__(name, function () {
      return require(path.resolve(__dirname, './engines/', engine))[name];
    });
  });
}

});

require.define("fs", function (require, module, exports, __dirname, __filename) {
    // nothing to see here... no file methods for the browser

});

require.define("/resourceful/engines/memory.js", function (require, module, exports, __dirname, __filename) {
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
  }

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
}

Memory.prototype.find = function (conditions, callback) {
  this.filter(function (obj) {
    return Object.keys(conditions).every(function (k) {
      return conditions[k] ===  obj[k];
    });
  }, callback);
};

Memory.prototype.filter = function (filter, callback) {
  this.request(function () {
    var result = [],
        store = this.store;

    Object.keys(this.store).forEach(function (k) {
      if (filter(store[k])) {
        result.push(store[k]);
      }
    });

    callback(null, result);
  });
};

Memory.prototype.sync = function (factory, callback) {
  process.nextTick(function () { callback(); });
};

});

require.define("/browser.js", function (require, module, exports, __dirname, __filename) {
    window.resourceful = require('./resourceful');

require('./resourceful/engines/memory');

});
require("/browser.js");
