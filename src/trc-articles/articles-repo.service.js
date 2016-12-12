var angular = require('angular');

module.exports = articlesRepoProvider;

function articlesRepoProvider() {
  var provider = {};
  provider.url = '/api/articles';
  provider.$get = articlesRepoFactory;
  return provider;

  /** @ngInject */
  function articlesRepoFactory($resource, _, uuid4, seeAlsoRepo) {
    var articleResource = $resource(provider.url + '/:id', { id: '@id' }, {
      update: { method: 'PUT' }
    });

    var repo = {};
    repo.getReferencesEndpoint = getReferencesEndpoint;
    repo.create = createArticle;
    repo.createLinked = createLinkedArticle;
    repo.createFootnote = createFootnote;
    repo.get = getArticle;
    repo.search = search;
    repo.save = saveArticle;
    repo.delete = deleteArticle;
    repo.cleanReferences = cleanReferences;
    repo.cleanFootnotes = cleanFootnotes;
    return repo;

    /* ================================
     * API METHODS
     * ================================ */

    /**
     * Constructs an API endpoint where a given article's reference collection is stored
     * @param {string} articleId
     * @return {string}
     */
    function getReferencesEndpoint(articleId) {
      return provider.url + '/' + articleId + '/references';
    }

    /**
     * Creates a new article instance
     * @param  {string} type
     * @param  {string} title
     * @return {Article}
     */
    function createArticle(type, title) {
      return new articleResource({
        articleType: type,
        title: title
      });
    }

    /**
     * Creates a new (persisted) article linked to the given entry via the 'see also' service
     * @param {string} type
     * @param {string} title
     * @param {string} token The unique token of the linked entry
     * @return {Promise.<Article>}
     */
    function createLinkedArticle(type, title, token) {
      var article = createArticle(type, title);
      var articleP = saveArticle(article);

      var linkP = articleP.then(function (article) {
        var link = seeAlsoRepo.create(article.ref.token, token);
        return link.$promise;
      });

      return linkP.then(function () {
        return article;
      });
    }

    /**
     * Creates a new footnote instance
     * @return {Footnote}
     */
    function createFootnote() {
      return {
        id: uuid4.generate(),
        content: '',
        mimeType: 'text/html'
      };
    }

    /**
     * Fetches an article instance by id.
     * The resulting Article object will be populated asynchronously when its `.$promise` completes.
     * @param  {string} id
     * @return {Article}
     */
    function getArticle(id) {
      return articleResource.get({ id: id });
    }

    /**
     * Searches for articles that match the given query
     * @param {string} query
     * @return {ArticleResult}
     */
    function search(query, options) {
      return articleResource.get({
        q: query,
        type: options.type
      });
    }

    /**
     * Saves an article to the REST API
     * @param  {Article} article
     * @return {Promise.<Article>}
     */
    function saveArticle(article) {
      if (!(article instanceof articleResource)) {
        throw new Error('Article was not created by this repo');
      }

      return article.id ? article.$update() : article.$save();
    }

    /**
     * Delete an article by id
     * @param  {string|Article} id
     * @return {Promise}
     */
    function deleteArticle(id) {
      if (angular.isObject(id) && id.id) {
        id = id.id;
      }

      var res = articleResource.delete({ id: id });
      return res.$promise
    }

    /**
     * Removes unused citations and bibliographic items.
     * @param  {Article} article
     * @param  {ReferenceCollection} refs
     * @return {ReferenceCollection} newly cleaned reference collection
     */
    function cleanReferences(article, refs) {
      // create large text blob of all article content
      var fullContent = article.body + _.map(article.footnotes, 'content').join('');

      // delete ids that do not occur within article content
      for (var citeId in refs.citations) if (refs.citations.hasOwnProperty(citeId) && fullContent.indexOf(citeId) < 0) {
        delete refs.citations[citeId];
      }

      return refs;
    }

    /**
     * Removes unused footnotes.
     * @param {Article} article
     * @param {object.<string, Footnote>} footnotes
     * @return {object.<string, Footnote>} newly cleaned footnotes
     */
    function cleanFootnotes(article, footnotes) {
      for (var footnoteId in footnotes) if (footnotes.hasOwnProperty(footnoteId) && article.body.indexOf(footnoteId) < 0) {
        delete footnotes[footnoteId];
      }

      return footnotes;
    }

    /* ================================
     * PRIVATE METHODS
     * ================================ */
  }
}
