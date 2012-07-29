var url = require('url'),
    async = require('async'),
    mongodb = require('mongodb'),
    Db = mongodb.Db,
    Server = mongodb.Server,
    Connection = mongodb.Connection;

var Mongodb = exports.Mongodb = function Mongodb (config) {
  if (config.uri) {
    var parsed = url.parsed('couchdb://'+config.uri);
    config.uri = parsed.hostname;
    config.port = parseInt(parsed.port, 10);
    config.database = (parsed.pathname || '').replace(/^\//, '');
  }
  
  this.user = config.auth.user;
  this.pass = config.auth.pass;
  
  this.db = new Db(config.database, new Server(config.uri, config.port));

  this.collection = config.collection;
}

Mongodb.prototype.protocol = 'mongodb';

Mongodb.prototype.load = function (data) {
  throw new Error('Load not valid for mongodb engine')
}

Mongodb.prototype.setup = function (callback) {
  this.db.open(function (err, p_client) {
    if (err) {
      return callback(err);
    }
    this.db.authenticate(this.user, this.pass, function(err, result) {
      if (err) {
        return callback(err);
      }
      if (result !== true) {
        return callback(new Error('Failed to authenticate'));
      }
      this.db.collection(this.collection, function (err, collection) {
        if (err) {
          return callback(err);
        }
        this.client = collection;
        return callback(null);
      });
    });
  });
}

Mongodb.prototype.request = function (method) {
  var self = this,
      args = Array.prototype.slice.call(arguments, 1);
      finish = function () {
    self.client[method].apply(self.client, args)
  };

  if (!this.client) {
    this.setup(function (err) {
      if (err) {
        throw err; // sure why not
      }
      return finish();
    });
  }
  else {
    return finish();
  }
}

Mongodb.prototype.get = function (id, callback) {
  if (Array.isArray(id)) {
    return async.concat(id, function (cb, i) {
      this.get(i, cb);
    }, callback);
  }

  return this.request('findOne', {_id: id}, function (err, doc) {
    if (err) return callback(err);

    doc.id = doc._id;
    delete doc._id;
    callback(null, doc);
  });
}

Mongodb.prototype.put = function (id, doc, callback) {
  delete doc.id;
  doc._id = id;
  return this.request('insert', doc, {safe: true}, function (err) {
    if (err) return callback(err);

    doc.id = id;
    delete doc._id;
    callback(null, doc);
  });
};

Mongodb.prototype.post = Mongodb.prototype.create = function (doc, callback) {
  return this.request('insert', doc, {safe: true}, function (err, res) {
    if (err) return callback(err);

    doc.id = res[0]._id;
    callback(null, doc);
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
  return this.request('update', {_id: id}, doc, {safe: true},
  function (err, res) {
    if (err) return callback(err);

    doc.id = res[0]._id;
    callback(null, doc);
  });
};

Mongodb.prototype.destroy = function (id, callback) {
  return this.request('remove', {_id: id}, {safe: true} function (err, num) {
    if (err) return callback(err);

    callback(null, this.cache.get(id) || { id: id });
  });
}

Mongodb.prototype.find = function (conditions, callback) {
  
}
