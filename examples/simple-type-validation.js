var resourceful = require('../lib/resourceful');

var User = resourceful.define('user', function () {
  //
  // Specify a storage engine
  //
  this.use('memory');
  this.string('name');

  //
  // Specify some properties with validation
  //
  this.string('email', { format: 'email', required: true })
});

var user = { email: 'INVALID_EMAIL@123' };
User.create(user, function (err, result) {
  /*
    [ { attribute: 'format',
        property: 'email',
        expected: 'email',
        actual: 'INVALID_EMAIL@123',
        message: 'is not a valid email' } ]
  */
  console.log(err, result)
});

var user = { email: 'marak.squires@gmail.com' };
User.create(user, function (err, result) {
  /*
    null { _id: '1',
      name: undefined,
      email: 'marak.squires@gmail.com',
      ctime: 1339644429540,
      mtime: 1339644429540,
      atime: undefined,
      resource: 'User'
  */
  console.log(err, result)
});


