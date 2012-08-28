var mongodb = require('mongodb'),
    Db = mongodb.Db,
    Server = mongodb.Server,
    Connection = mongodb.Connection;

var engine = exports;

engine.name = 'mongodb';
engine.options = {
  host: 'alex.mongohq.com',
  port: 10047,
  database: 'nodejitsudb15119137141',
  user: 'nodejitsu',
  pass: '48be573a3772606f1e03dd765ea2a2ee',
  collection: 'test'
};

engine.load = function (resourceful, data, callback) {
  var db = new Db(engine.options.database,
    new Server(engine.options.host, engine.options.port));

  db.open(function (err) {
    if (err) return callback(err);

    db.authenticate(engine.options.user, engine.options.pass, function (err, result) {
      if (err) return callback(err);
      if (result !== true) return callback(new Error('Failed to authenticate.'));

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
  });
};
