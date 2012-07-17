var resourceful = require('../lib/resourceful');
resourceful.use('couchdb', { database: "test2"} );

var Author = resourceful.define('author');
Author.string('name');

Author.create({
  id: 'Marak'
}, function(err, marak){
  Author.destroy('Marak', function(err, result){
    Author.get('Marak', function(err, result){
      console.log(err, result);
    })
  })
});

