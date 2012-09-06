var nosqlite = require('nosqlite'),
    resourceful = require('../../resourceful'),
    Cache = resourceful.Cache;

var Filesystem = exports.Filesystem = function (config) {
  config = config || {};

  this.uri = config.uri;
  this.connection = new(nosqlite.Connection)(this.uri);
  this.database = this.connection.database(config.database);
};

Filesystem.prototype.protocol = 'filesystem';

Filesystem.prototype.load = function (data) {
  throw new(Error)("Load not valid for filesystem engine");
};

Filesystem.prototype.request = function (fn) {
  var args = Array.prototype.slice.call(arguments, 1);
  return this.connection[fn].apply(this.connection, args);
};

Filesystem.prototype.get =  function (key, callback) {
  return this.request.call(this, 'get', key, function (err, res) {
    if (err) {
      return callback(err);
    }

    res.id = res.id || res._id;
    delete res._id;

    return callback(null, res);
  });
};

Filesystem.prototype.put = function (key, doc, callback) {
  delete doc.id;
  return this.request('put', key, doc, function (err, res) {
    if (err) {
      return callback(err);
    }

    res.id = key;
    delete res._id;
    callback(null, res);
  });
};

Filesystem.prototype.post = Filesystem.prototype.create = function (doc, callback) {
  doc._id = doc.id;
  delete doc.id;
  return this.request('post', doc, function (err, res) {
    if (err) return callback(err);

    doc.id = res._id;
    delete doc._id;
    callback(null, doc);
  });
};

Filesystem.prototype.save = function (key, doc, callback) {
  return this.put.apply(this, arguments);
};

Filesystem.prototype.update = function (key, obj, callback) {
  return this.put.apply(this, key, obj, callback);
};

Filesystem.prototype.destroy = function (key, callback) {
  return this.request.call('delete', key, function (err) {
    if (err) return callback(err);

    callback(null, {});
  });
}

Filesystem.prototype.find = function (conditions, callback) {
  return this.request.call(this, conditions, callback);
};
