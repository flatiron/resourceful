var fixtures = exports;

fixtures.testData = [
  {
    _id: 'user/marak',
    name: 'marak',
    resource: 'User',
    repository_ids: ['colors', 'npmtop'],
    membership_ids: ['nodedocs', 'nodejitsu', 'nodeapps'],
    follower_ids: ['pavan', 'christian'],
    following_ids: ['pavan']
  },
  {
    _id: 'user/pavan',
    name: 'pavan',
    resource: 'User',
    repository_ids: ['bullet', 'octonode'],
    membership_ids: ['nodejitsu', 'nodeapps'],
    follower_ids: ['marak', 'christian'],
    following_ids: ['marak']
  },
  {
    _id: 'user/christian',
    name: 'christian',
    resource: 'User',
    repository_ids: ['repository-1', 'repository-2'],
    membership_ids: ['nodejitsu'],
    follower_ids: [],
    following_ids: ['marak', 'pavan']
  },
  {
    _id: 'repository/user/marak/colors',
    name: 'colors',
    resource: 'Repository',
    user_id: 'marak'
  },
  {
    _id: 'repository/user/marak/npmtop',
    name: 'npmtop',
    resource: 'Repository',
    user_id: 'marak'
  },
  {
    _id: 'repository/user/pavan/bullet',
    name: 'bullet',
    resource: 'Repository',
    user_id: 'pavan'
  },
  {
    _id: 'repository/user/pavan/octonode',
    name: 'octonode',
    resource: 'Repository',
    user_id: 'pavan'
  },
  {
    _id: 'repository/user/christian/repository-1',
    name: 'repository-1',
    resource: 'Repository',
    pull_request_ids: ['1'],
    user_id: 'christian'
  },
  {
    _id: 'repository/user/christian/repository-2',
    name: 'repository-2',
    resource: 'Repository',
    user_id: 'christian'
  },
  {
    _id: 'team/nodeapps',
    name: 'nodeapps',
    resource: 'Team',
    member_ids: ['marak', 'pavan']
  },
  {
    _id: 'team/nodejitsu',
    name: 'nodejitsu',
    resource: 'Team',
    member_ids: ['marak', 'pavan', 'christian']
  },
  {
    _id: 'team/nodedocs',
    name: 'nodedocs',
    resource: 'Team',
    member_ids: ['marak']
  },
  {
    _id: 'member/team/nodeapps/marak',
    user: 'marak',
    resource: 'Member',
    team_id: 'nodeapps'
  },
  {
    _id: 'member/team/nodeapps/pavan',
    user: 'pavan',
    resource: 'Member',
    team_id: 'nodeapps'
  },
  {
    _id: 'member/team/nodejitsu/marak',
    user: 'marak',
    resource: 'Member',
    team_id: 'nodejitsu'
  },
  {
    _id: 'member/team/nodejitsu/pavan',
    user: 'pavan',
    resource: 'Member',
    team_id: 'nodejitsu'
  },
  {
    _id: 'member/team/nodejitsu/christian',
    user: 'christian',
    resource: 'Member',
    team_id: 'nodejitsu'
  },
  {
    _id: 'member/team/nodedocs/marak',
    user: 'marak',
    resource: 'Member',
    team_id: 'nodedocs'
  },
  {
    _id: 'membership/user/marak/nodeapps',
    team: 'nodeapps',
    resource: 'Membership',
    user_id: 'marak'
  },
  {
    _id: 'membership/user/marak/nodejitsu',
    team: 'nodejitsu',
    resource: 'Membership',
    user_id: 'marak'
  },
  {
    _id: 'membership/user/marak/nodedocs',
    team: 'nodedocs',
    resource: 'Membership',
    user_id: 'marak'
  },
  {
    _id: 'membership/user/pavan/nodeapps',
    team: 'nodeapps',
    resource: 'Membership',
    user_id: 'pavan'
  },
  {
    _id: 'membership/user/pavan/nodejitsu',
    team: 'nodejitsu',
    resource: 'Membership',
    user_id: 'pavan'
  },
  {
    _id: 'membership/user/christian/nodejitsu',
    team: 'nodejitsu',
    resource: 'Membership',
    user_id: 'christian'
  },
  {
    _id: 'follower/user/marak/pavan',
    name: 'pavan',
    resource: 'Follower',
    user_id: 'marak'
  },
  {
    _id: 'follower/user/marak/christian',
    name: 'christian',
    resource: 'Follower',
    user_id: 'marak'
  },
  {
    _id: 'follower/user/pavan/marak',
    name: 'marak',
    resource: 'Follower',
    user_id: 'pavan'
  },
  {
    _id: 'follower/user/pavan/christian',
    name: 'christian',
    resource: 'Follower',
    user_id: 'pavan'
  },
  {
    _id: 'following/user/marak/pavan',
    name: 'pavan',
    resource: 'Following',
    user_id: 'marak'
  },
  {
    _id: 'following/user/pavan/marak',
    name: 'marak',
    resource: 'Following',
    user_id: 'pavan'
  },
  {
    _id: 'following/user/christian/marak',
    name: 'marak',
    resource: 'Following',
    user_id: 'christian'
  },
  {
    _id: 'following/user/christian/pavan',
    name: 'pavan',
    resource: 'Following',
    user_id: 'christian'
  },
  {
    _id: 'forum/support',
    name: 'support',
    resource: 'Forum',
    forum_id: null,
    forum_ids: []
  },
  {
    _id: 'forum/develop',
    name: 'develop',
    resource: 'Forum',
    forum_id: null,
    forum_ids: ['nodejitsu', 'flatiron']
  },
  {
    _id: 'forum/forum/develop/nodejitsu',
    name: 'nodejitsu',
    resource: 'Forum',
    forum_id: 'develop',
    forum_ids: ['orchestrion', 'conservatory']
  },
  {
    _id: 'forum/forum/develop/flatiron',
    name: 'flatiron',
    resource: 'Forum',
    forum_id: 'develop',
    forum_ids: []
  },
  {
    _id: 'forum/forum/forum/develop/nodejitsu/conservatory',
    name: 'conservatory',
    resource: 'Forum',
    forum_id: 'forum/develop/nodejitsu',
    forum_ids: []
  },
  {
    _id: 'forum/forum/forum/develop/nodejitsu/orchestrion',
    name: 'orchestrion',
    resource: 'Forum',
    forum_id: 'forum/develop/nodejitsu',
    forum_ids: []
  },
  {
    _id: 'pull_request/repository/user/christian/repository-1/1',
    title: 'Resourceful rocks!',
    resource: 'PullRequest',
    repository_id: 'user/christian/repository-1'
  }
];
