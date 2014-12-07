//
// custom-methods.js - example of extending resources to have methods
//

var resourceful = require('../lib/resourceful');
resourceful.use('memory');

var Creature = resourceful.define('creature');

function fire (options, callback) {
  var result = {
    status: "fired",
    direction: options.direction,
    power: options.power
  };
  if(callback) {
    return callback(null, result);
  }
  return result;
};
//
// Resource.method takes three arguments:
//
//   name, Function, schema
//
//  The schema represents an optional JSON-Schema,
//  which if present, is enforced on the Function's arguments
//
//

var poke = function(target, velocity){
  console.log(target, velocity);
};

Creature.method('poke', poke, { properties: {
  "target": {
    "type": "string",
    "required": true
  },
  "velocity": {
    "type": "string",
    "default": "ten"
  }
}});


Creature.method('fire', fire, {
  "description": "fires a lazer at a certain power and direction",
  "properties": {
    "options": {
      "type": "object",
      "properties": {
        "power": {
          "type": "number",
          "default": 1
        },
        "direction": {
          "type": "string",
          "enum": ["up", "down", "left", "right"],
          "required": true,
          "default": "up"
        }
      }
    },
    "callback": {
      "type": "function",
      "required": false
    }
  }
});

Creature.fire({ direction: "side-ways"}, function(err, result){
  // errors since side-ways is not in enum
  console.log(err, result);
});
Creature.poke("someone");
Creature.poke("someone-else", "six");

// throws validation error
// Creature.fire({ powa: "TOO HIGH"});

Creature.create({
  id: 'Marak'
}, function(err, marak){
  if(err){
    console.log(err);
  }

  marak.poke("somebody");
  marak.poke("somebody-else", "seven");

  marak.fire({ "direction": "side-ways", "power": 20}, function(err, result){
    // errors since Tside-ways is not in enum
    console.log(err, result);
  });

  // throws validation error
  // marak.fire({ power: "TOO HIGH"});
  marak.fire({ "direction": "up", "power": 20}, function(err, result){
    // fires correctly
    console.log(err, result);
  });
});

