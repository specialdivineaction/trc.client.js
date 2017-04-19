/**
 * @callback styleSupplierCallback
 * @return {Promise.<string>} style definition
 */

/**
 * @callback localeSupplierCallback
 * @return {Promise.<string>} locale definition
 */

/**
 * @callback bibliographyItemSupplierCallback
 * @param {string} itemId
 * @return {CslItemDTO}
 */

module.exports = citeprocProvider;

/** @ngInject */
function citeprocProvider(_) {
  /** @type {object.<string,localeSupplierCallback>} */
  var localeSuppliers = {};

  /** @type {object.<string,Promise.<string>>} */
  var loadedLocales = {};

  /** @type {object.<string,styleSupplierCallback>} */
  var styleSuppliers = {};

  /** @type {object.<string,Promise.<string>>} */
  var loadedStyles = {};

  var provider = {
    defaultLocale: 'en-US',
    linkText: 'read online',
    linkPrefix: '[',
    linkSuffix: ']',
    linkFormatter: defaultLinkFormatter,
    addLocale: addLocale,
    addStyle: addStyle,
    $get: citeprocFactory
  };

  return provider;

  /**
   * Formats URL link text into a hyperlinked anchor tag.
   * @param  {string} url
   * @param  {string} text
   * @return {string}
   */
  function defaultLinkFormatter(url, text) {
    return provider.linkPrefix + '<a href="' + url + '" target="_blank">' + (provider.linkText || text) + '</a>' + provider.linkSuffix;
  }

  /**
   * Register a locale with the citeproc provider
   * @param {string} localeId
   */
  function addLocale(localeId, supplier) {
    localeSuppliers[localeId] = supplier;
  }

  /**
   * Register a style with the citeproc provider
   * @param {string} styleId
   * @param {styleProviderCallback} provider
   */
  function addStyle(styleId, supplier) {
    styleSuppliers[styleId] = supplier;
  }


  /** @ngInject */
  function citeprocFactory($q, $injector, CSL) {
    // HACK: have to load all locales in order for sys.retrieveLocale to work as citeproc expects
    //       might as well kick it off as soon as the service is injected
    var localesP = loadLocales();
    return { load: getEngine };

    /**
     * Constructs a citeproc instance with the given style
     * @param  {string} styleId
     * @param  {bibliographyItemSupplierCallback} bibliographyItemSupplier
     * @return {Promise.<CSL.Engine>}
     */
    function getEngine(styleId, bibliographyItemSupplier) {
      var paramsP = $q.all({
        style: loadStyle(styleId),
        locales: localesP
      });

      return paramsP.then(function (params) {
        var citeprocSys = {
          retrieveLocale: getLocale,
          retrieveItem: getBibliographyItem,
          variableWrapper: citeprocSysVariableWrapper
        };

        return new CSL.Engine(citeprocSys, params.style, provider.defaultLocale);

        /**
         * Retrieves a locale for the citeproc engine
         * @param  {string} lang
         * @return {string}
         */
        function getLocale(lang) {
          if (!params.locales.hasOwnProperty(lang)) {
            throw new Error('unknown locale ' + lang);
          }

          return params.locales[lang];
        }
      });

      /**
       * Retrieves a bibliographic item by ID for the citeproc engine
       * @param {string} id
       * @return {CslItemDTO}
       */
      function getBibliographyItem(id) {
        var item = bibliographyItemSupplier(id)

        if (!item) {
          throw new Error('bibliography item supplier failed to return an item for id {' + id + '}');
        }

        return item;
      }
    }

    /**
     * Intercepts variable text insertion and performs extra formatting. In this case, formats link text.
     * @param  {object} params    CSL variable formatting parameters
     * @param  {string} prePunct  prefix (punctuation) that is supposedto go before variable text
     * @param  {string} str       variable text as formatted by CSL style
     * @param  {string} postPunct suffix (punctuation) that is supposed to go after variable text
     * @return {string}           formatted variable text
     */
    function citeprocSysVariableWrapper(params, prePunct, str, postPunct) {
      if (params.variableNames[0] === 'URL' && params.itemData.URL) {
        return prePunct + provider.linkFormatter(params.itemData.URL, str) + postPunct;
      } else {
        return (prePunct + str + postPunct);
      }
    }

    /**
     * Loads the locale with the given id
     * Ensures corresponding supplier is called only once
     * @return {Promise.<string>}
     */
    function loadLocale(localeId) {
      if (!localeSuppliers.hasOwnProperty(localeId)) {
        throw new Error('unknown locale ' + localeId);
      }

      if (!loadedLocales.hasOwnProperty(localeId)) {
        var localeSupplier = localeSuppliers[localeId];
        loadedLocales[localeId] = $injector.invoke(localeSupplier);
      }

      return loadedLocales[localeId];
    }

    /**
     * Loads the style with the given id
     * Ensures corresponding supplier is called only once
     * @return {Promise.<string>}
     */
    function loadStyle(styleId) {
      if (!styleSuppliers.hasOwnProperty(styleId)) {
        throw new Error('unknown style ' + styleId);
      }

      if (!loadedStyles.hasOwnProperty(styleId)) {
        var styleSupplier = styleSuppliers[styleId];
        loadedStyles[styleId] = $injector.invoke(styleSupplier);
      }

      return loadedStyles[styleId];
    }

    /**
     * Loads all locales by calling their suppliers and syncing all of the resulting promises.
     * @return {Promise.<object.<string,string>>}
     */
    function loadLocales() {
      var locales = _.mapValues(localeSuppliers, function (supplier, localeId) {
        return loadLocale(localeId);
      });

      return $q.all(locales);
    }
  }
}
