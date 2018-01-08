define(['jquery','pcs/data-services/DataServices','pcs/tasklistActions/viewModel/Task'],
	function($,DataServices,Task) {
    'use strict';
    var resourceUrlConfig = {
            tasks: '/tasks',
            identities: '/identities'
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
        var resourcePaths = {
                tasks: {
                    url: '/tasks'
                }
            },

            doActionOnTask = function(task, action, type, comments) {
                var actionParams = {
                    payload: {
                        action: {
                            id: action.toUpperCase(),
                            type: type
                        }
                    }
                };

                if (task == null) {
                    task = _state.selectedTask ? _state.selectedTask : null;
                }
                if (comments && comments.trim() !== '') {
                    actionParams.payload.comment = {
                        commentStr: comments,
                        commentScope: 'BPM'
                    };
                }
                var promise = $.Deferred();
                if (task != null) {
                    var url = resourceUrlConfig.tasks + '/' + task.getNumber();
                    dataServices.put(url, actionParams).then(function(data) {
                        promise.resolve(new Task(data));
                    }).fail(function(error) {
                        promise.reject(error);
                    });
                } else {
                    promise.reject('Task is null or undefined');
                }
                return promise;
            },

            doBulkActionOnTasks = function(tasks, action, type, comments) {
                var actionParams = {
                    payload: {
                        action: {
                            id: action.toUpperCase(),
                            type: type
                        },
                        tasks: []
                    }
                };
                var promise = $.Deferred();
                if (tasks && Array.isArray(tasks)) {

                    tasks.forEach(function(item) {
                        actionParams.payload.tasks.push(item.getNumber());
                    });

                    if (comments && comments.trim() !== '') {
                        actionParams['payload'].comment = {
                            commentStr: comments,
                            commentScope: 'BPM'
                        };
                    }

                    var url = resourceUrlConfig.tasks;

                    dataServices.put(url, actionParams).then(function(data) {
                        promise.resolve(data.items.map(function(item) {
                            return new Task(item);
                        }));
                    }).fail(function(error) {
                        promise.reject(error);
                    });
                } else {
                    promise.reject('Tasks is undefined or empty');
                }
                return promise;
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
            },

            requestInfoBulk = function(taskList, identityId, identityType, userComment) {
                if (taskList == null) {
                    taskList = _state.tasks ? _state.tasks : null;
                }
                var promise = $.Deferred();
                if (taskList != null) {
                    var actionParams = {
                        payload: {
                            identities: createIdObjectArray(identityId, identityType),
                            action: {
                                id: 'INFO_REQUEST',
                                type: 'SYSTEM'
                            },
                            tasks: taskList.map(function(item) {
                                return String(item.getNumber());
                            }),
                            comment: {
                                commentStr: userComment,
                                commentScope: 'TASK'
                            }
                        }
                    };
                    var url = resourceUrlConfig.tasks;
                    dataServices.put(url, actionParams).then(function(data) {
                        promise.resolve(data.items.map(function(item) {
                            return new Task(item);
                        }));
                    }).fail(function(error) {
                        promise.reject(error);
                    });
                } else {
                    promise.reject('Task is undefined or null');
                }
                return promise;
            },
            requestInfo = function(task, identityId, identityType, userComment) {
                if (task == null) {
                    task = _state.selectedTask ? _state.selectedTask : null;
                }
                var promise = $.Deferred();
                if (task != null) {
                    var actionParams = {
                        payload: {
                            identities: createIdObjectArray(identityId, identityType),
                            action: {
                                id: 'INFO_REQUEST',
                                type: 'SYSTEM'
                            },
                            comment: {
                                commentStr: userComment,
                                commentScope: 'TASK'
                            }
                        }
                    };

                    promise = new Promise(function(resolve, reject) {
                        var url = resourceUrlConfig.tasks + '/' + task.getNumber();
                        dataServices.put(url, actionParams).then(function(data) {
                            resolve(new Task(data));
                        }).fail(function(error) {
                            reject(error);
                        });
                    });
                } else {
                    promise.reject('Task is undefined or null');
                }
                return promise;
            },

            reassignTasks = function(taskList, payloadObj) {
                if (taskList == null) {
                    taskList = _state.tasks ? _state.tasks : null;
                }
                var promise = $.Deferred();
                if (taskList != null) {
                    var actionParams = {
                        payload: {
                            identities: createIdObjectArray(payloadObj.identityId, payloadObj.identityType),
                            action: {
                                id: payloadObj.reassignType,
                                type: 'SYSTEM'
                            },
                            tasks: taskList.map(function(item) {
                                return String(item.getNumber());
                            }),
                            comment: {
                                commentStr: payloadObj.userComment,
                                commentScope: 'TASK'
                            }
                        }
                    };
                    var url = resourceUrlConfig.tasks;
                    dataServices.put(url, actionParams).then(function(data) {
                        promise.resolve(data.items.map(function(item) {
                            return new Task(item);
                        }));
                    }).fail(function(error) {
                        promise.reject(error);
                    });
                } else {
                    promise.reject('Task is undefined or null');
                }
                return promise;
            },
            reassignTask = function(task, payloadObj) {
                if (task == null) {
                    task = _state.selectedTask ? _state.selectedTask : null;
                }
                var promise = $.Deferred();
                if (task != null) {
                    var actionParams = {
                        payload: {
                            identities: createIdObjectArray(payloadObj.identityId, payloadObj.identityType),
                            action: {
                                id: payloadObj.reassignType,
                                type: 'SYSTEM'
                            },
                            comment: {
                                commentStr: payloadObj.userComment,
                                commentScope: 'TASK'
                            }
                        }
                    };

                    promise = new Promise(function(resolve, reject) {
                        var url = resourceUrlConfig.tasks + '/' + task.getNumber();
                        dataServices.put(url, actionParams).then(function(data) {
                            resolve(new Task(data));
                        }).fail(function(error) {
                            reject(error);
                        });
                    });
                } else {
                    promise.reject('Task is undefined or null');
                }
                return promise;
            },
            getIdentityInfo = function(params) {
                var promise = $.Deferred();
                var url = resourceUrlConfig.identities;
                var options = {
                    contentType: 'application/json; charset=utf-8',
                    queryParams: params
                };
                dataServices.get(url, options, null, params).then(function(data) {
                    promise.resolve(data);
                }).fail(function(error) {
                    promise.reject(error);
                });
                return promise;
            };

        return {
            getTaskDetail: function(task, params) {
                var promise = $.Deferred();
                if (task) {
                    var options = params ? {
                        queryParams: params
                    } : null;
                    var url = resourcePaths.tasks.url + '/' + task.getNumber();

                    dataServices.get(url, options).then(function(data) {
                        var result = new Task(data);
                        _state.selectedTask = result;
                        promise.resolve(result); //TODO: to map data
                    }).fail(function(error) {
                        promise.reject(error);
                    });
                } else {
                    return promise.reject('Task is not passed');
                }
                return promise;
            },

            doCustomActionOnTask: function(task, action, comments) {
                return doActionOnTask(task, action, 'CUSTOM', comments);
            },

            doSystemActionOnTask: function(task, action, comments) {
                return doActionOnTask(task, action, 'SYSTEM', comments);
            },

            doCustomActionOnTasks: function(tasks, action, comments) {
                return doBulkActionOnTasks(tasks, action, 'CUSTOM', comments);
            },

            doSystemActionOnTasks: function(tasks, action, comments) {
                return doBulkActionOnTasks(tasks, action, 'SYSTEM', comments);
            },

            reassignTasks: function(tasks, payloadObj) {
                //reassign the task to the identityId
                //if task is not passed, use selectedTask
                return ((tasks.length <= 1) ?
                    reassignTask(tasks[0], payloadObj) :
                    reassignTasks(tasks, payloadObj));
            },

            requestInfo: function(tasks, toUserId, identityType, comment) {
                //request info with the comment to the toUserId passed or
                //route to the previous assignee if toUserId is not passed
                //if task is not passed, use selectedTask
                return ((tasks.length <= 1) ?
                    requestInfo(tasks[0], toUserId, identityType, comment) :
                    requestInfoBulk(tasks, toUserId, identityType, comment));
            },

            getIdentities: function(params) {
                return getIdentityInfo(params);
            }

        };
    };
});
