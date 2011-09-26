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

vows.describe('resourcefule/memory/relationship').addBatch({
  'Initializing': {
    'A memory store': {
      topic: function () {
        resourceful.use('memory', 'memory://relationship-test');
        return null;
      },
      'with': {
        'author and article models': {
          topic: function () {
            this.Author = resourceful.define('author', function () {
              this.property('name', String);
            });
            this.Article = resourceful.define('article', function () {
              this.property('title', String);
              this.parent('Author');
            });
            return null;
          },
          'with': {
            'Author #1': authorAndArticles('paul'),
            'Author #2': authorAndArticles('bob')
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
      return null;
    },
    'paul.articles': authorTest('paul'),
    'bob.articles': authorTest('bob'),
    'Article.byAuthor(\'paul\')': articleTest('paul'),
    'Article.byAuthor(\'bob\')': articleTest('bob')
  }
}).export(module);
