var resourceful = require('../lib/resourceful');
resourceful.use('memory');

var Category = resourceful.define('category');
Category.parent('category');

Category.create({
  _id: 'music',
}, function(err, music){
  music.createCategory({
    _id: 'hip-hop',
  }, function(err, hiphop){
    music.createCategory({
      _id: 'rap',
    }, function(err, rap){
      hiphop.createCategory({ _id: "a-tribe-called-quest", title: "Hello!" }, function(err, result){
        hiphop.createCategory({ _id: "busta-rhymes", title: "Hello!" }, function(err, busta){
          rap.createCategory({ _id: "wu-tang", title: "Hello!" }, function(err, wutang){
            wutang.createCategory({ _id: "Enter the 36 Chambers", title: "Hello!" }, function(err, result){
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
              Category.categories('music/rap', function(err, result){
                console.log('music/rap', result)
              });
            });
          });
        });
      });
    });
  });
});

