/*
 * engines.js: Set of all engines `resourceful` knows about
 *
 * (C) 2011 Alexis Sellier, Charlie Robbins & the Contributors.
 * Apache 2.0
 *
 */

var fs = require('fs'),
    path = require('path'),
    common = require('./common');

var engines = exports;

if (fs.readdirSync) {
  // Backend - Setup all engines as lazy-loaded getters.
  fs.readdirSync(path.join(__dirname, 'engines')).forEach(function (file) {
    var engine = file.replace('.js', ''),
        name  = common.capitalize(engine);

    engines.__defineGetter__(name, function () {
      return require('./engines/' + engine)[name];
    });
  });
} else {
  // Frontend support for engines
  ['memory'].forEach(function (engine) {
    var name = common.capitalize(engine);

    engines.__defineGetter__(name, function () {
      return require(path.resolve(__dirname, './engines/', engine))[name];
    });
  });
}
