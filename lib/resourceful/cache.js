var resourceful = require('../resourceful');

exports.cache = true;
exports.caches = {
  stores: [],
  push: function (store) {
    return this.stores.push(store);
  },
  clear: function () {
    this.stores.forEach(function (s) { s.clear(); });
    return this;
  }
};

exports.Cache = function (options) {
  this.size = 0;
  this.store = {};

  resourceful.caches.push(this);
};

exports.Cache.prototype.get = function (id) {
  var that = this;
  if (!resourceful.cache) return;
  if (!id) { return; }
  else if (Array.isArray(id)) {
    return id.map(function (k) {
      return that.store[k.toString()];
    });
  } 
  else {
    return this.store[id.toString()];
  }
};

exports.Cache.prototype.put = function (id, obj) {
  if (!resourceful.cache) return;
  if (!this.has(id)) this.size++;
  this.store[id] = obj;
};

exports.Cache.prototype.update = function (id, obj) {
  if (!resourceful.cache) return;
  if (id in this.store) {
    for (var k in obj) {
      try { this.store[id][k] = obj[k]; }
      catch (ex) { }
    }
  }
};

exports.Cache.prototype.clear = function (id) {
  if (!resourceful.cache) return;
  if (id) {
    this.size --;
    delete(this.store[id]);
  } 
  else {
    this.size = 0;
    this.store = {};
  }
};

exports.Cache.prototype.has = function (id) {
  if (!resourceful.cache) return;
  return id in this.store;
};
