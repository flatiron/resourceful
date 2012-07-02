var macros = exports,
    fixture = require('../fixtures/relationship'),
    assert = require('assert');

var resourceful = require('../../lib/resourceful');

//
// Define common macros that will be used for all tests
//
macros.defineResources = function (e, resources) {
  return {
    'In database "test"': {
      topic: function () {
        e.load(resourceful, fixture.testData, this.callback)
      },
      "with defined resources" : {
        '"forum"': {
          topic: function () {
            return resources[e].Forum = resourceful.define('forum', function() {
              this.use(e.name, e.options);
              this.string('name', { minLength: 1 });
              this.parent('Forum');
            });
          },
          'will be successful': function (resource) {
            assert.equal(resource.schema.name, 'Forum');
          }
        },
        '"user"': {
          topic: function () {
            return resources[e].User = resourceful.define('user', function() {
              this.use(e.name, e.options);
              this.string('name', { minLength: 1 });
            });
          },
          'will be successful': function (resource) {
            assert.equal(resource.schema.name, 'User');
          }
        },
        '"repository"': {
          topic: function () {
            return resources[e].Repository = resourceful.define('repository', function() {
              this.use(e.name, e.options);
              this.string('name', { minLength: 1 });
              this.parent('User');
            });
          },
          'will be successful': function (resource) {
            assert.equal(resource.schema.name, 'Repository');
          }
        },
        '"team"': {
          topic: function () {
            return resources[e].Team = resourceful.define('team', function() {
              this.use(e.name, e.options);
              this.string('name', { minLength: 1 });
            });
          },
          'will be successful': function (resource) {
            assert.equal(resource.schema.name, 'Team');
          }
        },
        '"member"': {
          topic: function () {
            return resources[e].Member = resourceful.define('member', function() {
              this.use(e.name, e.options);
              this.string('user');
              this.parent('Team');
            });
          },
          'will be successful': function (resource) {
            assert.equal(resource.schema.name, 'Member');
          }
        },
        '"membership"': {
          topic: function () {
            return resources[e].Membership = resourceful.define('membership', function() {
              this.use(e.name, e.options);
              this.string('team');
              this.parent('User');
            });
          },
          'will be successful': function (resource) {
            assert.equal(resource.schema.name, 'Membership');
          }
        },
        '"follower"': {
          topic: function () {
            return resources[e].Follower = resourceful.define('follower', function() {
              this.use(e.name, e.options);
              this.string('user');
              this.parent('User');
            });
          },
          'will be successful': function (resource) {
            assert.equal(resource.schema.name, 'Follower');
          }
        },
        '"following"': {
          topic: function () {
            return resources[e].Following = resourceful.define('following', function() {
              this.use(e.name, e.options);
              this.string('user');
              this.parent('User');
            });
          },
          'will be successful': function (resource) {
            assert.equal(resource.schema.name, 'Following');
          }
        }
      }
    }
  }
};
