/*

  restful.js - RESTful resource engine for Resourceful

  This resourceful engine expects `restful` endpoint to be waiting somewhere, 
  and uses the `request` library to communicate with it.

  This engine is expected to work isomorphically ( on browser or server )

*/

var resourceful = require('../../resourceful'),
    Cache = resourceful.Cache;

var request = require('request');

exports.stores = {};
exports.caches = {};

var Restful = exports.Restful = function (options) {
  var counter = 0;
  options = options || {};
  this.uri = options.uri;

  if (typeof(this.uri) === 'string') {
    // Application-wide store
    if (!exports.stores[this.uri]) {
      this.store = exports.stores[this.uri] = {};
      this.cache = exports.caches[this.uri] = new Cache();
    } else {
      // Use store that was created before
      this.store = exports.stores[this.uri];
      this.cache = exports.caches[this.uri];
    }
  }
  else {
    // Connection-wise store
    this.store = {};
    this.cache = new Cache();
  }
};

Restful.prototype.protocol = 'restful';

Restful.prototype.request = function (action, key, data, callback) {
  var self = this,
      body,
      label,
      plabel,
      resource;

  key = key._id || key;
  //
  // Remark: non-strict /find route for `restful` routers
  //
  if(action === "find" && Object.keys(data).length > 1) {
    key += '/find';
  }

  var verb = mappings[action] || "GET",
      base = "http://localhost:8000",
      uri = base + '/' + key;

  request({ method: verb,
    uri:  uri,
    json: data
  },function (err, response, body) {
    if(err){
      return callback(err);
    }
    //
    // TODO: replace with `errs` constructors
    //
    if(response.statusCode === 404) {
      var error = new Error('document not found');
      error.status = 404;
      return callback(error);
    }
    if(response.statusCode === 422) {
      var error = new Error('document conflict');
      error.status = 422;
      return callback(error);
    }
    if(response.statusCode === 403) {
      var error = new Error('forbidden');
      error.status = 403;
      return callback(error);
    }

    var result;
    if(typeof body === "undefined") {
      body = {};
    }
    try {
      result = body;
      //
      // Remark: restful returns JSON results with labels, we must remove them
      //
      result = result[Object.keys(result)[0]]
    } catch (ex) {
      return callback(ex)
    }
    return callback(null, result);
  });
  
};

Restful.prototype.load = function (data, callback) {
  
  //
  // Remark: Since there is no bulk upload for restful yet,
  // let's just iterate through all the rows and post them
  //
  var self = this,
      limit = data.length,
      count = 0;
  data.forEach(function(row){
    self.create(row, function(err, result){
      count++;
      if(count >= limit) {
        callback(null)
      }
    })
  });
  
};

Restful.prototype.save = function (key, val, callback) {
  this.request('create', key, val, callback);
};

Restful.prototype.update = function (key, obj, callback) {
  var self = this;
  //
  // TODO: cleanup API contract here
  //
  if(typeof obj.id !== 'undefined') {
    obj.id = obj.id.split('/');
    if(obj.id.length > 0) {
      obj.id = obj.id[1];
    } else {
      obj.id = obj.id[0];
    }
  }
  this.request('update', key, obj, function(err){
    self.request('get', key, {}, callback);
  });
};

Restful.prototype.get =  function (key, callback) {
  this.request('get', key, {}, callback);
};

Restful.prototype.create =  function (doc, callback) {
  this.request('create', doc._id, doc, callback);
};

Restful.prototype.destroy = function (id, callback) {
  this.request('destroy', id, {}, callback);
};

Restful.prototype.find = function (conditions, callback) {
  return this.request('find', conditions.resource.toLowerCase(), conditions, callback);
};

Restful.prototype.filter = function (filter, callback) {
  return callback(new Error('method not available: filter')); // TODO: implement filter
};

Restful.prototype.sync = function (factory, callback) {
  return callback(new Error('method not available: sync'));
};

var mappings = {
  "create": "POST",
  "save": "PUT",
  "update": "PUT",
  "get": "GET",
  "destroy": "DELETE",
  "all": "GET"
};