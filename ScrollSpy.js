/*
 * ScrollSpy JavaScript Library v1.0.0
 * https://scrollspy.github.io
 *
 * Note : this JS file is converted to ES5 using babel, for any contributions use ScrollSpy.js in src folder
 */

"use strict";

function ScrollSpy() {
    var settings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
        contexts_class: 'scrollspy',
        delay: 200,
        callbackOnChange: function callbackOnChange() {},
        callbackOnDestroy: function callbackOnDestroy() {}
    };
    var callback_OnChange = typeof settings['callbackOnChange'] !== 'undefined' ? settings['callbackOnChange'] : function () {},
        callback_OnDestroy = typeof settings['callbackOnDestroy'] !== 'undefined' ? settings['callbackOnDestroy'] : function () {},
        delay = settings['delay'],
        page_visible_height = window.innerHeight,
        SpySections = [],
        indicator_settings_saved = [],
        CurrentPositionTop = -1,
        lastItemPercent = -1,
        lastScrollFireTime = 0,
        scrollTimer,
        fakePercent = true,
        firstScroll = true,
        ForceActiveIndicator = false,
        hasIndicator = false;
    var self = {
        "destroy": function destroy() {
            var callbackOnDestroy = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : callback_OnDestroy;
            DestroyOnScrollEvent(callbackOnDestroy());
        },
        Indicator: function Indicator() {
            var settings_indicator = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {
                element: null,
                indicator_container_class: '',
                indicator_item_class: '',
                clickable: true,
                forceActive: false
            };
            indicator_settings_saved = settings_indicator;
            ForceActiveIndicator = settings_indicator['forceActive'];

            if (settings_indicator['element'] !== null || typeof settings_indicator['element'] !== 'undefined') {
                settings_indicator['element'].innerHTML = '';
                var indicator = document.createElement('ul');
                indicator.classList.add('scrollspy-indicator-container');

                if (typeof settings_indicator['indicator_container_class'] !== 'undefined') {
                    indicator.classList.add(settings_indicator['indicator_container_class']);
                }

                settings_indicator['element'].appendChild(indicator);
                Array.prototype.forEach.call(SpySections, function (element) {
                    var indicator_item = document.createElement('li');

                    if (typeof settings_indicator['indicator_item_class'] !== 'undefined') {
                        indicator_item.classList.add(settings_indicator['indicator_item_class']);
                    }

                    indicator_item.innerHTML = element[0].getAttribute('spy-title');
                    indicator.appendChild(indicator_item);

                    if (settings_indicator['clickable'] !== false) {
                        indicator_item.classList.add('spy-clickable');

                        indicator_item.onclick = function (event) {
                            Array.prototype.forEach.call(SpySections, function (element) {
                                if (element[1] === event.target) {
                                    ScrollToSection(element[0]);
                                }
                            });
                        };
                    }

                    element.push(indicator_item);
                });
                hasIndicator = true;
            }
        }
    };

    var CheckIsInView = function CheckIsInView(element) {
        var ScrollPos = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ScrollPosition();
        return element.offsetTop > ScrollPos[0] && element.offsetTop < ScrollPos[1] || element.offsetTop + element.offsetHeight > ScrollPos[0] && element.offsetTop + element.offsetHeight < ScrollPos[1] || element.offsetTop < ScrollPos[0] && element.offsetTop + element.offsetHeight > ScrollPos[1];
    };

    var GetVisibilityPercent = function GetVisibilityPercent(element) {
        var ScrollPos = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ScrollPosition();

        if (CheckIsInView(element, ScrollPos)) {
            var item_top = element.offsetTop;
            var item_height = element.offsetHeight;
            var item_bottom = item_top + item_height;
            var page_top = ScrollPos[0];
            var page_bottom = ScrollPos[1];
            var visible_pixels = 0;

            if (item_top >= page_top && item_bottom <= page_bottom) {
                visible_pixels = item_height;
            }

            if (item_top < page_top && item_bottom <= page_bottom) {
                visible_pixels = item_bottom - page_top;
            }

            if (item_top >= page_top && item_bottom > page_bottom) {
                visible_pixels = page_bottom - item_top;
            }

            if (item_top < page_top && item_bottom > page_bottom) {
                visible_pixels = page_bottom - page_top;
            }

            return Math.round(visible_pixels / page_visible_height * 100);
        } else {
            return 0;
        }
    };

    var GetVisibilityDistanceFromCenter = function GetVisibilityDistanceFromCenter(element) {
        var ScrollPos = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ScrollPosition();

        if (CheckIsInView(element, ScrollPos)) {
            var item_top = element.offsetTop;
            var item_height = element.offsetHeight;
            var item_bottom = item_top + item_height;
            var page_top = ScrollPos[0];
            var page_center = page_top + page_visible_height / 2;
            var distance_from_center = 0;

            if (item_top < page_center && item_bottom < page_center) {
                distance_from_center = page_center - item_bottom;
            }

            if (item_top >= page_center && item_bottom > page_center) {
                distance_from_center = item_bottom - page_center;
            }

            if (item_top <= page_center && item_bottom >= page_center) {
                distance_from_center = 0;
            }

            return distance_from_center;
        } else {
            return 0;
        }
    };

    var ScrollPosition = function ScrollPosition() {
        if (window.pageYOffset !== undefined) {
            return [pageYOffset, pageYOffset + page_visible_height];
        } else {
            var page_y_top_offset, page_y_bottom_offset;
            page_y_top_offset = document.documentElement.scrollTop || document.body.scrollTop || 0;
            page_y_bottom_offset = page_y_top_offset + page_visible_height;
            return [page_y_top_offset, page_y_bottom_offset];
        }
    };

    var ScrollToSection = function ScrollToSection(element) {
        var offset;

        if (element.offsetHeight > page_visible_height) {
            offset = element.offsetTop - 24;
        } else {
            offset = element.offsetTop - (page_visible_height - element.offsetHeight) / 2;
        }

        window.scrollTo({
            top: offset,
            behavior: 'smooth'
        });
    };

    var OnScroll = function OnScroll() {
        var force = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
        var minScrollTime = delay;
        var now = new Date().getTime();

        var processScroll = function processScroll() {
            var ScrollPos = ScrollPosition(),
                StagesPositionPercentage = [],
                currentElement = null,
                currentIndicator = null;
            Array.prototype.forEach.call(SpySections, function (element) {
                var Percent = [element[0].offsetTop, GetVisibilityPercent(element[0], ScrollPos)];

                if (Percent[1] !== 0) {
                    StagesPositionPercentage.push(Percent);
                }
            });

            if (StagesPositionPercentage.length === 0) {
                StagesPositionPercentage[0] = [0, 0];
                StagesPositionPercentage[1] = [0, 0];
                fakePercent = true;

                if (hasIndicator && !ForceActiveIndicator) {
                    Array.prototype.forEach.call(SpySections, function (element) {
                        element[1].classList.remove('spy-active');
                    });
                    fakePercent = false;
                    currentIndicator = -1;
                }
            } else {
                fakePercent = false;
            }

            if (StagesPositionPercentage.length === 1) {
                StagesPositionPercentage[1] = [0, 0];
            }

            var max = StagesPositionPercentage.reduce(function (a, b) {
                return Math.max(a[1], b[1]);
            });

            if (isNaN(max)) {
                var TempStagesPositionPercentage = [];
                Array.prototype.forEach.call(StagesPositionPercentage, function (objectPositionPercentage) {
                    Array.prototype.forEach.call(SpySections, function (element) {
                        if (element[0].offsetTop === objectPositionPercentage[0]) {
                            var DistanceFromCenter = [element[0].offsetTop, GetVisibilityDistanceFromCenter(element[0], ScrollPos)];

                            if (!TempStagesPositionPercentage.includes(DistanceFromCenter)) {
                                TempStagesPositionPercentage.push(DistanceFromCenter);
                            }
                        }
                    });
                });
                TempStagesPositionPercentage.reduce(function (a, b) {
                    if (typeof a !== 'undefined' && typeof b != "undefined") {
                        max = Math.min(a[1], b[1]);
                    }
                });
                StagesPositionPercentage = TempStagesPositionPercentage;
            }

            if (max !== lastItemPercent) {
                lastItemPercent = max;
                Array.prototype.forEach.call(StagesPositionPercentage, function (objectPositionPercentage) {
                    if (firstScroll && !fakePercent) {
                        objectPositionPercentage[1] = max;
                        firstScroll = false;
                        CurrentPositionTop = 0;
                        lastItemPercent = 0;
                    }

                    if (objectPositionPercentage[1] === max && objectPositionPercentage[0] !== CurrentPositionTop && !fakePercent) {
                        CurrentPositionTop = objectPositionPercentage[0];
                        Array.prototype.forEach.call(SpySections, function (element) {
                            if (element[0].offsetTop === objectPositionPercentage[0]) {
                                currentElement = element[0];
                                currentIndicator = element[1];
                            }
                        });

                        if (hasIndicator && currentIndicator !== -1) {
                            Array.prototype.forEach.call(SpySections, function (element) {
                                element[1].classList.remove('spy-active');
                            });
                            currentIndicator.classList.add('spy-active');
                        }

                        if (currentElement !== null && typeof currentElement !== 'undefined') {
                            callback_OnChange(currentElement);
                        }
                    }
                });
            }
        };

        if (!scrollTimer && !force) {
            if (now - lastScrollFireTime > 3 * minScrollTime) {
                processScroll(); // fire immediately on first scroll

                lastScrollFireTime = now;
            }

            scrollTimer = setTimeout(function () {
                scrollTimer = null;
                lastScrollFireTime = new Date().getTime();
                processScroll();
            }, minScrollTime);
        } else {
            processScroll();
        }
    };

    var OnWindowResize = function OnWindowResize() {
        if (page_visible_height !== window.innerHeight) {
            page_visible_height = window.innerHeight;
            Initialize();
            self.Indicator(indicator_settings_saved);
        }
    };

    var InitializeOnScrollEvent = function InitializeOnScrollEvent() {
        var SpySectionsObject = document.getElementsByClassName(settings['contexts_class']);
        var SpySectionsUnfiltered = [];
        Array.prototype.forEach.call(SpySectionsObject, function (object) {
            SpySectionsUnfiltered[object.offsetTop] = object;
        });
        SpySectionsObject = null;
        SpySectionsUnfiltered = SpySectionsUnfiltered.filter(function (element) {
            return element !== undefined;
        });
        Array.prototype.forEach.call(SpySectionsUnfiltered, function (item) {
            var SpySection = [item];

            if (!SpySections.includes(SpySection)) {
                SpySections.push(SpySection);
            }
        });
        SpySectionsUnfiltered = null;
        document.addEventListener("scroll", OnScroll);
        window.addEventListener("resize", OnWindowResize);
    };

    var Initialize = function Initialize() {
        var callbackOnChange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : callback_OnChange();
        SpySections = [];

        if (typeof callbackOnChange !== 'undefined') {
            callback_OnChange = callbackOnChange;
        }

        InitializeOnScrollEvent();
    };

    var DestroyOnScrollEvent = function DestroyOnScrollEvent() {
        var callbackOnDestroy = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : function () {};
        document.removeEventListener("scroll", OnScroll);

        if (hasIndicator) {
            indicator_settings_saved['element'].innerHTML = '';
        }

        delay = null;
        page_visible_height = null;
        SpySections = null;
        CurrentPositionTop = null;
        lastItemPercent = null;
        fakePercent = null;
        firstScroll = null;
        hasIndicator = null;
        indicator_settings_saved = null;
        callbackOnDestroy();
    };

    Initialize(callback_OnChange);
    OnScroll();
    return self;
}
