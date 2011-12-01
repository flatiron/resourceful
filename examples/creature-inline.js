var resourceful = require('../lib/resourceful');

var Creature = resourceful.define('creature');

Creature.string('diet');
Creature.bool('vertebrate');
Creature.array('belly');

Creature.prototype.feed = function (food) {
  this.belly.push(food);
};

var wolf = new(Creature)({
  diet:      'carnivor',
  vertebrate: true
});

console.dir(wolf.belly);
wolf.feed('squirrel');
console.dir(wolf.belly);
