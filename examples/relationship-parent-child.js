var resourceful = require('../lib/resourceful');
resourceful.use('memory');

//
// TODO: This seems to not be working on couchdb. Test coverage should be added for this.
//

var Category = resourceful.define('category');
Category.parent('category');

Category.create({
  id: 'music',
}, function(err, music){
  music.createCategory({
    id: 'hip-hop',
  }, function(err, hiphop){
    music.createCategory({
      id: 'rap',
    }, function(err, rap){
      hiphop.createCategory({ id: "a-tribe-called-quest", title: "Hello!" }, function(err, result){
        hiphop.createCategory({ id: "busta-rhymes", title: "Hello!" }, function(err, busta){
          rap.createCategory({ id: "wu-tang", title: "Hello!" }, function(err, wutang){
            wutang.createCategory({ id: "Enter the 36 Chambers", title: "Hello!" }, function(err, result){
              music.categories(function(err, result){
                console.log('music', err, result);
              });
              rap.categories(function(err, result){
                console.log('rap', err, result);
              });
              hiphop.categories(function(err, result){
                console.log('hiphop', err, result);
              });
              wutang.categories(function(err, result){
                console.log('wutang', err, result);
              });
              Category.categories('music', function(err, result){
                console.log('music', result)
              });
              Category.categories('category/music/rap', function(err, result){
                console.log('category/music/rap', result)
              });
            });
          });
        });
      });
    });
  });
});

