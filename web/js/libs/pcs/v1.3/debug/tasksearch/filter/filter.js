define(['knockout', 'jquery', 'ojL10n!pcsMsg/nls/pcsSnippetsResource', 'pcs/tasksearch/filter/filterOperator', 'pcs/tasksearch/filter/filterType', 'pcs/tasksearch/filter/filterValue', 'pcs/tasksearch/filter/filterValueType'],

    function(ko, $, bundle, filterOperator, filterType, filterValue, filterValueType) {
        'use strict';

        function Filter(options) {
            var self = this;

            self.name = options.name || '';
            self.displayName = options.displayName || '';
            self.type = ko.observable(options.type || '');
            self.filterOperator = ko.observableArray(options.filterOperator || []);
            var filterOperatorLOV = options.filterOperators ? options.filterOperators : filterOperator.getFilterOperatorsByType(options.type);
            self.filterOperators = ko.observableArray(filterOperatorLOV || []);
            self.values = ko.observableArray([]);
            self.canDelete = options.canDelete || false;
            self.isMust = ko.observableArray([]);
            if (options.values) {
                self.values(options.values);
            } else {
                if (self.type() === filterType.filterTypes.DATE) {
                    self.filterOperator([filterOperator.operators.operator.OPERATOR_ON]);
                    self.values([new filterValue({
                        type: filterValueType.valueTypes.DATE
                    })]);
                }

                if (self.type() === filterType.filterTypes.STRING) {
                    self.filterOperator([filterOperator.operators.operator.OPERATOR_IS]);
                    self.values([new filterValue({
                        type: filterValueType.valueTypes.STRING
                    })]);
                }

                if (self.type() === filterType.filterTypes.DOUBLE) {
                    self.filterOperator([filterOperator.operators.operator.OPERATOR_IS]);
                    self.values([new filterValue({
                        type: filterValueType.valueTypes.DOUBLE
                    })]);
                }

                if (self.type() === filterType.filterTypes.INTEGER) {
                    self.filterOperator([filterOperator.operators.operator.OPERATOR_IS]);
                    self.values([new filterValue({
                        type: filterValueType.valueTypes.INTEGER
                    })]);
                }
            }

            function handleDateFilterOperatorChange(event, data) {
                var filterElementId = '#' + event.currentTarget.id;
                var filterValues = $(filterElementId).siblings('.pcs-ts-filter-values');
                var newValue = data.value[0];
                if (filterOperator.operators.operator.OPERATOR_IN_LAST === newValue ||
                    filterOperator.operators.operator.OPERATOR_WITH_IN === newValue) {
                    $(filterValues).empty();
                    self.values.removeAll();
                    var availableListofValues = [{
                        value: 'Days',
                        label: bundle.pcs.tasksearch.days
                    }, {
                        value: 'Months',
                        label: bundle.pcs.tasksearch.months
                    }, {
                        value: 'years',
                        label: bundle.pcs.tasksearch.years
                    }];
                    self.values([new filterValue({
                            type: filterValueType.valueTypes.DATE
                        }),
                        new filterValue({
                            type: filterValueType.valueTypes.LIST,
                            listOfValues: availableListofValues
                        })
                    ]);
                }
                if (filterOperator.operators.operator.OPERATOR_BEFORE === newValue ||
                    filterOperator.operators.operator.OPERATOR_AFTER === newValue ||
                    filterOperator.operators.operator.OPERATOR_ON === newValue) {
                    $(filterValues).empty();
                    self.values.removeAll();
                    self.values([new filterValue({
                        type: filterValueType.valueTypes.DATE
                    })]);
                }
                if (filterOperator.operators.operator.OPERATOR_BETWEEN === newValue) {
                    $(filterValues).empty();
                    self.values.removeAll();
                    self.values([new filterValue({
                            type: filterValueType.valueTypes.DATE
                        }),
                        new filterValue({
                            type: filterValueType.valueTypes.DATE
                        })
                    ]);
                }
            }

            function handleNumberFilterOperatorChange(event, data, valueType) {
                var filterElementId = '#' + event.currentTarget.id;
                var filterValues = $(filterElementId).siblings('.pcs-ts-filter-values');
                var newValue = data.value[0];
                if (filterOperator.operators.operator.OPERATOR_IS === newValue ||
                    filterOperator.operators.operator.OPERATOR_GREATER_THAN === newValue ||
                    filterOperator.operators.operator.OPERATOR_LESSER_THAN === newValue ||
                    filterOperator.operators.operator.OPERATOR_CONTAINS === newValue) {
                    $(filterValues).empty();
                    self.values.removeAll();
                    self.values([new filterValue({
                        type: valueType
                    })]);
                }
                if (filterOperator.operators.operator.OPERATOR_BETWEEN === newValue) {
                    $(filterValues).empty();
                    self.values.removeAll();
                    self.values([new filterValue({
                            type: valueType
                        }),
                        new filterValue({
                            type: valueType
                        })
                    ]);
                }
            }

            self.handleFilterOperatorChange = function handleFilterOperatorChange(event, data) {
                if (self.type() === filterType.filterTypes.DATE) {
                    handleDateFilterOperatorChange(event, data);
                }
                if (self.type() === filterType.filterTypes.INTEGER || self.type() === filterType.filterTypes.DOUBLE) {
                    handleNumberFilterOperatorChange(event, data, self.type());
                }
            };
        }
        return Filter;
    }
);
