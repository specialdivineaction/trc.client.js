import * as angular from 'angular';

import {TrcSearchProvider} from './trc-search.service';
import {CategorizationRepoProvider} from './categorizations/repository.service';

angular
  .module('trcCore', [
    'ngResource'
  ])
  .provider('categorizationService', CategorizationRepoProvider)
  .provider('trcSearch', TrcSearchProvider);
