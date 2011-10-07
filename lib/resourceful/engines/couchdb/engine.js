var sys = require('sys');
var path = require('path');

var resourceful = require('../../../resourceful'),
    url = require('url'),
    cradle = require('cradle');

var render = require('./view').render;


function Connection(config) {
  // Parse uri
  if (config.uri) {
    var parsed = url.parse('couchdb://' + config.uri);
    config.uri = parsed.hostname;
    config.port = parseInt(parsed.port, 10);
    config.database = (parsed.pathname || '').replace(/^\//, '');
  }

  this.connection = new(cradle.Connection)({
    host:  config.uri || '127.0.0.1',
    port:  config.port || 5984,
    raw:   true,
    cache: false,
    auth:  config && config.auth || null
  }).database(config.database || resourceful.env);
  this.cache = new(resourceful.Cache);
};
exports.Connection = Connection;

exports.Connection.prototype = {
  protocol: 'couchdb',
  load: function (data) {
    throw new(Error)("Load not valid for couchdb engine.");
  },
  request: function (method) {
    var args = Array.prototype.slice.call(arguments, 1);
    return this.connection[method].apply(this.connection, args);
  },
  head: function (id, callback) {
    return this.request('head', id, callback);
  },
  get: function (id, callback) {
    this.request.call(this, 'get', id, function (e, res) {
      if (e) { callback(e) }
      else {
        if (Array.isArray(id)) {
          callback(null, res.rows.map(function (r) { return r.doc }));
        } else {
          callback(null, res);
        }
      }
    });
  },
  put: function (id, doc, callback) {
    var args = Array.prototype.slice.call(arguments);
    return this.request('put', id, doc, function (e, res) {
      if (e) {
        callback(e);
      } else {
        res.status = 201;
        callback(null, res);
      }
    });
  },
  save: function () {
    return this.put.apply(this, arguments);
  },
  update: function (id, doc, callback) {
    if (this.cache.has(id)) {
      this.put(id, resourceful.mixin({}, this.cache.get(id).toJSON(), doc), callback);
    } else {
      this.request('merge', id, doc, callback);
    }
  },
  destroy: function () {
    var that = this,
        args = Array.prototype.slice.call(arguments),
        id = args[0];

    if (this.cache.has(id)) {
      args.splice(1, -1, this.cache.get(id)._rev);
      return this.request.apply(this, ['remove'].concat(args));
    } else {
      this.head(id, function (e, headers) {
        if (headers.etag) {
          args.splice(1, -1, headers.etag.slice(1, -1));
          return that.request.apply(that, ['remove'].concat(args));
        } else { args.pop()(e) }
      });
    }
  },
  view: function (path, opts, callback) {
    return this.request.call(this, 'view', path, opts, function (e, res) {
      if (e) { callback(e) }
      else {
        callback(null, res.rows.map(function (r) {
          // With `include_docs=true`, the 'doc' attribute is set instead of 'value'.
          var doc = r.doc || r.value;

          if (r.id) { doc._id = r.id }
          return doc;
        }));
      }
    });
  },
  all: function (callback) {
    return this.request.call(this, 'all', { include_docs: 'true' }, function (e, res) {
      if (e) { callback(e) }
      else {
        callback(null, res.rows.map(function (r) { return r.doc }));
      }
    });
  }
};

Connection.prototype.sync = function (factory, callback) {
  var that = this,
      id = '_design/' + factory.resource;

  callback || (callback = function() {});

  factory._design = factory._design || {};
  factory._design._id = id;
  if (factory._design._rev) { return callback(null) }

  // Check if design doc stored in database needs update
  function needsUpdate(olddoc, newdoc) {
    // If both design docs are w/o view
    if (!olddoc.views && !newdoc.views) return false;

    // If one of docs has view and other not
    if (!olddoc.views && newdoc.views ||
        olddoc.views && !newdoc.views) {
      return true;
    }

    // View count should be equal
    var oldViews = Object.keys(olddoc.views),
        newViews = Object.keys(newdoc.views);

    if (oldViews.length !== newViews.length) return true;

    var viewChanged = newViews.some(function(name) {
      if (!olddoc.views[name]) return true;

      if (olddoc.views[name].map !== newdoc.views[name].map) return true;
      if (olddoc.views[name].reduce !== newdoc.views[name].reduce) return true;

      return false;
    });

    if (viewChanged) return true;

    return false;
  };

  this.connection.get(id, function (e, doc) {
    if (!e && doc) {
      factory._design._rev = doc._rev;

      if (!needsUpdate(doc, factory._design)) {
        // Design document hasn't changed
        return callback(null, false);
      }
    }

    // Request confirmation
    if (!resourceful.autoMigrate) {
      return callback(Error('resourceful.autoMigrate should be set to true ' +
                            'to allow migrations'));
    }

    that.connection.put(id, factory._design, function (e, res) {
      if (e) {
        if (e.reason === 'no_db_file') {
          that.connection.connection.create(function () {
            that.sync(callback);
          });
        } else {
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
}

//
// Relationship hook
//
exports.Connection._byParent = function (factory, parent, rfactory) {
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
}
