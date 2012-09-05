var url = require('url'),
    async = require('async'),
    mongodb = require('mongodb'),
    common = require('../common'),
    resourceful = require('../../resourceful'),
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

  this.user = config.auth ? config.auth.user : config.user || null;
  this.pass = config.auth ? config.auth.pass : config.pass || null;

  this.db = new Db(config.database || resourceful.env || 'test',
    new Server(config.host || config.uri || '127.0.0.1',
      config.port || 27017));

  this.collection = config.collection || 'resourceful';

  this.cache = new resourceful.Cache();
};

Mongodb.prototype.protocol = 'mongodb';

Mongodb.prototype.setup = function (cb) {
  var self = this;

  if (this.callbacks === undefined) {
    this.callbacks = [];
  }

  this.callbacks.push(cb);

  var callbacks = function () {
    for (var i in self.callbacks)
    {
      self.callbacks[i].apply(this, arguments);
    }
  }

  var getCollection = function () {
    self.db.collection(self.collection, function (err, collection) {
      if (err) return callbacks(err);

      self.client = collection;
      return callbacks(null);
    });
  };

  var authenticate = function () {
    self.db.authenticate(self.user, self.pass, function (err, result) {
      if (err) {
        return callbacks(err);
      }
      if (result !== true) {
        return callbacks(new Error('Failed to authenticate'));
      }
      return getCollection();
    });
  };

  if (!this.db.openCalled) {
    this.db.open(function (err, p_client) {
      if (err) {
        return callbacks(err);
      }

      if (self.user && self.pass) {
        return authenticate();
      }

      return getCollection();
    });
  }
};

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
};

Mongodb.prototype.get = function (id, callback) {
  var self = this;
  if (Array.isArray(id)) {
    var array = [];
    return async.forEachSeries(id, function (i, cb) {
      self.get(i, function (err, doc) {
        if (err) {
          if (err.status === 404) {
            doc = null;
          }
          else {
            return cb(err);
          }
        }

        array.push(doc);

        return cb(null);
      });
    }, function (err) {
      if (err) return callback(err);
      callback(null, array);
    });
  }

  return this.request(function (err) {
    if (err) return callback(err);

    self.client.findOne({_id: id}, function (err, doc) {
      if (err) return callback(err);

      if (doc !== null) {
        doc.id = doc._id;
        delete doc._id;
      }
      else {
        var error = new Error('Document '+id+' not found.');
        error.status = 404;
        return callback(error);
      }

      return callback(null, doc);
    });
  });
};

Mongodb.prototype.load = function (data) {
  var self = this;
  var array = common.clone(data);
  return this.request(function (err) {
    if (err) return callback(err);

    for (var i in array) {
      array[i]._id = array[i].id;
      delete array[i].id;
    }

    self.client.insert(array, {safe: true}, function (err) {
      if (err) return callback(err);

      callback(null);
    });
  });
};

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

Mongodb.prototype.save = function (/*id, doc, callback*/) {
  var self = this,
      args = Array.prototype.slice.call(arguments, 0),
      callback = args.pop(),
      doc = args.pop(),
      id = args.pop();

  if (!id && !doc.id) {
    //no id available, so we must be inserting a new document. same as `post` :D
    return this.post(doc, callback);
  }

  if (id) {
    save = common.clone(doc);
    save._id = doc.id = id;
  }
  else {
    save = common.clone(doc);
    save._id = save.id;
    delete save.id;
  }

  return this.request(function (err) {
    if (err) return callback(err);

    self.client.save(save, {safe: true}, function (err) {
      if (err) return callback(err);

      return callback(null, doc);
    });
  });
};

Mongodb.prototype.update = function (id, update, callback) {
  var self = this;
  return this.request(function(err) {
    if (err) return callback(err);

    self.client.update({_id: id}, {$set: update}, {safe: true}, function (err, res) {
      if (err) return callback(err);

      self.client.findOne({_id: id}, function (err, doc) {
        if (err) return callback(err);

        doc.id = doc._id;
        delete doc._id;

        callback(null, doc);
      });
    });
  });
};

Mongodb.prototype.destroy = function (id, callback) {
  var self = this;
  return this.request(function (err) {
    if (err) return callback(err);

    self.client.remove({_id: id}, {safe: true}, function (err, num) {
      if (err) return callback(err);

      callback(null, self.cache.get(id) || { id: id });
    });
  });
};

Mongodb.prototype.find = function (conditions, callback) {
  var self = this;
  return this.request(function (err) {
    if (err) return callback(err);

    self.client.find(conditions).toArray(function (err, res) {
      if (err) return callback(err);

      var rows = res ? res.map(function (doc) {
        doc.id = doc._id.split('/').slice(1).join('/');
        delete doc._id;
        return doc;
      }) : [];

      callback(null, rows);
    });
  });
};

Mongodb.prototype.filter = function (filter, callback) {
  var self = this;
  var result = [];
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
