var resourceful = require('../lib/resourceful');

resourceful.use('memory');

var Author = resourceful.define('author');
Author.string('name');

Author.get(['tim', 'bob', 'mat'], function(err, people){
  console.log(err, people)
});
