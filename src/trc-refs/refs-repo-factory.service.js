var angular = require('angular');

/**
 * @typedef Reference
 * @type {object}
 * @property {object.<string,Citation>} citations
 * @property {object.<string,object>} bibliography
 */

/**
 * @typedef Citation
 * @type {object}
 * @property {string} id
 * @property {CitationItem[]} items
 */

/**
 * @typedef CitationItem
 * @type {object}
 * @property {string} id
 * @property {string} label
 * @property {string} locatorType
 * @property {string} locator
 * @property {boolean} suppressAuthor
 */

/**
 * @typedef BiblioItem
 * @type {object}
 * @property {string} id
 * @property {string} type
 * @property {BiblioItemMeta} meta
 * @property {Creator[]} creators
 * @property {Object.<string,string>} fields
 */

/**
 * @typedef BiblioItemMeta
 * @type {object}
 * @property {string} key
 * @property {string} creatorSummary
 * @property {string} parsedDate
 * @property {string} dateAdded
 * @property {string} dateModified
 */

/**
 * @typedef Creator
 * @type {object}
 * @property {string} role
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} name
 */

module.exports = refsRepoFactoryProvider;

/** @ngInject */
function refsRepoFactoryProvider() {
  var provider = {};

  provider.$get = referencesRepositoryFactoryFactory;

  return provider;

  /** @ngInject */
  function referencesRepositoryFactoryFactory(_, uuid4, $resource) {
    var factory = {}

    // the following methods can be considered static and require no repo state in order to function
    factory.createRefCollection = createRefCollection;
    factory.createCitation = createCitation;
    factory.createBiblioItem = createBiblioItem;
    factory.merge = mergeReferences;
    factory.compact = compactRefCollection;
    factory.validate = validateRefCollection;
    factory.isValid = isValidRefCollection;

    factory.getRepo = createRepository;

    return factory;

    /**
     * Creades a new reference collection repository scoped to the given endpoint URL
     * @param {string} endpoint
     * @return {ReferenceRepository}
     */
    function createRepository(endpoint) {
      var refsResource = $resource(endpoint);

      // initialize with static repo factory methods for convenience
      var repo = _.omit(factory, ['getRepo']);

      repo.get = getReferences;
      repo.save = saveReferences;
      repo.delete = deleteReferences;

      return repo;

      /**
       * Retrieves the reference collection from the server's API
       * @return {ReferenceCollection}
       */
      function getReferences() {
        return refsResource.get();
      }

      /**
       * Persists the given reference collection to the server's API
       * @param  {ReferenceCollection} refs
       * @return {Promise.<ReferenceCollection>}
       */
      function saveReferences(refs) {
        var compactRefs = compactRefCollection(refs);
        var res = refsResource.save({}, compactRefs);
        return res.$promise;
      }

      /**
       * Removes the reference collection from the server's API
       * @return {Promise}
       */
      function deleteReferences() {
        var res = refsResource.delete();
        return res.$promise;
      }
    }

    /**
     * Creates a new reference object instance
     * @return {Reference}
     */
    function createRefCollection() {
      return {
        citations: {},
        bibliography: {}
      };
    }

    /**
     * Creates a new citation object instance
     * @return {Citation}
     */
    function createCitation() {
      return {
        id: uuid4.generate(),
        items: []
      };
    }

    /**
     * Creates a new bibliography item
     * @return {BiblioItem}
     */
    function createBiblioItem(id) {
      return {
        id: id,
        type: null,
        meta: {},
        creators: [],
        fields: {}
      };
    }

    /**
     * Merge the citations and bibliographies of two references into a new reference.
     * @param  {Reference} a
     * @param  {Reference} b
     * @return {Reference}   A new reference containing the combined citations and bibliography enttries
     */
    function mergeReferences(a, b) {
      var newRef = createRefCollection();
      angular.extend(newRef.citations, a.citations, b.citations);
      angular.extend(newRef.bibliography, a.bibliography, b.bibliography);
      return newRef;
    }

    /**
     * Removes extraneous unreferenced bibliography entries
     * @param  {Reference} ref
     * @return {Reference}
     */
    function compactRefCollection(ref) {
      var newRef = createRefCollection();
      angular.extend(newRef.citations, ref.citations);
      newRef.bibliography = _.chain(ref.citations)
        // get set of unique referenced item ids
        .flatMap('items').map('id').uniq()
        // resolve id against bibliography object
        .map(function (id) { return { id: id, item: ref.bibliography[id] }; })
        // remove any null/undefined values
        .filter('item')
        // convert to object keyed by bibliography id
        .keyBy('id')
        .mapValues('item')
        .value();

      return newRef;
    }

    /**
     * Validates the given reference by ensuring all cited bibliographic items are present in the bibliography
     * @param  {Reference}           ref
     * @return {[string,string[]][]}     A list of 2-tuples, where the first element is the ID of an invalid citation, and the second is an array of invalid bib item ids
     */
    function validateRefCollection(ref) {
      return _.chain(ref.citations)
        .map(function (citation) {
          var itemIds = _.map(citation.items, 'id');
          var invalidItemIds = _.reject(itemIds, _.propertyOf(ref.bibliography));
          return [citation.id, invalidItemIds];
        })
        .filter(function (pair) {
          // remove pairs containing no invalid item ids
          return pair[1] && pair[1].length;
        })
        .value();
    }

    /**
     * @param  {Reference} ref
     * @return {boolean}       whether a given reference is valid
     */
    function isValidRefCollection(ref) {
      var errors = validateRefCollection(ref);
      return errors.length === 0;
    }
  }
}
