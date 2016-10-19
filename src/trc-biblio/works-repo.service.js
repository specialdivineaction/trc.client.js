var angular = require('angular');

module.exports = worksRepoProvider;

/**
 * This functionality is already being implemented as a standalone trc-biblio module. The code is
 * used here as an interim until the Bower build/dependency workflow has been finalized.
 *
 * @return {angular.provider}
 */
function worksRepoProvider() {
  var provider = {};
  provider.url = '/api/works';
  provider.$get = worksRepoFactory;
  return provider;

  /** @ngInject */
  function worksRepoFactory($resource, _) {
    var restResource = $resource(provider.url + '/:workId', { workId: '@id' }, {
      update: {
        method: 'PUT'
      }
    });

    var workCopyResource = $resource(provider.url + '/:workId/copies/:copyId', { copyId: '@id' }, {
      update: {
        method: 'PUT'
      }
    });

    var editionResource = $resource(provider.url + '/:workId/editions/:editionId', { editionId: '@id' }, {
      update: {
        method: 'PUT'
      }
    });

    var editionCopyResource = $resource(provider.url + '/:workId/editions/:editionId/copies/:copyId', { copyId: '@id' }, {
      update: {
        method: 'PUT'
      }
    });

    var volumeResource = $resource(provider.url + '/:workId/editions/:editionId/volumes/:volumeId', { volumeId: '@id' }, {
      update: {
        method: 'PUT'
      }
    });

    var volumeCopyResource = $resource(provider.url + '/:workId/editions/:editionId/volumes/:volumeId/copies/:copyId', { copyId: '@id' }, {
      update: {
        method: 'PUT'
      }
    });

    var repo = {};
    repo.getReferencesEndpoint = getReferencesEndpoint;
    repo.getAll = findAll;
    repo.search = search;
    repo.searchByAuthor = searchByAuthor;
    repo.get = getWork;
    repo.getWork = getWork;
    repo.getEdition = getEdition;
    repo.getVolume = getVolume;
    repo.getDigitalCopy = getDigitalCopy;
    repo.create = createWork;
    repo.createWork = createWork;
    repo.createEdition = createEdition;
    repo.createVolume = createVolume;
    repo.save = save;
    repo.saveWork = saveWork;
    repo.saveEdition = saveEdition;
    repo.saveVolume = saveVolume;
    repo.delete = deleteWork;
    repo.getTitle = getTitleByTypePreference;
    return repo;

    /**
     * Constructs a URL from which a bibliography for this work can be loaded.
     *
     * @return {string}
     */
    function getReferencesEndpoint(id) {
      return provider.url + '/' + id + '/references';
    }

    /**
     * Retrieves a listing of all works
     *
     * @return {WorkProxy[]}
     */
    function findAll() {
      return search('');
    }

    /**
     * Search for works by query
     *
     * @return {SearchResultSet}
     */
    function search(query) {
      return restResource.get({ q: query, max: 50 });
    }

    /**
     * Search for works by author
     *
     * @return {SearchResultSet}
     */
    function searchByAuthor(authorId) {
      return restResource.get({ aid: authorId, max: 50 });
    }

    /**
     * Retrieves a work object by identifier.
     *
     * A proxy object will be returned immediately, and its properties will be populated after the
     * request succeds. If fine-grained asynchronous handling, etc. is required, the request's
     * promis is available on Work.$promise.
     *
     * @param {string} workId
     * @return {Work}
     */
    function getWork(workId) {
      if (angular.isUndefined(workId)) {
        throw new TypeError('Invalid ID provided to getWork');
      }

      var work = restResource.get({ workId: workId });

      work.$promise.then(adaptWork);

      return work;
    }

    /**
     * Retrieves an edition object by identifier.
     *
     * A proxy object will be returned immediately, and its properties will be populated after the
     * request succeds. If fine-grained asynchronous handling, etc. is required, the request's
     * promis is available on Edition.$promise.
     *
     * @param {string} workId
     * @param {string} editionId
     * @return {Edition}
     */
    function getEdition(workId, editionId) {
      if (angular.isUndefined(workId) || angular.isUndefined(editionId)) {
        throw new TypeError('Invalid IDs provided to getEdition');
      }

      var edition = editionResource.get({ workId: workId, editionId: editionId });

      edition.$promise.then(adaptEdition);

      return edition;
    }

    /**
     * Retrieves a volume object by identifier.
     *
     * A proxy object will be returned immediately, and its properties will be populated after the
     * request succeds. If fine-grained asynchronous handling, etc. is required, the request's
     * promis is available on Volume.$promise.
     *
     * @param {string} workId
     * @param {string} editionId
     * @param {string} volumeId
     * @return {Volume}
     */
    function getVolume(workId, editionId, volumeId) {
      if (angular.isUndefined(workId) || angular.isUndefined(editionId) || angular.isUndefined(volumeId)) {
        throw new TypeError('Invalid IDs provided to getVolume');
      }

      var volume = volumeResource.get({ workId: workId, editionId: editionId, volumeId: volumeId });

      volume.$promise.then(adaptVolume);

      return volume;
    }

    /**
     * Retrieves a digital copy object for the identified work/edition/volume
     *
     * A proxy object will be returned immediately, and its properties will be populated after the
     * request succeds. If fine-grained asynchronous handling, etc. is required, the request's
     * promis is available on DigitalCopy.$promise.
     *
     * @param {string} copyId
     * @param {string} workId
     * @param {string} [editionId]
     * @param {string} [volumeId]
     * @return {DigitalCopy}
     */
    function getDigitalCopy(copyId, workId, editionId, volumeId) {
      var resource;

      if (workId && editionId && volumeId) {
        resource = volumeCopyResource;
      } else if (workId && editionId) {
        resource = editionCopyResource;
      } else if (workId) {
        resource = workCopyResource;
      } else {
        throw new Error('Expected work ID and optionally edition and volume ID options, but found none');
      }

      var options = {
        copyId: copyId,
        workId: workId
      }

      if (editionId) {
        options.editionId = editionId;
      }

      if (volumeId) {
        options.volumeId = volumeId;
      }

      return resource.get(options);
    }

    /**
     * Creates a new work instance
     *
     * @return {Work}
     */
    function createWork() {
      var work = new restResource();
      adaptWork(work);
      work.titles.push({});
      work.authors.push({});
      return work;
    }

    /**
     * Creates a new edition instance
     *
     * @return {Edition}
     */
    function createEdition() {
      var edition = new editionResource();
      return adaptEdition(edition);
    }

    /**
     * Creates a new volume instance
     *
     * @return {Volume}
     */
    function createVolume() {
      var volume = new volumeResource();
      return adaptVolume(volume);
    }

    /**
     * Dispatch method for saving works, editions, and volumes
     *
     * @deprecated use saveWork, saveEdition, or saveVolume directly
     * @return {Promise}
     */
    function save() {
      switch (arguments.length) {
        case 1: return saveWork.apply(null, arguments);
        case 2: return saveEdition.apply(null, arguments);
        case 3: return saveVolume.apply(null, arguments);
      }
      throw new TypeError('Unexpected arguments to worksRepo#save');
    }

    /**
     * Saves a work instance back to the server
     *
     * @param {Work} work
     * @return {Promise.<Work>}
     */
    function saveWork(work) {
      if (!(work instanceof restResource)) {
        throw new Error('work was not created by this repo');
      }

      // ngResource automatically updates the model to reflect any server changes (e.g. setting IDs for the work/edtions/volumes/copies).
      return work.id
        ? work.$update()
        : work.$save();
    }

    /**
     * Saves an edition instance back to the server
     *
     * @param  {string} workId
     * @param  {Edition} edition
     * @return {Promise.<Edition>}
     */
    function saveEdition(workId, edition) {
      if (!workId) {
        throw new Error('no work id provided');
      }

      if (!(edition instanceof editionResource)) {
        throw new Error('edition was not created by this repo');
      }

      return edition.id
        ? edition.$update({ workId: workId })
        : edition.$save({ workId: workId });
    }

    /**
     * Saves a volume instance back to the server
     *
     * @param  {string} workId
     * @param  {string} editionId
     * @param  {Volume} volume
     * @return {Promise.<Volume>}
     */
    function saveVolume(workId, editionId, volume) {
      if (!workId) {
        throw new Error('no work id provided');
      }

      if (!editionId) {
        throw new Error('no edition id provided');
      }

      if (!(volume instanceof volumeResource)) {
        throw new Error('volume was not created by this repo');
      }

      return volume.id
        ? volume.$update({ workId: workId, editionId: editionId })
        : volume.$save({ workId: workId, editionId: editionId });
    }

    /**
     * Deletes a work instance from the server
     *
     * @param  {Work|string} id
     */
    function deleteWork(workId) {
      if (angular.isObject(workId) && workId.id) {
        workId = workId.id;
      }

      var dataItem = restResource.delete({ workId: workId });
      return dataItem.$promise;
    }

    /**
     * Ensure that aggregate fields common to all work/edition/volume entities exist and are formatted correctly
     *
     * @param  {Work|Edition|Volume} entity
     * @return {Work|Edition|Volume}
     */
    function adaptCommon(entity) {
      if (!entity.titles) {
        entity.titles = [];
      } else {
        entity.titles.forEach(function (title) {
          title.type = angular.isString(title.type) ? title.type.toLowerCase() : title.type;
        });
      }

      if (!entity.authors) {
        entity.authors = [];
      } else {
        entity.authors.forEach(function (author) {
          author.role = angular.isString(author.role) ? author.role.toLowerCase() : author.role;
        });
      }

      if (!entity.copies) {
        entity.copies = [];
      }

      return entity;
    }

    /**
     * Ensure that work aggregate fields exist and are formatted correctly
     *
     * @param  {Work} work
     * @return {Work}
     */
    function adaptWork(work) {
      adaptCommon(work);

      if (!work.editions) {
        work.editions = [];
      } else {
        work.editions.forEach(adaptEdition);
      }

      return work;
    }

    /**
     * Ensure that edition aggregate fields exist and are formatted correctly
     *
     * @param  {Edition} edition
     * @return {Edition}
     */
    function adaptEdition(edition) {
      adaptCommon(edition);

      if (!edition.volumes) {
        edition.volumes = [];
      } else {
        edition.volumes.forEach(adaptVolume);
      }

      return edition;
    }

    /**
     * Ensure that volume aggregate fields exist and are formatted correctly
     *
     * @param  {Volume} volume
     * @return {Volume}
     */
    function adaptVolume(volume) {
      adaptCommon(volume);

      return volume;
    }

    /**
     * Retrieves the first available title of the given type or falsey if no title can be found.
     * If multiple types are given, returns the title corresponding to the first type for which a title is found.
     *
     * @param  {Title[]}         titles
     * @param  {string|string[]} types
     * @return {Title}
     */
    function getTitleByTypePreference(titles, types) {
      if (angular.isUndefined(types)) {
        types = ['short', 'canonical', 'bibliographic'];
      } else if (!angular.isArray(types)) {
        types = [types];
      }

      return types.reduce(function (found, type) {
        return found || _.find(titles, { type: type });
      }, null);
    }
  }
}
