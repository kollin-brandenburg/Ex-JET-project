/**
 * Created by rojv on 8/25/2016.
 */

define(['jquery'],
    function($) {
        'use strict';

        function FilterData() {

            var self = this;

            self.getRecentSearches = function() {
                var recentSearches = ['Completed tasks created by Me', 'Assigned Tasks in Loan Approval Process', 'Tasks overdue in Vacation Approval Process'];
                return recentSearches;
            };

            self.getStandardFilters = function() {
                var standardFilters = ['My Filters', 'High Priority', 'Related to Me', 'Started By Me'];
                return standardFilters;
            };

            self.getSavedFilters = function() {
                var savedFilters = ['Retail Customers - Gold Customers', 'Credit Card Requests - US', 'New Hires - ST Department', 'New Hires - Waiting for budget Approval',
                    'Credit Card Requests - IN', 'Vacation Requests overdue'
                ];
                return savedFilters;
            };
        }
        return new FilterData();
    }
);
