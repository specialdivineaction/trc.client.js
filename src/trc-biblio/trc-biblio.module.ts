import * as angular from 'angular';

import {WorksRepoProvider} from './works-repo.service';

angular
  .module('trcBiblio', [
    'ngResource'
  ])
  .provider('worksRepo', WorksRepoProvider);
