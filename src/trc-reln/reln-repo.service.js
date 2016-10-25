var angular = require('angular');

// NOTE: this entire API model *WILL* eventually change

/**
 * @typedef Relationship
 * @type {object}
 * @property {string}     id                  - A unique identifier for this relationship
 * @property {string}     typeId              - The ID of the RelationshipType of this relationship
 * @property {string}     description         - A detailed description of this relationship
 * @property {string}     descriptionMimeType - MIME type string of the description
 * @property {Provenance} provenance          - Metadata about the relationship record
 * @property {Anchor[]}   relatedEntities     - A set of "source" anchors
 * @property {Anchor[]}   targetEntities      - A set of "target" anchors
 */

/**
 * @typedef RelationshipType
 * @type {object}
 * @property {string}  identifier   - A unique identifier for this type
 * @property {string}  title        - A label to display for this type
 * @property {string}  reverseTitle - If this type is directed, the label to display for reverse relationships
 * @property {string}  description  - A more detailed description of this type
 * @property {boolean} isDirected   - Whether this type is directed (true) or undirected (false)
 */

/**
 * @typedef Provenance
 * @type {object}
 * @property {string[]} creatorUris  - URIs to people/authors of this relationship
 * @property {string}   dateCreated  - an ISO 8601 date representation of when the record was created
 * @property {string}   dateModified - an ISO 8601 date representation of when the record was last modified
 */

/**
 * @typedef Anchor
 * @type {object}
 * @property {string[]} entryUris[] - URIs to work/edition/volume
 */

/**
 * @typedef TypeGroup
 * @type {object}
 * @property {string}                   label         - Potentially directed display label for group
 * @property {RelationshipType}         type          - The type corresponding to this group
 * @property {boolean}                  reverse       - For directed types, pecifies the directionality of relationships in this group
 * @property {NormalizedRelationship[]} relationships - Relationships of the same type and direction
 */

/**
 * @typedef NormalizedRelationship
 * @type {object}
 * @property {string}                           id          - The id of the original relationship
 * @property {string}                           typeId      - The relationship's type id
 * @property {boolean}                          reverse     - Whether this relationship is in the reverse type direction
 * @property {string}                           description - A description of this relationship
 * @property {Entity[]}                         entities    - A set of target entities referenced by this relationship
 * @property {Promise.<NormalizedRelationship>} $promise    - Resolves to the normalized promise when all asynchronous data has been set
 */

/**
 * @typedef Entity
 * @type {object}
 * @property {string}              label               - A display label for the entity
 * @property {string}              type                - One of 'work', 'edition', or 'volume'
 * @property {object}              refParams           - Reference parameters for resolving the entity
 * @property {string}              refParams.workId    - The entity's work id
 * @property {string}              refParams.editionId - If an edition or volume, the entity's edition id
 * @property {string}              refParams.volumeId  - If a volume, the entity's volume id
 * @property {Work|Edition|Volume} entity              - The entity itself
 * @property {Promise.<Entity>}    $promise            - Resolves to the entity when all asynchronous data has been set
 */

var ENTITY_URI = /^works\/([^\/]+)(?:\/editions\/([^\/]+)(?:\/volumes\/([^\/]+))?)?$/i;

module.exports = relnRepoProvider;

function relnRepoProvider() {
  var provider = {};
  provider.url = '/api/relationships';
  provider.$get = relnRepoFactory;
  return provider;

  /** @ngInject */
  function relnRepoFactory($q, $resource) {
    var typeResource = $resource(provider.url + '/types/:id', { id: '@identifier' });
    var relnResource = $resource(provider.url + '/:id', { id: '@id' }, {
      update: { method: 'PUT' }
    });

    var typesCache = null;

    var repo = {};
    repo.getTypes = getTypes;
    repo.getType = getType;
    repo.createRelationship = createRelationship;
    repo.createProvenance = createProvenance;
    repo.createAnchor = createAnchor;
    repo.get = findById;
    repo.search = search;
    repo.save = saveRelationship;
    repo.delete = deleteRelationship;
    repo.normalizeRelationships = normalizeRelationships;
    return repo;

    /**
     * Fetches relationship types from the server, caching them in the process.
     * The returned array will be populated when the request resolves.
     * The underlying promise is available on the $promise property.
     *
     * @param  {object} options
     * @param  {boolean} options.force Discard cache (if set) and refetch
     * @return {object.<string,RelationshipType>}
     */
    function getTypes(options) {
      options = options || {};

      if (!typesCache || options.force) {
        var types = typeResource.query();

        typesCache = {};

        var tcPromise = types.$promise.then(function () {
          types.forEach(function (type) {
            typesCache[type.identifier] = type;
          });
          return typesCache;
        });

        // add $promise as a non-enumerable property
        Object.defineProperty(typesCache, '$promise', {
          value: tcPromise
        });
      }

      return typesCache;
    }

    /**
     * Fetches a type by ID
     *
     * @param  {string} id
     * @return {Promise.<RelationshipType>}
     */
    function getType(id) {
      var types = getTypes();

      return types.$promise.then(function (types) {
        return types[id];
      });
    }

    /**
     * Creates a new empty relationship instance
     *
     * @return {Relationship}
     */
    function createRelationship() {
      var reln = new relnResource();
      return adaptRelationship(reln);
    }

    /**
     * Creates a new empty provenance model
     *
     * @return {Provenance}
     */
    function createProvenance() {
      var provenance = {};
      return adaptProvenance(provenance);
    }

    /**
     * Creates a new empty anchor model
     *
     * @return {Anchor}
     */
    function createAnchor() {
      var anchor = {};
      return adaptAnchor(anchor);
    }

    /**
     * Retrieves a relationship from the server by ID.
     * The returned model will be populated once the request succeeds.
     * The underlying promise can be accessed via the $promise property.
     *
     * @param  {string} id
     * @return {Relationship}
     */
    function findById(id) {
      return relnResource.get({ id: id });
    }

    /**
     * Find all relationships matching the given criteria.
     * @param  {object|string} options
     * @property {string} options.uri (default if options is a string)
     * @property {string} options.typeId
     * @property {string} options.direction "from" (out-relationships), "to" (in-relationships), or "any"
     * @property {integer} options.start
     * @property {integer} options.max
     * @return {Relationship[]}
     */
    function search(options) {
      if (!options) {
        throw new Error('no options provided')
      }

      if (angular.isString(options)) {
        // treat single string as an entity URL
        options = { uri: options };
      }

      var queryOpts = {};

      if (options.uri) {
        queryOpts.entity = options.uri;
      }

      if (options.typeId) {
        queryOpts.type = options.typeId;
      }

      if (options.direction) {
        queryOpts.direction = options.direction;
      }

      if (options.start) {
        queryOpts.off = options.start;
      }

      if (options.max) {
        queryOpts.max = options.max;
      }

      return relnResource.query(queryOpts);
    }

    /**
     * Saves a relationship back to the server.
     *
     * @param  {Relationship} reln
     * @return {Promise} resolves on successful save
     */
    function saveRelationship(reln) {
      if (!(reln instanceof relnResource)) {
        throw new Error('Relationship was not created by this repo');
      }

      return reln.id
        ? reln.$update()
        : reln.$save();
    }

    /**
     * Deletes a relationship from the server via the REST API.
     *
     * @param  {string} id
     * @return {Promise} resolves on success
     */
    function deleteRelationship(id) {
      var response = relnResource.delete({ id: id });
      return response.$promise
    }

    /**
     * Ensures aggregate fields on a relationship are set appropriately
     *
     * @param  {Relationship} reln
     * @return {Relationship}
     */
    function adaptRelationship(reln) {
      if (!reln.provenance) {
        reln.provenance = createProvenance();
      }

      if (!reln.relatedEntities) {
        reln.relatedEntities = [];
      }

      if (!reln.targetEntities) {
        reln.targetEntities = [];
      }

      return reln;
    }

    /**
     * Ensures aggregate fields on a provenance model are set appropriately
     *
     * @param  {Provenance} provenance
     * @return {Provenance}
     */
    function adaptProvenance(provenance) {
      if (!provenance.creatorUris) {
        provenance.creatorUris = [];
      }

      return provenance;
    }

    /**
     * Ensures aggregate fields on an anchor model are set appropriately
     *
     * @param  {Anchor} anchor
     * @return {Anchor}
     */
    function adaptAnchor(anchor) {
      if (!anchor.entryUris) {
        anchor.entryUris = [];
      }

      return anchor;
    }

    /**
     * Normalizes relationships into type groups that are more suitable for display in the UI
     *
     * @param  {Relationship[]} relationships
     * @return {TypeGroup[]}
     */
    function normalizeRelationships(relationships, currentUri, worksRepo) {
      var normRelns = relationships.map(function (relationship) {
        var isReverse = relationship.targetEntities.some(function (anchor) {
          return anchor.entryUris.some(function (uri) {
            return uri === currentUri;
          });
        });

        var targetField = isReverse ? 'relatedEntities' : 'targetEntities';

        var entities = flatMap(relationship[targetField], property('entryUris'))
          .map(function (uri) {
            return resolveEntityUri(uri, worksRepo);
          });

        var normReln = {
          id: relationship.id,
          typeId: relationship.typeId,
          reverse: isReverse,
          description: relationship.description,
          entities: entities
        };

        var entityPs = entities.map(property('$promise'));

        Object.defineProperty(normReln, '$promise', {
          value: $q.all(entityPs).then(constant(normReln))
        });

        return normReln;
      });

      var relnsByTypeDir = {};

      normRelns.forEach(function (relationship) {
        var typeId = relationship.typeId;

        if (!relnsByTypeDir.hasOwnProperty(typeId)) {
          relnsByTypeDir[typeId] = {
            fwd: [],
            rev: []
          };
        }

        relnsByTypeDir[typeId][relationship.reverse ? 'rev' : 'fwd'].push(relationship);
      });

      var typeGroups = [];

      var typeGroupPs = kvMap(relnsByTypeDir, function (dirs, typeId) {
        return getType(typeId).then(function (type) {
          if (type.isDirected) {
            // add forward group
            if (dirs.fwd.length > 0) {
              typeGroups.push({
                label: type.title,
                type: type,
                reverse: false,
                relationships: dirs.fwd
              });
            }

            // add reverse group
            if (dirs.rev.length > 0) {
              typeGroups.push({
                label: type.reverseTitle,
                type: type,
                reverse: true,
                relationships: dirs.rev
              });
            }
          } else {
            // combine forward/reverse and add as a single group
            var group = dirs.fwd.concat(dirs.rev);
            if (group.length > 0) {
              typeGroups.push({
                label: type.title,
                type: type,
                relationships: group
              });
            }
          }
        });
      });

      Object.defineProperty(typeGroups, '$promise', {
        value: $q.all(typeGroupPs).then(constant(typeGroups))
      });

      return typeGroups;
    }
  }
}

/**
 * Resolves an entity URI into a uniform container for the referenced entity.
 * @param  {string} uri
 * @param  {WorksRepository} worksRepo
 * @return {Entity}
 */
function resolveEntityUri(uri, worksRepo) {
  var match = ENTITY_URI.exec(uri);

  if (!match) {
    return null;
  }

  if (match[1] && match[2] && match[3]) {
    return makeVolumeEntity(match[1], match[2], match[3], worksRepo);
  } else if (match[1] && match[2]) {
    return makeEditionEntity(match[1], match[2], worksRepo);
  } else if (match[1]) {
    return makeWorkEntity(match[1], worksRepo);
  }

  return null;
}

/**
 * Creates an entity for a volume.
 * @param  {string} workId
 * @param  {string} editionId
 * @param  {string} volumeId
 * @param  {WorksRepository} worksRepo
 * @return {Entity}
 */
function makeVolumeEntity(workId, editionId, volumeId, worksRepo) {
  var edition = worksRepo.getEdition(workId, editionId);
  var volume = worksRepo.getVolume(workId, editionId, volumeId);

  var entity = {
    type: 'volume',
    refParams: {
      workId: workId,
      editionId: editionId,
      volumeId: volumeId
    },
    entity: volume
  };

  var labelP = volume.$promise.then(function () {
    var title = worksRepo.getTitle(volume.titles, ['short', 'canonical', 'bibliographic']);
    var label = formatTitle(title);

    return edition.$promise.then(function () {
      return label + '. ' + edition.editionName + '. Volume ' + volume.volumeNumber;
    }, function () {
      return label + '. [Unknown edition]. Volume ' + volume.volumeNumber;
    });
  });

  var entityP = labelP.then(function (label) {
    entity.label = label;
    return entity;
  });

  Object.defineProperty(entity, '$promise', {
    value: entityP
  });

  return entity;
}

/**
 * Creates an entity for an edition.
 * @param  {string} workId
 * @param  {string} editionId
 * @param  {WorksRepository} worksRepo
 * @return {Entity}
 */
function makeEditionEntity(workId, editionId, worksRepo) {
  var edition = worksRepo.getEdition(workId, editionId);

  var entity = {
    type: 'edition',
    refParams: {
      workId: workId,
      editionId: editionId
    },
    entity: edition
  };

  var entityP = edition.$promise.then(function () {
    var title = worksRepo.getTitle(edition.titles, ['short', 'canonical', 'bibliographic']);
    entity.label = formatTitle(title) + '. ' + edition.editionName;
    return entity;
  });

  Object.defineProperty(entity, '$promise', {
    value: entityP
  });

  return entity;
}

/**
 * Creates an entity for a work.
 * @param  {string} workId
 * @param  {WorksRepository} worksRepo
 * @return {Entity}
 */
function makeWorkEntity(workId, worksRepo) {
  var work = worksRepo.getWork(workId);

  var entity = {
    type: 'work',
    refParams: {
      workId: workId
    },
    entity: work
  };

  var entityP = work.$promise.then(function () {
    var title = worksRepo.getTitle(work.titles, ['short', 'canonical', 'bibliographic']);
    entity.label = formatTitle(title);
    return entity;
  });

  Object.defineProperty(entity, '$promise', {
    value: entityP
  });

  return entity;
}

/**
 * Formats a bibliographic entity's title into a title string
 * @param  {Title} title
 * @return {string}
 */
function formatTitle(title) {
  if (!title) {
    return '';
  }

  return title.title + (title.subtitle ? ': ' + title.subtitle : '');
}

// UTILITY FUNCTIONS

/**
 * @param {object} o
 * @return {function}
 */
function constant(o) {
  return function () {
    return o;
  };
}

/**
 * Maps over an object's key/value pairs
 * @param {object.<string, object>} obj
 * @param {function} cb
 * @return {array}
 */
function kvMap(obj, cb) {
  return Object.keys(obj)
    .filter(function (k) {
      return obj.hasOwnProperty(k);
    })
    .map(function (k) {
      return cb(obj[k], k);
    });
}

/**
 * Flattens an array of arrays by one level
 * @param {array[]} arrs
 * @return {array}
 */
function flatten(arrs) {
  return arrs.reduce(function (flattened, arr) {
    return flattened.concat(arr);
  }, []);
}

/**
 * @param {array} arr
 * @param {function} cb
 * @return {array}
 */
function flatMap(arr, cb) {
  return flatten(arr.map(cb));
}

/**
 * @param {string} prop
 * @return {function}
 */
function property(prop) {
  return function (o) {
    return o[prop];
  };
}
