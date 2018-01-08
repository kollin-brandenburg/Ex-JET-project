define(function() {
    'use strict';
    var numericRangeType = {
        Integer: 'IntegerRange',
        Long: 'LongRange',
        Float: 'FloatRange',
        Date: 'LongRange',
        Double: 'DoubleRange'
    };

    var numericRangePrimitiveType = {
        Integer: 'Integer',
        Long: 'Long',
        Float: 'Float',
        Date: 'Long',
        Double: 'Double'
    };

    return {
        getNumericRangeTypeBasedOnType: function getNumericRangeTypeBasedOnType(dataType) {
            return numericRangeType[dataType];
        },
        getNumericRangePrimitiveTypeBasedOnType: function getNumericRangePrimitiveTypeBasedOnType(dataType) {
            return numericRangePrimitiveType[dataType];
        }
    };
});
