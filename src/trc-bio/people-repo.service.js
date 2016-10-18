var angular = require('angular');

/**
 * Data model representing a person returned by the TRC REST API
 * @typedef Person
 * @type {object}
 * @property {string}           id       - a unique identifier for this person; assigned upon creation
 * @property {EntryMeta}        meta     - metadata about the record and its history in the system
 * @property {PersonName}       name     - primary name used to identify this person
 * @property {PersonName[]}     altNames - other names by which this person is known
 * @property {?HistoricalEvent} birth    - the date and location this person was born; may be null if unknown
 * @property {?HistoricalEvent} death    - the date and location this person was born; may be null if unknown or still alive
 * @property {string}           summary  - an HTML summary of the person and his or her significance
 */

/**
 * Simplified, lightweight representation of a person for use in search results
 * @typedef Person
 * @type {object}
 * @property {string}     id             - a unique identifier for the person
 * @property {EntryMeta}  meta           - metadata about the record and its history in the system
 * @property {PersonName} name           - structured name representation
 * @property {string}     label          - formatted name to display
 * @property {string}     summaryExcerpt - a leading excerpt from the full summary
 */

/**
 * Metadata about a TRC entry
 * @typedef EntryMeta
 * @type {object}
 * @property {string}                      slug         - a short, unique identifier intended to be more human-readable than the id
 * @property {integer}                     version      - a monotonically increasing version number incremented on each change
 * @property {object.<string, SimpleLink>} links        - links to related resources; keyed by link role
 * @property {string}                      lastModified - ISO 8601 timestamp of the last modification date
 */

/**
 * Container for linking to related entities
 * @typedef SimpleLink
 * @type {object}
 * @property {string} uri  - a URI representing the linked item
 * @property {string} type - MIME type of the related linked item
 */

/**
 * Structured form of a person's name
 * @typedef PersonName
 * @type {object}
 * @property {string} role        - clarifies the use of this name
 * @property {string} label       - a simple representation of this name for display purposes
 * @property {?string} title      - title of address
 * @property {?string} givenName  - given or first name
 * @property {?string} middleName - middle name
 * @property {?string} familyName - family or last name
 * @property {?string} suffix     - a suffix (e.g. 'Jr' or 'III')
 */

/**
 * Event with a date/time, location, and descriptive information
 * @typedef HistoricalEvent
 * @type {object}
 * @property {string}          id          - a unique identifier for this event
 * @property {string}          title       - a brief title of the event for display purposes
 * @property {string}          description - a detailed summary of the event
 * @property {string}          location    - the location in which the event took place
 * @property {DateDescription} date        - the date the event took place
 */

/**
 * Container for encapsulating human-readable and machine-readable forms of a date.
 * @typedef DateDescription
 * @type {object}
 * @property {string} calendar    - machine-readable ISO 8601 timestamp
 * @property {string} description - human-readable description of this date
 */

/**
 * Container for search results
 * @typedef PersonSearchResultSet
 * @type {object}
 * @property {SimplePerson[]} items  - search results
 * @property {string}         qs     - query string that gives the current set of search results
 * @property {?string}        qsNext - query string that gives next set of search results or null if this is the last set
 * @property {?string}        qsPrev - query string that gives preceding set of search results or null if this is the first set
 */

module.exports = peopleRepoProvider;

function peopleRepoProvider() {
  var provider = {};
  provider.url = '/api/people';
  provider.$get = peopleRepoFactory;
  return provider;

  /** @ngInject */
  function peopleRepoFactory($q, $resource) {
    var restResource = $resource(provider.url + '/:id', null, {
      'update': { method: 'PUT' }
    });

    var repo = {};
    repo.getReferencesEndpoint = getReferencesEndpoint;
    repo.create = createPerson;
    repo.createName = createName;
    repo.createEvent = createEvent;
    repo.get = findById;
    repo.search = search;
    repo.save = savePerson;
    repo.delete = deletePerson;
    return repo;

    /**
     * Constructs a URL from which a bibliography for this entry can be loaded
     *
     * @return {string}
     */
    function getReferencesEndpoint(id) {
      return provider.url + '/' + id + '/references';
    }

    /**
     * Creates a new empty person instance.
     *
     * @return {Person}
     */
    function createPerson() {
      var person = new restResource();
      return adaptPerson(person);
    }

    /**
     * Creates a new empty entry metadata instance
     *
     * @return {EntryMeta}
     */
    function createMeta() {
      var meta = {};
      return adaptMeta(meta);
    }

    /**
     * Creates a new empty name instance
     *
     * @return {PersonName}
     */
    function createName() {
      var name = {};
      return adaptName(name);
    }

    /**
     * Creates a new historical event instance
     *
     * @return {HistoricalEvent}
     */
    function createEvent() {
      var evt = {};
      return adaptEvent(evt);
    }

    /**
     * Creates a date/description instance
     *
     * @return {DateDescription}
     */
    function createDateDescription() {
      var dateDescription = {};
      return dateDescription;
    }

    /**
     * Retrieves a person object by identifier.
     *
     * A proxy object will be returned immediately, and its properties will be populated after the
     * request succeeds. If fine-grained asynchronous handling, etc. is required, the request's
     * promise is available on Person.$promise.
     *
     * @param  {string} id
     * @return {Person}
     */
    function findById(id) {
      return restResource.get({ id: id });
    }

    /**
     * Retrieves a serch result set of people who match the given query.
     *
     * @param {string} query
     * @return {PersonSearchResultSet}
     */
    function search(query) {
      return restResource.get({ q: query });
    }

    /**
     * Saves a person model to the REST API.
     *
     * If no ID is provided on the person model, the API will create save the model as a new
     * person. Otherwise, the API will attempt to update the existing person model with that ID.
     *
     * @param {Person} person
     * @return {Promise.<Person>} - resolves to the saved person on success
     */
    function savePerson(person) {
      var response;
      if (person.id) {
        response = restResource.update({ id: person.id }, person);
      } else {
        response = restResource.save(null, person);
      }

      return response.$promise.then(function (personId) {
        person.id = personId.id;
        return person;
      });
    }

    /**
     * Deletes a person on the server via the REST API.
     *
     * @param {Person|string} id
     * @return {Promise} - resolves on success
     */
    function deletePerson(id) {
      if (angular.isObject(id) && id.id) {
        id = id.id;
      }

      var response = restResource.delete({ id: id });
      return response.$promise;
    }

    /**
     * Populates a person with aggregate fields
     *
     * @param  {Person} person
     * @return {Person}
     */
    function adaptPerson(person) {
      if (!person.meta) {
        person.meta = createMeta();
      } else {
        adaptMeta(person.meta);
      }

      if (!person.name) {
        person.name = createName();
      } else {
        adaptName(person.name);
      }

      if (!person.altNames) {
        person.altNames = [];
      } else {
        person.altNames.forEach(adaptName);
      }

      if (!person.birth) {
        person.birth = createEvent();
      } else {
        adaptEvent(person.birth);
      }

      if (!person.death) {
        person.death = createEvent();
      } else {
        adaptEvent(person.death);
      }

      return person
    }

    /**
     * Ensure that entry metadata aggregate fields exist and are formatted correctly.
     *
     * @param  {EntryMeta} meta
     * @return {EntryMeta}
     */
    function adaptMeta(meta) {
      if (!meta.links) {
        meta.links = {};
      }

      return meta;
    }

    /**
     * Ensure that name aggregate fields exist and are formatted correctly
     * @param  {PersonName} name
     * @return {PersonName}
     */
    function adaptName(name) {
      // no aggregate fields yet...
      return name;
    }

    /**
     * Ensure that event aggregate fields exist and are formatted correctly.
     *
     * @param  {HistoricalEvent} evt
     * @return {HistoricalEvent}
     */
    function adaptEvent(evt) {
      if (!evt.date) {
        evt.date = createDateDescription();
      }

      return evt;
    }
  }
}
