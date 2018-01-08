define(function() {
    'use strict';

    function TextQuery(options) {
        var self = this;
        self.fieldName = options.fieldName || '';
        self.values = options.values || [];
        if (options.boost) {
            self.boost = options.boost;
        }
    }
    return TextQuery;
});
