var resourceful = require('../lib/resourceful');
resourceful.use('memory');

var Author = resourceful.define('author');
Author.string('name');

Author.create({
  id: 'Marak',
  name: 'foobar'
}, function(err, marak){
  marak.update({ name: 'barfoo'}, function(err, result){
    console.log(err, result);
  })
});
