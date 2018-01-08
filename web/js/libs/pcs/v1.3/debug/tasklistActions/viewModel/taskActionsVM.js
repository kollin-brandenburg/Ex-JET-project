/**
 * Created by praburajan on 28/09/16.
 */

define(['ojs/ojcore', 'knockout', 'jquery', 'pcs/tasklistActions/viewModel/TaskAction', 'pcs/tasklistActions/viewModel/Task',
        'ojs/ojknockout', 'ojs/ojselectcombobox', 'ojs/ojbutton', 'ojs/ojmenu', 'ojs/ojdialog'
    ],
    function(oj, ko, $, TaskAction, Task) {
        'use strict';
        return function TaskActionsVM(params, componentInfo) {
            var self = this;
            var service;

            var systemActions = (self.systemActions ? self.systemActions : ['SUSPEND', 'ESCALATE', 'RENEW', 'REASSIGN', 'INFO_REQUEST', 'WITHDRAW', 'ACQUIRE', 'PURGE', 'DELETE', 'RESUME', 'RELEASE']);

            function registerChildComponents() {
                //register reassign and request info components
                if (!ko.components.isRegistered('requestInfo')) {
                    ko.components.register('requestInfo', {
                        template: {
                            require: 'text!pcs/tasklistActions/templates/pcs-requestInfo.html'
                        },
                        viewModel: {
                            createViewModel: function(params, componentInfo) {
                                var requestInfoVM = require('pcs/tasklistActions/viewModel/requestInfoVM');
                                return new requestInfoVM(params, componentInfo);
                            }
                        }
                    });
                }

                if (!ko.components.isRegistered('reassign')) {
                    ko.components.register('reassign', {
                        template: {
                            require: 'text!pcs/tasklistActions/templates/pcs-reassign.html'
                        },
                        viewModel: {
                            createViewModel: function(params, componentInfo) {
                                var reassignVM = require('pcs/tasklistActions/viewModel/reassignVM');
                                return new reassignVM(params, componentInfo);
                            }
                        }
                    });
                }
            }
            self.rootElement = componentInfo ? $(componentInfo.element) : $(document);
            //Set the resourcebundle
            self.bundle = require('ojL10n!pcsMsg/nls/pcsSnippetsResource');
            self.displayInfoRequest = ko.observable();
            self.displayReassign = ko.observable();
            //Array that saves the Actions that can be performed on selected Tasks
            self.taskActionList = ko.observableArray([]);
            self.selectedTasklist = ko.observableArray([]);
            self.isTaskSelected = ko.observable(false);
            self.isActionConfirm = ko.observable(false);
            self.showConfirmation = ko.observable('none');
            self.actionName = ko.observable('');
            self.actionComments = ko.observable('');
            self.displayActionName = ko.computed(function() {
                return self.bundle.pcs.taskActions[self.actionName()];
            });
            //self.params = params.taskactionParams;
            self.hideCustomActions = params.taskactionParams.hideCustomActions;
            self.hideSystemActions = params.taskactionParams.hideSystemActions;
            self.systemActions = params.taskactionParams.systemActions.split(',').map(function(item) {
                return item.trim();
            });
            // this is passed when Task Action Component is invoked independently
            //self.taskObjectArray = (params.taskactionParams.taskObjectArray ? JSON.parse(params.taskactionParams.taskObjectArray) : null) ;
            self.taskNumbers = params.taskactionParams.taskNumbers == null ? null : params.taskactionParams.taskNumbers.split(',').map(function(item) {
                var newObj = {
                    'number': item.trim()
                };
                var _task = new Task(newObj);
                return _task;
            });
            self.confirmDialog = $('#pcs-taskActions-confirmation-dialog', self.rootElement);

            //registering reassign and request info components
            registerChildComponents();

            //Function to remove redundant list of system actions
            var trimList = function(actionList) {
                if (!actionList) {
                    return [];
                }
                return actionList.filter(function(item) {
                    var label = self.bundle.pcs.taskActions[item.title];
                    item.label = label ? label : item.title;
                    //logic returns true when the action is not present in redundantActions list
                    //added to remove any remaining redundant actions
                    return (item.actionType === 'System' && systemActions.indexOf(item.title) > -1) || (item.actionType === 'Custom');
                });
            };

            //compare and filters out common actions
            var processActionListData = function(actionList, collatedActionList) {
                if (collatedActionList.length === 0 && actionList.length > 0) {
                    collatedActionList = actionList;
                } else {
                    collatedActionList = collatedActionList.filter(function(outerItem) {
                        if (outerItem.actionType === 'System' && systemActions.indexOf(outerItem.title) === -1) {
                            return false;
                        }
                        var arr = actionList.filter(function(innerItem) {
                            return outerItem.title === innerItem.title;
                        });
                        return arr.length > 0;
                    });
                }
                return collatedActionList;
            };

            function handleTaskSelect(event, taskList) {
                self.taskActionList([]);
                if (!taskList) {
                    return;
                }
                var collatedActionList = [];
                var selectedTasks = taskList.filter(function(item) {
                    if (self.taskNumbers || item.isSelected()) {
                        collatedActionList = processActionListData(item.getActionList(), collatedActionList);
                    }
                    return self.taskNumbers || item.isSelected();
                });
                self.isTaskSelected(selectedTasks.length > 0);
                self.taskActionList(trimList(collatedActionList));
                self.selectedTasklist(selectedTasks);
            }

            function init() {
                service = new TaskAction();
                registerChildComponents();
                //if(self.taskObjectArray) {
                //  self.taskObjectArray = self.taskObjectArray.map(function(item) {
                //      return new Task(item);
                //  })
                //  self.isTaskSelected(true);
                //  handleTaskSelect(null, self.taskObjectArray);
                //}

                if (self.taskNumbers) {
                    var taskObjectPromisesArray = self.taskNumbers.map(function(item) {
                        return service.getTaskDetail(item);
                    });
                    Promise.all(taskObjectPromisesArray).then(function(values) {
                        self.isTaskSelected(true);
                        handleTaskSelect(null, values);
                    }).catch(function(reason) {
                        $('#pcs-taskactions-container').html('One of more task objects could not be obtained');
                    });
                }
            }
            init();

            //TODO nisabhar  reading events from document is wrong
            $(document).on('tasklist:taskCheck', handleTaskSelect);
            //Event Handler for event TaskSelected

            function reset() {
                self.taskActionList([]);
                self.selectedTasklist([]);
                self.isTaskSelected(false);
                self.actionName('');
                self.actionComments('');
                self.showConfirmation('none');
            }

            function handleRefresh() {
                reset();
            }

            //TODO nisabhar  reading events from document is wrong
            $(document).on('tasklistAction:refresh', handleRefresh);
            $(document).on('taskAction:submit', handleRefresh);
            //Event handler for event RefreshTaskList

            self.getSelectedItems = function() {
                var msg = self.bundle.pcs.taskActions.selectedTasks;
                msg = oj.Translations.applyParameters(msg, {
                    '0': self.selectedTasklist().length
                });
                return msg;
            };

            self.onCustomActionClick = function(data, event) {
                self.actionName(event.currentTarget.id);
                self.showConfirmation('custom');
                self.confirmDialog.ojDialog('open');
            };

            self.onSystemActionSelect = function(event, data) {
                self.actionName(data.item.children().val());
                self.showConfirmation('system');
                // No need for separate confirmation in case of INFO_REQUEST and REASSIGN
                if (self.actionName() === 'INFO_REQUEST' || self.actionName() === 'REASSIGN') {
                    self.handleSubmit();
                } else {
                    self.confirmDialog.ojDialog('open');
                }
            };

            self.handleSubmit = function() {
                if (self.showConfirmation() === 'custom') {
                    self.submitCustomAction();
                } else if (self.showConfirmation() === 'system') {
                    self.submitSystemAction();
                }
                self.confirmDialog.ojDialog('close');
            };

            self.handleClose = function() {
                self.confirmDialog.ojDialog('close');
            };

            //Event handler for click of Custom action button click
            self.submitCustomAction = function() {
                var action = self.actionName();
                var comments = self.actionComments();
                if (self.selectedTasklist().length === 1) {
                    service.doCustomActionOnTask(self.selectedTasklist()[0], action, comments).then(function() {
                        self.rootElement.trigger('taskAction:submit', [action]);
                        reset();
                    });
                } else {
                    service.doCustomActionOnTasks(self.selectedTasklist(), action, comments).then(function() {
                        self.rootElement.trigger('taskAction:submit', [action]);
                        reset();
                    });
                }
            };

            var performSystemAction = function(action) {
                var comments = self.actionComments();
                if (self.selectedTasklist().length === 1) {
                    service.doSystemActionOnTask(self.selectedTasklist()[0], action, comments).then(function() {
                        self.rootElement.trigger('taskAction:submit', [action]);
                        reset();
                    });
                } else {
                    service.doSystemActionOnTasks(self.selectedTasklist(), action, comments).then(function() {
                        self.rootElement.trigger('taskAction:submit', [action]);
                        reset();
                    });
                }
            };

            //Event handler for selection of action item in the System Actions menu
            self.submitSystemAction = function() {
                self.displayInfoRequest(false);
                self.displayReassign(false);
                var action = self.actionName();
                switch (action) {
                    case 'INFO_REQUEST':
                        self.displayInfoRequest(true);
                        break;
                    case 'REASSIGN':
                        self.displayReassign(true);
                        break;
                    default:
                        performSystemAction(action);
                        break;
                }
            };


			/**
			 * method to clean up everything
			 */
			self.dispose = function() {
				console.log('dispose in taskActionsVM');

				//clear computed
				self.displayActionName.dispose();

				// clean up the events
			};

        };
    }
);
