import * as angular from 'angular';

import {TrcSearchProvider} from './trc-search.service';

angular
  .module('trcCore', [
    'ngResource'
  ])
  .provider('trcSearch', TrcSearchProvider);
