var assert = require('assert'),
    vows = require('vows'),
    resourceful = require('../lib/resourceful');

var users = {
  valid: {
    id: 'valid-user',
    email: 'valid@email.com',
    name: 'valid string'
  },
  invalid: {
    id: 'invalid-user',
    email: 'invalid-email@123',
    name: 123
  }
}

function assertValidUser(obj) {
  Object.keys(users.valid).forEach(function (key) {
    assert.equal(users.valid[key], obj[key]);
  });
}

vows.describe('resourceful/validation').addBatch({
  "A Resource with complex validation": {
    topic: function () {
      return resourceful.define('user', function () {
        //
        // Specify a storage engine
        //
        this.use('memory');

        //
        // Specify some properties with validation
        //
        this.string('email', { format: 'email', required: true });
        this.string('name', { required: true });
      });
    },
    "when created": {
      "with a valid object": {
        topic: function (r) {
          r.create(users.valid, this.callback);
        },
        "it should be created correctly": function (err, inst) {
          assert.isNull(err);
          assertValidUser(inst);
        }
      },
      "with an invalid object": {
        topic: function (r) {
          r.create(users.invalid, this.callback);
        },
        "it should respond with the correct errors": function (err, _) {
          assert.isFalse(err.validate.valid);
          assert.isArray(err.validate.errors);
          assert.lengthOf(err.validate.errors, 2);

          assert.equal(err.validate.errors[0].property, 'email');
          assert.equal(err.validate.errors[1].property, 'name');
        }
      }
    },
    "when updated": {
      "with a valid object": {
        topic: function (r) {
          var that = this;
          r.create(users.valid, function (err, user) {
            user.update({ email: 'another-valid@email.com' }, that.callback);
          });
        },
        "it should be created correctly": function (err, inst) {
          assert.isNull(err);
          assert.equal(inst.email, 'another-valid@email.com');
        }
      },
      "with an invalid object": {
        topic: function (r) {
          var that = this;
          r.create(users.valid, function (err, user) {
            user.update({ email: 'invalid@email1234' }, that.callback);
          });
        },
        "it should respond with the correct errors": function (err, _) {
          assert.isFalse(err.validate.valid);
          assert.isArray(err.validate.errors);
          assert.lengthOf(err.validate.errors, 1);
          assert.equal(err.validate.errors[0].property, 'email');
        }
      }
    }
  }

}).export(module);
