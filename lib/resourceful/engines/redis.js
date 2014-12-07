/*
 * Redis engine wrapper
 *
 * (C) 2011 Alexis Sellier, Charlie Robbins & the Contributors.
 * Apache 2.0
 *
 */

var resourceful = require('../../resourceful'),
    redis =  require('redis'),
    utile = require('utile')
    async =  resourceful.async,
    uuid  =  resourceful.uuid;

var Redis = exports.Redis = function Redis(config) {

  config = config || {};
  this.uri = config.uri;
  this.namespace = config.namespace;

  if (config.connection) {
    this.connection = config.connection;
  }
  else if (this.uri) {
    var redisUrl = url.parse('redis://' + this.uri, true);

    this.uri = redisUrl.hostname;
    this.port = parseInt(redisUrl.port, 10);

    if(redisUrl.auth) {
      var redisAuth = redisUrl.auth.split(':');
      this.database = redisAuth[0];
      this.pass = redisAuth[1];
    }

    this.connection = redis.createClient(config.port, this.uri);
    if (this.pass) this.connection.auth(this.pass);
  }
  else {
    this.connection = redis.createClient();
  }

  if(!this.namespace) {
    throw new Error('namespace must be set in the config for each model.');
  }

  this.cache = new resourceful.Cache();

  this.config = {};
  this.config.count_key = 'resourceful:' + this.namespace + ':count';
  this.config.index_key = 'resourceful:' + this.namespace + ':indexes';
  this.config.key = 'resourceful:' + this.namespace + ':id:';
};

Redis.prototype.protocol = 'redis';

Redis.prototype.load = function (data) {
  throw new(Error)("Load not valid for redis engine.");
};

/* we probably don't need to wrap our calls because redis is awesome
Redis.prototype.request = function (method) {
  var args = Array.prototype.slice.call(arguments, 1);
  return this.connection[method].apply(this.connection, args);
};
*/

Redis.prototype.get = function(id, callback) {

  var self = this;
  var getfunc;

  if (Array.isArray(id)) {
    id = id.map(function(i) {
      return self.config.key + i;
    });
    getfunc = 'MGET';
  }
  else {
    id = self.config.key + id;
    getfunc = 'GET';
  }

  self.connection[getfunc](id, function(err, val) {
    if(val === null || val.length === 0) {
      err = {status: 404};
      err.msg = "No Val: Could not find " + id;
      return callback(err);
    }
    if(err) {
      err.status = 500;
      err.msg = "Err: while retrieving " + id;
      return callback(err);
    }

    if (Array.isArray(val)) {
      val = val.map(function (rec) {
        return JSON.parse(rec);
      });
    } else {
      val = JSON.parse(val);
    }

    return callback(null, val);
  });

};

Redis.prototype.post = Redis.prototype.create = function (doc, callback) {

  if ('undefined' === typeof doc.id) {
    doc.id = uuid.v4();
  }
  this.save(doc.id, JSON.stringify(doc), callback);
};

Redis.prototype.update = Redis.prototype.put = function (id, doc, callback) {
  var self = this;
  var wtf = utile.clone(doc);
  function cb (err, val) {
    var newdoc = utile.mixin(val, wtf);
    self.save(newdoc, callback);
  }
  self.get(id, cb);
};

Redis.prototype.save = function (id, doc, callback) {
  var args = Array.prototype.slice.call(arguments, 0),
      callback = args.pop(),
      doc = args.pop();

  // if there's an ID left in args after popping off the callback and
  // the doc, then we need to PUT, otherwise create a new record thru POST
  if (args.length) {
    doc.id = args.pop();
  }

  doc.id = this.config.key + doc.id;
  this.connection.SET(doc.id, JSON.stringify(doc), function(err, val) {
    if (err) {
      return callback(err);
    }
    callback(null, doc);
  });
};

Redis.prototype.destroy = function (id, callback) {
  var key = this.config.key + id;
  var self = this;
  this.connection.DEL(key, function(err, res) {
    /*
     * This is not necessary because deletes are cascaded by resource before destroy
    self.connection.KEYS(key+'/*', function(err, keys) {
      if(!keys || Object.keys(keys).length === 0) {
        return callback(null, []);
      }
      async.forEach(keys,
        function(item, next) {
          self.connection.DEL(item, function(err, res) {
            next();
          });
        },
        function (err) {
          if (err) return callback(err);
          callback(null, {});
        });
    });
  */
    callback(err, res);
  });
}

Redis.prototype._all = function(resource, callback) {
  var self = this;
  //let's see how fast this is, maybe we can avoid using a set for keys
  self.connection.KEYS(self.config.key+resource+'/*', function(err, keys) {
    if(!keys || Object.keys(keys).length === 0) {
      //err = {status: 404};
      //err.msg = "Could not find any keys under " + self.config.key + resource + '/*';
      //return callback(err, null);
      return callback(null, []);
    }
    self.connection.MGET(keys, function(err, vals) {
      if(!vals || Object.keys(vals).length === 0) {
        err = {status: 404};
        err.msg = "Could not find " + id;
        return callback(err, null);
      }
      var results = vals.map(function (elem) { var e = JSON.parse(elem); e.id = e.id.split('/').slice(1).join('/'); return e; });
      callback(null, results);
    });
  });
}

function matchProps(obj, target) {
  if ('undefined' === typeof target) return false;
  for (var key in obj) {
    if ( typeof target[key] === 'undefined' || target[key] !== obj[key]) {
      return false;
    }
  }
  return true;
}

Redis.prototype.find = function(conditions, callback) {
  this._all(conditions.resource.toLowerCase(), function(err, objs) {
    var cond = utile.clone(conditions);
    delete cond.resource;
    if (err) {
      return callback(err, null);
    }
    callback(null, utile.filter(objs, function(val, key, obj) {
      return matchProps(cond, val);
    }));
  });
};

Redis.prototype.filter = function(filter, callback) {

  this._all(function(resource, err, data) {
    var results = [];
    data.forEach(function(elem) {
      if (filter(elem)) {
        results.push(elem)
      }
    });
    callback(null, results);
  });
}

