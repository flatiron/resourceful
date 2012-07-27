var resourceful = exports;

resourceful.Cache          = require('./resourceful/cache').Cache;
resourceful.cache          = require('./resourceful/cache').cache;
resourceful.caches         = require('./resourceful/cache').caches;

resourceful.Resource       = require('./resourceful/resource').Resource;
resourceful.define         = require('./resourceful/core').define;
resourceful.defineProperty = require('./resourceful/core').defineProperty;
resourceful.init           = require('./resourceful/init');

resourceful.use            = require('./resourceful/core').use;
resourceful.connect        = require('./resourceful/core').connect;
resourceful.connection     = require('./resourceful/core').connection;
resourceful.resources      = require('./resourceful/core').resources;
resourceful.register       = require('./resourceful/core').register;
resourceful.unregister     = require('./resourceful/core').unregister;
resourceful.engines        = require('./resourceful/engines');
resourceful.instantiate    = require('./resourceful/core').instantiate;

resourceful.deferredRelationships = require('./resourceful/core').deferredRelationships;

resourceful.typeOf         = require('./resourceful/common').typeOf;
resourceful.mixin          = require('./resourceful/common').mixin;
resourceful.clone          = require('./resourceful/common').clone;
resourceful.async          = require('./resourceful/common').async;
resourceful.capitalize     = require('./resourceful/common').capitalize;
resourceful.pluralize      = require('./resourceful/common').pluralize;
resourceful.lowerize       = require('./resourceful/common').lowerize;
resourceful.render         = require('./resourceful/common').render;

resourceful.resources.Resource = resourceful.define('resource');

resourceful.uuid          = require('node-uuid');
