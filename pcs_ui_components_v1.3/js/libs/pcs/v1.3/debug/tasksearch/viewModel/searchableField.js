define(function() {
    'use strict';
    return function(data) {
        return {
            getFieldName: function() {
                return data.searchFieldName;
            },
            getDisplayName: function() {
                return data.displayName;
            },
            getDataType: function() {
                return data.dataType;
            },
            getCategory: function() {
                return data.category;
            },
            getProcessName: function() {
                return data.processName;
            }
        };
    };
});
