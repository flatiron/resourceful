var engine = exports;

engine.name = 'memory';
engine.options = { uri: 'test' };

engine.load = function (resourceful, data, callback) {
  data = data.map(function (r) {
    r = JSON.parse(JSON.stringify(r));
    r.id = r._id;
    delete r._id;
    return r;
  });

  new(resourceful.engines.Memory)(engine.options).load(data);
  callback();
};
