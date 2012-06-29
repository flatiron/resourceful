var vows = require('vows'),
    path = require('path'),
    macros = require('./macros/relationship'),
    fs   = require('fs'),
    assert = require('assert');

var resourceful = require('../lib/resourceful');
var engines = fs.readdirSync(path.join(__dirname, 'engines')).map(function (e) { return require('./engines/' + e.slice(0,-3)); });
var resources = {};

//engines = engines.reverse();
engines.pop();

engines.forEach(function (e) {
  resources[e] = {};
  function authorAndArticles(name) {
    return {
      topic: function () {
        resources[e].Author.create({
          _id: name,
          name: name
        }, this.callback);
      },
      'should not error': function (err, author) {
        assert.isNull(err);
      },
      'should return correct author': function (err, author) {
        assert.equal(author._id, name);
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
            assert.equal(article._id,  'article/author/' + name + '/article-1');
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
            assert.equal(article._id,  'article/author/' + name + '/article-2');
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
      'should not error': function (err, author) {
        assert.isNull(err);
      },
      'should return author with unique id': function (err, author) {
        assert.isObject(author);
        assert.isNotNull(author._id);
      },
      'with': {
        'article #3': {
          topic: function (author) {
            var self = this;
            author.createArticle({
              title: name + '\'s article #3'
            }, this.callback);
          },
          'should not error': function (err, article) {
            assert.isNull(err);
          },
          'should return the correct article': function (err, article) {
            assert.isObject(article);
            assert.isNotNull(article._id);
          }
        }
      }
    };
  }

  function updateAuthor(author, attrs) {
    return {
      topic: function () {
        resources[e].Author.update(author, attrs, this.callback);
      },
      'should not error': function (err, _author) {
        assert.isNull(err);
      },
      'should return updated author': function (err, _author) {
        assert.isObject(_author);
        assert.isNotNull(_author._id);
        assert.equal(_author.name, attrs.name);
      }
    };
  }

  function updateArticle(article, attrs) {
    return {
      topic: function () {
        resources[e].Article.update(article, attrs, this.callback);
      },
      'should not error': function (err, _article) {
        assert.isNull(err);
      },
      'should return updated author': function (err, _article) {
        assert.isObject(_article);
        assert.isNotNull(_article._id);
        assert.equal(_article.title, attrs.title);
      }
    };
  }

  function deleteArticle(article) {
    return {
      topic: function () {
        resources[e].Article.destroy(article, this.callback);
      },
      'should not error': function (err, _article) {
        assert.isNull(err);
      },
      'should delete article': function (err, result) {
        assert.isObject(result);
        assert.equal(result.status, 204);
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
      },
      'should have correct name': function (err, parent) {
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
        },
        'should return correct child': function(err, child){
          assert.equal(child.name, childName)
        }
      }
    }
  }

  function categoryParentTest(name) {
    var parent_id = name;
    return {
      topic: function(){
        resources[e].Category.categories(parent_id, this.callback);
      },
      'should not error': function(err, children){
        assert.isNull(err);
      },
      'should return the children': function(err, children){
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
      'should not error': function(err, child){
        assert.isNull(err);
      },
      'should return the child': function(err, child){
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
    var author_id =  name;

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
    var author_id = name;
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

  vows.describe('resourceful/' + e.name + '/relationship')
  .addBatch(macros.defineResources(e, resources))
  .addBatch({
  'Initializing': {
    'One-To-Many Creates': {
      'Author #1': authorAndArticles('marak'),
      'Author #2': authorAndArticles('james'),
      'Author #3': authorAndArticlesWithoutId('lenny'),
      // 'Category #1 & #2': category('music', 'hip-hop')
      }
    }
  })
  .addBatch({
    'One-To-Many Joins': {
      'marak.articles': authorTest('marak'),
      'james.articles': authorTest('james'),
      'Article.byAuthor(\'marak\')': articleTest('marak'),
      'Article.byAuthor(\'james\')': articleTest('james'),
      // 'Category.categories()': categoryParentTest('hip-hop'),
      // 'Category.category()': categoryChildTest('hip-hop', 'a-tribe-called-quest')
    }
  })
  .addBatch({
    'One-To-Many Updates': {
      'Updating existing author'  :  updateAuthor('marak', { name: "not-marak" }),
      'Updating existing article' :  updateArticle('author/marak/article-1', { title: "an updated title" })
    }
  })
  .addBatch({
    'One-To-Many Deletes': {
      'Deleting an article' : deleteArticle('author/james/article-1'), // TODO: This should work, cache issue
      '## TODO : Deleting the author'  : ''
    }
  })
  .export(module);
});

