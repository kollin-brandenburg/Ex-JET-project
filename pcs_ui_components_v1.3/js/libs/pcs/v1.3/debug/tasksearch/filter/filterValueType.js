define(function() {
        'use strict';
        /**
         * An array to holds the different type of filter value.
         * @type {{filterType: {DATE: string, STRING: string}}}
         */
        var valueTypes = {
            DATE: 'Date',
            STRING: 'String',
            INTEGER: 'Integer',
            DOUBLE: 'Double',
            FLOAT: 'Float',
            LONG: 'Long',
            NUMBER: 'Number',
            LIST: 'List'
        };

        return {
            valueTypes: valueTypes
        };
    }

);
