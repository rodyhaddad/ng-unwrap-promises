!(function () {
    'use strict';

    /**
     * @ngdoc object
     * @name ng.$interpolateProvider
     * @function
     *
     * @description
     *
     * Used for configuring the interpolation markup.
     * Defaults to `{{` and `}}`, as well as `{||` and `||}` for expression requiring promise unwrapping.
     *
     * @example
     <doc:example module="customInterpolationApp">
     <doc:source>
     <script>
     var customInterpolationApp = angular.module('customInterpolationApp', []);

     customInterpolationApp.config(function($interpolateProvider) {
        $interpolateProvider.startSymbol('//');
        $interpolateProvider.endSymbol('//');
      });


     customInterpolationApp.controller('DemoController', function DemoController() {
          this.label = "This binding is brought you by // interpolation symbols.";
      });
     </script>
     <div ng-app="App" ng-controller="DemoController as demo">
     //demo.label//
     </div>
     </doc:source>
     <doc:scenario>
     it('should interpolate binding with custom symbols', function() {
      expect(binding('demo.label')).toBe('This binding is brought you by // interpolation symbols.');
     });
     </doc:scenario>
     </doc:example>
     */
    angular.module("rh.unwrapPromises", []).provider("$interpolate", ['$parseProvider', function $InterpolateProvider($parseProvider) {
        var $interpolateMinErr = function () {
            var code = arguments[0],
                prefix = '[$interpolate:' + code + '] ',
                template = arguments[1],
                templateArgs = arguments,
                stringify = function (obj) {
                    if (angular.isFunction(obj)) {
                        return obj.toString().replace(/ \{[\s\S]*$/, '');
                    } else if (angular.isUndefined(obj)) {
                        return 'undefined';
                    } else if (!angular.isString(obj)) {
                        return JSON.stringify(obj);
                    }
                    return obj;
                },
                message, i;

            message = prefix + template.replace(/\{\d+\}/g, function (match) {
                var index = +match.slice(1, -1), arg;

                if (index + 2 < templateArgs.length) {
                    arg = templateArgs[index + 2];
                    if (angular.isFunction(arg)) {
                        return arg.toString().replace(/ ?\{[\s\S]*$/, '');
                    } else if (angular.isUndefined(arg)) {
                        return 'undefined';
                    } else if (!angular.isString(arg)) {
                        return angular.toJson(arg);
                    }
                    return arg;
                }
                return match;
            });

            message = message + '\nhttp://errors.angularjs.org/' + angular.version.full + '/' +
                '$interpolate/' + code;
            for (i = 2; i < arguments.length; i++) {
                message = message + (i == 2 ? '?' : '&') + 'p' + (i - 2) + '=' +
                    encodeURIComponent(stringify(arguments[i]));
            }

            return new Error(message);
        };

        var startSymbol = '{{',
            endSymbol = '}}',
            upStartSymbol = '{||', // up == unwrap promise
            upEndSymbol = '||}';

        /**
         * @ngdoc method
         * @name ng.$interpolateProvider#startSymbol
         * @methodOf ng.$interpolateProvider
         * @description
         * Symbol to denote start of expression in the interpolated string. Defaults to `{{`.
         *
         * @param {string=} value new value to set the starting symbol to.
         * @returns {string|self} Returns the symbol when used as getter and self if used as setter.
         */
        this.startSymbol = function (value) {
            if (value) {
                startSymbol = value;
                return this;
            } else {
                return startSymbol;
            }
        };

        /**
         * @ngdoc method
         * @name ng.$interpolateProvider#startSymbol.unwrapPromises
         * @methodOf ng.$interpolateProvider
         * @description
         * Symbol to denote start of expression, with unwrapping promises enabled, in the interpolated string.
         * Defaults to `{||`.
         *
         * @param {string=} value new value to set the starting symbol to.
         * @returns {string|self} Returns the symbol when used as getter and self if used as setter.
         */
        this.startSymbol.unwrapPromises = function (value) {
            if (value) {
                upStartSymbol = value;
                return this;
            } else {
                return upStartSymbol;
            }
        };

        /**
         * @ngdoc method
         * @name ng.$interpolateProvider#endSymbol
         * @methodOf ng.$interpolateProvider
         * @description
         * Symbol to denote the end of expression in the interpolated string. Defaults to `}}`.
         *
         * @param {string=} value new value to set the ending symbol to.
         * @returns {string|self} Returns the symbol when used as getter and self if used as setter.
         */
        this.endSymbol = function (value) {
            if (value) {
                endSymbol = value;
                return this;
            } else {
                return endSymbol;
            }
        };

        /**
         * @ngdoc method
         * @name ng.$interpolateProvider#endSymbol.unwrapPromises
         * @methodOf ng.$interpolateProvider
         * @description
         * Symbol to denote the end of expression, with unwrapping promises enabled, in the interpolated string.
         * Defaults to `||}`.
         *
         * @param {string=} value new value to set the ending symbol to.
         * @returns {string|self} Returns the symbol when used as getter and self if used as setter.
         */
        this.endSymbol.unwrapPromises = function (value) {
            if (value) {
                upEndSymbol = value;
                return this;
            } else {
                return upEndSymbol;
            }
        };


        this.$get = ['$parse', '$exceptionHandler', '$sce', function ($parse, $exceptionHandler, $sce) {
            var startSymbolLength = startSymbol.length,
                endSymbolLength = endSymbol.length,
                upStartSymbolLength = upStartSymbol.length,
                upEndSymbolLength = upEndSymbol.length;


            /**
             * @ngdoc function
             * @name ng.$interpolate
             * @function
             *
             * @requires $parse
             * @requires $sce
             *
             * @description
             *
             * Compiles a string with markup into an interpolation function. This service is used by the
             * HTML {@link ng.$compile $compile} service for data binding. See
             * {@link ng.$interpolateProvider $interpolateProvider} for configuring the
             * interpolation markup.
             *
             *
             <pre>
             var $interpolate = ...; // injected
             var exp = $interpolate('Hello {{name}}!');
             expect(exp({name:'Angular'}).toEqual('Hello Angular!');
             </pre>
             *
             *
             * @param {string} text The text with markup to interpolate.
             * @param {boolean=} mustHaveExpression if set to true then the interpolation string must have
             *    embedded expression in order to return an interpolation function. Strings with no
             *    embedded expression will return null for the interpolation function.
             * @param {string=} trustedContext when provided, the returned function passes the interpolated
             *    result through {@link ng.$sce#methods_getTrusted $sce.getTrusted(interpolatedResult,
             *    trustedContext)} before returning it.  Refer to the {@link ng.$sce $sce} service that
             *    provides Strict Contextual Escaping for details.
             * @returns {function(context)} an interpolation function which is used to compute the
             *    interpolated string. The function has these parameters:
             *
             *    * `context`: an object against which any expressions embedded in the strings are evaluated
             *      against.
             *
             */
            function $interpolate(text, mustHaveExpression, trustedContext) {
                var startIndex,
                    endIndex,
                    index = 0,
                    parts = [],
                    length = text.length,
                    hasInterpolation = false,
                    fn,
                    exp,
                    concat = [];

                while (index < length) {
                    if (((startIndex = text.indexOf(startSymbol, index)) != -1) &&
                        ((endIndex = text.indexOf(endSymbol, startIndex + startSymbolLength)) != -1)) {
                        (index != startIndex) && interUnwrapPromise(text.substring(index, startIndex));
                        parts.push(fn = $parse(exp = text.substring(startIndex + startSymbolLength, endIndex)));
                        fn.exp = exp;
                        index = endIndex + endSymbolLength;
                        hasInterpolation = true;
                    } else {
                        // we did not find anything, so we have to add the remainder to the parts array
                        (index != length) && interUnwrapPromise(text.substring(index));
                        index = length;
                    }
                }

                function interUnwrapPromise(part) {
                    var startIndex, index = 0, length = part.length;
                    while (index < length) {
                        if (((startIndex = part.indexOf(upStartSymbol, index)) != -1) &&
                            ((endIndex = part.indexOf(upEndSymbol, startIndex + upStartSymbolLength)) != -1)) {
                            (index != startIndex) && parts.push(part.substring(index, startIndex));
                            parts.push(fn = parseUPExpr(exp = part.substring(startIndex + upStartSymbolLength, endIndex)));
                            fn.exp = exp;
                            index = endIndex + upEndSymbolLength;
                            hasInterpolation = true;
                        } else {
                            // we did not find anything, so we have to add the remainder to the parts array
                            (index != length) && parts.push(part.substring(index));
                            index = length;
                        }
                    }
                }

                function parseUPExpr(expr){
                    var exprFn,
                        origUP = $parseProvider.unwrapPromises(),
                        origLog = $parseProvider.logPromiseWarnings();
                    $parseProvider.unwrapPromises(true);
                    $parseProvider.logPromiseWarnings(false);
                    exprFn = $parse(expr);
                    $parseProvider.unwrapPromises(origUP);
                    $parseProvider.logPromiseWarnings(origLog);
                    return exprFn;
                }

                if (!(length = parts.length)) {
                    // we added, nothing, must have been an empty string.
                    parts.push('');
                    length = 1;
                }

                // Concatenating expressions makes it hard to reason about whether some combination of
                // concatenated values are unsafe to use and could easily lead to XSS.  By requiring that a
                // single expression be used for iframe[src], object[src], etc., we ensure that the value
                // that's used is assigned or constructed by some JS code somewhere that is more testable or
                // make it obvious that you bound the value to some user controlled value.  This helps reduce
                // the load when auditing for XSS issues.
                if (trustedContext && parts.length > 1) {
                    throw $interpolateMinErr('noconcat',
                        "Error while interpolating: {0}\nStrict Contextual Escaping disallows " +
                            "interpolations that concatenate multiple expressions when a trusted value is " +
                            "required.  See http://docs.angularjs.org/api/ng.$sce", text);
                }

                if (!mustHaveExpression || hasInterpolation) {
                    concat.length = length;
                    fn = function (context) {
                        try {
                            for (var i = 0, ii = length, part; i < ii; i++) {
                                if (typeof (part = parts[i]) == 'function') {
                                    part = part(context);
                                    if (trustedContext) {
                                        part = $sce.getTrusted(trustedContext, part);
                                    } else {
                                        part = $sce.valueOf(part);
                                    }
                                    if (part === null || angular.isUndefined(part)) {
                                        part = '';
                                    } else if (typeof part != 'string') {
                                        part = angular.toJson(part);
                                    }
                                }
                                concat[i] = part;
                            }
                            return concat.join('');
                        }
                        catch (err) {
                            var newErr = $interpolateMinErr('interr', "Can't interpolate: {0}\n{1}", text,
                                err.toString());
                            $exceptionHandler(newErr);
                        }
                    };
                    fn.exp = text;
                    fn.parts = parts;
                    return fn;
                }
            }


            /**
             * @ngdoc method
             * @name ng.$interpolate#startSymbol
             * @methodOf ng.$interpolate
             * @description
             * Symbol to denote the start of expression in the interpolated string. Defaults to `{{`.
             *
             * Use {@link ng.$interpolateProvider#startSymbol $interpolateProvider#startSymbol} to change
             * the symbol.
             *
             * @returns {string} start symbol.
             */
            $interpolate.startSymbol = function () {
                return startSymbol;
            };

            /**
             * @ngdoc method
             * @name ng.$interpolate#startSymbol.unwrapPromises
             * @methodOf ng.$interpolate
             * @description
             * Symbol to denote the start of expression, with unwrapping promises enabled, in the interpolated string.
             * Defaults to `{||`.
             *
             * Use {@link ng.$interpolateProvider#startSymbol.unwrapPromises $interpolateProvider#startSymbol.unwrapPromises}
             * to change the symbol.
             *
             * @returns {string} start symbol.
             */
            $interpolate.startSymbol.unwrapPromises = function () {
                return upStartSymbol;
            };


            /**
             * @ngdoc method
             * @name ng.$interpolate#endSymbol
             * @methodOf ng.$interpolate
             * @description
             * Symbol to denote the end of expression in the interpolated string. Defaults to `}}`.
             *
             * Use {@link ng.$interpolateProvider#endSymbol $interpolateProvider#endSymbol} to change
             * the symbol.
             *
             * @returns {string} start symbol.
             */
            $interpolate.endSymbol = function () {
                return endSymbol;
            };

            /**
             * @ngdoc method
             * @name ng.$interpolate#endSymbol
             * @methodOf ng.$interpolate
             * @description
             * Symbol to denote the end of expression, with unwrapping promises enabled, in the interpolated string.
             * Defaults to `||}`.
             *
             * Use {@link ng.$interpolateProvider#endSymbol.unwrapPromises $interpolateProvider#endSymbol.unwrapPromises}
             * to change the symbol.
             *
             * @returns {string} start symbol.
             */
            $interpolate.endSymbol.unwrapPromises = function () {
                return upEndSymbol;
            };

            return $interpolate;
        }];
    }]);
}());