/**
 * Data structure returned from a see-also query.
 */
interface ISeeAlsoResult extends angular.resource.IResource<ISeeAlsoResult> {
  /**
   * The entry for which related links are to be returned.
   * @type {ILinkTarget}
   */
  root: ILinkTarget;

  /**
   * A map of related links, grouped by the type of related item.
   * @type {Object}
   */
  links: { [type: string]: ILinkTarget[] };
}

/**
 * Data structure representing a successfully-created see-also link.
 */
interface ISeeAlsoLink extends angular.resource.IResource<ISeeAlsoLink> {
  source: ILinkTarget;
  target: ILinkTarget;
}

interface ILinkTarget {
  /**
   * A human-readable display label for the referenced entry.
   * @type {string}
   */
  label: string;

  /**
   * The (locally) unique identifier of the referenced entry.
   * @type {string}
   */
  id: string;

  /**
   * The type of the referenced entry.
   * @type {string}
   */
  type: string;

  /**
   * The (globally) unique token of the referenced entry.
   * @type {string}
   */
  token: string;
}

/**
 * Type Alias for a the see also REST resource.
 */
type ISeeAlsoResource = angular.resource.IResourceClass<ISeeAlsoResult | ISeeAlsoLink>;

/**
 * Angular provider for SeeAlsoRepo.
 */
export class SeeAlsoRepoProvider {
  /**
   * path to the rest endpoint
   * @type {string}
   */
  url: string = '/api/seealso';

  /** @ngInject */
  $get($resource: angular.resource.IResourceService): SeeAlsoRepo {
    const resource = <ISeeAlsoResource>$resource(`${this.url}/:source/:target`);
    return new SeeAlsoRepo(resource);
  }
};

/**
 * Repository for managing "see also" links on tokenized entries.
 */
class SeeAlsoRepo {
  private resource: ISeeAlsoResource;

  constructor(resource: ISeeAlsoResource) {
    this.resource = resource;
  }

  /**
   * Fetches all resources that have been linked to the given source entry.
   * @param {string} source The source entry's token
   * @return {ISeeAlsoResult}
   */
  get(source: string): ISeeAlsoResult {
    return <ISeeAlsoResult>this.resource.get({source});
  }

  /**
   * Associates the given target entry with the given source entry.
   * @param {string} source The source entry's token
   * @param {string} target The target entry's token
   * @return {ISeeAlsoLink}
   */
  create(source: string, target: string): ISeeAlsoLink {
    return <ISeeAlsoLink>this.resource.save({source}, {
      token: target
    });
  }

  /**
   * Unassociates the target (or all targets if no target is supplied) from the given source.
   * @param {string} source The source entry's token
   * @param {string} [target] THe target entry's token
   * @return {angular.IPromise<any>}
   */
  delete(source: string, target?: string): angular.IPromise<any> {
    const result = this.resource.delete({source, target});
    return result.$promise;
  }
}
