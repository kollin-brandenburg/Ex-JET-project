define(function() {
    'use strict';

    function WildcardQuery(options) {
        var self = this;
        self.fieldName = options.fieldName || '';
        self.expression = options.values || '';
        if (options.boost) {
            self.boost = options.boost;
        }
    }
    return WildcardQuery;
});
