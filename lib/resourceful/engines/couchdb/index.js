/*
 * couchdb/index.js: CouchDB engine wrapper
 *
 * (C) 2011 Nodejitsu Inc.
 * MIT LICENCE
 *
 */

exports.Couchdb = require('./engine').Connection;

var filter = require('./view').filter;

exports.Couchdb.prototype.filter = function (name, data) {
  return filter.call(data.resource, name, data.options, data.filter);
};
