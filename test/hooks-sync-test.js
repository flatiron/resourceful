var assert = require('assert'),
    vows = require('vows'),
    resourceful = require('../lib/resourceful');

vows.describe('resourceful/hooks/sync').addBatch({
  "a Resource (save)": {
    topic: function () {
      return resourceful.define('Resource', function () {
        this.property('name');
      });
    },
    "synchronous 'before' hooks on `save`": {
      topic: function (R) {
        var that = this;
        that.run = 0;
        R.before('save', function (obj) {
          that.run += 2;
          obj.counter += 2;
          return true;
        });
        R.before('save', function (obj) {
          that.run *= 2;
          obj.counter *= 2;
          return true;
        });
        return R;
      },
      "when calling save() on an instance of Article": {
        topic: function (R) {
          new(R)({ id: '256', counter: 0, name: 'a-name' }).save(this.callback);
        },
        "should trigger both hooks in the right order": function (e, res) {
          assert.isNull(e);
          assert.equal(res.counter, 4);
          assert.equal(this.run, 4);
        }
      }
    }
  },
  "another Resource (save)": {
    topic: function () {
      return resourceful.define('Resource2', function () {
        this.property('name');
      });
    },
    "synchronous 'after' hooks on `save`": {
      topic: function (R) {
        var that = this;
        that.run = 0;
        R.after('save', function (e, obj) {
          that.run += 2;
          obj.counter += 2;
          return true;
        });
        R.after('save', function (e, obj) {
          that.run *= 2;
          obj.counter *= 2;
          return true;
        });
        return R;
      },
      "should have two 'after' hooks registered": function (R) {
        assert.equal(R.hooks.after.save.length,  2);
        assert.equal(R.hooks.before.save.length, 0);
      },
      "when calling save() on an instance of Article": {
        topic: function (R) {
          var self = this;
          new(R)({ id: '678', counter: 0, title: 'a-name2' }).save(function(e, i) {
            R.get('678', function(err, res) {
              self.callback(e, i, res);
            });
          });
        },
        "should trigger both hooks in the right order": function (e, res, i) {
          assert.isNull(e);
          assert.equal(this.run, 4);
          assert.equal(res.counter, 4);
          assert.equal(i.counter, 0);
        }
      }
    }
  },
  "a Resource (create)": {
    topic: function () {
      return resourceful.define('Resource3', function () {
        this.property('title');
      });
    },
    "with synchronous 'before' hooks on `create`": {
      topic: function (R) {
        var that = this;
        that.run = 0;
        R.before('create', function (obj) {
          that.run += 2;
          obj.counter += 2;
          return true;
        });
        R.before('create', function (obj) {
          that.run *= 2;
          obj.counter *= 2;
          return true;
        });
        return R;
      },
      "when calling create() on an instance of Article": {
        topic: function (R) {
          R.create({ id: '69', counter: 0, title: 'a-name3' }, this.callback);
        },
        "should trigger both hooks in the right order": function (e, res) {
          assert.isNull(e);
          assert.equal(this.run, 4);
          assert.equal(res.counter, 4);
        }
      }
    }
  },
  "another Resource (create)": {
    topic: function () {
      return resourceful.define('Resource4', function () {
        this.property('title');
      });
    },
    "with synchronous 'after' hooks on `create`": {
      topic: function (R) {
        var that = this;
        that.save = 0;
        R.after('save', function (e, obj) {
          that.save += 2;
          obj.counter += 2;
          return true;
        });
        R.after('save', function (e, obj) {
          that.save *= 2;
          obj.counter *= 2;
          return true;
        });
        this.create = 0;
        R.after('create', function (e, obj) {
          assert.equal(that.save, 0);
          that.create += 2;
          obj.counter += 2;
          return true;
        });
        R.after('create', function (e, obj) {
          that.create *= 2;
          obj.counter *= 2;
          return true;
        });
        return R;
      },
      "should have two 'after' hooks registered": function (R) {
        assert.equal(R.hooks.after.create.length,  2);
        assert.equal(R.hooks.before.create.length, 0);
      },
      "when calling create() on an instance of Article": {
        topic: function (R) {
          var self = this;
          R.create({ id: '67', counter: 0, title: 'hookbar' }, function(e, i) {
            R.get('67', function(err, res) {
              self.callback(e, i, res);
            });
          });
        },
        "should trigger both hooks in the right order": function (e, res, i) {
          assert.isNull(e);
          assert.equal(this.save, 4);
          assert.equal(this.create, 4);
          assert.equal(i.counter, 4);
          assert.equal(res.counter, 12);
        }
      }
    }
  }
}).export(module);
