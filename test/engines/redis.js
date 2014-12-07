var engine = exports;
var redis = require('redis');

engine.name = 'redis';
engine.options = {
  namespace : "test"
}
engine.load = function (resourceful, data, callback) {
  var conn = redis.createClient();

  var stuff = [];
  data = data.forEach(function (r) {
    r = JSON.parse(JSON.stringify(r));
    r.id = r._id;
    delete r._id;
    stuff.push('resourceful:' + engine.options.namespace + ':id:' + r.id);
    stuff.push(JSON.stringify(r));
  });

  conn.flushdb(function() {
    conn.mset(stuff, callback);
  });
};
