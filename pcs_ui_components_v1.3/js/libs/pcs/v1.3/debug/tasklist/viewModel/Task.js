define(function() {
    'use strict';
    return function(data, mapping) {

        if (mapping && mapping.hasOwnProperty('update')) {
            for (var key in data) {
                if (!data.hasOwnProperty(key)) {
                    continue;
                }
                if (mapping.update.hasOwnProperty(key)) {
                    data[key] = typeof mapping.update[key] === 'function' ? mapping.update[key](data[key]) : data[key];
                }
            }
        }

        return {
            getTitle: function() {
                return data.title;
            },
            getNumber: function() {
                return data.number;
            },
            getFromUser: function() {
                return data.fromUserDisplayName;
            },
            getState: function() {
                return data.state;
            },
            getAssignees: function() {
                return data.assignees.items;
            },
            getCreator: function() {
                return data.creatorName;
            },
            getAssignedDate: function() {
                return data.assignedDate;
            },
            getCreatedDate: function() {
                return data.createdDate;
            },
            getPriority: function() {
                return data.priority;
            },
            getFromUserName: function() {
                return data.fromUserName;
            },
            getFromUserDisplayName: function() {
                return data.fromUserDisplayName;
            },
            getShortSummary: function() {
                return data.shortSummary;
            },
            getDueDate: function() {
                return data.dueDate;
            },
            getProcessName: function() {
                return data.processName;
            },
            getUpdatedDate: function() {
                return data.updatedDate;
            },
            getActionList: function() {
                return data.actionList;
            }
        };
    };
});
