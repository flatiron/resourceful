var common = require('./common');

module.exports = {
  all: {
    define: function (attr, val /*, condition, options */) {
      var args = Array.prototype.slice.call(arguments, 2),
          condition,
          options;

      this.property[attr] = val;

      if (typeof(args[0]) === "function") {
        condition = args[0];
        options = args[1] || {};
      }
      else {
        options = args[0] || {};
      }

      if (options.message) { this.property.messages[attr] = options.message }
      if (options.condition) { this.property.conditions[attr] = condition }

      return this;
    },
    requires: function () {},
    //
    // JSON Schema 5.1: type
    //
    type: function (val) {
      var valid = [
        'string',  'number', 'integer',
        'boolean', 'object', 'array',
        'null',    'any'
      ];

      if (valid.indexOf(val) === -1) {
        throw new(TypeError)("invalid type.");
      }

      this.property.type = val;
      return this;
    },
    default: function (val, condition, options) {
      if (this.property.type) {
         enforceType(val, this.property.type);
      }
      return this.define("default", val, condition, options);
    },
    //
    // JSON Schema 5.4: optional
    //
    optional: function (val, condition, options) {
      enforceType(val, "boolean");
      return this.define("optional", val, condition, options);
    },
    unique: function (val, condition, options) {
        enforceType(val, "boolean");
        return this.define("unique", val, condition, options);
    },
    //
    // JSON Schema 5.18: title
    //
    title: function (val) {
      enforceType(val, "string");
      this.property.title = val;
      return this;
    },
    //
    // JSON Schema 5.19: description
    //
    description: function (val) {
      enforceType(val, "string");
      this.property.description = val;
      return this;
    },
    //
    // JSON Schema 5.20: format
    //
    format: function (val, condition, options) {
      var valid = [
          'date',       'time',      'utc-millisec',
          'regex',      'color',     'style',
          'phone',      'uri',       'email',
          'ip-address', 'ipv6',      'street-adress',
          'country',    'region',    'postal-code',
          'locality',   'date-time',
      ];
      if (valid.indexOf(val) === -1) {
        throw new(Error)({name:"ArgumentError"});
      }

      return this.define("format", val, condition, options);
    },
    storageName: function (val) {
      enforceType(val, "string");
      this.property.storageName = val;

      return this;
    },
    conform: function (val, condition, options) {
      enforceType(val, "function");
      return this.define("conform", val, condition, options);
    },
    lazy: function (val, condition, options) {
      enforceType(val, "boolean");
      return this.define("lazy", val, condition, options);
    },
  },
  string: {
    //
    // JSON Schema 5.14: pattern
    //
    pattern: function (val, condition, options) {
      enforceType(val, "regexp");
      return this.define("pattern", val, condition, options);
    },
    //
    // JSON Schema 5.16: minLength
    //
    minLength: function (val, condition, options) {
      enforceType(val, "number");
      return this.define("minLength", val, condition, options);
    },
    //
    // JSON Schema 5.15: maxLength
    //
    maxLength: function (val, condition, options) {
      enforceType(val, "number");
      return this.define("maxLength", val, condition, options);
    },
    //
    // Addition: Sets minLength and maxLength
    //
    length: function (val, condition, options) {
      enforceType(val, "array");
      return this.define("minLength", val[0], condition, options)
                 .define("maxLength", val[1], condition, options);
    },
  },
  number: {
    //
    // JSON Schema 5.7: minimum
    //
    minimum: function (val, condition, options) {
      enforceType(val, "number");
      return this.define("minimum", val, condition, options);
    },
    //
    // JSON Schema 5.8: maximum
    //
    maximum: function (val, condition, options) {
      enforceType(val, "number");
      return this.define("maximum", val, condition, options);
    },
    //
    // Addition: Sets minimum and maximum
    //
    within: function (val, condition, options) {
      enforceType(val, "array");
      return this.define("minimum", val[0], condition, options)
                 .define("maximum", val[1], condition, options);
    }
  }
};

function enforceType(val, type) {
  if (common.typeOf(val) !== type) {
    throw new TypeError({ name: "ArgumentError" });
  }
}
