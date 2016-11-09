import * as angular from 'angular';

import {SeeAlsoRepoProvider} from './see-also-repo.service';

angular
  .module('trcSeeAlso', [
    'ngResource'
  ])
  .provider('seeAlsoRepo', SeeAlsoRepoProvider);
