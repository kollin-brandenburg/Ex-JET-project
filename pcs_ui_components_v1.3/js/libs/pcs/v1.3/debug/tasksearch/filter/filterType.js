define(function() {
        'use strict';
        /**
         * An array to holds the different type of filter.
         * @type {{filterType: {DATE: string, STRING: string}}}
         */
        var filterTypes = {
            DATE: 'Date',
            STRING: 'String',
            INTEGER: 'Integer',
            DOUBLE: 'Double',
            Number: 'Number',
            FLOAT: 'Float',
            LONG: 'Long',
            USER: 'User'
        };

        return {
            filterTypes: filterTypes
        };
    }

);
