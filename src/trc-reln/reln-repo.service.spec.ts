import * as angular from 'angular';
import 'angular-mocks';
import 'angular-resource';

import {RelnRepo} from './reln-repo.service';

import './trc-reln.module';

describe('relnRepo', function () {
  let relnRepo: RelnRepo;

  beforeEach(function () {
    angular.mock.module('trcReln');
  });

  beforeEach(angular.mock.inject(function (_relnRepo_: RelnRepo) {
    relnRepo = _relnRepo_;
  }));

  describe('#method', function () {
    // TODO: tests
  });
});
