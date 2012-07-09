var assert = require('assert'),
    vows = require('vows'),
    resourceful = require('../lib/resourceful');

vows.describe('resourceful/hooks/async').addBatch({
  "save-able Resource": {
    topic: function () {
      return resourceful.define('resource', function () {
        this.property('title');
      });
    },
    "with 'before' hooks on `save`": {
      topic: function (A) {
        var that = this;
        this.hooked_save = 0;
        A.before('save', function (obj, next) {
          that.hooked_save += 1; next(null);
        });
        A.before('save', function (obj, next) {
          that.hooked_save *= 2; next(null);
        });
        return A;
      },
      "when calling save() on an instance of Article": {
        topic: function (A) {
          new(A)({ id: '128', counter: 0, title: 'foobar' }).save(this.callback);
        },
        "should trigger both hooks in the right order": function (e, res) {
          assert.isNull(e);
          assert.equal(this.hooked_save, 2);
        }
      }
    }
  },
  "another save-able Resource": {
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
          that.hooked += 1; next(null);
          // TODO: test other stuff
        });
        A.after('save', function (e, obj, next) {
          that.hooked *= 2; next(null);
        });
        return A;
      },
      "should just have the two 'after' hooks registered": function (A) {
        assert.equal(A.hooks.after.save.length,  2);
        assert.equal(A.hooks.before.save.length, 0);
      },
      "when calling save() on an instance of Article": {
        topic: function (A) {
          new(A)({ id: '65', counter: 0, title: 'hookbar' }).save(this.callback);
        },
        "should trigger both hooks in the right order": function (e, res) {
          assert.isNull(e);
          assert.equal(this.hooked, 2);
        }
      }
    }
  },
  "create-able Resource": {
    topic: function () {
      return resourceful.define('resourceCreate', function () {
        this.property('title');
      });
    },
    "with 'before' hooks on `create`": {
      topic: function (A) {
        var that = this;
        that.hooked = [];
        this.hooked_create = 0;
        A.before('create', function (obj, next) {
          that.hooked.push('a');
          that.hooked_create += 1;
          next(null);
        });
        A.before('create', function (obj, next) {
          that.hooked_create += 1;
          that.hooked.push('b');
          next(null);
        });
        A.before('create', function (obj, next) {
          that.hooked.push('c');
          obj.title = "not foobar";
          that.hooked_create += 1;
          next(null);
        });
        return A;
      },
      "when calling create() on an instance of Article": {
        topic: function (A) {
          A.create({ id: '69', counter: 0, title: 'foobar' }, this.callback);
        },
        "should trigger all hooks": function (e, res) {
          assert.isNull(e);
          assert.equal(this.hooked_create, 3);
        },
        "should trigger all hooks in the right order": function (e, res) {
          assert.isNull(e);
          assert.equal(this.hooked[0], 'a');
          assert.equal(this.hooked[1], 'b');
          assert.equal(this.hooked[2], 'c');

        },
        "should have modified attributes": function (e, res) {
          assert.isNull(e);
          assert.equal(res.title, "not foobar");
        }
      }
    },
  },
  "another create-able Resource": {
    topic: function () {
      return resourceful.define('resourceAfterCreate', function () {
        this.property('title');
      });
    },
    "with 'after' hooks on `create`": {
      topic: function (A) {
        var that = this;
        this.hooked = 0;
        A.after('save', function (e, obj, next) {
          that.hooked += 1; next(null);
          // TODO: test other stuff
        });
        A.after('save', function (e, obj, next) {
          that.hooked *= 2; next(null);
        });
        this.hooked_create = 0;
        A.after('create', function (e, obj, next) {
          // after.create preceeds after.save
          assert.equal(that.hooked, 0);
          that.hooked_create += 1; next(null);
          // TODO: test other stuff
        });
        A.after('create', function (e, obj, next) {
          that.hooked_create *= 2; next(null);
        });
        return A;
      },
      "should just have the two 'after' hooks registered": function (A) {
        assert.equal(A.hooks.after.create.length,  2);
        assert.equal(A.hooks.before.create.length, 0);
      },
      "when calling create() on an instance of Article": {
        topic: function (A) {
          A.create({ id: '67', counter: 0, title: 'hookbar' }, this.callback);
        },
        "should trigger both hooks in the right order": function (e, res) {
          assert.isNull(e);
          assert.equal(this.hooked, 2);
          assert.equal(this.hooked_create, 2);
        }
      }
    }
  }
}).export(module);
