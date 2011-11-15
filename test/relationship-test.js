var vows = require('vows'),
    assert = require('assert');

var resourceful = require('../lib/resourceful');

function authorAndArticles(name) {
  return {
    topic: function () {
      this.Author.create({
        _id: 'author-' + name,
        name: name
      }, this.callback);
    },
    'should exist': function (err, author) {
      assert.isNull(err);
    },
    'with': {
      'article #1': {
        topic: function (author) {
          author.createArticle({
            _id: author._id + '-article-1',
            title: name + '\'s article #1'
          }, this.callback);
        },
        'should exist': function () {}
      },
      'article #2': {
        topic: function (author) {
          author.createArticle({
            _id: author._id + '-article-2',
            title: name + '\'s article #2'
          }, this.callback);
        },
        'should exist': function () {}
      }
    }
  };
};

function category(parentName, childName){
  return {
    topic: function () {
      this.Category.create({
        _id: 'category-' + parentName,
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
          _id: 'category-' + childName,
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
  var parent_id = 'category-' + name
  return {
    topic: function(){
      // FIXME category pluralized should be categories (maybe use https://github.com/MSNexploder/inflect?)
      this.Category.categorys(parent_id, this.callback);
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

function categoryChildTest(name) {
  var child_id = 'category-' + name;

  return {
    topic: function(){
      this.Category.get(child_id, this.callback);
    },
    'should return the child': function(err, child){
      assert.isNull(err);
      assert.equal(child.name, name);
    },
    'and child.category()': {
      topic: function(child){
        child.category(this.callback)
      },
      'should return the parent': function(err, parent){
        assert.isNull(err);
        assert.notEqual(parent.name, name);
      }
    }
  }
}

function authorTest(name) {
  var author_id = 'author-' + name;

  return {
    topic: function () {
      this.Author.articles(author_id, this.callback);
    },
    'should return only his articles': function (err, articles) {
      assert.isNull(err);
      assert.ok(Array.isArray(articles));
      assert.ok(articles.every(function (article) {
        return article.author_id === author_id;
      }));
    }
  };
};

function articleTest(name) {
  var author_id = 'author-' + name;

  return {
    topic: function () {
      this.Article.byAuthor(author_id, this.callback);
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
        assert.instanceOf(author, this.Author);
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
        assert.instanceOf(author, this.Author);
        assert.equal(author._id, author_id);
      }
    }
  };
};

vows.describe('resourceful/memory/relationship').addBatch({
  'Initializing': {
    'A memory store': {
      topic: function () {
        resourceful.use('memory', 'memory://relationship-test');
        return null;
      },
      'with': {
        'author, category and article models': {
          topic: function () {
            this.Author = resourceful.define('author', function () {
              this.property('name', String);
            });
            this.Article = resourceful.define('article', function () {
              this.property('title', String);
              this.parent('Author');
            });
            this.Category = resourceful.define('category', function () {
              this.property('name', String);
              // FIXME Allow this.parent('category') by resourceful.register() earlier in resourceful.define()
            });
            this.Category.parent('category');
            return null;
          },
          'with': {
            'Author #1': authorAndArticles('paul'),
            'Author #2': authorAndArticles('bob'),
            'Category #1 & #2': category('alice', 'bob')
          }
        }
      }
    }
  }
}).addBatch({
  'One-To-Many': {
    topic: function () {
      this.Author = resourceful.resources['Author'];
      this.Article = resourceful.resources['Article'];
      this.Category = resourceful.resources['Category'];
      return null;
    },
    'paul.articles': authorTest('paul'),
    'bob.articles': authorTest('bob'),
    'Article.byAuthor(\'paul\')': articleTest('paul'),
    'Article.byAuthor(\'bob\')': articleTest('bob'),
    'Category.categories()': categoryParentTest('alice'),
    'Category.category()': categoryChildTest('bob')
  }
}).export(module);
