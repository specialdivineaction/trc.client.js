import * as angular from 'angular';

interface ITitle {
  /**
   * One of (typically): short, canonical, bibliographic.
   * @type {string}
   */
  type: string;

  /**
   * Language
   * @type {string}
   */
  lg: string;

  title: string;
  subtitle: string;
}

interface IAuthorReference {
  authorId: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface IDateDescription {
  /**
   * ISO 8601 local (YYYY-MM-DD) representation of this date
   * @type {string}
   */
  calendar: string;

  /**
   * A human-readable description of this date.
   * @type {string}
   */
  description: string;
}

interface IPublicationInfo {
  publisher: string;
  place: string;
  date: IDateDescription;
}

interface IEntryReference {
  id: string;
  type: string;
  token: string;
}

interface IWorkSearchResultSet extends angular.resource.IResource<IWorkSearchResultSet> {
  items: IWorkSearchResult[];
  qs: string;
  qsNext?: string;
  qsPrev?: string;
}

interface IWork extends angular.resource.IResource<IWork>  {
  id: string;
  ref: IEntryReference;
  authors: IAuthorReference[];
  titles: ITitle[];
  series: string;
  summary: string;
  editions: IEdition[];
  defaultCopyId: string;
  copies: IDigitalCopy[];

  $update(params?: any): angular.IPromise<IWork>;
}

interface IWorkSearchResult {
  id: string;
  ref: IEntryReference;
  authors: IAuthorReference;
  title: string;
  label: string;
  summary: string;
  pubYear: string;
}

interface IEdition extends angular.resource.IResource<IEdition> {
  id: string;
  editionName: string;
  publicationInfo: IPublicationInfo;
  authors: IAuthorReference[];
  titles: ITitle[];
  summary: string;
  series: string;
  volumes: IVolume[];
  defaultCopyId: string;
  copies: IDigitalCopy[];

  $update(params?: any): angular.IPromise<IEdition>;
}

interface IVolume extends angular.resource.IResource<IVolume> {
  id: string;
  volumeNumber: string;
  publicationInfo: IPublicationInfo;
  authors: IAuthorReference[];
  titles: ITitle[];
  summary: string;
  series: string;
  defaultCopyId: string;
  copies: IDigitalCopy[];

  $update(params?: any): angular.IPromise<IVolume>;
}

interface IDigitalCopy extends angular.resource.IResource<IDigitalCopy> {
  id: string;
  type: string;
  properties: { [prop: string]: string };
  title: string;
  summary: string;
  rights: string;

  $update(params?: any): angular.IPromise<IDigitalCopy>;
}

interface IWorkResource extends angular.resource.IResourceClass<IWork | IWorkSearchResultSet> {
  update(params: any, work: IWork): IWork;
}

interface IEditionResource extends angular.resource.IResourceClass<IEdition> {
  update(params: any, edition: IEdition): IEdition;
}

interface IVolumeResource extends angular.resource.IResourceClass<IVolume> {
  update(params: any, volume: IVolume): IVolume;
}

interface IDigitalCopyResource extends angular.resource.IResourceClass<IDigitalCopy> {
  update(params: any, digitalCopy: IDigitalCopy): IDigitalCopy;
}

interface IBiblioResources {
  work: IWorkResource;
  workCopy: IDigitalCopyResource;
  edition: IEditionResource;
  editionCopy: IDigitalCopyResource;
  volume: IVolumeResource;
  volumeCopy: IDigitalCopyResource;
}

interface IBibentryLabelFields {
  author?: string;
  pubdate?: string;
  title: string;
  edition?: string;
  volume?: string;
}

export class WorksRepoProvider {
  url: string = '/api/works';

  /** @ngInject */
  $get($resource: angular.resource.IResourceService) {
    const work = <IWorkResource> $resource(`${this.url}/:workId`, { workId: '@id' }, {
      update: {
        method: 'PUT'
      }
    });

    const workCopy = <IDigitalCopyResource> $resource(`${this.url}/:workId/copies/:copyId`, { copyId: '@id' }, {
      update: {
        method: 'PUT'
      }
    });

    const edition = <IEditionResource> $resource(`${this.url}/:workId/editions/:editionId`, { editionId: '@id' }, {
      update: {
        method: 'PUT'
      }
    });

    const editionCopy = <IDigitalCopyResource> $resource(`${this.url}/:workId/editions/:editionId/copies/:copyId`, { copyId: '@id' }, {
      update: {
        method: 'PUT'
      }
    });

    const volume = <IVolumeResource> $resource(`${this.url}/:workId/editions/:editionId/volumes/:volumeId`, { volumeId: '@id' }, {
      update: {
        method: 'PUT'
      }
    });

    const volumeCopy = <IDigitalCopyResource> $resource(`${this.url}/:workId/editions/:editionId/volumes/:volumeId/copies/:copyId`, { copyId: '@id' }, {
      update: {
        method: 'PUT'
      }
    });

    const resources: IBiblioResources = {work, workCopy, edition, editionCopy, volume, volumeCopy};
    return new WorkRepository(this, resources);
  }
}

class WorkRepository {
  private provider: WorksRepoProvider;
  private resources: IBiblioResources;

  constructor(provider: WorksRepoProvider, resources: IBiblioResources) {
    this.provider = provider;
    this.resources = resources;
  }

  /**
   * Constructs a URL from which a bibliography for the identified work can be loaded.
   * @return {string}
   */
  getReferencesEndpoint(id: string): string {
    return `${this.provider.url}/${id}/references`;
  }

  /**
   * Search for works by query.
   * @param {string} query
   * @return {IWorkSearchResultSet}
   */
  search(query: string): IWorkSearchResultSet {
    return <IWorkSearchResultSet> this.resources.work.get({ q: query, max: 50 });
  }

  /**
   * Search for works by author id.
   * @param {string} authorId
   * @return {IWorkSearchResultSet}
   */
  searchByAuthor(authorId: string): IWorkSearchResultSet {
    return <IWorkSearchResultSet> this.resources.work.get({ aid: authorId, max: 50 });
  }

  /**
   * Retrieves a work object by identifier.
   * @param {string} workId
   * @return {IWork}
   */
  getWork(workId: string): IWork {
    return <IWork> this.resources.work.get({workId});
  }

  /**
   * Retrieves an edition object by identifier.
   * @param {string} workId
   * @param {string} editionId
   * @return {IEdition}
   */
  getEdition(workId: string, editionId: string): IEdition {
    return this.resources.edition.get({workId, editionId});
  }

  /**
   * Retrieves a volume object by identifier.
   * @param {string} workId
   * @param {string} editionId
   * @param {string} volumeId
   * @return {IVolume}
   */
  getVolume(workId: string, editionId: string, volumeId: string): IVolume {
    return this.resources.volume.get({workId, editionId, volumeId});
  }

  /**
   * Retrieves a digital copy object by identifier
   * @param {string} copyId
   * @param {string} workId
   * @param {string} [editionId]
   * @param {string} [volumeId]
   * @return {IDigitalCopy}
   */
  getDigitalCopy(copyId: string, workId: string, editionId?: string, volumeId?: string): IDigitalCopy {
    if (workId && editionId && volumeId) {
      return this.resources.volumeCopy.get({copyId, workId, editionId, volumeId});
    } else if (workId && editionId) {
      return this.resources.editionCopy.get({copyId, workId, editionId});
    } else if (workId) {
      return this.resources.workCopy.get({copyId, workId});
    } else {
      throw new Error('Expected work ID and optionally edition and volume ID options, but found none');
    }
  }

  /**
   * Creates a new work instance with empty title and author
   * @return {IWork} [description]
   */
  createWork(): IWork {
    const work = <IWork> new this.resources.work();
    work.authors = [this.createAuthorReference()];
    work.titles = [this.createTitle()];
    work.editions = [];
    work.copies = [];
    return work;
  }

  /**
   * Creates a new empty edition instance
   * @type {IEdition}
   */
  createEdition(): IEdition {
    const edition = new this.resources.edition();
    edition.authors = [];
    edition.titles = [];
    edition.volumes = [];
    edition.copies = [];
    return edition;
  }

  /**
   * Creates a new empty volume instance
   * @type {IEdition}
   */
  createVolume(): IVolume {
    const volume = new this.resources.volume();
    volume.authors = [];
    volume.titles = [];
    volume.copies = [];
    return volume;
  }

  /**
   * Creates a new empty title instance
   * @return {ITitle}
   */
  createTitle(): ITitle {
    return {
      title: null,
      subtitle: null,
      lg: null,
      type: null
    };
  }

  /**
   * Creates a new empty author reference instance
   * @return {IAuthorReference}
   */
  createAuthorReference(): IAuthorReference {
    return {
      authorId: null,
      firstName: null,
      lastName: null,
      role: null
    };
  }

  /**
   * Saves a new or existing work instance back to the server
   * @param {IWork} work
   * @return {angular.IPromise<IWork>}
   */
  saveWork(work: IWork): angular.IPromise<IWork> {
    if (!(work instanceof this.resources.work)) {
      throw new Error('work was not created by this repo');
    }

    return work.id ? work.$update() : work.$save();
  }

  /**
   * Saves a new or existing edition instance back to the server
   * @param {IEdition} edition
   * @return {angular.IPromise<IEdition>}
   */
  saveEdition(workId: string, edition: IEdition): angular.IPromise<IEdition> {
    if (!workId) {
      throw new Error('no work id provided');
    }

    if (!(edition instanceof this.resources.edition)) {
      throw new Error('edition was not created by this repo');
    }

    return edition.id ? edition.$update({workId}) : edition.$save({workId});
  }

  /**
   * Saves a new or existing volume instance back to the server
   * @param {IVolume} volume
   * @return {angular.IPromise<IVolume>}
   */
  saveVolume(workId: string, editionId: string, volume: IVolume): angular.IPromise<IVolume> {
    if (!workId) {
      throw new Error('no work id provided');
    }

    if (!editionId) {
      throw new Error('no edition id provided');
    }

    if (!(volume instanceof this.resources.volume)) {
      throw new Error('volume was not created by this repo');
    }

    return volume.id ? volume.$update({workId, editionId}) : volume.$save({workId, editionId});
  }

  /**
   * Deletes a work from the server
   * @param {string} workId
   * @return {angular.IPromise<any>}
   */
  delete(workId: string): angular.IPromise<any> {
    const result = <angular.resource.IResource<any>> this.resources.work.delete({workId});
    return result.$promise;
  }

  /**
   * Retrieves the first available title of the given type or null if no title can be found.
   * If multiple types are given, returns the title corresponding to the first type for which a title is found.
   *
   * @param {ITitle[]} titles
   * @param {string[]} types
   * @return {ITitle}
   */
  getTitle(titles: ITitle[], types: string|string[] = ['short', 'canonical', 'bibliographic']): ITitle {
    if (!angular.isArray(types)) {
      types = [types];
    }

    for (let type of types) {
      for (let title of titles) {
        if (title.type === type) {
          return title;
        }
      }
    }

    return null;
  }

  /**
   * Generates an HTML label for the given work.
   * @param {IWork} work
   * @return {string}
   */
  getWorkLabel(work: IWork): string {
    const titleObj = this.getTitle(work.titles, ['short', 'canonical']);
    const title = this.getFullTitle(titleObj);

    const authorObj = work.authors.length > 0 ? work.authors[0] : null;
    const author = authorObj ? (trimToNull(authorObj.lastName) || trimToNull(authorObj.firstName)) : null;

    const pubDates = work.editions
      .map(e => e.publicationInfo).filter(p => p)
      .map(p => p.date).filter(d => d)
      .map(d => d.calendar).filter(c => c)
      .map(c => new Date(c)).filter(d => !isNaN(d.getTime()))
      .sort();
    const pubdate = (pubDates.length > 0) ? pubDates[0].getFullYear().toString() : null;

    return makeBibentryLabel({ author, pubdate, title });
  }

  /**
   * Generates an HTML label for the given edition.
   * @param {IEdition} edition
   * @return {string}
   */
  getEditionLabel(edition: IEdition): string {
    const titleObj = this.getTitle(edition.titles, ['short', 'canonical']);
    const title = this.getFullTitle(titleObj);

    const authorObj = edition.authors.length > 0 ? edition.authors[0] : null;
    const author = authorObj ? (trimToNull(authorObj.lastName) || trimToNull(authorObj.firstName)) : null;

    const calendarDate = edition.publicationInfo && edition.publicationInfo.date && edition.publicationInfo.date.calendar;
    const pubdateObj = calendarDate ? new Date(calendarDate) : null;
    let pubdate = (pubdateObj && !isNaN(pubdateObj.getTime())) ? pubdateObj.getFullYear().toString() : null;

    if (!pubdate) {
      const pubDates = edition.volumes
        .map(e => e.publicationInfo).filter(p => p)
        .map(p => p.date).filter(d => d)
        .map(d => d.calendar).filter(c => c)
        .map(c => new Date(c)).filter(d => !isNaN(d.getTime()))
        .sort();
      pubdate = (pubDates.length > 0) ? pubDates[0].getFullYear().toString() : null;
    }

    return makeBibentryLabel({ author, pubdate, title, edition: edition.editionName });
  }

  /**
   * Generates an HTML label for the given volume.
   * @param {IVolume} volume
   * @param {string} edition
   * @return {string}
   */
  getVolumeLabel(volume: IVolume, edition: string): string {
    const titleObj = this.getTitle(volume.titles, ['short', 'canonical']);
    const title = this.getFullTitle(titleObj);

    const authorObj = volume.authors.length > 0 ? volume.authors[0] : null;
    const author = authorObj ? (trimToNull(authorObj.lastName) || trimToNull(authorObj.firstName)) : null;

    const calendarDate = volume.publicationInfo && volume.publicationInfo.date && volume.publicationInfo.date.calendar;
    const pubdateObj = calendarDate ? new Date(calendarDate) : null;
    let pubdate = (pubdateObj && !isNaN(pubdateObj.getTime())) ? pubdateObj.getFullYear().toString() : null;

    return makeBibentryLabel({ author, pubdate, title, edition, volume: volume.volumeNumber });
  }

  getFullTitle(title: ITitle): string {
    return title ? (title.title + ((title.subtitle && title.subtitle.trim().length > 0) ? `: ${title.subtitle}` : '')) : null;
  }
}

/**
 * Returns the trimmed string or null if the string is falsey or empty after trimming
 * @param {string} value
 * @return {string}
 */
function trimToNull(value: string): string {
  return (!value || value.trim().length === 0) ? null : value.trim();
}

/**
 * Assembles an HTML label from the given fields
 * @param {IBibentryLabelFields} fields
 * @return {string}
 */
function makeBibentryLabel(fields: IBibentryLabelFields): string {
  let label = '';

  if (fields.author) {
    label += `<span class="bibentry-author">${fields.author}</span>` + (fields.pubdate ? ' ' : ', ');
  }

  if (fields.pubdate) {
    label += `<span class="bibentry-pubdate">(${fields.pubdate})</span>: `;
  }

  label += `<span class="bibentry-title">${fields.title}</span>`;

  if (fields.edition) {
    label += `. <span class="bibentry-edition">${fields.edition}</span>`;
  }

  if (fields.volume) {
    label += `. <span class="bibentry-volume">Volume ${fields.volume}</span>`;
  }

  return `<span class="bibentry-label">${label}</span>`;
}
