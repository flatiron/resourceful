var assert = require('assert'),
    events = require('events'),
    path = require('path'),
    sys = require('sys'),
    vows = require('vows'),
    resourceful = require('../lib/resourceful');

var Article = resourceful.define('Article', function () {
  this.property('title');
  this.property('published', Boolean);
}).connect('memory://cache-test');

vows.describe('resourceful/resource/cache', {
  "When creating an instance, and saving it": {
    topic: function () {
      this.article = new(Article)({ _id: '43', title: "The Last Article", published: true });
      this.article.save(this.callback);
    },
    "and then loading it back up with `get()`": {
      topic: function () {
        Article.get('43', this.callback);
      },
      "it should return the previous instance": function (res) {
        assert.strictEqual(res._properties, this.article._properties);
      }
    },
    "and then loading it back up with `find()`": {
      topic: function () {
        Article.find({ title: "The Last Article" }, this.callback);
      },
      "it should return the previous instance": function (res) {
        assert.strictEqual(res[0]._properties, this.article._properties);
      }
    }
  }
}).addBatch({
  "When creating an instance, and saving it": {
    topic: function () {
      this.article = new(Article)({ _id: '43', title: "The Last Article", published: true });
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
