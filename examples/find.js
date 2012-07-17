var resourceful = require('../lib/resourceful');
resourceful.use('couchdb', { database: "test2"} );

var Author = resourceful.define('author');
Author.string('name');

Author.create({
  id: 'Marak',
  name: "brown"
}, function(err, marak){
  Author.find({name: "brown"}, function(err, result){
    console.log(err, result);
  })
});

