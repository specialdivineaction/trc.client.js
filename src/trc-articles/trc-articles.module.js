var angular = require('angular');

var _ = require('lodash');

var articlesRepoProvider = require('./articles-repo.service');

angular
  .module('trcArticles', [
    'ngResource',
    'uuid4'
  ])
  .constant('_', _)
  .provider('articlesRepo', articlesRepoProvider);
