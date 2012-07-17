var macros = exports,
    fixture = require('../fixtures'),
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
        '"book"': {
          topic: function () {
            resourceful.unregister('Book');
            return resources[e].Book = resourceful.define('book', function () {
              this.use(e.name, e.options);
              this.string('title');
              this.number('year');
              this.bool('fiction');
            });
          },
          'will be successful': function (resource) {
            assert.equal(resource.schema.name, 'Book');
          }
        },
        '"author"': {
          topic: function () {
            resourceful.unregister('Author');
            return resources[e].Author = resourceful.define('author', function () {
              this.use(e.name, e.options);
              this.number('age');
              this.string('hair').sanitize('lower');
            });
          },
          'will be successful': function (resource) {
            assert.equal(resource.schema.name, 'Author');
          }
        },
        '"creature"': {
          topic: function () {
            resourceful.unregister('Creature');
            return resources[e].Creature = resourceful.define('creature', function () {
              this.use(e.name, e.options);
              this.string('name');
            });
          },
          'will be successful': function (resource) {
            assert.equal(resource.schema.name, 'Creature');
          },
        }
      }
    }
  }
};
