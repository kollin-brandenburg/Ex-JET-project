define(function() {
    'use strict';

    function StringQuery(options) {
        var self = this;
        self.fieldName = options.fieldName || '';
        self.values = options.values || [];
        if (options.boost) {
            self.boost = options.boost;
        }
    }
    return StringQuery;
});
