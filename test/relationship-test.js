var vows = require('vows'),
    path = require('path'),
    macros = require('./macros/relationship'),
    fs   = require('fs'),
    assert = require('assert');

var resourceful = require('../lib/resourceful');
var engines = fs.readdirSync(path.join(__dirname, 'engines')).map(function (e) { return require('./engines/' + e.slice(0,-3)); });
var resources = {};

//engines = engines.reverse();
engines.pop();

engines.forEach(function (e) {
  resources[e] = {};

  vows.describe('resourceful/' + e.name + '/relationship')
  .addBatch(macros.defineResources(e, resources))
  .export(module);
});

