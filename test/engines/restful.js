var engine = exports,
    resourceful = require('../../lib/resourceful'),
    restful = require('restful');

engine.name = 'restful';

engine.load = function (resourceful, data, callback) {
  

  //
  // Remark: Re-define the resources and pass them to the restful server creation
  //
  //
  // TODO: Refactor engines tests so we can re-use resource definitions ( and remove the following copy / paste )
  //
  try {
    var Book = resourceful.define('book', function () {
      this.string('title');
      this.number('year');
      this.bool('fiction');
    });
    var Author = resourceful.define('author', function () {
      this.number('age');
      this.string('hair').sanitize('lower');
    });
    var Creature = resourceful.define('creature', function () {
      this.string('name');
    });
  } catch(err) {
    console.log(err)
  }

  //
  // Start a restful server with the resources needed for tests
  //
  var server = restful.createServer([Book, Author, Creature]);
  server.listen(8000, function(){
    new(resourceful.engines.Restful)({}).load(data, function(err, result){
      callback(err, result);
    });
  });

};
