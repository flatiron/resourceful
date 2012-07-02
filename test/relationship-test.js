var vows = require('vows'),
    path = require('path'),
    macros = require('./macros/relationship'),
    fs   = require('fs'),
    assert = require('assert');

var resourceful = require('../lib/resourceful');
var engines = fs.readdirSync(path.join(__dirname, 'engines')).map(function (e) { return require('./engines/' + e.slice(0,-3)); });
var resources = {};

//engines = engines.reverse();
engines.pop();

engines.forEach(function (e) {
  resources[e] = {};

  vows.describe('resourceful/' + e.name + '/relationship')
  .addBatch(macros.defineResources(e, resources))
  .addBatch({
    "In database 'test'": {
      topic: function () {
        return null
      },
      "an user named 'pavan'": {
        topic: function () {
          resources[e].User.get('pavan', this.callback);
        },
        "should exist": function (err, obj) {
          assert.isNull(err);
          assert.equal(obj._id, 'pavan');
          assert.equal(obj.name, 'pavan');
          assert.equal(obj.resource, 'User');
        },
        "should have children": {
          "repositories": {
            topic: function (obj) {
              return obj;
            },
            "in an array": function (obj) {
              assert.lengthOf(obj.repository_ids, 2);
              assert.equal(obj.repository_ids[0], 'bullet');
              assert.equal(obj.repository_ids[1], 'octonode');
            },
            "on which '.repositories' is called": {
              topic: function (obj) {
                obj.repositories(this.callback);
              },
              "should return them": function (obj) {
                assert.lengthOf(obj, 2);
                assert.equal(obj[0]._id, 'bullet');
                assert.equal(obj[0].name, 'bullet');
                assert.equal(obj[1]._id, 'octonode');
                assert.equal(obj[0].name, 'octonode');
              },
              "should be of proper resource type": function (obj) {
                assert.equal(obj[0].resource, 'Repository');
                assert.equal(obj[1].resource, 'Repository');
              },
              "should have the user_id set correctly": function (obj) {
                assert.equal(obj[0].user_id, 'pavan');
                assert.equal(obj[1].user_id, 'pavan');
              }
            }
          }
        }
      }
    }
  }).addBatch({
    "In database 'test'": {
      topic: function () {
        return null;
      },
      "an user named 'christian'": {
        topic: function () {
          resources[e].User.get('christian', this.callback);
        },
        "should exist": function (err, obj) {
          assert.isNull(err);
          assert.equal(obj._id, 'christian');
          assert.equal(obj.name, 'christian');
          assert.equal(obj.resource, 'User');
          assert.lengthOf(obj.repository_ids, 2);
        },
        "on which '.createRepository' is called": {
          "when successful": {
            topic: function (obj) {
              obj.createRepository({ _id: 'issues', name: 'issues'}, this.callback);
            },
            "should return the newly created object": function (err, obj) {
              assert.isNull(err);
              assert.equal(obj._id, 'user/christian/issues');
              assert.equal(obj.name, 'issues');
              assert.equal(obj.resource, 'Repository');
            },
            "should set the user_id correctly": function (err, obj) {
              assert.isNull(err);
              assert.equal(obj.user_id, 'christian');
            },
            "and reloading parent object": {
              topic: function (child, parent) {
                parent.reload(this.callback);
              },
              "should be successful": function (err, obj) {
                assert.isNull(err);
                assert.equal(obj._id, 'christian');
                assert.equal(obj.name, 'christian');
                assert.equal(obj.resource, 'User');
              },
              "should contain the new child object in the array": function (err, obj) {
                assert.isNull(err);
                assert.lengthOf(obj.repository_ids, 3);
                assert.include(obj.repository_ids, 'issues');
              }
            },
            "should create the record in the db": {
              topic: function () {
                resources[e].Repository.get('user/christian/issues', this.callback);
              },
              "should respond with the right object": function (err, obj) {
                assert.isNull(err);
                assert.equal(obj._id, 'user/christian/issues');
                assert.equal(obj.name, 'issues');
                assert.equal(obj.user_id, 'christian');
              }
            }
          },
          "when unsuccessful using same _id": {
            topic: function (obj) {
              obj.createRepository({ _id: 'repository-1', name: 'reposit' }, this.callback);
            },
            "should respond with error": function (err, obj) {
              assert.equal(err.error, 'conflict');
              assert.isUndefined(obj);
            }
          }
        }
      }
    }
  }).export(module);
});

