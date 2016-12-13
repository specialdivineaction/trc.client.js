import * as angular from 'angular';

import {EventEmitter} from '../event-emitter';

interface IAuthResponse {
  access_token: string;
  expiration: string;
  expires_in: number;
  token_type: string;
  uuid: string;
}

/**
 * Encapsulates a login state
 */
export interface IAuthCredentials {
  /**
   * API access token provided by the authentication endpoint
   * @type {string}
   */
  token: string;

  /**
   * Token expiration timestamp
   * @type {Date}
   */
  expires: Date;

  /**
   * Account id of the authenticated account to which the token belongs
   * @type {string}
   */
  accountId: string;
}

/**
 * Authentication Service Provider
 *
 * Configures and constructs authentication service instance
 */
export interface IAuthServiceProvider extends angular.IServiceProvider {
  loginUrl: string;
  loginGuestUrl: string;
}

export class AuthServiceProvider implements IAuthServiceProvider {
  loginUrl: string;
  loginGuestUrl: string;

  /** @ngInject */
  $get($http: angular.IHttpService): IAuthService {
    return new AuthService($http, this);
  }
}

/**
 * Authentication Service
 *
 * Responsible for maintaining the state of a currently logged-in user account and notifying when that state changes.
 */
export interface IAuthService {
  credentials: IAuthCredentials;

  /**
   * Logs in the user identified by the specified credentials
   *
   * @param {string} username
   * @param {string} rawPassword
   * @return {Promise.<IAuthCredentials>}
   */
  login(username: string, password: string): angular.IPromise<IAuthCredentials>;

  /**
   * Logs into a guest account
   *
   * @return {Promise.<IAuthCredentials>}
   */
  loginGuest(): angular.IPromise<IAuthCredentials>;

  /**
   * Logs out of the current account
   */
  logout(): void;

  /**
   * Logs out of the active account (if necessary) and explicitly sets the active account to the given credentials
   *
   * @param {IAuthCredentials} creds
   */
  setCredentials(creds: IAuthCredentials): void;

  /**
   * @return whether the user is authenticated
   */
  isAuthenticated(): boolean;

  /**
   * Adds a subscriber for login events
   *
   * @param {function} fn
   * @return {function} unregistration function
   */
  onLogin(fn: (creds: IAuthCredentials) => void): () => void;

  /**
   * Adds a subscriber for logout events
   *
   * @param {function} fn
   * @return {funciton} unregistration function
   */
  onLogout(fn: (_: null) => void): () => void;
}

/**
 * Authentication service implementation
 */
class AuthService implements IAuthService {
  credentials: IAuthCredentials;

  private $http: angular.IHttpService;
  private provider: IAuthServiceProvider;

  private loginEmitter: EventEmitter<IAuthCredentials> = new EventEmitter();
  private logoutEmitter: EventEmitter<null> = new EventEmitter();

  /**
   * Adapts a login response data vehicle into authentication credentials for use within the authentication framework
   *
   * @param {IAuthResponse} res
   * @return {IAuthCredentials}
   */
  private static adaptAuthData(res: IAuthResponse): IAuthCredentials {
    return {
      token: res.access_token,
      expires: new Date(res.expiration),
      accountId: res.uuid
    };
  }

  constructor($http: angular.IHttpService, provider: IAuthServiceProvider) {
    this.$http = $http;
    this.provider = provider;
  }

  /** @inheritdoc */
  login(username: string, password: string): angular.IPromise<IAuthCredentials> {
    const loginP = this.$http.post(this.provider.loginUrl, {username, password}).then(res => res.data);
    const credsP = loginP.then(AuthService.adaptAuthData);

    credsP.then(creds => this.setCredentials(creds));

    return credsP;
  }

  /** @inheritdoc */
  loginGuest(): angular.IPromise<IAuthCredentials> {
    const loginP = this.$http.post(this.provider.loginGuestUrl, {}).then(res => res.data);
    const credsP = loginP.then(AuthService.adaptAuthData);

    credsP.then(creds => {
      this.credentials = creds;
      this.loginEmitter.emit(creds);
    });

     return credsP;
  }

  /** @inheritdoc */
  logout(): void {
    this.credentials = null;
    this.logoutEmitter.emit(null);
  }

  /** @inheritdoc */
  setCredentials(creds: IAuthCredentials): void {
    if (this.credentials) {
      this.logout();
    }

    this.credentials = creds;
    this.loginEmitter.emit(creds);
  }

  /** @inheritdoc */
  isAuthenticated(): boolean {
    return !!this.credentials;
  }

  /** @inheritdoc */
  onLogin(fn: (creds: IAuthCredentials) => void): () => void {
    return this.loginEmitter.subscribe(fn);
  }

  /** @inheritdoc */
  onLogout(fn: (_: null) => void): () => void {
    return this.logoutEmitter.subscribe(fn);
  }
}
