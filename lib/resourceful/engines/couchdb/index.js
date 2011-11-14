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
    var parsed = url.parse('couchdb://' + config.uri);
    config.uri = parsed.hostname;
    config.port = parseInt(parsed.port, 10);
    config.database = (parsed.pathname || '').replace(/^\//, '');
  }

  this.connection = new(cradle.Connection)({
    host:  config.host || config.uri || '127.0.0.1',
    port:  config.port || 5984,
    raw:   true,
    cache: false,
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
    if (e) return callback(e);
    
    return Array.isArray(id) ?
        callback(null, res.rows.map(function (r) { return r.doc; }))
        :
        callback(null, res);
  });
};

Couchdb.prototype.put = function (id, doc, callback) {
  return this.request('put', id, doc, function (e, res) {
    if (e) return callback(e);
    
    res.status = 201;
    callback(null, res);
  });
};

Couchdb.prototype.save = function () {
  return this.put.apply(this, arguments);
};

Couchdb.prototype.update = function (id, doc, callback) {
  return this.cache.has(id) ?
      this.put(id, resourceful.mixin({}, this.cache.get(id).toJSON(), doc), callback)
      :
      this.request('merge', id, doc, callback);
};

Couchdb.prototype.destroy = function () {
  var that = this,
      args = Array.prototype.slice.call(arguments),
      id = args[0],
      rev;

  if (Array.isArray(id)) {
    rev = id[1];
    id = id[0];
  }

  if (rev) {
    return this.request.apply(this, ['remove', id, rev, callback]);
  } 
  if (this.cache.has(id)) {
    args.splice(1, -1, this.cache.get(id)._rev);
    return this.request.apply(this, ['remove'].concat(args));
  } 
  
  this.head(id, function (e, headers) {
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
      var doc = r.doc || r.value;

      if (r.id) { doc._id = r.id }
      return doc;
    }));
  });
};

Couchdb.prototype.all = function (callback) {
  return this.request.call(this, 'all', { include_docs: 'true' }, function (e, res) {
    return e ?
        callback(e)
        :
        callback(null, res.rows.map(function (r) { return r.doc; }));
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
          that.connection.connection.create(function () {
            that.sync(callback);
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
Couchdb._byParent = function (factory, parent, rfactory) {
  factory.filter('by' + parent, { include_docs: true }, resourceful.render({
    map: function (doc) {
      if (doc.resource === $resource) {
        for (var i = 0; i < doc.$children.length; i++) {
          emit(doc._id, { _id: doc.$children[i] });
        }
      }
    }
  }, {
    resource: JSON.stringify(parent),
    children: factory.resource + '_ids'
  }));
};
