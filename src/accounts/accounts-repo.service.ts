import * as angular from 'angular';

export interface IAccount extends angular.resource.IResource<IAccount> {
  id: string;
  // TODO: document other account properties

  $update(params?: any): angular.IPromise<IAccount>;
}

interface IAccountResource extends angular.resource.IResourceClass<IAccount> {
  update(params: any, work: IAccount): IAccount;
}

/**
 * Accounts Repository Provider
 *
 * Configures and constructs accounts repository service instance.
 */
export interface IAccountsRepositoryProvider extends angular.IServiceProvider {
  url: string;
}

/**
 * Accounts Repository Provider implementation
 */
export class AccountsRepositoryProvider implements IAccountsRepositoryProvider {
  url: string;

  /** @ngInject */
  $get($resource: angular.resource.IResourceService): IAccountsRepository {
    const accountsResource = <IAccountResource>$resource(`${this.url}/:id`, { id: '@id' }, {
      update: {
        method: 'PUT'
      }
    });

    return new AccountsRepository(accountsResource);
  }
}

/**
 * Accounts Repository
 *
 * Responsible for managing persistence and retrieval of account data.
 */
export interface IAccountsRepository {
  /**
   * Creates a new empty account instance
   *
   * @return {IAccount}
   */
  create(): IAccount;

  /**
   * Searches for accounts matching the given query
   *
   *
   * @param {string} query
   * @return {IAccount[]}
   */
  search(query: string): IAccount[];

  /**
   * Retrieves an account by its id
   *
   * @param {string} id
   * @return {IAccount}
   */
  get(id: string): IAccount;

  /**
   * Saves the given account for later retrieval
   *
   * @param {IAccount} account
   * @return {Promise.<IAccount>}
   */
  save(account: IAccount): angular.IPromise<IAccount>;

  /**
   * Removes the given account from persistence
   *
   * @param {string} id
   * @return {Promise.<*>}
   */
  delete(id: string): angular.IPromise<any>;
}

/**
 * Accounts Repository implementation
 */
class AccountsRepository implements IAccountsRepository {
  private accountsResource: IAccountResource;

  constructor(accountsResource: IAccountResource) {
    this.accountsResource = accountsResource;
  }

  /** @inheritdoc */
  create(): IAccount {
    return new this.accountsResource();
  }

  /** @inheritdoc */
  search(query: string): IAccount[] {
    return this.accountsResource.query({ q: query });
  }

  /** @inheritdoc */
  get(id: string): IAccount {
    return this.accountsResource.get({id});
  }

  /** @inheritdoc */
  save(account: IAccount): angular.IPromise<IAccount> {
    if (!(account instanceof this.accountsResource)) {
      throw new Error('account was not created by this repository');
    }

    return account.id ? account.$update() : account.$save();
  }

  /** @inheritdoc */
  delete(id: string): angular.IPromise<any> {
    const res = this.accountsResource.delete({id});
    return res.$promise;
  }
}
