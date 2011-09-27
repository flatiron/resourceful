var path = require('path'),
    sys = require('sys'),
    assert = require('assert'),
    events = require('events'),
    http = require('http'),
    fs = require('fs'),
    cradle = require('cradle'),
    vows = require('vows'),
    resourceful = require('../../lib/resourceful');

var numberOfArticles = 5;

resourceful.env = 'test';

vows.describe('resourceful/resource/relationship').addBatch({
  "One-To-Many:": {
    "A database containing authors and articles": {
      topic: function () {
        resourceful.use('couchdb', 'couchdb://localhost:5984/test');
        var db = new(cradle.Connection)().database('test'), callback = this.callback;
        db.destroy(function () {
          db.create(function () {
            db.save([
              { resource: 'Author', _id: 'yoda', Article_ids: ['a-1']},
              { resource: 'Article', title: 'The Great Gatsby', author: 'fitzgerald', tags: ['classic'] },
              { resource: 'Article', title: 'Finding vim',      author: 'cloudhead', tags: ['hacking', 'vi'] },
              { resource: 'Article', title: 'On Writing',       author: 'cloudhead', tags: ['writing'] },
              { resource: 'Article', title: 'vi Zen',           author: 'cloudhead', tags: ['vi', 'zen'] },
              { resource: 'Article', _id: 'a-1', title: 'Channeling force', author_id: 'yoda',      tags: ['force', 'zen'] },
              { resource: 'Body',    name: 'fitzgerald' }
            ], callback);
          });
        })
      },
      "and a Resource definition for Author and Article": {
        topic: function () {
          this.Article = resourceful.define('article', function () {});
          this.Author  = resourceful.define('author',  function () { this.child('article') });
          this.Article.parent('author');
          return null;
        },
        "Author should have a <articles> method": function () {
          assert.isFunction(this.Author.articles);
        },
        "Author should have a <articles> method": {
          topic: function () {
            this.Author.articles('yoda', this.callback);
          },
          "which will return all author's articles": function (articles) {
            assert.equal(articles.length, 1);
            assert.instanceOf(articles[0], this.Article);
          }
        },
        "Author should have a <parents> property which is empty": function () {
          assert.isArray(this.Author.parents);
          assert.isEmpty(this.Author.parents);
        },
        "Author should have a <children> property": function (Author, Article) {
          assert.isArray(this.Author.children);
          assert.include(this.Author.children,this.Article);
        },
        "Article should have a <parents> property which includes Author": function (Author, Article) {
          assert.isArray(this.Article.parents);
          assert.include(this.Article.parents,this.Author);
        },
        "Article should have a <children> property which is empty": function (Author, Article) {
          assert.isArray(this.Article.children);
          assert.isEmpty(this.Article.children);
        },
        "Article should have a <byAuthor> filter": function (Author, Article) {
          assert.isFunction(this.Article.byAuthor);
          assert.isObject(this.Article.views.byAuthor);
        },
        "when instantiated": {
          topic: function () {
            this.author = new(this.Author);
            this.article = new(this.Article);
            return null;
          },
          "author should have a <articles> method": function () {
            assert.isFunction(this.author.articles);
          },
          "author should have a <article_ids> property": function (_, Author, Article) {
            assert.isArray(this.author.article_ids);
          },
          "article should have a <author_id> property": function (Author, Article) {
            assert.include(this.article,'author_id');
            assert.isNull(this.article.author_id);
          },
          "article should have a <author> method": function (Author, Article) {
            assert.isFunction(this.article.author);
          }
        }
      }
    }
  }
}).export(module);
