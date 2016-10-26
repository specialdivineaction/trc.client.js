var angular = require('angular');

var _ = require('lodash');
var CSL = require('CSL');

var citeprocProvider = require('./citeproc.service');
var refsAdapterFactory = require('./refs-adapter.service');
var refsRendererFactory = require('./refs-renderer.service');
var refsRepoFactoryProvider = require('./refs-repo-factory.service');
var bibliographyDirective = require('./bibliography.directive');

angular
  .module('trcRefs', [
    'ngResource',
    'uuid4'
  ])
  .constant('_', _)
  .constant('CSL', CSL)
  .provider('citeproc', citeprocProvider)
  .factory('refsAdapter', refsAdapterFactory)
  .factory('refsRenderer', refsRendererFactory)
  .provider('refsRepoFactory', refsRepoFactoryProvider)
  .directive('bibliography', bibliographyDirective);
