/**
 * Created by rojv on 8/25/2016.
 */

//TODO nisabhar do we need 'ojs/ojconveyorbelt', 'ojs/ojradioset', 'ojs/ojswitch'
define(['ojs/ojcore', 'knockout', 'jquery', 'pcs/tasklist/viewModel/filtersData', 'ojs/ojknockout', 'ojs/ojnavigationlist', 'ojs/ojconveyorbelt',
        'ojs/ojradioset', 'ojs/ojswitch'
    ],
    function(oj, ko, $, fData) {
        'use strict';

        function FiltersViewModel() {

            var self = this;

            self.navigationLevel = ko.observable('page');
            //Set the resourcebundle
            self.bundle = require('ojL10n!pcsMsg/nls/pcsSnippetsResource');

            self.recentSearchesModule = (function() {
                var filters = ko.observableArray(fData.getRecentSearches());
                var moreLimit = 5;
                var showAll = ko.observable(false);
                var filtersToShow = ko.computed(function() {
                    return (showAll() ? filters() : filters.slice(0, moreLimit));
                });
                return {
                    getFilters: function() {
                        return filtersToShow();
                    },
                    isShowMore: ko.computed(function() {
                        if (showAll()) {
                            return false;
                        }
                        return (filters().length > moreLimit ? true : false);
                    }),
                    clickMore: function() {
                        // Show more components
                        showAll(true);
                        // Refresh the Navigation List - Needed since CSS and other binding are not applied to the new <li> element(s)
                        $('.recent-search-component').ojNavigationList('refresh');
                        //TODO nisabhar Do this in context of some element
                    }
                };
            }());

            self.standardFiltersModule = (function() {
                var filters = ko.observableArray(fData.getStandardFilters());
                var moreLimit = 5;
                var showAll = ko.observable(false);
                var filtersToShow = ko.computed(function() {
                    return (showAll() ? filters() : filters.slice(0, moreLimit));
                });
                return {
                    getFilters: function() {
                        return filtersToShow();
                    },
                    isShowMore: ko.computed(function() {
                        if (showAll()) {
                            return false;
                        }
                        return (filters().length > moreLimit ? true : false);
                    }),
                    clickMore: function() {
                        // Show more components
                        showAll(true);
                        // Refresh the Navigation List - Needed since CSS and other binding are not applied to the new <li> element(s)
                        $('.std-filters-component').ojNavigationList('refresh');
                        //TODO nisabhar Do this in context of some element
                    }
                };
            }());

            self.savedFiltersModule = (function() {
                var filters = ko.observableArray(fData.getSavedFilters());
                var moreLimit = 5;
                var showAll = ko.observable(false);
                var filtersToShow = ko.computed(function() {
                    return (showAll() ? filters() : filters.slice(0, moreLimit));
                });
                return {
                    getFilters: function() {
                        return filtersToShow();
                    },
                    isShowMore: ko.computed(function() {
                        if (showAll()) {
                            return false;
                        }
                        return (filters().length > moreLimit ? true : false);
                    }),
                    clickMore: function() {
                        // Show more components
                        showAll(true);
                        // Refresh the Navigation List - Needed since CSS and other binding are not applied to the new <li> element(s)
                        $('.saved-filters-component').ojNavigationList('refresh');
                        //TODO nisabhar Do this in context of some element
                    }
                };
            }());

            self.filterNavItem = (function(data) {
                var selectedFilter = ko.observable(self.standardFiltersModule.getFilters()[0]);
                return {
                    setSelectedFilter: function() {
                        selectedFilter(data);
                    },
                    getSelectedFilter: function() {
                        return selectedFilter;
                    }
                };
            }());

            self.getInbox = function() {
                alert('Inbox selected');
            };

            self.getFavourites = function() {
                alert('Favourites');
            };
        }
        return new FiltersViewModel();
    }
);
