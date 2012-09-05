var mongodb = require('mongodb'),
    Db = mongodb.Db,
    Server = mongodb.Server,
    Connection = mongodb.Connection;

var engine = exports;

engine.name = 'mongodb';
engine.options = {
  database: 'test',
  host: '127.0.0.1',
  port: 27017,
  collection: 'resourceful'
};

engine.load = function (resourceful, data, callback) {
  var db = new Db(engine.options.database,
    new Server(engine.options.host, engine.options.port));

  db.open(function (err) {
    if (err) return callback(err);
    db.dropCollection(engine.options.collection, function (err) {
      if (err) return callback(err);

      db.createCollection(engine.options.collection, function (err, collection) {
        if (err) return callback(err);

        collection.insert(data, {safe: true}, function (err) {
          if (err) return callback(err);

          return callback(null);
        });
      });
    });
  });
};
