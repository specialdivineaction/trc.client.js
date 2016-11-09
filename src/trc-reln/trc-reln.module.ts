import * as angular from 'angular';

import {RelnRepoProvider} from './reln-repo.service';

angular
  .module('trcReln', [
    'ngResource'
  ])
  .provider('relnRepo', RelnRepoProvider);
