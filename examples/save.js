var resourceful = require('../lib/resourceful');
resourceful.use('memory');

var Author = resourceful.define('author');
Author.string('name');

Author.create({
  id: 'Marak'
}, function(err, marak){
  marak.name = "foobar";
  marak.save(function(err, result){
    console.log(err, result);
  })
});
