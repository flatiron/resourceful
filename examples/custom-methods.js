//
// custom-methods.js - example of extending resources to have methods
//

var resourceful = require('../lib/resourceful');
resourceful.use('memory');

var Creature = resourceful.define('creature');

var lazer = function(options){
  console.log('firing mah lazar @ ' + options.powa);
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
Creature.method('fire', lazer, { properties: {
  "powa": {
    "type": "string",
    "enum": ["high", "low", "med", "SUPA POWA"],
    "required": true
  }
}});

Creature.fire({ powa: "med"});
Creature.fire({ powa: "TOO HIGH"}, function(err, result){
  // errors since TOO HIGH is not in enum
  console.log(err, result);
});

// throws validation error
// Creature.fire({ powa: "TOO HIGH"});

Creature.create({
  id: 'Marak'
}, function(err, marak){
  if(err){
    console.log(err.validate)
    
  }
  marak.fire({ powa: "med"});

  // throws validation error
  // marak.fire({ powa: "TOO HIGH"});

  marak.fire({ powa: "low"}, function(err, result){
    console.log(err, result);
  });

  marak.fire({ powa: "TOO HIGH"}, function(err, result){
    // errors since TOO HIGH is not in enum
    console.log(err, result);
  });
});
