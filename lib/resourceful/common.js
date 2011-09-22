/*
 * common.js: Common utility functions for resourceful.
 *
 * (C) 2011 Nodejitsu Inc.
 * MIT LICENCE
 *
 */

var common = exports;

common.mixin = function (target) {
  var objs = Array.prototype.slice.call(arguments, 1);
  objs.forEach(function (o) {
    Object.keys(o).forEach(function (k) {
      if (!o.__lookupGetter__(k)) {
        target[k] = o[k];
      }
    });
  });
  return target;
};

common.clone = function (object) {
  return Object.keys(object).reduce(function (obj, k) {
    obj[k] = object[k];
    return obj;
  }, {});
};

common.typeOf = function (value) {
  var derived = typeof(value);

  if (Array.isArray(value)) {
    return 'array';
  }
  else if (derived === 'object') {
    return derived ? 'object' : 'null'
  }
  else if (derived === 'function') {
    return derived instanceof RegExp ? 'regexp' : 'function';
  }

  return derived;
};

common.capitalize = function (str) {
  return str && str[0].toUpperCase() + str.slice(1);
};

common.pluralize = function (s) {
  return s + 's'
};
