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
             return resources[e].Book = resourceful.define('book', function () {
               this.use(e.name, e.options);
               this.string('title');
               this.number('year');
               this.bool('fiction');
             });
           },
           'will be successful': function (book) {
             assert.equal(Object.keys(book.properties).length, 4);
           }
         },
         '"author"': {
           topic: function () {
             return resources[e].Author = resourceful.define('author', function () {
               this.use(e.name, e.options);
               this.number('age');
               this.string('hair').sanitize('lower');
             });
           },
           'will be successful': function (author) {
             assert.equal(Object.keys(author.properties).length, 4);
           }
         },
         '"article"': {
           topic: function () {
             return resources[e].Article = resourceful.define('article', function () {
               this.use(e.name, e.options);
               this.string('title');
               this.parent('Author');
             });
           },
           'will be successful': function (author) {
             assert.equal(Object.keys(author.properties).length, 3);
           }
         },
         '"creature"': {
           topic: function () {
             return resources[e].Creature = resourceful.define('creature', function () {
               this.use(e.name, e.options);
               this.string('name');
             });
           },
           'will be successful': function (creature) {
             assert.equal(Object.keys(creature.properties).length, 2);
           },
           '"category"': {
             topic: function () {
               return resources[e].Category = resourceful.define('category', function () {
                 this.use(e.name, e.options);
                 this.string('name');
                 this.parent('category');
               });
               return null;
             },
             'will be successful': function (category) {
               assert.isObject(category.properties);
             }
           }
         }
       }
     }
   }
};



