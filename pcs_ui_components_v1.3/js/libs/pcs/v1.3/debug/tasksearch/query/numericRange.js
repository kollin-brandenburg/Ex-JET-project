define(function() {
    'use strict';

    function NumericRange(options) {
        var self = this;
        self.type = options.type;
        self.minValue = options.minValue;
        self.maxValue = options.maxValue;
        self.primitiveType = options.primitiveType;
    }

    return NumericRange;
});
