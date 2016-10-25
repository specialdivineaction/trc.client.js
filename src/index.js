var angular = require('angular');

require('./trc-articles/trc-articles.module');
require('./trc-biblio/trc-biblio.module');
require('./trc-bio/trc-bio.module');
require('./trc-refs/trc-refs.module');
require('./trc-reln/trc-reln.module');

angular
  .module('trc', [
    'trcArticles',
    'trcBiblio',
    'trcBio',
    'trcRefs',
    'trcReln'
  ]);
