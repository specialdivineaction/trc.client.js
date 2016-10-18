var angular = require('angular');

/**
 * @typedef CiteprocReferenceDTO
 * @type {object}
 * @property {object.<string, object>} citations
 * @property {CiteprocBibliographyDTO} bibliography
 */

/**
 * @typedef CiteprocBibliographyDTO
 * @type {object}
 * @property {CiteprocBibliographyMetaDTO} meta
 * @property {string} html - rendered bibliography HTML
 * @property {string[]} items - Individually rendered bibliography items
 */

/**
 * @typedef CiteprocBibliographyMetaDTO
 * @type {object}
 * @property {object[]} errors
 * @property {boolean} done
 * @property {string[]} entryIds
 * @property {number} entrySpacing
 * @property {number} hangingIndent
 * @property {number} lineSpacing
 * @property {number} maxOffset
 * @property {boolean} secondFieldAlign
 */

module.exports = refsRendererFactory;

/** @ngInject */
function refsRendererFactory($q, $http, _, refsAdapter, citeproc) {
  var adapterConfigP = $http.get('assets/typemap/zotero-csl.json').then(function (res) {
    return res.data;
  });

  return {
    render: renderReference,
    renderBiblioItem: renderBiblioItem
  };

  /**
   * Asynchronously adapts and renders the given reference into an HTML bibliography
   * @param  {Reference} reference
   * @param  {string} styleId
   * @return {Promise.<CiteprocReferenceDTO>}
   */
  function renderReference(styleId, reference) {
    if (!styleId || !angular.isString(styleId)) {
      throw new Error('no style provided');
    }

    if (!reference) {
      throw new Error('no reference provided');
    }

    var cslReferenceP = adapterConfigP.then(function (config) {
      return refsAdapter.adapt(config, reference);
    });

    var citeprocP = cslReferenceP.then(function (cslReference) {
      return citeproc.load(styleId, function (key) {
        return cslReference.bibliography[key];
      });
    });

    var paramsP = $q.all({
      cslReference: cslReferenceP,
      citeproc: citeprocP
    });

    var renderP = paramsP.then(function (params) {
      return renderCiteproc(params.citeproc, params.cslReference);
    });

    return renderP;
  }

  /**
   * Asynchronously renders a single bibliography item.
   * @param  {string} styleId
   * @param  {BiblioItem} biblioItem
   * @return {Promise.<string>}
   */
  function renderBiblioItem(styleId, biblioItem) {
    var cslBiblioItemP = adapterConfigP.then(function (config) {
      return refsAdapter.adaptBiblioItem(config, biblioItem);
    });

    var citeprocP = cslBiblioItemP.then(function (cslBiblioItem) {
      return citeproc.load(styleId, function () {
        return cslBiblioItem;
      });
    });

    var cslBibliographyP = cslBiblioItemP.then(function (cslBiblioItem) {
      var bibliography = {};
      bibliography[cslBiblioItem.id] = cslBiblioItem;
      return bibliography;
    });

    var paramsP = $q.all({
      cslBibliography: cslBibliographyP,
      citeproc: citeprocP
    });

    var renderP = paramsP.then(function (params) {
      return renderCiteproc(params.citeproc, {
        citations: [],
        bibliography: params.cslBibliography
      });
    });

    return renderP.then(function (rendered) {
      return rendered.bibliography.html;
    });
  }

  /**
   * Renders a CSL bibliography and citations against the given citeproc engine
   * @param  {CSL.Engine} citeproc
   * @param  {CslReferenceDTO} cslReference
   * @return {CiteprocReferenceDTO}
   */
  function renderCiteproc(citeproc, cslReference) {
    citeproc.updateItems(_.keys(cslReference.bibliography));

    /** @type {[0@index: number, 1@html: string, 2@id: string][]} */
    var renderedCitations = _.flatMap(cslReference.citations, function (citation) {
      // citeproc updates the citation internally, which causes infinite $digest loops
      // create a copy so changes do not leak out
      var copy = angular.copy(citation);
      return citeproc.appendCitationCluster(copy, true);
    });

    var bibliography = citeproc.makeBibliography();

    var meta = bibliography[0];
    var items = bibliography[1].map(function (item) {
      return item.trim();
    });

    return {
      citations: _.mapValues(_.keyBy(renderedCitations, 2), 1),
      bibliography: {
        meta: {
          errors: meta.bibliography_errors,
          done: meta.done,
          entryIds: meta.entry_ids,
          entrySpacing: meta.entryspacing,
          hangingIndent: meta.hangingindent,
          lineSpacing: meta.linespacing,
          maxOffset: meta.maxoffset,
          secondFieldAlign: meta['second-field-align']
        },
        html: meta.bibstart + items.join('') + meta.bibend,
        items: items
      }
    };
  }
}
