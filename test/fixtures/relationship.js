var fixtures = exports;

fixtures.testData = [
  {
    _id: 'author/marak',
    name: 'marak',
    resource: 'Author',
    article_ids: ['article-1', 'article-2']
  },
  {
    _id: 'author/pavan',
    name: 'pavan',
    resource: 'Author',
    article_ids: ['article-1', 'article-2']
  },
  {
    _id: 'article/author/marak/article-1',
    title: 'marak\'s first article',
    resource: 'Article',
    author_id: 'marak'
  },
  {
    _id: 'article/author/marak/article-2',
    title: 'marak\'s second article',
    resource: 'Article',
    author_id: 'marak'
  },
  {
    _id: 'article/author/pavan/article-1',
    title: 'pavan\'s first article',
    resource: 'Article',
    author_id: 'pavan'
  },
  {
    _id: 'article/author/pavan/article-2',
    title: 'pavan\'s second article',
    resource: 'Article',
    author_id: 'pavan'
  }
];
