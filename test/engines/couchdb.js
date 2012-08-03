var cradle = require('cradle');

var engine = exports;

engine.name = 'couchdb';
engine.options = { host: 'nodejitsudb175109436030.iriscouch.com', port: 5984, database: 'test' };

engine.load = function (resourceful, data, callback) {
  var db = new(cradle.Connection)(engine.options).database(engine.options.database);
  db.destroy(function () {
    db.create(function () {
      db.save(data, function (e, res) {
        callback();
      });
    });
  });
};
