var assert = require('assert'),
    vows = require('vows'),
    resourceful = require('../lib/resourceful');

vows.describe('resourceful/deferredRelationship').addBatch({
  "Defining a child resource of non-defined parent": {
    topic: function () {
      return resourceful.define('articlelol', function () {
        this.string('title');
        this.parent('Authorlol');
      });
    },
    "should be successful": function (article) {
      assert.isFunction(article);
      assert.equal(article._resource, 'Articlelol');
    },
    "should have no parent": function (article) {
      assert.lengthOf(article._parents, 0);
    },
    "and defining the parent resource": {
      topic: function (article) {
        return [resourceful.define('authorlol', function () {
          this.string('name');
        }), article]
      },
      "should be successful": function (author) {
        assert.isFunction(author[0]);
        assert.equal(author[0]._resource, 'Authorlol');
      },
      "should have child set": function (author) {
        assert.deepEqual(author[0]._children, ['Articlelol']);
      },
      "and child should have parent set": function (author) {
        assert.deepEqual(author[1]._parents, ['Authorlol']);
      }
    }
  }
}).export(module);
