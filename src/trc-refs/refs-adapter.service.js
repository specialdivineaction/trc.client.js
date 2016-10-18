var angular = require('angular');

/**
 * @typedef TrcReferenceCollection
 * @type {object}
 * @property {object.<string, TrcCitation>} citations
 * @property {object.<string, TrcBibliographicItem>} bibliography
 */

/**
 * @typedef TrcCitation
 * @type {object}
 * @property {string} id
 * @property {TrcBibliographicItemRef[]} items
 */

/**
 * @typedef TrcBibliographicItemRef
 * @type {object}
 * @property {string} id
 * @property {string} locator
 * @property {string} locatorType
 * @property {boolean} suppressAuthor
 */

/**
 * @typedef TrcBibliographicItem
 * @type {object}
 * @property {string} id
 * @property {string} type
 * @property {TrcCreator[]} creators
 * @property {object.<string, string>} meta
 * @property {object.<string, string>} fields
 */

/**
 * @typedef TrcCreator
 * @type {object}
 * @property {string} role
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} name
 */

module.exports = refsAdapterFactory;

/** @ngInject */
function refsAdapterFactory(_) {
  var adapter = {};

  adapter.adapt = adaptReference;
  adapter.adaptCitation = adaptCitation;
  adapter.adaptBiblioItem = adaptBiblioItem

  return adapter;

  /**
   * Adapts a trc reference collection into csl citations and bibliography items
   * @param {ItemAdapterMapping} config - Field mapping the bibliography item adapter
   * @param {TrcReferenceCollection} reference
   * @return {CslReferenceCollection}
   */
  function adaptReference(config, reference) {
    return {
      citations: _.mapValues(reference.citations, adaptCitation),
      bibliography: _.mapValues(reference.bibliography, makeCslBibliogaphyItemAdapter(config))
    };
  }

  /**
   * Adapts the given trc citation into a csl citation
   * @param {TrcCitation} trcCitation
   * @return {CslCitationDTO}
   */
  function adaptCitation(trcCitation) {
    return {
      citationID: trcCitation.id,
      citationItems: trcCitation.items.map(function (trcCitationItem) {
        return {
          id: trcCitationItem.id,
          locator: trcCitationItem.locator,
          label: trcCitationItem.locatorType,
          'suppress-author': trcCitationItem.suppressAuthor
        };
      }),
      properties: {}
    };
  }

  /**
   * Adapts the given biblio item into a csl bibliographic item
   * @param {object} config
   * @param {TrcBibliographicItem} item
   * @return {CslCitationDTO}
   */
  function adaptBiblioItem(config, item) {
    var adapt = makeCslBibliogaphyItemAdapter(config);
    return adapt(item);
  }

  /**
   * creates an adapter from zotero bibliography items into csl bibliography items
   * @param {AdapterConfig} config
   * @return {function}
   */
  function makeCslBibliogaphyItemAdapter(config) {
    return adaptItem;

    /**
     * Adapts the given zotero bibliography item into a csl bibliography item
     * @param  {TrcBibliographicItem} item
     * @return {CslItemDTO}
     */
    function adaptItem(item) {
      if (!item) {
        return null;
      }

      var itemType = item.type;
      var itemTypeMapping = getItemTypeMapping(itemType);

      var cslItem = {};

      cslItem.id = item.id;
      cslItem.type = itemTypeMapping.target;


      var cslCreatorFields = getCslCreators(itemTypeMapping, item.creators);
      angular.merge(cslItem, cslCreatorFields)

      angular.forEach(item.fields, adaptField);
      angular.forEach(item.meta, adaptField);

      return cslItem;

      function adaptField(value, field) {
        if (!value) {
          return;
        }

        var cslField = getCslField(itemTypeMapping, field);

        if (!cslField) {
          return;
        }

        if (cslField.type === 'date') {
          value = { raw: value };
        }

        cslItem[cslField.field] = value;
      }
    }

    /**
     * @param {string} zItemType
     * @return {object} field mapping config for the given zotero item type
     */
    function getItemTypeMapping(zItemType) {
      if (!zItemType || !config.itemMappings.hasOwnProperty(zItemType)) {
        throw new Error('malformed item or mapping: ' + zItemType + ' is not defined as a valid ' + config.source.format + ' type mapping');
      }

      return config.itemMappings[zItemType];
    }

    /**
     * Looks up the corresponding csl field metadata given a zotero field name
     * @param {string} zField
     * @return {?FieldMeta} the corresponding field metadata or null if there is no corresponding target field for the given source field
     */
    function getCslField(itemTypeMapping, zField) {
      var cslFieldDef = itemTypeMapping.fields[zField];

      if (cslFieldDef && cslFieldDef.target) {
        var cslField = cslFieldDef.target
        var cslFieldMeta = config.target.fields[cslField];

        if (!cslFieldMeta) {
          throw new Error('malformed mapping: source field ' + zField + ' maps to target field ' + cslField + ', but ' + cslField + ' is not listed as a valid ' + config.target.format + ' field');
        }

        return cslFieldMeta;
      }

      return null;
    }

    /**
     * Adapts an array of zotero creators into a mapping of csl creator fields.
     * These fields should be merged onto the final adapted csl item
     * @param {string} zItemType
     * @param {Creator[]} trcCreators
     * @return {object.<string,CslCreator[]>}
     */
    function getCslCreators(itemTypeMapping, trcCreators) {
      var cslCreators = {};

      trcCreators.forEach(function (trcCreator) {
        if (!(trcCreator && (trcCreator.firstName || trcCreator.lastName || trcCreator.name))) {
          return;
        }

        var cslCreatorFieldDef = itemTypeMapping.creatorTypes[trcCreator.role];

        if (cslCreatorFieldDef && cslCreatorFieldDef.target) {
          var cslCreator = (trcCreator.firstName || trcCreator.lastName)
            ? { given: trcCreator.firstName, family: trcCreator.lastName }
            : { literal: trcCreator.name };

          var cslCreatorField = cslCreatorFieldDef.target;
          if (!cslCreators.hasOwnProperty(cslCreatorField)) {
            cslCreators[cslCreatorField] = [];
          }

          cslCreators[cslCreatorField].push(cslCreator);
        }
      });

      return cslCreators;
    }
  }
}
