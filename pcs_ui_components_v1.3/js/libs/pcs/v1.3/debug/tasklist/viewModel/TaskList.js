define(['jquery','pcs/data-services/DataServices','pcs/tasklist/viewModel/Task' ],
	function($,DataServices, Task) {
    'use strict';
    var resourceUrlConfig = {
            tasks: '/tasks',
            taskSearch: '/tasks/search'
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

            /*
            //TODO nisabhar Do we need this method , I see it in many place . Can't it be moved to util ?
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
            */
            doActionOnTask = function(task, action, type, comments) {

                //TODO nisabhar , check if you can do uppercase in all cases. by creating a human task with actions  in small letters.
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

                        //TODO nisabhar , Show error meesage
                    });
                } else {
                    promise.reject('Task is null or undefined');
                    //TODO nisabhar , Show error meesage
                }
                return promise;
            };
        /*
                    ,doBulkActionOnTasks = function(tasks, action, type, comments) {
                        //TODO nisabhar , check if you can do uppercase in all cases. by creating a human task with actions  in small letters.
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
                                actionParams.payload.comment = {
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
                                //TODO nisabhar , Show error meesage
                            });
                        } else {
                            promise.reject('Tasks is undefined or empty');
                            //TODO nisabhar , Show error meesage
                        }
                        return promise;
                    },

                    requestInfoBulk = function(taskList, identityId, identityType, userComment) {
                        if (taskList == null) {
                            taskList = _state.tasks ? _state.tasks : null;
                        }
                        var promise = $.Deferred();
                        if (taskList != null) {
                            var actionParams = {
                                payload: {
                                    assignees: createIdObjectArray(identityId, identityType),
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
                    reassignTasks = function(taskList, identityId, identityType, isDelegate) {
                        if (taskList == null) {
                            taskList = _state.tasks ? __state.tasks : null;
                        }
                        var promise = $.Deferred();
                        if (taskList != null) {
                            var actionParams = {
                                payload: {
                                    assignees: createIdObjectArray(identityId, identityType),
                                    action: {
                                        id: (isDelegate ? 'DELEGATE' : 'REASSIGN'),
                                        type: 'SYSTEM'
                                    },
                                    tasks: taskList.map(function(item) {
                                        return String(item.getNumber());
                                    })
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
                    reassignTask = function(task, identityId, identityType, isDelegate) {
                        if (task == null) {
                            task = _state.selectedTask ? _state.selectedTask : null;
                        }
                        var promise = $.Deferred();
                        if (task != null) {
                            var actionParams = {
                                payload: {
                                    identities: createIdObjectArray(identityId, identityType),
                                    action: {
                                        id: (isDelegate ? 'DELEGATE' : 'REASSIGN'),
                                        type: 'SYSTEM'
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
                    };
        */

        return {
            fetchTasks: function(refresh, params) {
                var url = resourceUrlConfig.tasks;
                var promise = $.Deferred();

                if (!refresh) {
                    promise.resolve(_state.tasks);
                    return promise;
                }
                var options = {
                    queryParams: params
                };
                dataServices.get(url, options).done(function(data) {
                    //Convert date returned by REST API to ISO format
                    var convertToISOFormat = function(data) {
                        return data ? Date.parse(data.toString().replace(' ', 'T')) : 0;
                    };
                    //Pass a map containing the properties that needs to be updated
                    var mapping = {
                        'update': {
                            'assignedDate': function(data) {
                                return convertToISOFormat(data);
                            },
                            'dueDate': function(data) {
                                return convertToISOFormat(data);
                            },
                            'updatedDate': function(data) {
                                return convertToISOFormat(data);
                            }
                        }
                    };
                    //do data mapping
                    var tasks = data.items.map(function(item) {
                        return new Task(item, mapping);
                    });
                    tasks.count = data.count;

                    //put it in cache
                    _state.tasks = tasks;
                    promise.resolve(tasks);
                }).fail(function(error) {
                    promise.reject(error);
                });
                return promise;
            },
            queryTasksBySearchableFields: function(refresh, taskSearchQuery) {
                var url = resourceUrlConfig.taskSearch;
                var promise = $.Deferred();

                if (!refresh) {
                    promise.resolve(_state.tasks);
                    return promise;
                }
                var options = {
                    payload: {
                        query: taskSearchQuery.query,
                        start: taskSearchQuery.start,
                        offset: taskSearchQuery.offset,
                        sorts: taskSearchQuery.sorts,
                        fields: taskSearchQuery.fields,
                        language: taskSearchQuery.language
                    }
                };
                dataServices.post(url, options).done(function(data) {
                    //Convert date returned by REST API to ISO format
                    var convertToISOFormat = function(data) {
                        return data ? Date.parse(data.replace(' ', 'T')) : 0;
                    };
                    //Pass a map containing the properties that needs to be updated
                    var mapping = {
                        'update': {
                            'assignedDate': function(data) {
                                return convertToISOFormat(data);
                            },
                            'dueDate': function(data) {
                                return convertToISOFormat(data);
                            },
                            'updatedDate': function(data) {
                                return convertToISOFormat(data);
                            }
                        }
                    };
                    //do data mapping
                    var tasks = data.items.map(function(item) {
                        return new Task(item, mapping);
                    });
                    //put it in cache
                    _state.tasks = tasks;
                    promise.resolve(tasks);
                }).fail(function(error) {
                    promise.reject(error);
                });
                return promise;
            },
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


            /***********  APIs for managing filters  *****************/
            listRecentFilters: function() {
                //get last 5 recent filters from browser offline storage
            },
            listStandardFilters: function() {
                //get the list of standard filters from API and cache
                //if data not in cache, then get from API
            },
            listSavedFilters: function(refresh) {
                //get the list of saved filters from API and cache
                //if data not in cache, then get from API
            },
            selectFilter: function(filterId) {
                //set the selected filter in cache and refresh the task list
                //with the selected filter's filter criteria
                _state.selectedFilter = filterId;
            },
            getSelectedFilter: function() {
                return _state.selectedFilter;
            },
            saveFilter: function(filterId, filterCriteria) {
                //if filterId is not passed, use selectedFilter
            },
            deleteFilter: function(filterId) {
                //remove the filter from cache and delete it in backend
            }
        };
    };
});
