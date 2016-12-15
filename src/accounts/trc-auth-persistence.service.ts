import * as angular from 'angular';

import {IAuthCredentials, IAuthService} from './trc-auth.service';

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

class WebStoragePersistenceStrategy implements IPersistenceStrategy<IAuthCredentials> {
  private storage: Storage;
  private key: string;
  private serialize: (creds: IAuthCredentials) => string;

  constructor(storage: Storage, key: string, serializer: (creds: IAuthCredentials) => string = JSON.stringify) {
    this.storage = storage;
    this.key = key;
    this.serialize = serializer;
  }

  /** @inheritdoc */
  save(value: IAuthCredentials): void {
    this.storage.setItem(this.key, this.serialize(value));
  }

  /** @inheritdoc */
  load(): IAuthCredentials {
    const json: string = this.storage.getItem(this.key);
    const creds: any = json ? JSON.parse(json) : null;

    // HACK: date does not deserialize properly
    if (creds) {
      creds.expires = new Date(creds.expires);
    }

    return <IAuthCredentials>creds;
  }

  /** @inheritdoc */
  clear(): void {
    this.storage.removeItem(this.key);
  }
}

export interface IAuthPersistenceProvider extends angular.IServiceProvider {
  /**
   * Persistence mechanism for storing credentials. May be one of:
   *
   *   - 'local' for window.localStorage web storage
   *   - 'session' for window.sessionStorage web storage
   *   - an object defining 'save', 'load', and 'clear' methods
   *
   * @type {string|IPersistenceStrategy<IAuthCredentials>}
   */
  strategy: string|IPersistenceStrategy<IAuthCredentials>;

  /**
   * storage key to use for web storage strategies
   *
   * @type {string}
   */
  key: string;
}

export class AuthPersistenceProvider implements IAuthPersistenceProvider {
  strategy: string|IPersistenceStrategy<IAuthCredentials> = 'local';
  key: string = 'sdaAuthCredentials';

  $get(trcAuth: IAuthService): IAuthPersistence {
    const strategy = this.getPersistenceStrategy();
    return new AuthPersistence(trcAuth, strategy);
  }

  private getPersistenceStrategy(): IPersistenceStrategy<IAuthCredentials> {
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

export interface IAuthPersistence {
  /**
   * Loads existing credentials from persistence if available,
   * listens for login and logout events to update saved credentials, and
   * attempts to log in as a guest if the user is not already authenticated.
   *
   * This should be called early during app startup.
   */
  activate(): void;

  /**
   * Cleans up any opened resources, i.e. listeners.
   */
  destroy(): void;
}

class AuthPersistence implements IAuthPersistence {
  private auth: IAuthService;
  private strategy: IPersistenceStrategy<IAuthCredentials>;

  private unregisterLoginListener: () => void;
  private unregisterLogoutListener: () => void;

  constructor(auth: IAuthService, strategy: IPersistenceStrategy<IAuthCredentials>) {
    this.auth = auth;
    this.strategy = strategy;
  }

  /** @inheritdoc */
  activate(): void {
    // attempt to load saved credentials
    const creds = this.strategy.load();
    this.auth.setCredentials(creds);

    // attach listeners to save changes to credentials
    this.unregisterLoginListener = this.auth.onLogin(creds => this.strategy.save(creds));
    this.unregisterLogoutListener = this.auth.onLogout(() => this.strategy.clear());

    if (!this.auth.isAuthenticated()) {
      this.auth.loginGuest();
    }
  }

  /** @inheritdoc */
  destroy(): void {
    this.unregisterLoginListener();
    this.unregisterLogoutListener();
  }
}
