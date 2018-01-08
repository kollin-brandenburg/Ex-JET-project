define(function() {
    'use strict';

    function QueryClause() {
        var self = this;
        self.queryClauses = [];
        self.operator = 'MUST';
    }
    return QueryClause;
});
