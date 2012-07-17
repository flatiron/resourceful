var assert = require('assert'),
    vows = require('vows'),
    resourceful = require('../lib/resourceful');

var Article = resourceful.define('Article', function () {
  this.property('title');
  this.property('published', Boolean);
}).connect('memory://cache-test');

vows.describe('resourceful/resource/cache', {
  "When creating an instance, and saving it": {
    topic: function () {
      this.article = new(Article)({ id: '43', title: "The Last Article", published: true });
      this.article.save(this.callback);
    },
    "and then loading it back up with `get()`": {
      topic: function () {
        Article.get('43', this.callback);
      },
      "it should return the previous instance": function (res) {
        assert.equal(res.id, '43');
        assert.isTrue(res.published);
        assert.equal(res.resource, 'Article');
        assert.equal(res.title, 'The Last Article');
      }
    },
    "and then loading it back up with `find()`": {
      topic: function () {
        Article.find({ title: "The Last Article" }, this.callback);
      },
      "it should return the previous instance": function (res) {
        assert.equal(res[0].id, '43');
        assert.isTrue(res[0].published);
        assert.equal(res[0].resource, 'Article');
        assert.equal(res[0].title, 'The Last Article');
      }
    }
  }
}).addBatch({
  "When creating an instance, and saving it": {
    topic: function () {
      this.article = new(Article)({ id: '43', title: "The Last Article", published: true });
      this.article.save(this.callback);
    },
    "and then clearing the cache and loading it back up with `get()`": {
      topic: function () {
        resourceful.caches.clear();
        Article.get('43', this.callback);
      },
      "it should return a new instance": function (res) {
        assert.notStrictEqual(res, this.article);
      }
    }
  }
}).export(module);
