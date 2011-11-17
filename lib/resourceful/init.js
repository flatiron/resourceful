
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
    return null;
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
    return '';
  },
  number: function (schema) {
    //
    // TODO: Consume schema to determine default value
    //
    return 0;
  },
  array: function (schema) {
    //
    // TODO: Consume schema to determine default value
    //
    return [];
  }
};