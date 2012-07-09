var resourceful = require('../lib/resourceful');
resourceful.use('memory');

var Author = resourceful.define('author');
Author.string('name');

Author.create({
  id: 'Marak'
}, function(err, marak){
  //
  // "marak" exists already in scope from the create
  //
  console.log(marak);
  //
  // We can also re-fetch the resource
  //
  Author.get('Marak', function(err, result){
    console.log(err, result);
  })
});
