var resourceful = require('../lib/resourceful');
resourceful.use('memory');

var Category = resourceful.define('category');
Category.parent('category');

Category.create({
  _id: 'hip-hop',
}, function(err, hiphop){
  Category.create({
    _id: 'rap',
  }, function(err, rap){
    hiphop.createCategory({ _id: "a-tribe-called-quest", title: "Hello!" }, function(err, result){
      hiphop.createCategory({ _id: "busta-rhymes", title: "Hello!" }, function(err, result){
        rap.createCategory({ _id: "wu-tang", title: "Hello!" }, function(err, result){
          rap.categories(function(err, result){
            console.log(err, result);
          });
          hiphop.categories(function(err, result){
            console.log(err, result);
          });
          Category.categories('hip-hop', function(err, result){
            console.log('hip-hop', result)
          });
          Category.categories('rap', function(err, result){
            console.log('rap', result)
          });
        });
      });
    });
  });
});

