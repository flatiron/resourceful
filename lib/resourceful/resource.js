var util = require('util'),
    utile = require('utile'),
    validator = require('revalidator'),
    definers  = require('./definers'),
    resourceful = require('../resourceful');

//
// CRUD
//
var Resource = exports.Resource = function () {
  Object.defineProperty(this, 'isNewRecord', {
    value: true,
    writable: true
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

      if (hook && hook.length === 2) {
        hook(obj, function (e, obj) {
          if (e || obj) {
            if (callback) {
              callback(e, obj);
            }
          }
          else {
            loop(hooks);
          }
        });
      }
      else if (hook && hook.length === 1) {
        var res = hook(obj);
        if(res === true) {
          loop(hooks);
        } else {
          if (callback) { callback(res, obj); }
        }
      }
      else {
        finish();
      }
    })(this.hooks.before[method].slice(0));
  } else { finish(); }
};

Resource.runAfterHooks = function (method, e, obj, finish) {
  if (method in this.hooks.after) {
    (function loop(hooks) {
      var hook = hooks.shift();

      if (hook && hook.length === 3) {
        hook(e, obj, function (e, obj) {
          if (e) { finish(e, obj); }
          else   { loop(hooks); }
        });
      }
      else if (hook && hook.length === 2) {
        var res = hook(e, obj);
        if (res === true) {
          loop(hooks);
        } else {
          finish(res, obj);
        }
      }
      else {
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

Resource._request = function (/* method, [id, obj], callback */) {
  var args     = Array.prototype.slice.call(arguments),
      that     = this,
      key      = this.key,
      callback = args.pop(),
      method   = args.shift(),
      id       = args.shift(),
      obj      = args.shift();

  if (id) args.push(id);
  if (obj) args.push(obj.properties ? obj.properties : obj);
  else {
    obj = that.connection.cache.get(id) || {};
    obj[key] = id;
  }

  this.runBeforeHooks(method, obj, callback, function () {
    args.push(function (e, result) {
      var Factory;

      if (e) {
        if (e.status >= 500) {
          that.emit('error', e, obj);
          if (callback) { return callback(e); }
        } else {
          that.runAfterHooks(method, e, obj, function () {
            that.emit("error", e, obj);
            if (callback) { callback(e); }
          });
        }
      } else {
        if (Array.isArray(result)) {
          result = result.map(function (r) {
            return r ? resourceful.instantiate.call(that, r) : r;
          });
        } else {
          if (method === 'destroy') {
            that.connection.cache.clear(id);
          } else {
            that.connection.cache.put(result[key], result);
            result = resourceful.instantiate.call(that, result);
          }
        }

        that.runAfterHooks(method, null, result, function (e, res) {
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
  var key = this.key;

  if (this.schema.properties[key] && this.schema.properties[key].sanitize) {
    id = this.schema.properties[key].sanitize(id);
  }

  var newid, oldid;
  if (id && id[key]) {
    newid = this.lowerResource + "/" + id[key];
    oldid = id[key];
  }
  else if(Array.isArray(id)) {
    for(var i in id) {
      id[i] = this.lowerResource + "/" + id[i];
    }
    newid = id;
  }
  else if(id) {
    newid = this.lowerResource + "/" + id;
    oldid = id;
  }
  else {
    if(callback) {
      return callback(new Error('key is undefined'));
    }
    return;
  }

  this._request('get', newid, function(err, res){
    //
    // Remap back original ids
    //
    if(res && typeof res[key] !== 'undefined') {
      res[key] = oldid;
    }
    if(Array.isArray(res)) {
      for(var r in res) {
        if (res[r] && res[r][key]) {
          res[r][key] = res[r][key].split('/').slice(1).join('/')
        }
      }
    }
    if(res) {
      callback(err, res);
    } else {
      return callback(err, res)
    }
  });
};

Resource.new = function (attrs) {
  return new(this)(attrs);
};

Resource.create = function (attrs, callback) {
  if (this._ctime || this._mtime) {
    var now = Date.now();
    if(this._ctime) attrs.ctime = now;
    if(this._mtime) attrs.mtime = now;
  }

  var that = this,
      key = this.key;

  var instance = new(that)(attrs);
  var validate = that.prototype.validate(instance, that.schema);

  if (!validate.valid) {
    var e = { validate: validate, value: attrs, schema: that.schema };
    that.emit('error', e);
    if (callback) {
      callback(e);
    }
    return;
  }

  var oldid = instance[key];
  this.runBeforeHooks("create", instance, callback, function (err, result) {

    if (!validate.valid) {
      var e = { validate: validate, value: attrs, schema: that.schema };
      that.emit('error', e);
      if (callback) {
        callback(e);
      }
      return;
    }

    that.runAfterHooks("create", null, instance, function (e, res) {
      if (e) {
        return that.emit('error', e);
      }
      instance.save(function (e, res) {
        if (callback) {
          callback(e, res);
        }
      });
    });
  });
};

Resource.save = function (obj, callback) {
  var key = this.key,
      validate = this.prototype.validate(obj, this.schema);

  if (!validate.valid) {
    var e = { validate: validate, value: obj, schema: this.schema };
    return callback && callback(e);
  }

  if (this._ctime || this._mtime) {
    var now = Date.now();
    if (this._mtime) {
      obj.mtime = now;
    }
    if (this._ctime && obj.isNewRecord) {
      obj.ctime = now;
    }
  }

  var newid, oldid;

  if (typeof obj !== 'undefined' && obj[key]) {
    oldid = obj[key];
  } else {
    oldid = resourceful.uuid.v4();
  }

  newid = this.lowerResource + '/' + oldid;
  obj[key] = newid;

  return this._request("save", newid, obj, function(err, res){
    if (res && res[key] && typeof oldid !== 'undefined') {
      res[key] = oldid;
      obj[key] = oldid;
    }
    callback(err, res);
  });
};

Resource.destroy = function (id, callback) {
  var key = this.key;

  if (this.schema.properties[key] && this.schema.properties[key].sanitize) {
    id = this.schema.properties[key].sanitize(id);
  }

  var newid = this.lowerResource + "/" + id;

  return newid
    ? this._request('destroy', newid, callback)
    : callback && callback(new Error('key is undefined'));
};

Resource.update = function (id, obj, callback) {
  var key = this.key;

  if (this.schema.properties[key] && this.schema.properties[key].sanitize) {
    id = this.schema.properties[key].sanitize(id);
  }

  if (this._mtime) {
    obj.mtime = Date.now();
  }

  var self = this,
      partialSchema = { properties: {} },
      validate;

  Object.keys(obj).forEach(function (key) {
    if (self.schema.properties[key]) {
      partialSchema.properties[key] = self.schema.properties[key];
    }
  });

  validate = this.prototype.validate({ _properties: obj }, partialSchema);

  if (!validate.valid) {
    var e = { validate: validate, value: obj, schema: this.schema };
    this.emit('error', e);
    if (callback) {
      callback(e);
    }
    return;
  }

  var newid = this.lowerResource + "/" + id,
  oldid = id;
  obj[key] = newid;
  obj.resource = this._resource;

  return id
    ? this._request('update', newid, obj, function(err, result){
      if(result) {
        result[key] = oldid;
        obj[key] = oldid;
      }
      callback && callback(err, result);
    })
    : callback && callback(new Error('key is undefined'));
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

// Define getter / setter for key property. The key property should be defined for all engines
Resource.__defineGetter__('key', function () {
  return this._key || resourceful.key || 'id';
});
Resource.__defineSetter__('key', function (val) {
  return this._key = val;
});

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
  var engine = factory.engine || resourceful.engine || {},
      rfactory,     // Resource factory/constructor
      rstring,      // Resource string
      rstringp,     // Resource pluralized string
      rstringc;     // Resource capitalized string

  if (typeof(r) === 'string') {
    rstringc = resourceful.capitalize(r);
    rfactory = resourceful.resources[rstringc];

    // We're dealing with .child('name-of-this-resource')
    if (!rfactory && rstringc === factory.resource) {
      rfactory = factory;
    }
  } else if (typeof(r) === 'function') {
    rstringc = r.resource;
    rfactory = r;
  } else {
    throw new(TypeError)("argument must be a string or constructor");
  }

  if (typeof rfactory === 'undefined') {
    //
    // If the Parent resource is not yet defined,
    // then store the relationship as defferred, where it could be called later
    //
    if (typeof resourceful.deferredRelationships[r] === 'undefined') {
      resourceful.deferredRelationships[r] = [factory.resource]
    } else {
      resourceful.deferredRelationships[r].push(factory.resource)
    }
    //
    // Return nothing, do not attempt to relate unknown resource.
    // If the missing resource is later defined...this relationship
    // will then be mapped at define-time for the missing resource
    //
    return;
  }

  rstring  = rfactory.lowerResource;
  rstringp = resourceful.pluralize(rstring);

  if (type == 'child') {
    if (factory._children.indexOf(rstringc) !== -1) return;

    factory._children.push(rstringc);
    factory.property(rstring + '_ids', Array, { 'default': [], required: true });
    //
    // Parent.children(id, callback)
    //
    if (engine._children) {
      engine._children.call(this, factory, rstringp, rfactory);
    } else {
      factory[rstringp] = function (id, callback) {
        return rfactory['by' + factory.resource](id, callback)
      };
    }
    //
    // parent.children(callback)
    //
    factory.prototype[rstringp] = function (callback) {
      return this.constructor[rstringp](this.key, callback);
    };

    //
    // Parent.getChild(parent, child_id, callback)
    //
    factory['get' + rstringc] = function (parent, child_id, callback) {
      var id  = parent.key || parent,
          cid = child_id;

      id_path = factory.lowerResource + '/' + id + '/' + cid

      rfactory.get(id_path, function(err, child){
        if(err) {
          if(callback) return callback(err);
        }
        return callback(null, child);
      });
    }
    //
    // parent.getChild(child_id, callback)
    //
    factory.prototype['get' + rstringc] = function (child_id, callback) {
      return this.constructor['get' + rstringc](this.key, child_id, callback);
    };

    //
    // Parent.createChild(id, child, callback)
    //
    factory['create' + rstringc] = function (parent, child, callback) {
      var key = factory.lowerResource + '_id',
          id  = parent.key || parent,
          cid = child[rfactory.key] || resourceful.uuid.v4();

      function notifyParent(c, callback) {
        factory.get(id, function(err, p) {
          if(err) {
            if(callback) return callback(err);
          }

          var rstringi = rstring + '_ids';

          if (p[rstringi] && !Array.isArray(p[rstringi])) {
            p[rstringi] = [p[rstringi]];
          }
          p[rstringi] = p[rstringi] || [];

          if (p[rstringi].indexOf(cid) < 0) {
            p[rstringi].push(cid);
          }

          p.save(function(err, result){
            callback(err, c);
          });
        });
      }

      child[rfactory.key] = factory.lowerResource + '/' + id + '/' + cid;

      if (child instanceof rfactory) {
        child[key] = id;
        child.save(function(err) {
          if(err) {
            if(callback) return callback(err);
          }
          notifyParent(child, callback);
        });
      } else {
        var inheritance = {};
        inheritance[key] = id;
        child = resourceful.mixin({}, child, inheritance);
        rfactory.create(child, function(err, c) {
          if(err) {
            if(callback) return callback(err);
          }
          notifyParent(c, function(e, r) {
            if(e) {
              if(callback) return callback(e);
            } else {
              if(callback) callback(err, r);
            }
          });
        });
      }
    }

    //
    // parent.createChild(child, callback)
    //
    factory.prototype['create' + rstringc] = function (child, callback) {
      factory['create' + rstringc](this, child, callback);
    };

    factory.before('destroy', function (obj, next) {
      obj = obj[rfactory.key] || obj;
      obj = obj.split('/').slice(1).join('/');

      factory.get(obj, function (e, p) {
        if (e) { return next(e); }

        p[rstringp](function (e, c) {
          if (e) { return next(e); }

          resourceful.async.forEachSeries(c, function (i, cb) {
            i.destroy(cb);
          }, function (e) {
            next(e);
          });
        });
      });
    });

    // Notify child about new parent
    rfactory.parent(factory);
  } else {
    if (factory._parents.indexOf(rstringc) !== -1) return;

    factory._parents.push(rstringc);

    //
    // Child.byParent(id, callback)
    //
    if (engine._byParent) {
      engine._byParent.call(factory._connection, factory, rfactory);
    } else {
      factory['by' + rstringc] = function (id, callback) {
        var filter = {};
        filter[rstring + '_id'] = id;
        factory.find(filter, callback);
      };
    }

    //
    // child.parent(callback)
    //
    factory.prototype[rstring] = function (callback) {
      if (this[rstring + '_id']) {
        return rfactory.get(this[rstring + '_id'], callback);
      }
      callback(null, null);
    };
    factory.property(rstring + '_id', [String, null], {
      'default': null,
      required: true
    });

    factory.before('destroy', function(obj, next) {
      obj = obj[rfactory.key] || obj;
      obj = obj.split('/').slice(1).join('/');

      factory.get(obj, function(e, c) {
        if(e) { return next(e); }

        c[rstring](function(err, p) {
          if(err || !p) { return next(err); }
          var key = factory.lowerResource + '_ids';
          obj = obj.replace(rfactory.lowerResource + '/' + p.key + '/', '');

          if(p[key].indexOf(obj) > -1) {
            p[key].splice(p[key].indexOf(obj), 1);
            p.save(function(err) {
              if(err) { return next(err); }
              next();
            });
          } else {
            next();
          }
        });
      });
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
};

Resource.bool = function (name, schema) {
  return this.property(name, Boolean, schema);
};

Resource.array = function (name, schema) {
  return this.property(name, Array, schema);
};

Resource.number = function (name, schema) {
  return this.property(name, Number, schema);
};

Resource.object = function (name, schema) {
  return this.property(name, Object, schema);
};

Resource.method = function (name, fn, schema) {
  var that = this;

  if(typeof this[name] !== 'undefined') {
    throw new Error(name + ' is a reserved word on the Resource definition')
  }
  if (typeof schema === 'object') {
    this[name] = function(){
      var args = utile.args(arguments);
      var payload = {};
      //
      // Compare parsed arguments to expected schema
      //
      args.forEach(function(arg, i){
        //
        // For every argument, try to match it to a schema value
        // The order of arguments is expected to match the order of schema property declaration
        //
        Object.keys(schema.properties).forEach(function(prop, j){
          if(j === i) {
            payload[prop] = arg;
          }
        });
      });
      //
      // TODO: better default settings using new(that)(payload) instance
      //
      Object.keys(schema.properties).forEach(function(prop, j){
        if(typeof payload[prop] === "undefined" && typeof schema.properties[prop].default !== 'undefined') {
          payload[prop] = schema.properties[prop].default;
        }
      });

      //
      // Turn payload back into args
      //
      var _args = [];
      Object.keys(payload).forEach(function(val){
        _args.push(payload[val]); // ignore the key, assume order of arguments is 1:1 to schema property declarations
      });

      //
      // TODO: if only argument is callback and its not provided,
      // make noop callback so the method doesn't crash
      //
      var valid = validator.validate(payload, schema);
      if(!valid.valid) {
        if(typeof args.cb === 'function') {
          args.cb(valid);
        } else {
          throw new Error(JSON.stringify(valid.errors)); // TODO: better errors
        }
      } else {
        //
        // If there is a callback, push it back into the arguments
        //
        if(typeof args.cb === "function") {
          _args.push(args.cb);
        }
        return fn.apply(this, _args);
      }
    };
  } else { // no schema present, pass along the function un-altered
    this[name] = fn;
  }
  this[name].type = "method";
  this[name].schema = schema;
  if(typeof this.methods === "undefined") {
    this.methods = {};
  }
  this.methods[name] = this[name];
  return;
};

Resource.property = function (name, typeOrSchema, schema) {
  var definer = {};
  var type = (function () {
    switch (Array.isArray(typeOrSchema) ? 'array' : typeof typeOrSchema) {
      case "array":
      case "string":    return typeOrSchema;
      case "function":  return typeOrSchema.name.toLowerCase(); // TODO: <= might be incorrect
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
  this.schema.properties[name].messages = {};
  this.schema.properties[name].conditions = {};
  definer.name = name;
  resourceful.mixin(definer, definers.all, definers[schema.type] || {});
  return definer;
};

Resource.timestamps = function (options) {
  this._ctime = !options || !('ctime' in options) || options.ctime;
  this._mtime = !options || !('mtime' in options) || options.mtime;
  this._atime = !!options && !!options.atime;
  //
  // Remark: All timestamps should be considered Unix time format,
  // see: http://en.wikipedia.org/wiki/Unix_time
  //
  //
  // The time the resource was created
  //
  if (this._ctime) {
    this.property('ctime', 'number', { format: "unix-time", private: true });
  }
  //
  // The last time the resource was modified
  //
  if (this._mtime) {
    this.property('mtime', 'number', { format: "unix-time", private: true });
  }
  //
  // The last time the resource was accessed
  //
  if (this._atime) {
    this.property('atime', 'number', { format: "unix-time", private: true });
    //TODO actually update atime
  }
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
  var validation = this.validate();
  if (validation.valid) {
    this.constructor.save(this, function (err, res) {
      if (!err) {
        self.isNewRecord = false;
      }
      if (callback) {
        callback(err, res);
      }
    });
  } else if (callback) {
    callback(validation.errors);
  }
};

Resource.prototype.update = function (obj, callback) {
  return this.constructor.update(this.key, obj, callback);
};

Resource.prototype.saveAttachment = function (attachment, callback) {
  return this.constructor.saveAttachment({
    id: this.key,
    rev: this._rev
  }, attachment, callback);
};

Resource.prototype.destroy = function (callback) {
  return this.constructor.destroy(this.key, callback);
};

Resource.prototype.reload = function (callback) {
  return this.constructor.get(this.key, callback);
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

Resource.prototype.safeJSON = function () {
  var schema = this.constructor.schema;
  return resourceful.clone(this.properties, function (key) {
    return !(key === '_id' || key === '_rev' || key === 'resource'
      || (schema.properties[key] && schema.properties[key].restricted));
  });
};

Resource.prototype.inspect = function () {
  return util.inspect(this.properties);
};

Resource.prototype.toString = function () {
  return JSON.stringify(this.toJSON());
};

Resource.prototype.__defineGetter__('slug', function () {
  return resourceful.pluralize(this.resource.toLowerCase()) + "/" + this.id;
});

Resource.prototype.__defineGetter__('key', function () {
  return this[this.constructor.key];
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
