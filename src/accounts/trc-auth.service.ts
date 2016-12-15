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
 * Encapsulates the authenticated state of the application.
 */
export interface IAccountTokenData {
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
 * Simple adapter pattern for synchronous storage mechanisms.
 * The availability and duration of persistence are implementation-specific
 * (e.g. never expiring, expiring at the end of a session, expiring between refreshes)
 */
export interface IPersistenceStrategy<T> {
  /**
   * Saves the given value for later retrieval.
   *
   * @param {T} value
   */
  save(value: T): void;

  /**
   * Loads the previously saved value or null if the value does not exist.
   *
   * @return {T}
   */
  load(): T;

  /**
   * Clears the stored value.
   */
  clear(): void;
}

/**
 * Adapts the HTML5 web storage mechanisms (e.g. localStorage and sessionStorage) for use as persistence strategies for authentication data.
 */
class WebStoragePersistenceStrategy implements IPersistenceStrategy<IAccountTokenData> {
  private storage: Storage;
  private key: string;
  private serialize: (tokenData: IAccountTokenData) => string;

  /**
   * @param {Storage} storage Underlying web storage mechanism to use.
   * @param {string} key Key/name to use with web storage mechanism.
   * @param {function} [serializer] Serialization strategy to use when converting token data to a string (defaults to JSON.stringify)
   */
  constructor(storage: Storage, key: string, serializer: (tokenData: IAccountTokenData) => string = JSON.stringify) {
    this.storage = storage;
    this.key = key;
    this.serialize = serializer;
  }

  /** @inheritdoc */
  save(value: IAccountTokenData): void {
    this.storage.setItem(this.key, this.serialize(value));
  }

  /** @inheritdoc */
  load(): IAccountTokenData {
    const json: string = this.storage.getItem(this.key);
    const tokenData: any = json ? JSON.parse(json) : null;

    // HACK: date does not deserialize properly
    if (tokenData) {
      tokenData.expires = new Date(tokenData.expires);
    }

    return <IAccountTokenData>tokenData;
  }

  /** @inheritdoc */
  clear(): void {
    this.storage.removeItem(this.key);
  }
}

/**
 * Defines configuration values for and constructs an instance of the authentication service
 */
export interface IAuthServiceProvider extends angular.IServiceProvider {
  /**
   * URL endpoint at which to authenticate user accounts.
   *
   * @type {string}
   */
  loginUrl: string;

  /**
   * URL endpoint at which to authenticate via the "guest" account.
   * This is meant to support secured API endpoints that also allow anonymous access.
   * If not provided, this endpoint will default to the loginUrl with no username and no password.
   *
   * @type {string}
   */
  loginGuestUrl: string;

  /**
   * Persistence mechanism for storing credentials. May be one of:
   *
   *   - 'local' for window.localStorage web storage (default)
   *   - 'session' for window.sessionStorage web storage
   *   - an object defining 'save', 'load', and 'clear' methods
   *
   * @type {string|IPersistenceStrategy<IAccountTokenData>}
   */
  strategy: string|IPersistenceStrategy<IAccountTokenData>;

  /**
   * storage key to use for web storage strategies
   * only necessary if strategy is set to one of 'local' or 'session'
   *
   * @type {string}
   */
  key: string;
}

export class AuthServiceProvider implements IAuthServiceProvider {
  loginUrl: string;
  loginGuestUrl: string;
  strategy: string|IPersistenceStrategy<IAccountTokenData> = 'local';
  key: string = 'sdaAuthCredentials';

  /** @ngInject */
  $get($injector: any): IAuthService {
    if (!this.loginUrl) {
      throw new Error('no login url provided');
    }

    const strategy = this.getPersistenceStrategy();

    // NOTE: defer $http dependency to prevent cycle with auth interceptor
    return new AuthService($injector, strategy, this.loginUrl, this.loginGuestUrl);
  }

  private getPersistenceStrategy(): IPersistenceStrategy<IAccountTokenData> {
    if (!angular.isString(this.strategy)) {
      return this.strategy;
    }

    if (!this.key) {
      throw new Error('no web storage persistence key provided');
    }

    switch (this.strategy) {
      case 'session':
        return new WebStoragePersistenceStrategy(window.sessionStorage, this.key, angular.toJson);
      case 'local':
        /* falls through */
      default:
        return new WebStoragePersistenceStrategy(window.localStorage, this.key, angular.toJson);
    }
  }
}

/**
 * Responsible for maintaining the state of a currently logged-in account and notifying when that state changes.
 */
export interface IAuthService {
  /**
   * @return {IAccountTokenData} token data for the currently authenticated account (if available)
   */
  getAccountTokenData(): IAccountTokenData;

  /**
   * Logs in the user identified by the specified credentials
   *
   * @param {string} username
   * @param {string} rawPassword
   * @return {Promise.<IAccountTokenData>}
   */
  login(username: string, password: string): angular.IPromise<IAccountTokenData>;

  /**
   * Logs into a guest account
   *
   * @return {Promise.<IAccountTokenData>}
   */
  loginGuest(): angular.IPromise<IAccountTokenData>;

  /**
   * Logs out of the current account
   */
  logout(): void;

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
  onLogin(fn: (creds: IAccountTokenData) => void): () => void;

  /**
   * Adds a subscriber for logout events
   *
   * @param {function} fn
   * @return {funciton} unregistration function
   */
  onLogout(fn: (_: null) => void): () => void;
}

class AuthService implements IAuthService {
  private $injector: any;
  private loginUrl: string;
  private loginGuestUrl: string;

  private loginEmitter: EventEmitter<IAccountTokenData> = new EventEmitter();
  private logoutEmitter: EventEmitter<null> = new EventEmitter();

  private persistenceStrategy: IPersistenceStrategy<IAccountTokenData>;
  private cachedTokenData: IAccountTokenData;

  /**
   * Adapts a login response data vehicle into authentication credentials for use within the authentication framework
   *
   * @param {IAuthResponse} res
   * @return {IAccountTokenData}
   */
  private static adaptAuthResponse(res: IAuthResponse): IAccountTokenData {
    return {
      token: res.access_token,
      expires: new Date(res.expiration),
      accountId: res.uuid
    };
  }

  constructor($injector: any, persistenceStrategy: IPersistenceStrategy<IAccountTokenData>, loginUrl: string, loginGuestUrl?: string) {
    this.$injector = $injector;
    this.persistenceStrategy = persistenceStrategy;
    this.loginUrl = loginUrl;
    this.loginGuestUrl = loginGuestUrl;

    // attempt to load persisted credentials
    const tokenData = this.getAccountTokenData();
    this.setAccountTokenData(tokenData);
  }

  /** @inheritdoc */
  getAccountTokenData(): IAccountTokenData {
    if (!this.cachedTokenData) {
      this.cachedTokenData = this.persistenceStrategy.load();
    }

    return this.cachedTokenData;
  }

  /** @inheritdoc */
  login(username: string, password: string): angular.IPromise<IAccountTokenData> {
    const $http = this.$injector.get('$http');
    const loginP = $http.post(this.loginUrl, {username, password}).then(res => res.data);
    const tokenDataP = loginP.then(AuthService.adaptAuthResponse);

    tokenDataP.then(tokenData => this.setAccountTokenData(tokenData));

    return tokenDataP;
  }

  /** @inheritdoc */
  loginGuest(): angular.IPromise<IAccountTokenData> {
    const $http = this.$injector.get('$http');
    const loginP = $http.post(this.loginGuestUrl || this.loginUrl, {}).then(res => res.data);
    const credsP = loginP.then(AuthService.adaptAuthResponse);

    credsP.then(tokenData => this.setAccountTokenData(tokenData));

    return credsP;
  }

  /** @inheritdoc */
  logout(): void {
    this.persistenceStrategy.clear();
    this.cachedTokenData = null;
    this.logoutEmitter.emit(null);
  }

  /** @inheritdoc */
  isAuthenticated(): boolean {
    const tokenData = this.getAccountTokenData();
    return !!tokenData;
  }

  /** @inheritdoc */
  onLogin(fn: (tokenData: IAccountTokenData) => void): () => void {
    return this.loginEmitter.subscribe(fn);
  }

  /** @inheritdoc */
  onLogout(fn: (_: null) => void): () => void {
    return this.logoutEmitter.subscribe(fn);
  }

  /**
   * Logs out currently authenticated account if necessary, sets new account token data, and triggers login event.
   *
   * @param {IAccountTokenData} tokenData
   */
  private setAccountTokenData(newTokenData: IAccountTokenData): void {
    const oldTokenData = this.getAccountTokenData();

    if (oldTokenData && oldTokenData !== newTokenData) {
      this.logout();
    }

    if (newTokenData) {
      this.cachedTokenData = newTokenData;
      this.persistenceStrategy.save(newTokenData);
      this.loginEmitter.emit(newTokenData);
    }
  }
}
