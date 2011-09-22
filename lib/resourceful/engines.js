/*
 * engines.js: Set of all engines `resourceful` knows about
 *
 * (C) 2010 Nodejitsu Inc.
 * MIT LICENCE
 *
 */

var fs = require('fs'),
    path = require('path'),
    common = require('./common');

var engines = exports;

//
// Setup all engines as lazy-loaded getters.
//
fs.readdirSync(path.join(__dirname, 'engines')).forEach(function (file) {
  var engine = file.replace('.js', ''),
      name  = common.capitalize(engine);

  engines.__defineGetter__(name, function () {
    return require('./engines/' + engine)[name];
  });
});
