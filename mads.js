/*jshint es5: true, browser: true, undef:true, unused:true, indent: 4 */

var TG = TG || {};

/***

    This module allows you to integrate ads served by MADS based on the Javascript SDK
    It does lazy loading and initialization of ads, so the page won't be blocked from
    rendering the content.
    It will try to display ads within 500 milliseconds (configurable).
    http://developer.madsone.com/JavaScript_AdTags

***/
TG.mads = (function (doc, win) {

    "use strict";

    var mads_js = "mads-js-" + Date.now(),
        mads_js_loaded = 0,
        tries = 0,

        options = {
            max_tries: 10,
            timeout: 500
        };

    // A simple extend function so we can mix objects
    function extend(destination, source) {
        for (var k in source) {
            if (source.hasOwnProperty(k)) {
                destination[k] = source[k];
            }
        }
        return destination;
    }

    return {

        /**
         * Getter for the global options object
         */

        get options() {
            return options;
        },

        /**
         * Setter for the global options object
         * @param params {Object} will merge the object's values with the global options
         * existing keys will be overridden, new keys will be added
         */
        set options(params) {

            if (typeof params !== "object") {
                throw "params must be an object";
            }

            extend(options, params);
        },

        /**
         * loaded
         * Returns a boolean wether MADS Javascript has been succesfully loaded
         */

        get loaded() {
            return (doc.getElementById(mads_js) && mads_js_loaded) ? true : false;
        },

        /**
         * @method reset
         * Will reset the loading state of ads, useful if you want to retry
         * Use a try/catch block around load
         */

        reset: function () {

            if (! this.loaded) {
                mads_js_loaded = 0;
                tries = 0;
            }
        },

        /**
         * @method load
         * @param callback {Function} function to execute when MADS has been succesfully loaded
         * throws an error if it can't be loaded after the configured amount of tries,
         * so use a try/catch if you want to handle this
         */
        load: function (callback) {

            var try_mads_sdk = function () {

                try {
                    mads_js_loaded = (typeof win.MADSAdrequest !== "undefined") ? 1 : 0;
                    if (mads_js_loaded) callback(); else throw "MADS not yet loaded";
                }

                catch (e) {

                    if (tries < options.max_tries) {
                        setTimeout(try_mads_sdk, options.timeout);
                        tries++;
                    }

                    else {
                        throw "MADS couldn't be downloaded";
                    }
                }
            };

            if (mads_js_loaded > 0) callback();

            else if (mads_js_loaded === 0) {

                mads_js_loaded = -1;

                (function (s, id) {
                    var js, mjs = doc.getElementsByTagName(s)[0];

                    if (! doc.getElementById(id)) {
                        js = doc.createElement(s);
                        js.id = id;
                        js.src = "http://eu2.madsone.com/js/tags.js";
                        mjs.parentNode.insertBefore(js, mjs);
                    }
                })("script", mads_js);

                try_mads_sdk();

            }

            else {
                try_mads_sdk();
            }
        },

        /**
         * @method showAd will load an advertisement and display it
         * @param id {String} the ID of the element where the ad should be displayed
         * if the id isn't found, throws an error
         * @param params {Object} optional object containing any keys specific to the ad
         * the params object will be merged with the global options, so you can set default zones etc. and override them per ad
         * See http://developer.madsone.com/JavaScript_AdTags#Complete_list_of_ad_request_parameters for the complete list of options
         * By default it will show a random MADS test advertisement
         */
        showAd: function (id, params) {

            var el = doc.getElementById(id);

            if (! el) {
                throw "Couldn't find element with id " + id;
            }

            if (el.children.length) {
                throw "Already loaded " + id;
            }

            // check if we have valid options
            params = typeof params === "object" ? params : {};

            // setup default options
            var settings = {
                pid: "6252122059",
                element_id: id,
                async: true,
                ad_type: "live"
            };

            // merge global options into settings
            extend(settings, options);

            // merge params into options
            extend(settings, params);

            this.load(function () {
                win.MADSAdrequest.adrequest(settings);
            });
        },

        /**
         * @method showAllAds convenience function for showing ads in a range of elements with the same class name
         * @param className the class, e.g. "js-mads-ad"
         * You can set data attributes on each element containing any ad request parameters from
         * http://developer.madsone.com/JavaScript_AdTags#Complete_list_of_ad_request_parameters
         *
         * Example:
         * <div class="js-mads-ad" id="mads-ad" data-ad_type="live" data-user_age="34"></div>
         *
         */
        showAllAds: function (className) {

            var ads = Array.prototype.slice.call(doc.getElementsByClassName(className), 0),
                self = this;

            if (ads.length) {

                self.load(function () {
                    ads.forEach(function (el) {

                        var id = el.getAttribute("id");

                        if (id && ! el.children.length) {
                            var params = el.dataset;
                            self.showAd.call(self, id, params);
                        }
                    });
                });
            }
        }
    };

})(document, window);