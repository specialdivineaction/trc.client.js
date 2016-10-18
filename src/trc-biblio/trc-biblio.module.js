var angular = require('angular');

var _ = require('lodash');

var worksRepoProvider = require('./works-repo.service');

angular
  .module('trcBiblio', [
    'ngResource'
  ])
  .constant('_', _)
  .provider('worksRepo', worksRepoProvider);
