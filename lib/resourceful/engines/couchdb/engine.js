var sys = require('sys');
var path = require('path');

var resourceful = require('resourceful'),
    cradle = require('cradle');

resourceful.Cache = require('resourceful/cache').Cache;

this.Connection = function (config) {
    this.connection = new(cradle.Connection)({
        host:  config.uri || '127.0.0.1',
        port:  config.port || 5984,
        raw:   true,
        cache: false,
        auth:  config && config.auth || null
    }).database(config.database || resourceful.env); 
    this.cache = new(resourceful.Cache);
};

this.Connection.prototype = {
    protocol: 'couchdb',
    load: function(data) {
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

CouchDb.prototype.sync = function (callback) {
  this._design = this._design || {};

  if (this._design._rev) { return synched(null) }

  this.connection.head(id, function (e, headers, status) {
      if (headers.etag) {
          that._design._rev = headers.etag.slice(1, -1);
      }
      that.connection.put(id, that._design, function (e, res) {
          if (e) { 
              if (e.reason === 'no_db_file') {
                  that.connection.connection.create(function () {
                      that.sync(callback);
                  });
              }
              
              /* TODO: Catch errors here. Needs a rewrite, because of the race */
              /* condition, when the design doc is trying to be written in parallel */
          } 
          else {
              // We might not need to wait for the document to be
              // persisted, before returning it. If for whatever reason
              // the insert fails, it'll just re-attempt it. For now though,
              // to be on the safe side, we wait.
              that._design._rev = res.rev;
              synched(null, that._design);
          }
      });
  });
}

this.Resource._relationship = function (type, r, options) {
  //
  // **** TODO **** The context of this prototype function is the resource, 
  // it needs to be the engine.
  //
  
    var that = this,
        rfactory,     // Resource factory/constructor
        rstring,      // Resource string
        rstringp,     // Resource pluralized string
        rstringc;     // Resource capitalized string

    if (typeof(r) === 'string') {
        rstring  = r; 
        rfactory = resourceful.resources[capitalize(r)];
    } else if (typeof(r) === 'function') {
        rstringc = r.resource;
        rfactory = r;
    } else {
        throw new(TypeError)("argument must be a string or constructor");
    }
    rstringp = pluralize(rstring);
    rstringc = capitalize(rstring);

    if (this._children.indexOf(rstringc) !== -1) { return }
    if (rfactory === undefined) throw new(Error)("unknown resource " + rstring);

    if (type == 'child') {
        this._children.push(rstringc);
        this.property(rstring + '_ids', Array, { default: [] });
        //
        // Parent.children(id, callback)
        //
        this[rstringp] = function (id, callback) {
            return rfactory['by' + rstringc](id, callback);
        };
        //
        // parent.children(callback)
        //
        this.prototype[rstringp] = function (callback) {
            return this.constructor[rstringp](this._id, callback);
        };
    } else {
        this._parents.push(rstringc);
        //
        // Child.byParent(id, callback)
        //
        this.filter('by' + rstringc, { include_docs: true }, {
             map: render(function () {
                 if (doc.resource === $resource) {
                     for (var i = 0; i < doc.$children.length; i++) {
                         emit(doc.$children[i], null);
                     }
                 }
             }, { resource: that.resource, children: that.resource + '_ids' })
        });
        //
        // child.parent(callback)
        //
        this.prototype[rstring] = function (callback) {
            return rfactory.get(this[rstring_id], callback);
        };
        this.property(rstring + '_id', String, { default: null });
    }
};
