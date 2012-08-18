/*
 * couchdb/index.js: CouchDB engine wrapper
 *
 * (C) 2011 Nodejitsu Inc.
 * MIT LICENCE
 *
 */

var url = require('url'),
    cradle = require('cradle'),
    resourceful = require('../../../resourceful'),
    render = require('./view').render,
    filter = require('./view').filter;

var Couchdb = exports.Couchdb = function Couchdb(config) {
  if (config.uri) {
    var parsed = url.parse(config.uri);
    config.uri = parsed.hostname;
    config.port = parseInt(config.port || parsed.port, 10);
    config.database = config.database || ((parsed.pathname || '').replace(/\//g, ''));
  }

  this.connection = new(cradle.Connection)({
    host:  config.host || config.uri || '127.0.0.1',
    port:  config.port || 5984,
    raw:   true,
    cache: false,
    secure: config.secure,
    auth:  config && config.auth || null
  }).database(config.database || resourceful.env);

  this.cache = new resourceful.Cache();
};

Couchdb.prototype.protocol = 'couchdb';

Couchdb.prototype.load = function (data) {
  throw new(Error)("Load not valid for couchdb engine.");
};

Couchdb.prototype.request = function (method) {
  var args = Array.prototype.slice.call(arguments, 1);
  return this.connection[method].apply(this.connection, args);
};

Couchdb.prototype.head = function (id, callback) {
  return this.request('head', id, callback);
};

Couchdb.prototype.get = function (id, callback) {
  return this.request.call(this, 'get', id, function (e, res) {
    if (e) {
      if (e.headers) {
        e.status = e.headers.status;
      }
      return callback(e);
    }

    if (Array.isArray(id)) {
      res = res.rows.map(function (r) {
        if (r.doc) {
          r.doc.id = r.doc._id;
          delete r.doc._id;
        }
        return r.doc;
      });
    } else {
      res.id = res._id;
      delete res._id;
    }

    return callback(null, res);
  });
};

Couchdb.prototype.put = function (id, doc, callback) {
  delete doc.id;
  return this.request('put', id, doc, function (e, res) {
    if (e) {
      if (e.headers) {
        e.status = e.headers.status;
      }
      return callback(e);
    }

    doc._rev = res.rev;
    doc.id = id;
    callback(null, doc);
  });
};

Couchdb.prototype.post = Couchdb.prototype.create = function (doc, callback) {
  return this.request('post', doc, function (e, res) {
    if (e) return callback(e);

    doc.id = res.id;
    doc._rev = res.rev;
    callback(null, doc);
  });
};

Couchdb.prototype.save = function (id, doc, callback) {
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

Couchdb.prototype.update = function (id, doc, callback) {
 if (this.cache.has(id)) {
   var r = this.cache.get(id);
   this.put(id, resourceful.mixin({}, r, doc), callback)
 } else {
   var that = this;
   this.request('merge', id, doc, function (err, res) {
     that.get(id, callback);
   });
 }
};

Couchdb.prototype.destroy = function (id, callback) {
  var that = this, args, rev,
      cb = callback;

  callback = function (err, res) {
    if (err) return cb(err);
    cb(null, that.cache.get(id) || { id: res.id, _rev: res.rev });
  };

  args = [id, callback];

  if (Array.isArray(id)) {
    rev = id[1];
    id = id[0];
  }

  if (rev) {
    return this.request.apply(this, ['remove', id, rev, callback]);
  }
  if (this.cache.has(id)) {
    args.splice(1, -1, this.cache.get(id)._rev);
    args[0] = id;
    return this.request.apply(this, ['remove'].concat(args));
  }

  this.head(id, function (e, headers, res) {
    if (res === 404 || !headers['etag']) {
      e = e || { reason: 'not_found', status: 404 };
    }

    if (headers.etag) {
      args.splice(1, -1, headers.etag.slice(1, -1));
      return that.request.apply(that, ['remove'].concat(args));
    } else { args.pop()(e) }
  });
};

Couchdb.prototype.view = function (path, opts, callback) {
  return this.request.call(this, 'view', path, opts, function (e, res) {
    if (e) return callback(e);

    callback(null, res.rows.map(function (r) {
      // With `include_docs=true`, the 'doc' attribute is set instead of 'value'.
      if (r.doc) {
        if (r.doc._id) {
          r.doc.id = r.doc._id.split('/').slice(1).join('/');
          delete r.doc._id;
        }
        return r.doc;
      } else {
        if (r.value._id) {
          r.value.id = r.value._id.split('/').slice(1).join('/');
          delete r.value._id;
        }
        return r.value;
      }
    }));
  });
};

Couchdb.prototype.find = function (conditions, callback) {
  this.connection.temporaryView(resourceful.render({
    map: function (doc) {
      var obj = $conditions;
      if (function () {
        for (var k in obj) {
          if (obj[k] !== doc[k]) return false;
        }
        return true;
      }()) {
        emit(doc._id, doc);
      }
    }
  }, { conditions: JSON.stringify(conditions) }), function (e, res) {
    if (e) return callback(e);
    callback(null, res.rows.map(function (r) {
      // With `include_docs=true`, the 'doc' attribute is set instead of 'value'.
      if (r.doc) {
        if (r.doc._id) {
          r.doc.id = r.doc._id.split('/').slice(1).join('/');
          delete r.doc._id;
        }
        return r.doc;
      } else {
        if (r.value._id) {
          r.value.id = r.value._id.split('/').slice(1).join('/');
          delete r.value._id;
        }
        return r.value;
      }
    }));
  });
};

Couchdb.prototype.filter = function (name, data) {
  return filter.call(data.resource, name, data.options, data.filter);
};

Couchdb.prototype.sync = function (factory, callback) {
  var that = this,
      id = '_design/' + factory.resource;

  factory._design = factory._design || {};
  factory._design._id = id;
  if (factory._design._rev) return callback(null);

  this.connection.head(id, function (e, headers, status) {
    if (!e && headers.etag) {
      factory._design._rev = headers.etag.slice(1, -1);
    }

    that.connection.put(id, factory._design, function (e, res) {
      if (e) {
        if (e.reason === 'no_db_file') {
          that.connection.create(function () {
            that.sync(factory, callback);
          });
        }
        else {

          /* TODO: Catch errors here. Needs a rewrite, because of the race */
          /* condition, when the design doc is trying to be written in parallel */
          callback(e);
        }
      }
      else {
        // We might not need to wait for the document to be
        // persisted, before returning it. If for whatever reason
        // the insert fails, it'll just re-attempt it. For now though,
        // to be on the safe side, we wait.
        factory._design._rev = res.rev;
        callback(null, factory._design);
      }
    });
  });
};

//
// Relationship hook
//
Couchdb._byParent = function (factory, rfactory) {
  var conn = this
    , parent = rfactory.lowerResource
    , child = factory.lowerResource;

  factory['by' + rfactory.resource] = function (id, callback) {
    rfactory.get.call(rfactory, id, function (err, res) {
      if (err) return callback(err);

      var children = res[child + '_ids'].map(function (e) {
        return parent + "/" + id + "/" + e;
      });

      factory.get.call(factory, children, callback);
    });
  };
};
