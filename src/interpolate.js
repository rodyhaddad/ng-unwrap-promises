angular.module('rh.unwrapPromises', [
    'ngParser',
    'rh.ngCustomInterpolate'
]).config(['$interpolateProvider', function ($interpolateProvider) {
    $interpolateProvider.registerSyntax('rh.unwrapPromises', '{||', '||}',
        ['ngParser', '$sniffer', function (ngParser, $sniffer) {
        return ngParser.child({
            unwrapPromises: true,
            csp: $sniffer.csp
        });
    }])
}]);