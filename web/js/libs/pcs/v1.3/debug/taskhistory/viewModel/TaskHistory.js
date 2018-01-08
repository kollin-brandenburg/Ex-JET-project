define(['jquery','pcs/data-services/DataServices','pcs/tasklist/viewModel/Task' ],
	function($,DataServices, Task) {
    'use strict';
    var resourceUrlConfig = {
            tasks: '/tasks',
            processAudit: '/processes'
        },
        dataServices = DataServices.getInstance();


    //TODO: refactor to remove jquery deferred and use Promise when moving to JET 2.1
    return function(options) {
        //entire UI state of the task list is stored in _state
        var _state = {};
        //options will contain all preferences or customizations that can be
        //passed to task list via component. It will also contain language
        //and timezone
        _state.options = options;

        /*
                var resourcePaths = {
                        tasks: {
                            url: '/tasks'
                        }
                    },
                    createIdObjectArray = function(identityId, identityType) {
                        var idArray = [];
                        for (var i = 0; i < identityId.length; i++) {
                            idArray.push({
                                id: identityId[i],
                                type: identityType[i]
                            });
                        }
                        return idArray;
                    };
        */

        return {
            fetchTask: function(taskNumber) {
                var url = resourceUrlConfig.tasks;
                var promise = $.Deferred();

                url += '/' + taskNumber;
                dataServices.get(url, null, '4.0').done(function(data) {
                    promise.resolve(data);
                }).fail(function(error) {
                    promise.reject(error);
                });
                return promise;
            },
            fetchProcessAuditInfo: function(procInstId, currentTaskNumber) {
                var url = resourceUrlConfig.processAudit;
                var promise = $.Deferred();

                url += '/' + procInstId;
                url += '/audit?graphicFlag=false&filterActivitiesBy=USER_TASK&filterActivitiesBy=START_EVENT&filterActivitiesBy=END_EVENT&includeFutureTasksFlag=true';
                url += '&currentTaskNumber=' + currentTaskNumber;
                dataServices.get(url, null, '4.0').done(function(data) {
                    promise.resolve(data);
                }).fail(function(error) {
                    promise.reject(error);
                });
                return promise;
            }
        };
    };
});
