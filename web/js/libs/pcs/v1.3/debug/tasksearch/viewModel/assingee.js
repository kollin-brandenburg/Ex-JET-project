define(function() {
        'use strict';
        var assigneeType = {
            MY: 'MY',
            MY_AND_GROUP: 'MY_AND_GROUP',
            MY_AND_GROUP_ALL: 'MY_AND_GROUP_ALL',
            REPORTEES: 'REPORTEES',
            CREATOR: 'CREATOR',
            REVIEWER: 'REVIEWER',
            PREVIOUS: 'PREVIOUS',
            ADMIN: 'ADMIN',
            OWNER: 'OWNER'
        };

        return {
            assigneeType: assigneeType
        };
    }

);
