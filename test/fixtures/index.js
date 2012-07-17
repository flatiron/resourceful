var fixtures = exports;

fixtures.testData = [
  { _id: 'author/bob',        resource: 'Author', age: 35, hair: 'black'},
  { _id: 'author/mat',        resource: 'Author', age: 29, hair: 'black'},
  { _id: 'author/tim',        resource: 'Author', age: 16, hair: 'brown'},
  { _id: 'book/author/bob/1', resource: 'Book',   title: 'Nodejs rocks!', year: 2003, fiction: true},
  { _id: 'book/author/tim/1', resource: 'Book',   title: 'Nodejitsu rocks!', year: 2008, fiction: false},
  { _id: 'book/author/bob/2', resource: 'Book',   title: 'Loling at you', year: 2011, fiction: true},
  { _id: 'zine/1',            resource: 'Zine',   title: 'Danger'},
  { _id: 'zine/2',            resource: 'Zine',   title: 'Doom'},
  { _id: 'zine/author/bob/1', resource: 'Zine',   title: 'Doom'},
  { _id: 'dummy/1',           resource: 'Dummy',  hair:  'black'},
  { _id: 'dummy/2',           resource: 'Dummy',  hair:  'blue'}
];
