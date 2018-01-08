define(function() {
    'use strict';
    return function(data) {
        return {
            getProcessDefId: function() {
                return data.processDefId;
            },
            getProcessName: function() {
                return data.hasOwnProperty('processName') ? data.processName : '';
            },
            getRevision: function() {
                return data.revision;
            }
        };
    };
});
