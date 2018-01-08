define(function() {
    'use strict';

    function Query(options) {
        var self = this;
        self.queryClauses = [];
        self.operator = options.operator || 'MUST';
    }

    return Query;
});
