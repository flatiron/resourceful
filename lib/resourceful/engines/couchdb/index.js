/*
 * couchdb/index.js: CouchDB engine wrapper
 *
 * (C) 2011 Nodejitsu Inc.
 * MIT LICENCE
 *
 */

exports.Couchdb = require('./engine').Connection;

exports.Couchdb.prototype.filter = function(name, options) {
  return require('./view').filter.call(options.resource, name, options.filter);
};
