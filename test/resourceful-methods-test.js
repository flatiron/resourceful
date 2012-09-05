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
  function talk () {
    console.log('talk');
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
    properties: {
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
    }
  }});

  r.method('talk', talk, { properties: {
    "text": {
      "type": "string",
      "required": true
    }
  }});

  return r;
}

vows.describe('resourceful').addVows({ // property
  "A Resource with methods": {
    topic: function () {
      var r = describeResourceWithMethods();
      return r;
    },
    "adds them to `Resource.methods`": function (R) {
      assert.equal(Object.keys(R.methods).length, 3);
      assert.include(R.methods, 'fire');
      assert.include(R.methods, 'talk');
    },
    "should be able to fire simple method with callback" : function (R) {
      R.poke(function(err, result){
        assert.isNull(err);
        assert.equal(result, 'poked!');
      });
    },
    "should be able to fire simple method with no callback" : function (R) {
      var result = R.poke();
      assert.equal(result, 'poked!');
    },
    "should error on firing schema method with bad arguments and callback" : function (R) {
      R.fire(function(err, result){
        assert.isNotNull(err);
      });
    },
    "should error on firing schema method with bad arguments and no callback" : function (R) {
      try {
        var result = R.fire();
      } catch (err) {
        assert.isNotNull(err);
        return;
      }
      assert.equal(true, false)
    },
    "should be able to fire schema method with good arguments and callback" : function (R) {
      R.fire({ power: 9001, direction: "up" }, function(err, result){
        assert.isNull(err);
        assert.isObject(result);
        assert.equal(result.status, 'fired');
        assert.equal(result.power, 9001);
        assert.equal(result.direction, 'up');
      });
    },
    "should be able to fire schema method with good arguments and no callback" : function (R) {
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
    "When instantiated": {
      topic: function (R) {
        var r = new(R)({ name: 'Larry', type: 'Dragon' });
        return r;
      },
      "should respond to toJSON()": function (r) {
        assert.isObject(r.toJSON());
      },
      "should return the attributes, when `Object.keys` is called": function (r) {
        var keys = Object.keys(r);
        assert.include(keys, 'fire');
        assert.include(keys, 'talk');
      },
      "should be able to fire simple method with callback" : function (r) {
        r.poke(function(err, result){
          assert.isNull(err);
          assert.equal(result, 'poked!');
        });
      },
      "should be able to fire simple method with no callback" : function (r) {
        var result = r.poke();
        assert.equal(result, 'poked!');
      },
      "should error on firing schema method with bad arguments and callback" : function (r) {
        r.fire(function(err, result){
          assert.isNotNull(err);
        });
      },
      "should error on firing schema method with bad arguments and no callback" : function (r) {
        try {
          var result = r.fire();
        } catch (err) {
          assert.isNotNull(err);
          return;
        }
        assert.equal(true, false)
      },
      "should be able to fire schema method with good arguments and callback" : function (r) {
        r.fire({ power: 9001, direction: "up" }, function(err, result){
          assert.isNull(err);
          assert.isObject(result);
          assert.equal(result.status, 'fired');
          assert.equal(result.power, 9001);
          assert.equal(result.direction, 'up');
        });
      },
      "should be able to fire schema method with good arguments and no callback" : function (r) {
        var result;
        try {
          result = r.fire({ power: 9001, direction: "up" });
        } catch (err) {
          assert.isNull(err);
          return;
        }
        assert.isObject(result);
        assert.equal(result.status, 'fired');
        assert.equal(result.power, 9001);
        assert.equal(result.direction, 'up');
      }
    }
  }
}).export(module);