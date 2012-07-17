var resourceful = require('../lib/resourceful');
resourceful.use('memory');

var Author = resourceful.define('author');
Author.string('name');

Author.create({
  name: 'Marak'
}, function(err, marak){
  console.log(marak);
});
