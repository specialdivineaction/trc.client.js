import * as angular from 'angular';

import {IAuthService} from './trc-auth.service';

export interface IAuthInterceptorProvider extends angular.IServiceProvider {
  url: RegExp;
}

/**
 * Configures and constructs a $http interceptor that adds bearer tokens to API requests that match a given URL pattern.
 */
export class AuthInterceptorProvider implements IAuthInterceptorProvider {
  url: RegExp;

  /** @ngInject */
  $get(trcAuth: IAuthService): angular.IHttpInterceptor {
    const urlMatcher = this.url;

    return {
      /**
       * Appends an 'Authorization:' header to the request if the destination URL is intended for the configured API
       *
       * @param {object} config
       * @return {object}
       */
      request(config: angular.IRequestConfig): angular.IRequestConfig {
        if ((!urlMatcher || urlMatcher.test(config.url)) && trcAuth.isAuthenticated()) {
          const tokenData = trcAuth.getAccountTokenData();
          (<any>config.headers).Authorization = `Bearer ${tokenData.token}`;
        }

        return config;
      }
    };
  }
}
