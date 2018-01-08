define(['knockout', 'pcs/tasksearch/filter/filterValueType'], function(ko, filterValueType) {
    'use strict';

    function FilterValue(options) {
        var self = this;
        self.type = ko.observable(options.type || '');
        if (filterValueType.valueTypes.LIST === options.type && options.listOfValues) {
            self.listOfValues = ko.observableArray(options.listOfValues);
            var initialValue = options.listOfValues.length > 0 ? options.listOfValues[0].value : '';
            self.value = ko.observableArray([initialValue]);
        } else {
            self.listOfValues = ko.observableArray();
            self.value = ko.observable('');
        }
    }
    return FilterValue;
});
