var angular = require('angular');

require('./trc-articles/trc-articles.module');
require('./trc-bio/trc-bio.module');
require('./trc-refs/trc-refs.module');
require('./trc-biblio/trc-biblio.module');

angular
  .module('trc', [
    'trcArticles',
    'trcBio',
    'trcRefs',
    'trcBiblio'
  ]);
