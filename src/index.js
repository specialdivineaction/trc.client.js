var angular = require('angular');

require('./trc-core/trc-core.module');
require('./trc-articles/trc-articles.module');
require('./trc-biblio/trc-biblio.module');
require('./trc-bio/trc-bio.module');
require('./trc-refs/trc-refs.module');
require('./trc-reln/trc-reln.module');
require('./trc-see-also/trc-see-also.module');

angular
  .module('trc', [
    'trcCore',
    'trcArticles',
    'trcBiblio',
    'trcBio',
    'trcRefs',
    'trcReln',
    'trcSeeAlso'
  ]);
