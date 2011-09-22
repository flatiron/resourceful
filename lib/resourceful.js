var resourceful = exports;

resourceful.Resource       = require('./resourceful/resource').Resource;
resourceful.define         = require('./resourceful/core').define;
resourceful.defineProperty = require('./resourceful/core').defineProperty;

resourceful.use            = require('./resourceful/core').use;
resourceful.connect        = require('./resourceful/core').connect;
resourceful.typeOf         = require('./resourceful/common').typeOf;
resourceful.connection     = require('./resourceful/core').connection;
resourceful.mixin          = require('./resourceful/common').mixin;
resourceful.clone          = require('./resourceful/common').clone;
resourceful.resources      = require('./resourceful/core').resources;
resourceful.register       = require('./resourceful/core').register;
resourceful.unregister     = require('./resourceful/core').unregister;
resourceful.engines        = require('./resourceful/engines');
resourceful.instantiate    = require('./resourceful/core').instantiate;

resourceful.resources.Resource = resourceful.define('resource');
