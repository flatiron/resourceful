var url = require('url'),
    async = require('async'),
    mongodb = require('mongodb'),
    Db = mongodb.Db,
    Server = mongodb.Server,
    Connection = mongodb.Connection;

var Mongodb = exports.Mongodb = function Mongodb (config) {
  if (config.uri) {
    var parsed = url.parse('mongodb://'+config.uri);
    config.uri = parsed.hostname;
    config.port = parseInt(parsed.port, 10);
    config.database = (parsed.pathname || '').replace(/^\//, '');
  }

  this.user = config.auth ? config.auth.user : null;
  this.pass = config.auth ? config.auth.pass : null;

  this.db = new Db(config.database || resourceful.env,
    new Server(config.host || config.uri || '127.0.0.1',
      config.port || 27017));

  this.collection = config.collection;
}

Mongodb.prototype.protocol = 'mongodb';

Mongodb.prototype.load = function (data) {
  throw new Error('Load not valid for mongodb engine')
}

Mongodb.prototype.setup = function (cb) {
  var self = this;

  var getCollection = function (callback) {
    self.db.collection(self.collection, function (err, collection) {
      if (err) return callback(err);

      self.client = collection;
      return callback(null);
    });
  };

  var authenticate = function (callback) {
    self.db.authenticate(self.user, self.pass, function (err, result) {
      if (err) {
        return callback(err);
      }
      if (result !== true) {
        return callback(new Error('Failed to authenticate'));
      }
      return getCollection(callback);
    });
  }

  this.db.open(function (err, p_client) {
    if (err) {
      return callback(err);
    }
    if (self.user && self.pass) {
      return authenticate(cb);
    }

    return getCollection(cb);
  });
}

Mongodb.prototype.request = function (callback) {
  if (!this.client) {
    return this.setup(function (err) {
      if (err) {
        return callback(err); // sure why not
      }
      return callback(null);
    });
  }
  else {
    return process.nextTick(function (client) {
      return callback(null);
    });
  }
}

Mongodb.prototype.get = function (id, callback) {
  var self = this;
  if (Array.isArray(id)) {
    return async.concat(id, function (cb, i) {
      self.get(i, cb);
    }, callback);
  }

  return this.request(function (err) {
    if (err) return callback(err);

    self.client.findOne({_id: id}, function (err, doc) {
      if (err) return callback(err);

      doc.id = doc._id;
      delete doc._id;
      callback(null, doc);
    });
  });
}

Mongodb.prototype.put = function (id, doc, callback) {
  var self = this;
  return this.request(function (err) {
    if (err) return callback(err);

    delete doc.id;
    doc._id = id;
    self.client.insert(doc, {safe: true}, function (err) {
      if (err) return callback(err);

      doc.id = id;
      delete doc._id;
      callback(null, doc);
    });
  });
};

Mongodb.prototype.post = Mongodb.prototype.create = function (doc, callback) {
  var self = this;
  return this.request(function (err) {
    if (err) return callback(err);

    self.client.insert(doc, {safe: true}, function (err, res) {
      if (err) return callback(err);

      doc.id = res[0]._id;
      callback(null, doc);
    });
  });
};

// ripped from couchdb engine :P
Mongodb.prototype.save = function (id, doc, callback) {
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

Mongodb.prototype.update = function (id, doc, callback) {
  var self = this;
  return this.request(function(err) {
    if (err) return callback(err);

    self.client.update({_id: id}, doc, {safe: true}, function (err, res) {
      if (err) return callback(err);

      doc.id = res[0]._id;
      callback(null, doc);
    });
  });
};

Mongodb.prototype.destroy = function (id, callback) {
  var self = this;
  return this.request(function (err) {
    if (err) return callback(err);

    self.remove({_id: id}, {safe: true}, function (err, num) {
      if (err) return callback(err);

      callback(null, self.cache.get(id) || { id: id });
    });
  });
};

Mongodb.prototype.find = function (conditions, callback) {
  return this.request(function (err) {
    if (err) return callback(err);

    self.find(conditions).toArray(function (err, res) {
      if (err) return callback(err);

      callback(null, res);
    });
  });
};

Mongodb.prototype.filter = function (filter, callback) {
  var result = []
  return this.request(function (err) {
    if (err) return callback(err);

    self.client.find().each(function (err, doc) {
      if (err) return callback(err);

      if (doc === null) {
        return callback(null, result);
      }

      if (filter(doc)) {
        result.push(doc);
      }
    });
  });
};

Mongodb.prototype.sync = function () {
  process.nextTick(function () { callback(); }); //do nothing
}
