/*
 * common.js: Common utility functions for resourceful.
 *
 * (C) 2011 Alexis Sellier, Charlie Robbins & the Contributors.
 * Apache 2.0
 *
 */
var util = require('util'),
    async = require('async'),
    inflect = require('i')();

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

common.render = function (template, attributes) {
  return ['map', 'reduce', 'rereduce'].reduce(function (view, f) {
    if (template[f]) {
      view[f] = Object.keys(attributes).reduce(function (str, k) {
        var attribute = attributes[k];
        if (typeof(attribute) !== 'string') {
          attribute = JSON.stringify(attribute);
        }

        var re = new RegExp(('$' + k).replace(/([^\w\d])/g, '\\$1'), 'g');

        return str.replace(re, attribute)
                  .replace(/"/g, "'");
      }, template[f].toString().replace(/\n/g, '').replace(/\s+/g, ' '));
      return view;
    } else {
      return view;
    }
  }, {});
};

common.clone = function (object, filter) {
  return Object.keys(object).reduce(filter ? function (obj, k) {
    if (filter(k)) obj[k] = object[k];
    return obj;
  } : function (obj, k) {
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
     if (util.isRegExp(value)) {
       return 'regexp';
     } else {
       return derived ? 'object' : 'null';
     }
  }
  else if (derived === 'function') {
    return derived instanceof RegExp ? 'regexp' : 'function';
  }

  return derived;
};

common.async = async;

common.capitalize = inflect.camelize;

common.pluralize = inflect.pluralize;

common.lowerize = inflect.underscore;
