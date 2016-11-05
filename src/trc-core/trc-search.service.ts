import * as angular from 'angular';

interface ISearchResults extends angular.resource.IResource<ISearchResults> {
}

interface ISearchResource extends angular.resource.IResourceClass<ISearchResults> {
}

export class TrcSearchProvider {
  url: string = '/api/search';

  /** @ngInject */
  $get($resource: angular.resource.IResourceService) {
    const resource = $resource(this.url);
    return new TrcSearch(resource);
  }
}

class TrcSearch {
  resource: ISearchResource;

  constructor(resource: ISearchResource) {
    this.resource = resource;
  }

  /**
   * Performs a search across all entries
   * @param {string} q Search query to execute
   * @return {ISearchResults}
   */
  search(q: string): ISearchResults {
    return this.resource.get({q});
  }
}
