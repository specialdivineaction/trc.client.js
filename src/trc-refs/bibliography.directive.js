module.exports = bibliographyDirective;

/** @ngInject */
function bibliographyDirective(refsRenderer, $log) {
  return {
    restrict: 'E',
    scope: {
      refs: '<',
      styleId: '@'
    },
    link: linkFunc
  };

  function linkFunc($scope, $el) {
    $scope.$watch('refs', function (newRefs) {
      if (!newRefs) {
        return;
      }

      var styleId = $scope.styleId;

      if (!styleId) {
        $log.error('no citation style ID provided; refusing to render bibliography');
        return;
      }

      refsRenderer.render(styleId, newRefs).then(function (rendered) {
        $el.html(rendered.bibliography.html);
      });
    });
  }
}
