var resourceful = require('../lib/resourceful');
resourceful.use('memory');

//
// First, create two resources: Author and Article
//
var Author = resourceful.define('author');
Author.string('name');

var Article = resourceful.define('article');
Article.string('title');

//
// Now we add a special property to Article indicating that Author is its parent
//
Article.parent('author');

//
// Create a new author "bob"
//
Author.create({
  id: 'bob'
}, function(err, bob){
  //
  // Create a new article for bob
  //
  bob.createArticle({ id: "cool-story", title: "A cool story by bob." }, function(err, result){
    console.log(bob.article_ids);
    //
    // Get all of bob's articles
    //
    bob.articles(function(err, result){
      console.log(result);
    });
    Article.get('author/bob/cool-story', function(err, result){
      console.log(result);
    })
  });
});
