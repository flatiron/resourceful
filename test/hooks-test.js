var path = require('path'),
    assert = require('assert'),
    events = require('events'),
    vows = require('vows'),
    resourceful = require('../lib/resourceful');

vows.describe('resourceful/hooks').addBatch({
  "a Resource": {
    topic: function () {
      return resourceful.define('resource', function () {
        this.property('title');
      });
    },
    "with 'before' hooks on `save`": {
      topic: function (A) {
        var that = this;
        this.hooked = 0;
        A.before('save', function (obj, next) {
          that.hooked += 1; next(null);
        });
        A.before('save', function (obj, next) {
          that.hooked *= 2; next(null);
        });
        return A;
      },
      "when calling save() on an instance of Article": {
        topic: function (A) {
          new(A)({ _id: '64', counter: 0, title: 'foobar' }).save(this.callback);
        },
        "should trigger both hooks in the right order": function (e, res) {
          assert.isNull(e);
          assert.equal(this.hooked, 2);
        }
      }
    }
  },
  "another Resource": {
    topic: function () {
      return resourceful.define('resource2', function () {
        this.property('title');
      });
    },
    "with 'after' hooks on `save`": {
      topic: function (A) {
        var that = this;
        this.hooked = 0;
        A.after('save', function (e, obj, next) {
          that.hooked ++; next(null);
          // TODO: test other stuff
        });
        A.after('save', function (e, obj, next) {
          that.hooked ++; next(null);
        });
        return A;
      },
      "should just have the two 'after' hooks registered": function (A) {
        assert.equal(A.hooks.after.save.length,  2);
        assert.equal(A.hooks.before.save.length, 0);
      },
      "when calling save() on an instance of Article": {
        topic: function (A) {
          new(A)({ _id: '65', counter: 0, title: 'hookbar' }).save(this.callback);
        },
        "should trigger both hooks in the right order": function (e, res) {
          assert.isNull(e);
          assert.equal(this.hooked, 2);
        }
      }
    }
  }
}).export(module);
