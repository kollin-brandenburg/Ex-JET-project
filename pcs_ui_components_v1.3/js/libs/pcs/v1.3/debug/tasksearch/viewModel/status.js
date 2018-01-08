define(function() {
        'use strict';
        var statusType = {
            ASSIGNED: 'ASSIGNED',
            INFO_REQUESTED: 'INFO_REQUESTED',
            WITHDRAWN: 'WITHDRAWN',
            SUSPENDED: 'SUSPENDED',
            ALERTED: 'ALERTED',
            ERRORED: 'ERRORED',
            EXPIRED: 'EXPIRED',
            COMPLETED: 'COMPLETED'
        };

        return {
            statusType: statusType
        };
    }

);
