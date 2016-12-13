import * as angular from 'angular';

import {IAuthService} from './trc-auth.service';

export interface IAuthInterceptorProvider extends angular.IServiceProvider {
  url: RegExp;
}

/**
 * Authentication Interceptor Provider
 *
 * Configures and constructs authentication interceptor instance
 */
export class AuthInterceptorProvider implements IAuthInterceptorProvider {
  url: RegExp;

  /** @ngInject */
  $get(trcAuth: IAuthService): angular.IHttpInterceptor {
    return new AuthInterceptor(trcAuth, this.url);
  }
}

/**
 * Authentication Interceptor
 *
 * Intercepts and configures matching HTTP requests according to the user's authentication status.
 */
class AuthInterceptor implements angular.IHttpInterceptor {
  private auth: IAuthService;
  private urlMatcher: RegExp;

  constructor(auth: IAuthService, urlMatcher: RegExp) {
    this.auth = auth;
    this.urlMatcher = urlMatcher;
  }

  /**
   * Appends an 'Authorization:' header to the request if the destination URL is intended for the configured API
   *
   * @param {object} config
   * @return {object}
   */
  request(config: angular.IRequestConfig): angular.IRequestConfig {
    if (this.urlMatcher.test(config.url) && this.auth.isAuthenticated()) {
      (<any>config.headers).Authorization = `Bearer ${this.auth.credentials.token}`;
    }

    return config;
  }
}
