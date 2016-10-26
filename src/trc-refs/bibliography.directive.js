module.exports = bibliographyDirective;

/** @ngInject */
function bibliographyDirective(refsRenderer) {
  return {
    restrict: 'E',
    scope: {
      refs: '<',
      styleId: '@'
    },
    link: linkFunc
  };

  function linkFunc($scope, $el) {
    var styleId = $scope.styleId || 'chicago';

    $scope.$watch('refs', function (newRefs) {
      if (!newRefs) {
        return;
      }

      refsRenderer.render(styleId, newRefs).then(function (rendered) {
        $el.html(rendered.bibliography.html);
      });
    });
  }
}
