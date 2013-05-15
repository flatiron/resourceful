var assert = require('assert'),
    events = require('events'),
    cradle = require('cradle'),
    vows = require('vows'),
    resourceful = require('../lib/resourceful');

var Article;

resourceful.env = 'test';

var memory = require('./engines/memory');

vows.describe('resourceful/resource/view').addBatch({
  "A database containing articles and other resources": {
    topic: function () {
      resourceful.use(memory.name, memory.options);
      this.callback();
    },
    "is created": function () {},
    "A Resource definition with filters": {
      topic: function () {
        Article = resourceful.define('Article', function () {
          this.property('author');
          this.property('title');
          this.property('published', Boolean);

          this.filter('all', {});
          this.filter('published', { published: true });
          this.filter('by', function (author) { return { author: author } });
          this.filter('byTag', { map: function (doc) { if ( doc.resource == "Article" && doc.tags ) doc.tags.forEach(function(tag) { emit ( tag, doc );  }); } });
        })

        Article.register();
        return Article;
      },
      "is populated with articles and other resources" : function (R) {
        R.create({ _id: '1', resource: 'Article', title: 'The Great Gatsby', published: true,  author: 'fitzgerald', tags: ['classic'] });
        R.create({ _id: '2', resource: 'Article', title: 'Finding vim',      published: false, author: 'cloudhead',  tags: ['hacking', 'vi'] });
        R.create({ _id: '3', resource: 'Article', title: 'On Writing',       published: true,  author: 'cloudhead',  tags: ['writing'] });
        R.create({ _id: '4', resource: 'Article', title: 'vi Zen',           published: false, author: 'cloudhead',  tags: ['vi', 'zen'] });
        R.create({ _id: '5', resource: 'Article', title: 'Channeling force', published: true,  author: 'yoda',       tags: ['force', 'zen'] })
      },
      "should respond to the filters": function (R) {
        assert.isFunction(R.published);
        assert.isFunction(R.all);
        assert.isFunction(R.by);
       // assert.isFunction(R.byTag);
      },
      "can be used to query the database:": {
        "<published>": {
          topic: function (Article) {
            this.Article = Article;
            Article.published(this.callback);
          },
          "should return an array of all published Articles": function (e, res) {
            var that = this;
            assert.isArray(res);
            assert.equal(res.length,3);
            res.forEach(function (d) {
              assert.isObject(d);
              assert.instanceOf(d,that.Article);
              assert.equal(d.constructor,that.Article);
              assert.equal(d.resource,'Article');
              assert.ok(d.published);
            });
          }
        },
        "<all>": {
          topic: function (Article) {
            Article.all(this.callback);
          },
          "should return an array of all Article records": function (e, res) {
            assert.isArray(res);
            assert.equal(res.length,5);
          }
        },
        "<by> 'cloudhead'": {
          topic: function (Article) {
            Article.by('cloudhead', this.callback);
          },
          "should return an array of Article records by 'cloudhead'": function (e, res) {
            assert.isArray(res);
            assert.equal(res.length,3);
            res.forEach(function (d) {
              assert.isObject(d);
              assert.equal(d.resource,'Article');
              assert.equal(d.author,'cloudhead');
            });
          }
        },
        "<by> 'yoda'": {
          topic: function (Article) {
            Article.by('yoda', this.callback);
          },
          "should return an array of Article records by 'yoda'": function (e, res) {
            assert.isArray(res);
            assert.equal(res.length,1);
            assert.equal(res[0].author,'yoda');
          }
        },
        "<by> ['yoda', 'fitzgerald']": {
          topic: function (Article) {
            Article.by({
              keys: ['yoda', 'fitzgerald']
            }, this.callback);
          },
          "should return an array of Article records by 'yoda' or 'fitzgerald'": function (e, res) {
            assert.isArray(res);
            assert.equal(res.length, 2);
            assert(
              (res[0].author === 'yoda' && res[1].author === 'fitzgerald') ||
              (res[0].author === 'fitzgerald' && res[1].author === 'yoda')
            );
          }
        },
        "<byTag> 'classic'": {
          topic: function (Article) {
            Article.byTag('classic', this.callback);
          },
          "should return an array of Article records tagged 'classic'": function (e, res) {
            var that = this;
            assert.isArray(res);
            assert.equal(res.length,1);
            assert.equal(res[0].tags[0], 'classic');
            res.forEach(function (d) {
                assert.isObject(d);
                assert.instanceOf(d,Article);
                assert.equal(d.constructor,Article);
                assert.equal(d.resource,'Article');
                assert.ok(d.published);
              });
          }
        },
        "<byTag> ['classic', 'hacking']": {
          topic: function (Article) {
            Article.byTag({
              keys: ['classic', 'hacking']
            }, this.callback);
          },
          "should return an array of Article records tagged 'classic' or 'hacking'": function (e, res) {
            var that = this;
            assert.isArray(res);
            assert.equal(res.length, 2);
            
            assert(
              (res[0].tags[0] === 'classic' && res[1].tags[0] === 'hacking') ||
              (res[0].tags[0] === 'hacking' && res[1].tags[0] === 'classic')
            );
            
            res.forEach(function (d) {
                assert.isObject(d);
                assert.instanceOf(d,Article);
                assert.equal(d.constructor,Article);
                assert.equal(d.resource,'Article');
              });
          }
        }
      }
    }
  }
}).addBatch({
  "A second Resource definition with filters": {
    topic: function () {
      return resourceful.define('Person', function () {
        this.property('name');
        this.property('position');
        this.property('age', Number);

        this.filter('all', {});
        this.filter('at', function (position) { return { position: position } });
        this.filter('age', function (age) { return { age: age } });
      }).register();
    },
    "should have no side effects on the first resource views": function () {
      var views = Object.keys(Article.views);
      assert.isTrue(views.indexOf('at')===-1);
      assert.isTrue(views.indexOf('age')===-1);
    }
  }
}).export(module);
