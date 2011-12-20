var path = require('path')
  , assert = require('assert')
  , fs = require('fs')
  , vows = require('vows')
  , resourceful = require('../lib/resourceful');

var engines = fs.readdirSync(path.join(__dirname, 'engines')).map(function (e) { return require('./engines/' + e.slice(0,-3)); });

var resources = {};

engines.forEach(function (e) {
  resources[e] = {}
  vows.describe('resourceful/engines/' + e.name)
  .addBatch({
    'In database "test"': {
      topic: function () {
        e.load(resourceful, [
          { _id: 'bob', age: 35, hair: 'black', resource: 'Author'},
          { _id: 'tim', age: 16, hair: 'brown', resource: 'Author'},
          { _id: 'mat', age: 29, hair: 'black', resource: 'Author'}
        ], this.callback);
      },
      'Defining resource "book"': {
        topic: function () {
          return resources[e].Book = resourceful.define('book', function () {
            this.use(e.name, e.options);

            this.string('title').sanitize('lower');
            this.number('year');
            this.bool('fiction');
          });
        },
        'will be successful': function (book) {
          assert.equal(Object.keys(book.properties).length, 4);
        }
      },
      'Defining resource "author"': {
        topic: function () {
          return resources[e].Author = resourceful.define('author', function () {
            this.use(e.name, e.options);

            this.number('age');
            this.string('hair').sanitize('lower');
          });
        },
        'will be successful': function (author) {
          assert.equal(Object.keys(author.properties).length, 3);
        }
      }
    }
  }).export(module)
});
