var macros = exports,
    fixture = require('../fixtures'),
    assert = require('assert');

//
// Define common macros that will be used for all tests
//
macros.defineResources = function (resourceful, e) {
  return {
    'In database "test"': {
      topic: function () {
        resourceful.use(e.name, e.options);
        e.load(resourceful, fixture.testData, this.callback)
      },
      "with defined resources" : {
        '"book"': {
          topic: function () {
            resourceful.unregister('Book');
            return resourceful.define('book', function () {
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
            return resourceful.define('author', function () {
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
            return resourceful.define('creature', function () {
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
