define(['ojL10n!pcsMsg/nls/pcsSnippetsResource', 'pcs/tasksearch/filter/filterType'], function(bundle, filterType) {
        'use strict';
        /**
         *  An array holds list of available operators
         * @type {{operator: {OPERATOR_ON: string, OPERATOR_WITH_IN: string, OPERATOR_IN_LAST: string,
         * OPERATOR_BEFORE: string, OPERATOR_AFTER: string, OPERATOR_BETWEEN: string, OPERATOR_IS: string,
         * OPERATOR_CONTAINS: string}}}
         */
        var operators = {
            operator: {
                OPERATOR_ON: 'on',
                OPERATOR_WITH_IN: 'within',
                OPERATOR_IN_LAST: 'inlast',
                OPERATOR_BEFORE: 'before',
                OPERATOR_AFTER: 'after',
                OPERATOR_BETWEEN: 'between',
                OPERATOR_IS: 'is',
                OPERATOR_CONTAINS: 'contains',
                OPERATOR_GREATER_THAN: 'greaterthan',
                OPERATOR_LESSER_THAN: 'lesserthan',
                OPERATOR_EQUALS: 'equals'
            }
        };

        /**
         * An array holds the available date filter operator with label and value.
         * @type {*[]}
         */
        var availableDateFilterOperators = [{
            value: operators.operator.OPERATOR_ON,
            label: bundle.pcs.tasksearch.on
        }, {
            value: operators.operator.OPERATOR_BEFORE,
            label: bundle.pcs.tasksearch.before
        }, {
            value: operators.operator.OPERATOR_AFTER,
            label: bundle.pcs.tasksearch.after
        }, {
            value: operators.operator.OPERATOR_BETWEEN,
            label: bundle.pcs.tasksearch.between
        }];

        /**
         * An array holds the array of available string filter operators with label and value.
         * @type {*[]}
         */
        var availableStringFilterOperators = [{
            value: operators.operator.OPERATOR_IS,
            label: bundle.pcs.tasksearch.is
        }, {
            value: operators.operator.OPERATOR_CONTAINS,
            label: bundle.pcs.tasksearch.contains
        }];


        var availableNumberFilterOperators = [{
            value: operators.operator.OPERATOR_IS,
            label: bundle.pcs.tasksearch.is
        }, {
            value: operators.operator.OPERATOR_GREATER_THAN,
            label: bundle.pcs.tasksearch.greater_than
        }, {
            value: operators.operator.OPERATOR_LESSER_THAN,
            label: bundle.pcs.tasksearch.lesser_than
        }, {
            value: operators.operator.OPERATOR_BETWEEN,
            label: bundle.pcs.tasksearch.between
        }];



        return {
            operators: operators,
            getAvailableDateFilterOperators: function() {
                return availableDateFilterOperators;
            },
            getAvailableStringFilterOperators: function() {
                return availableStringFilterOperators;
            },
            getFilterOperatorsByType: function(type) {
                if (type && filterType.filterTypes.DATE === type) {
                    return availableDateFilterOperators;
                } else if (type && filterType.filterTypes.STRING === type) {
                    return availableStringFilterOperators;
                } else if (type && filterType.filterTypes.NUMBER === type || type && filterType.filterTypes.INTEGER === type ||
                    type && filterType.filterTypes.DOUBLE === type || type && filterType.filterTypes.FLOAT === type) {
                    return availableNumberFilterOperators;
                }
            }
        };
    }

);
