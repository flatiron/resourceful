var assert = require('assert'),
    vows = require('vows'),
    Resourceful = require('..');

var resourceful = new Resourceful();

vows.describe('resourceful/events').addBatch({
  "an Article": {
    topic: function () {
      return resourceful.define("article", function () {
        this.property('title');
      });
    },
    "with a 'success' listener on `save`": {
      topic: function (A) {
        var that = this;
        this.func = function (obj) {
          that.obj = obj;
        };
        A.on('save', this.func);
        return A;
      },
      "should add the bound method to factory's `listeners` array": function (A) {
        assert.isArray(A.listeners('save'));
        assert.equal(A.listeners('save')[0], this.func);
      },
      "when calling save() on an instance of Article": {
        topic: function (A) {
          new(A)({ id: '66', title: 'an Article' }).save(this.callback);
        },
        "should trigger the bound function": function (e, res) {
          assert.isNull(e);
          assert.isObject(this.obj);
          assert.equal(this.obj, res);
        }
      }
    }
  }
}).export(module);

