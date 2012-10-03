var events = require('events'),
    resourceful = require('../../../resourceful'),
    Resource = resourceful.Resource;

//
// Define a Resource filter
//
exports.filter = function (name /* [options], filter */) {
  var args = Array.prototype.slice.call(arguments),
      R = this,
      filter = args.pop(),
      options = (typeof(args[args.length - 1]) === 'object') && args.pop();

  if (R._design && R._design._rev) {
    throw new(Error)("Cannot call 'filter' after design has been saved to database");
  }

  R._design = R._design || {
    views: R.views = R.views || {}
  };
  if (typeof(filter) === 'object') {
    // In this case, we treat the filter as a raw view object,
    // and copy it as-is.
    if (filter.map) {
      Object.keys(filter).forEach(function (key) {
        filter[key] = filter[key].toString().replace(/\n|\r/g, '')
                                            .replace(/\s+/g, ' ');
      });
      R.views[name] = filter;
    // Here, we treat the filter as a sub-object which must be matched
    // in the document to pass through.
    } else {
      R.views[name] = resourceful.render({
        map: function (doc) {
          var object = $object;
          if (doc.resource === $resource) {
            if (function () {
              for (var k in object) {
                if (object[k] !== doc[k]) return false;
              }
              return true;
            }()) { emit(doc._id, doc); }
          }
        }
      }, { object: filter, resource: JSON.stringify(R.resource) });
    }
  } else if (typeof(filter) === 'function') {
    R.views[name] = resourceful.render({
      map: function (doc) {
        if (doc.resource === $resource) {
            emit($key, doc);
        }
      }
    }, { key: "doc." + Object.keys(filter("$key"))[0],
         resource: JSON.stringify(R.resource) });
  } else { throw new TypeError("last argument must be an object or function"); }

  // Here we create the named filter method on the Resource
  //
  // Sample Usage:
  //   resource.someFilter('targetKey');
  //   resoure.someFilter({ startKey: 0, endKey: 1 });
  //
  R[name] = function (param, callback) {
    var that = this,
        path = [this.resource, name].join('/'),
        params;

    if (typeof param === 'function') {
      callback = param;
      param = {};
    }

    params = (typeof(param) === 'object' && !Array.isArray(param)) ? param : { key: param };

    if (options) {
      Object.keys(options).forEach(function (key) {
        params[key] = options[key];
      });
    }

    // Make sure our _design document is synched,
    // before we attempt to call it.
    if (R._design._rev) {
      that.view(path, params, callback);
    } else {
      R.sync(function (err) {
        if (err) return callback(err);
        that.view(path, params, callback);
      });
    }
  };
};
