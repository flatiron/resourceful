var engine = exports;

engine.name = 'filesystem';
engine.options = { uri: 'test' };

engine.load = function (resourceful, data, callback) {
  console.log(resourceful.engines.FileSystem);
  new(resourceful.engines.Filesystem)(engine.options).load(data);
  callback();
};
