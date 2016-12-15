import * as angular from 'angular';

import {AuthServiceProvider} from './trc-auth.service';
import {AuthInterceptorProvider} from './trc-auth-interceptor.service';
import {AuthPersistenceProvider} from './trc-auth-persistence.service';
import {AccountsRepositoryProvider} from './accounts-repo.service';

/**
 * To use the provided authentication interceptor, add the following to the app config step:
 *
 *     $httpProvider.interceptors.push('trcAuthInterceptor');
 */

angular
  .module('accounts', [])
  .provider('trcAuth', AuthServiceProvider)
  .provider('trcAuthInterceptor', AuthInterceptorProvider)
  .provider('trcAuthPersistence', AuthPersistenceProvider)
  .provider('accountsRepo', AccountsRepositoryProvider);
