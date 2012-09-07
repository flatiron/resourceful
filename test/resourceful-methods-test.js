var assert = require('assert'),
    vows = require('vows'),
    resourceful = require('../lib/resourceful');

function describeResourceWithMethods(){
  var r = resourceful.define('creature');

  r.property('name');
  r.property('type');

  function poke(callback) {
    if (callback) {
      return callback(null, 'poked!');
    }
    return 'poked!';
  }
  function talk (text, target, callback) {
    var result = {
      text: text,
      target: target,
      status: 200
    }
    if (callback) {
      return callback(null, result);
    }
    return result;
  };
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

  r.method('poke', poke);

  r.method('fire', fire, { 
    "description": "fires a lazer at a certain power and direction",
    "properties": {
      "options": {
        "type": "object",
        "properties": {
          "power": {
            "type": "number",
            "default": 1,
            "required": true
          },
          "direction": {
            "type": "string",
            "enum": ["up", "down", "left", "right"],
            "required": true,
            "default": "up"
          },
          "callback": {
            "type": "function",
            "required": false
          }
        }
      }
  }});

  r.method('talk', talk, {
    "description": "echos back a string",
    "properties": {
      "text": {
        "type": "string",
        "required": true
      }
    }
  });

  return r;
}

function resourceTest (instance) {
  return {
     topic: function () {
       var r = describeResourceWithMethods();
       //
       // Remarks: tests are run on both the Class and the Instance
       //
       if(instance) {
         return new r();
       } else {
         return r;
       }
     },
     "adds them to `Resource`": function (R) {
       assert.isFunction(R.fire);
       assert.isFunction(R.talk);
     },
    "should be able to fire method with no schema and callback" : function (R) {
      R.poke(function(err, result){
        assert.isNull(err);
        assert.equal(result, 'poked!');
      });
    },
    "should be able to fire method with no schema and no callback" : function (R) {
      var result = R.poke();
      assert.equal(result, 'poked!');
    },
    "should be able to fire method with one argument and a callback" : function (R) {
      R.talk("hello", "marak", function(err, result){
        assert.isNull(err);
        assert.isObject(result);
      });
    },
    "should be able to fire method with two arguments and no callback" : function (R) {
      var result = R.talk("hello", "marak");
      assert.isObject(result, result);
    },
    "should be able to fire method method with oneargument and callback" : function (r) {
      r.talk("hello", function(err, result){
        assert.isNull(err);
       });
    },
    "should be able to fire method with single arguments and no callback" : function (r) {
      var result;
      try {
        result = r.talk("hello");
      } catch (err) {
        assert.isNull(err);
        return;
      }
    },
    "should error on firing method with invalid signature arguments and callback" : function (R) {
      R.fire(function(err, result){
        assert.isNotNull(err);
      });
    },
    "should error on firing method with signature and no callback" : function (R) {
      try {
        var result = R.fire();
      } catch (err) {
        assert.isNotNull(err);
        return;
      }
      assert.equal(true, false)
    },
    "should be able to fire method with good signature and callback" : function (R) {
      R.fire({ power: 9001, direction: "up" }, function(err, result){
        assert.isNull(err);
        assert.isObject(result);
        assert.equal(result.status, 'fired');
        assert.equal(result.power, 9001);
        assert.equal(result.direction, 'up');
      });
    },
    "should be able to fire method with good signature and no callback" : function (R) {
      var result;
      try {
        result = R.fire({ power: 9001, direction: "up" });
      } catch (err) {
        assert.isNotNull(err);
        return;
      }
      assert.isObject(result);
      assert.equal(result.status, 'fired');
      assert.equal(result.power, 9001);
      assert.equal(result.direction, 'up');
    },
    "should error when firing methods with invalid schema values and no callback" : function (r) {
      var result;
      try {
        result = r.fire({ power: 9001, direction: "side-ways" });
      } catch (err) {
        assert.isNotNull(err);
        return;
      }
      assert.equal(false, true);
    },
    "should error when firing methods with invalid schema values with callback" : function (r) {
      r.fire({ power: 9001, direction: "side-ways" }, function(err, result){
        assert.isNotNull(err);
      });
    }
  }
}

vows.describe('resourceful').addVows({
  "A Resource with methods": resourceTest(),
  "An instance of that Resource": resourceTest(true),
}).export(module);