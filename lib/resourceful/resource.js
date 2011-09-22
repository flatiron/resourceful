var events = require('events'),
    util = require('util'),
    validator = require('revalidator'),
    common = require('./common'),
    definers  = require('./definers')
    resourceful = require('../resourceful');;

//
// CRUD
//
var Resource = exports.Resource = function () {
  Object.defineProperty(this, 'isNewRecord', {
      value: true, writable: true
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
          if (e || obj) { callback(e, obj) }
          else          { loop(hooks) }
        });
      } else {
        finish();
      }
    })(this.hooks.before[method].slice(0));
  } else { finish() }
};
Resource.runAfterHooks = function (method, e, obj, finish) {
  if (method in this.hooks.before) {
    (function loop(hooks) {
      var hook = hooks.shift();

      if (hook) {
        hook(e, obj, function (e, obj) {
          if (e) { finish(e, obj) }
          else   { loop(hooks) }
        });
      } else {
        finish();
      }
    })(this.hooks.after[method].slice(0));
  } else { finish() }
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

  key && args.push(key);
  obj && args.push(obj.properties ? obj.properties : obj);

  this.runBeforeHooks(method, obj, callback, function () {
    args.push(function (e, result) {
      var Factory;

      if (e) {
        if (e.status >= 500) {
          throw new(Error)(e);
        } else {
          that.runAfterHooks(method, e, obj, function () {
            that.emit("error", e, obj);
            callback(e);
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
            result = resourceful.instantiate.call(that, method === 'get' ? result : obj);

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
          if (e) { that.emit('error', e) }
          else   { that.emit(method, res || result) }
          callback(e || null, result);
        });
      }
    });
    that.connection[method].apply(that.connection, args);
  });
};

Resource.get = function (id, callback) {
  return id
    ? this._request('get', id, callback)
    : callback(new Error('key is undefined'));
};

Resource.create = function (attrs, callback) {
  if (this._timestamps) {
    attrs.ctime = attrs.mtime = Date.now()
  }

  // Before we create a new resource, perform a validation based on its schema
  var validate = validator.validate(attrs, {
    properties: this.schema.properties || {}
  });

  if (!validate.valid) {
    return callback(validate.errors);
  }

  var instance = new(this)(attrs);
  instance.save(function (e, res) {
    if (res) {
      instance._id  = instance._id  || res.id;
      instance._rev = instance._rev || res.rev;
    }

    callback(e, instance);
  });
};

Resource.save = function (obj, callback) {
  // Before we save a resource,  perform a validation based on its schema
  var validate = validator.validate(obj, {
    properties: this.schema.properties || {}
  });

  if (!validate.valid) {
    return callback(validate.errors);
  }

  if (this._timestamps) {
      obj.mtime = Date.now();
      if (obj.isNewRecord) { obj.ctime = obj.mtime }
  }

  return this._request("save", obj.key, obj, callback);
};

Resource.destroy = function (key, callback) {
  return this._request("destroy", key, callback);
};

Resource.update = function (key, obj, callback) {
  if (this._timestamps) { obj.mtime = Date.now() }
  return this._request("update", key, obj, callback);
};

Resource.all = function (callback) {
  return this._request("all", callback);
};

Resource.view = function (path, params, callback) {
  return this._request("view", path, params, callback);
};

Resource.find = function (conditions, callback) {
  if (typeof(conditions) !== "object") {
      throw new(TypeError)("`find` takes an object as first argument.");
  }
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
Resource.__defineSetter__('key', function (val) { return this._key = val });
Resource.__defineGetter__('key', function ()    { return this._key });

Resource.__defineGetter__('children', function (name) {
  return this._children.map(function (c) { return resourceful.resources[c] });
});
Resource.__defineGetter__('parents', function (name) {
  return this._parents.map(function (c) { return resourceful.resources[c] });
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
// Entity relationships
//
Resource.child = function (resource, options) {
  this.engine.relationship(this, 'child', resource, options);
};
Resource.parent = function (resource, options) {
  this.engine.relationship(this, 'parent', resource, options);
};

Resource.property = function (name, typeOrSchema, schema) {
  var definer = {};
  var type = (function () {
    switch (typeof(typeOrSchema)) {
      case "string":    return typeOrSchema;
      case "function":  return typeOrSchema.name.toLowerCase();
      case "object":    schema = typeOrSchema;
      case "undefined": return "string";
      default:          throw new(Error)("Argument Error");
    }
  })();

  schema = schema || {};
  schema.type = schema.type || type;

  this.schema.properties[name] = definer.property = schema;

  common.mixin(definer, definers.all, definers[schema.type] || {});

  return definer;
};
Resource.timestamps = function () {
  this._timestamps = true;
  this.property('ctime');
  this.property('mtime');
};

Resource.define = function (schema) {
  return common.mixin(this.schema, schema);
};

//
// Synchronize a Resource's design document with the database.
//
Resource.sync = function (callback) {
  var that = this,
      id   = ["_design", this.resource].join('/');

  this.once('sync', function (d) { callback(null, d) });

  if (this._synching) {
    return;
  }

  this._synching = true;
  this.engine.sync(function (e, design) {
    that._synching = false;
    that.emit('sync', design);
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

      callback(err, res);
    });
  }
};

Resource.prototype.update = function (obj, callback) {
  return this.constructor.update(this._id, obj, callback);
};

Resource.prototype.saveAttachment = function (name, data, callback) {
  return this.constructor.saveAttachment(this._id, this._rev, name, data, callback);
};

Resource.prototype.destroy = function () {},
Resource.prototype.reload = function () {},
Resource.prototype.readProperty = function (k) {
  return this._properties[k];
};

Resource.prototype.writeProperty = function (k, val) {
  return this._properties[k] = val;
};


Resource.prototype.toJSON = function () {
  return common.clone(this.properties);
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
  return this.constructor.key === '_id'
    ? this._id
    : undefined;
});

Resource.prototype.__defineGetter__('isValid', function () {
  return true;
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
