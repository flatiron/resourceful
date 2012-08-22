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
      plabel;

  //
  // TODO: cleanup inflection code
  //
  key = key._id || key;
  key = key.split('\/');
  label = key[0];
  plabel = key[0] = key[0] + 's';
  key = key.join('\/');

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
    var result;
    if(typeof body === "undefined") {
      body = "{}";
    }
    try {
      result = JSON.parse(body);
      //
      // Remark: restful returns JSON results with labels, we must remove them
      //
      if(typeof result[plabel] === "object") {
        result = result[plabel];
      }
      if(typeof result[label] === "object") {
        result = result[label];
      }
    } catch (ex) {
      console.log(body)
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
  this.request('create', key, {}, callback);
};

Restful.prototype.update = function (key, obj, callback) {
  this.request('update', key, obj, callback);
};

Restful.prototype.get =  function (key, callback) {
  this.request('get', key, {}, callback);
};

Restful.prototype.create =  function (doc, callback) {
  this.request('create', doc, {}, callback);
};

Restful.prototype.destroy = function (id, callback) {
  this.request('destroy', id, {}, callback);
};

Restful.prototype.find = function (conditions, callback) {
  this.request('all', conditions.resource.toLowerCase(), conditions, callback);
};

Restful.prototype.filter = function (filter, callback) {
  callback(new Error('method not available: filter'));
};

Restful.prototype.sync = function (factory, callback) {
  callback(new Error('method not available: sync'));
};

var mappings = {
  "create": "POST",
  "save": "PUT",
  "update": "PUT",
  "get": "GET",
  "destroy": "DELETE",
  "all": "GET"
};