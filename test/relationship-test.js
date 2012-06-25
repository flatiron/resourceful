var vows = require('vows'),
    path = require('path'),
    macros = require('./macros'),
    fs   = require('fs'),
    assert = require('assert');

var resourceful = require('../lib/resourceful');

var engines = fs.readdirSync(path.join(__dirname, 'engines')).map(function (e) { return require('./engines/' + e.slice(0,-3)); });
var resources = {};

//
// Remark: only running one engine now
//
engines.shift();

engines.forEach(function (e) {
  function authorAndArticles(name) {
    return {
      topic: function () {
        resources[e].Author.create({
          _id: 'author-' + name,
          name: name
        }, this.callback);
      },
      'should not error': function (err, author) {
        assert.isNull(err);
      },
      'should return correct author': function (err, author) {
        assert.equal(author._id, 'author-' + name);
      },
      'with': {
        'article #1': {
          topic: function (author) {
            author.createArticle({
              _id: 'article-1',
              title: name + '\'s article #1'
            }, this.callback);
          },
          'should not error': function (err, article) {
            assert.isNull(err);
          },
          'should return correct article': function (err, article) {
            assert.equal(article._id, 'author-' + name + '/article-1');
          }
        },
        'article #2': {
          topic: function (author) {
            author.createArticle({
              _id: 'article-2',
              title: name + '\'s article #2'
            }, this.callback);
          },
          'should not error': function (err, article) {
            assert.isNull(err);
          },
          'should return correct article': function (err, article) {
            assert.equal(article._id, 'author-' + name + '/article-2');
          }
        }
      }
    };
  }

  function authorAndArticlesWithoutId(name) {
    return {
      topic: function () {
        resources[e].Author.create({
          name: name
        }, this.callback);
      },
      'should exist': function (err, author) {
        assert.equal(author._id, '1');
        assert.isNull(err);
      },
      'with': {
        'article #3': {
          topic: function (author) {
            var self = this;
            author.createArticle({
              title: name + '\'s article #3'
            }, function(err, i) {
              self.callback(err, author);
            });
          },
          'should exist': function (err, author) {
            author.articles(function(err, articles) {
              assert.isArray(articles);
              assert.equal(articles[0].title, name + '\'s article #3');
            });
            resources[e].Article.byAuthor('1', function(err, articles) {
              assert.isArray(articles);
              assert.equal(articles[0].title, name + '\'s article #3');
            });
          }
        }
      }
    };
  }

  function category(parentName, childName){
    return {
      topic: function () {
        resources[e].Category.create({
          _id: parentName,
          name: parentName
        }, this.callback)
      },
      'should not fail': function (err, parent) {
        assert.isNull(err);
        assert.equal(parent.name, parentName)
      },
      'with parent Category': {
        topic: function(parent){
          parent.createCategory({
            _id: childName,
            name: childName
          }, this.callback)
        },
        'should not fail': function(err, child){
          assert.isNull(err);
          assert.equal(child.name, childName)
        }
      }
    }
  }

  function categoryParentTest(name) {
    var parent_id = name;
    return {
      topic: function(){
        // FIXME category pluralized should be categories (maybe use https://github.com/MSNexploder/inflect?)
        resources[e].Category.categories(parent_id, this.callback);
      },
      'should return the children': function(err, children){
        assert.isNull(err);
        assert.ok(Array.isArray(children));
        assert.ok(children.every(function (category) {
          return category.category_id === parent_id;
        }));
      },
      'and .category() of the first child': {
        topic: function(children){
          children[0].category(this.callback)
        },
        'should return the parent': function(err, parent){
          assert.isNull(err);
          assert.equal(parent_id, parent.id);
        }
      }
    }
  }

  function categoryChildTest(parentName, childName) {
    var child_id = parentName + '/' + childName;
    return {
      topic: function(){
        resources[e].Category.get(child_id, this.callback);
      },
      'should return the child': function(err, child){
        assert.isNull(err);
        assert.equal(child.name, childName);
      },
      'and child.category()': {
        topic: function(child){
          child.category(this.callback)
        },
        'should return the parent': function(err, parent){
          assert.isNull(err);
          assert.notEqual(parent.name, childName);
        }
      }
    }
  }

  function authorTest(name) {
    var author_id = 'author-' + name;

    return {
      topic: function () {
        resources[e].Author.articles(author_id, this.callback);
      },
      'should return only his articles': function (err, articles) {
        assert.isNull(err);
        assert.ok(Array.isArray(articles));
        assert.ok(articles.every(function (article) {
          return article.author_id === author_id;
        }));
      }
    };
  }

  function articleTest(name) {
    var author_id = 'author-' + name;

    return {
      topic: function () {
        resources[e].Article.byAuthor(author_id, this.callback);
      },
      'should return only his articles': function (err, articles) {
        assert.isNull(err);
        assert.ok(Array.isArray(articles));
        assert.ok(articles.every(function (article) {
          return article.author_id === author_id;
        }));
      },
      'and .author() call for first article': {
        topic: function (articles) {
          if (!articles[0]) return {};
          articles[0].author(this.callback);
        },
        'should return himself': function (err, author) {
          assert.isNull(err);
          assert.instanceOf(author, resources[e].Author);
          assert.equal(author._id, author_id);
        }
      },
      'and .author() call for second article': {
        topic: function (articles) {
          if (!articles[1]) return {};
          articles[1].author(this.callback);
        },
        'should return himself': function (err, author) {
          assert.isNull(err);
          assert.instanceOf(author, resources[e].Author);
          assert.equal(author._id, author_id);
        }
      }
    };
  }

  resources[e] = {};
  vows.describe('resourceful/' + e.name + '/relationship')
  .addBatch(macros.defineResources(e, resources))
  .addBatch({
  'Initializing': {
    'In database "test"': {
      topic: function () {
        this.use(e.name, e.options)
        return null;
      },
      'with': {
        'Author #1': authorAndArticles('paul'),
        'Author #2': authorAndArticles('bob'),
        'Author #3': authorAndArticlesWithoutId('lenny'),
        'Category #1 & #2': category('hip-hop', 'a-tribe-called-quest')
        }
      }
    }
  })
  .addBatch({
    'One-To-Many': {
      topic: function () {
        return null;
      },
      'paul.articles': authorTest('paul'),
      'bob.articles': authorTest('bob'),
      'Article.byAuthor(\'paul\')': articleTest('paul'),
      'Article.byAuthor(\'bob\')': articleTest('bob'),
      'Category.categories()': categoryParentTest('hip-hop'),
      'Category.category()': categoryChildTest('hip-hop', 'a-tribe-called-quest')
    }
  })
  .export(module);
});

