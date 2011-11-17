
module.exports = function init(obj, property, schema) {
  if (obj[property]) {
    return obj[property];
  }
  
  return !!init.type[schema.type]
    ? init.type[schema.type](schema)
    : null;
};

module.exports.type = {
  default: function (schema) {
    //
    // TODO: Consume schema to determine default value
    //
    return undefined;
  },
  object: function (schema) {
    //
    // TODO: Consume schema to determine default value
    //
    return {};
  },
  string: function (schema) {
    //
    // TODO: Consume schema to determine default value
    //
    return undefined;
  },
  number: function (schema) {
    //
    // TODO: Consume schema to determine default value
    //
    return undefined;
  },
  array: function (schema) {
    //
    // TODO: Consume schema to determine default value
    //
    return [];
  }
};