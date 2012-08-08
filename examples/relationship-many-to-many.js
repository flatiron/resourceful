var resourceful = require('../lib/resourceful');
resourceful.use('memory', { database: "many" });

//
// Define the resources
//
var Artist = resourceful.define('artist'),
    Album  = resourceful.define('album'),
    Song   = resourceful.define('song');

//
// Now, define the relationships of every resource
//
Album.parent('artist');   // Artists can have many Albums
Artist.parent('album');   // Albums can have many featured Artists
Artist.parent('song');    // Songs can have many Artists
Song.parent('artist');    // Artists can have many Songs
Song.parent('album');     // Albums can have many Songs

//
// Now create a few new resources that are related
//
// Remark: There are several ways you can now use the resourceful API
// to interact with your relational resources.
// The following code is just an example
//

Artist.create({
  id: 'Beastie Boys'
}, function(err, result){
  Artist.create({
    id: 'Q-Tip'
  }, function(err, result){
    Album.create({
      id: 'Ill Communication'
    }, function(err, album){
      album.createArtist({ id: "Q-Tip"}, function(err, result){
        console.log(err, result);
        album.createSong({ id: "Get it together"}, function(err, song){
          console.log(err, result);
          album.createArtist({ id: "Beastie Boys"}, function(err, result){
            console.log(err, result);
             Album.get({ id: 'Ill Communication' }, function(err, result){
               console.log(err, result);
             });
           });
         });
       });
     });
  });
});
