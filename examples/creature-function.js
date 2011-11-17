var resourceful = require('../lib/resourceful');

var Creature = resourceful.define('creature', function () {
  this.property('diet');
  this.property('vertebrate', Boolean);
  this.property('belly', Array);

  this.prototype.feed = function (food) {
    this.belly.push(food);
  };
});

var wolf = new(Creature)({
  diet:      'carnivor',
  vertebrate: true
});

console.dir(wolf.belly);
wolf.feed('squirrel');
console.dir(wolf.belly);