var angular = require('angular');

var relnRepoProvider = require('./reln-repo.service');

angular
  .module('trcReln', [
    'ngResource'
  ])
  .provider('relnRepo', relnRepoProvider);
