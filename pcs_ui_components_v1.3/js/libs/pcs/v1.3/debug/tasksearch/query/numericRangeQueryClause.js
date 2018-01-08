define(function() {
    'use strict';

    function NumericRangeQuery(options) {
        var self = this;
        self.fieldName = options.fieldName;
        self.minInclusive = options.minInclusive;
        self.maxInclusive = options.maxInclusive;
        self.numericRanges = options.numericRanges;
        if (options.boost) {
            self.boost = options.boost;
        }
    }
    return NumericRangeQuery;
});
