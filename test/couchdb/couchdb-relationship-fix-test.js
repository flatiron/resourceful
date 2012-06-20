var resourceful = require('../../lib/resourceful'),
    vows        = require('vows'),
    assert      = require('assert'),
    cradle      = require('cradle');

resourceful.use('couchdb', {database: 'test'});
var Author = resourceful.define('author', function () {
  this.property('name');
});
var Book = resourceful.define('book', function () {
  this.property('title');
  this.parent('Author');
});

vows.describe('relationships in couchdb').addBatch({
  'when using relationships': {
    topic: function() {

      var db = new(cradle.Connection)().database('test')
      var todo = 2,
          that = this;
      db.create(function() {

      Author.create({
        name:'William Shakespeare'
      }, function(e, shakespeare) {

        function go() {
          --todo || that.callback(null, shakespeare);
        }

        shakespeare.createBook({
          title:'Romeo and Juliet'
        }, go);
        setTimeout(function() {
          shakespeare.createBook({
            title:'Hamlet'
          }, go);
        }, 500);
      });
      });
    },
    'author should have articles': function(e, s) {
      s.books(function(e, a) {
        assert.equal(a.length, 2);
        a[0].destroy(function() {

          s.books(function(e, x) {
            assert.equal(x.length, 1);
          });
        });
      });
    }
  }
}).export(module);
