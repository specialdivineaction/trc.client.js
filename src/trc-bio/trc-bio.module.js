var angular = require('angular');

var peopleRepoProvider = require('./people-repo.service');

angular
  .module('trcBio', [
    'ngResource'
  ])
  .provider('peopleRepo', peopleRepoProvider);
