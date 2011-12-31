var engine = exports;

engine.name = 'memory';
engine.options = { uri: 'test' };

engine.load = function (resourceful, data, callback) {
  new(resourceful.engines.Memory)(engine.options).load(data);
  callback();
}
;
