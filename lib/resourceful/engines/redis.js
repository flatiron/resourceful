/*
 * Redis engine wrapper
 *
 * (C) 2013 Rick Richardson 
 * MIT LICENCE
 *
 */

var resourceful = require('../../resourceful'),
    redis =  require('redis'),
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
    getfunc = self.connection.MGET;
  }
  else {
    id = self.config.key + id;
    getfunc = self.connection.GET;
  }

  console.dir("fetching " + id);
  getfunc(id, function(err, val) {
   
    console.dir("found " + val);  
    if(!val || val.length === 0 || val === null) {
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
      console.dir(val);
      val = JSON.parse(val);
    }

    return callback(null, val);
  });

};

Redis.prototype.post = Redis.prototype.create = function (doc, callback) {

  if ('undefined' === typeof doc.id) {
    doc.id = uuid.v4(); 
    console.dir("setting doc.id to " + doc.id); 
  }
  this.save(doc.id, JSON.stringify(doc), callback); 
};

Redis.prototype.update = Redis.prototype.put = function (id, doc, callback) {

  var self = this, index;
  var newid = self.config.key+id; 
  console.dir(newid);  
  self.connection.SET(newid, JSON.stringify(doc), function(err) {
    if(err) { console.dir(err); return callback(err); }
    self.get(id, callback); 
  });
};

Redis.prototype.save = function (id, doc, callback) {
  var args = Array.prototype.slice.call(arguments, 0),
      callback = args.pop(),
      doc = args.pop();

  // if there's an ID left in args after popping off the callback and
  // the doc, then we need to PUT, otherwise create a new record thru POST
  if (args.length) {
    return this.put.apply(this, arguments);
  }

  // checks for presence of _id in doc, just in case the caller forgot
  // to add an id as first argument
  if (doc.id) {
    return this.put.apply(this, [doc.id, doc, callback]);
  } else {
    return this.post.call(this, doc, callback);
  }
};

Redis.prototype.destroy = function (id, callback) {
  var self = this,
      key = this.config.key + id;

  self.connection.DEL(key, function(err) {
    if (err)
      return callback(err);
    callback(null); 
  });
}


Redis.prototype._all = function(resource, callback) {
  var self = this;
  //let's see how fast this is, maybe we can avoid using a set for keys
  console.dir("fetching " + self.config.key + resource+'/*');
  self.connection.KEYS(self.config.key+resource+'/*', function(err, keys) {
    if(!keys || Object.keys(keys).length === 0) {
      err = {status: 404};
      err.msg = "Could not find any keys under" + self.config.key;
      return callback(err, null);
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

Redis.prototype.find = function(conditions, callback) {
  this._all(conditions.resource.toLowerCase(), callback); 
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

