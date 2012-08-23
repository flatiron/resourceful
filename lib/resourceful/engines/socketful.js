var resourceful = require('../../resourceful'),
    Cache = resourceful.Cache;

//
// TODO: based on the env, switch between `socket.io` ( browser ) and `socket.io-client` ( server-side client )
//
var io = require('socket.io-client');

exports.stores = {};
exports.caches = {};

var Socketful = exports.Socketful = function (options) {
  var counter = 0;
  options = options || {};
  this.uri = options.uri;
  this.socket = io.connect('http://localhost:8000');

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

Socketful.prototype.protocol = 'socketful';

Socketful.prototype.request = function (action, key, data, callback) {
  var self = this,
      body,
      label,
      plabel;

  //
  // TODO: better key extraction / management
  //
  var resource = data.resource.toLowerCase();
  console.log('emitting', resource, action, data);
  self.socket.emit(resource, action, data, function(err, result) {
    if(err) {
      return callback(err);
    } else {
      return callback(null, result);
    }
  });
};

Socketful.prototype.load = function (data, callback) {
  //
  // Remark: Since there is no bulk upload for socketful yet,
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

Socketful.prototype.save = function (key, val, callback) {
  this.request('create', key, val, callback);
};

Socketful.prototype.update = function (key, obj, callback) {
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
  this.request('update', key, obj, callback);
};

Socketful.prototype.get =  function (key, callback) {
  //
  // TODO: cleanup API contract here
  //
  var resource, id;

  key = key.split('/');
  resource = key[0];
  id = key[1];
  this.request('get', key, { resource: resource }, callback);
};

Socketful.prototype.create =  function (doc, callback) {
  this.request('create', doc._id, doc, callback);
};

Socketful.prototype.destroy = function (id, callback) {
  this.request('destroy', id, {}, callback);
};

Socketful.prototype.find = function (conditions, callback) {
  if(Object.keys(conditions).length === 1) {
    return this.request('all', conditions.resource.toLowerCase(), conditions, callback); // TODO: implement find
  }
  return callback(new Error('method not available: find'));
};

Socketful.prototype.filter = function (filter, callback) {
  return callback(new Error('method not available: filter')); // TODO: implement filter
};

Socketful.prototype.sync = function (factory, callback) {
  return callback(new Error('method not available: sync'));
};