/**
 * Created by srayker on 8/25/2016.
 */
define(['ojs/ojcore', 'knockout', 'jquery', 'pcs/util/pcsUtil', 'pcs/tasklist/viewModel/TaskList', 'ojs/ojknockout', 'ojs/ojlistview', 'ojs/ojselectcombobox', 'ojs/ojarraytabledatasource',
        'ojs/ojbutton', 'ojs/ojoffcanvas', 'promise', 'ojs/ojpopup', 'ojs/ojmenu', 'ojL10n!pcsMsg/nls/pcsSnippetsResource',
        'pcs/pcs.taskdetail'
    ],
    function(oj, ko, $, utils, TaskList) {
        'use strict';

        /**
         * The view model for the main content view template
         */
        function TaskListViewModel(params) {
            var self = this;
            var service;
            //Set the resourcebundle
            self.bundle = require('ojL10n!pcsMsg/nls/pcsSnippetsResource');
            var dataArr = [];
            self.params = params.data;
            //the jquery element where the widget is pushed, all the selectors will work in context of this element
            self.rootElement = self.params.rootElement;
            //Holds the tasklist data fetched
            self.tasklistData = ko.observable();
            //Holds the last selected task in the tasklist
            self.selectedTask = ko.observableArray();
            var defaultLimit = self.params.pageSize;
            //Variable to hold input parameters to fetch task list
            var taskParams = {
                limit: defaultLimit,
                showAction: true,
                noPagingFlag: false
            };
            //Holds last selected sort value for displaying due date
            self.lastSelectedSort = ko.observable('');
            //Holds the last selected sort values and sort direction
            var lastOrderBy;
            //the total records available in last fetched tasklist
            var totalRecs = 0;
            self.hasMoreRecs = ko.observable(false);
            self.pagingInfoText = ko.observable('');

            self.actionName = ko.observable('');
            self.actionComments = ko.observable('');
            self.selectedTaskNumber = ko.observable('');
            self.displayActionName = ko.computed(function() {
                return self.bundle.pcs.taskActions[self.actionName()];
            });

            self.toolbarParams = {
                hideCustomActions: self.params.hideCustomActions,
                hideSystemActions: self.params.hideSystemActions,
                hideSearch: self.params.hideSearch,
                hideSort: self.params.hideSort,
                hideRefresh: self.params.hideRefresh,
                hideSelectAll: self.params.hideSelectAll,
                selectedSortType: self.params.selectedSortType,
                selectedSortOrder: self.params.selectedSortOrder,
                hideFilter: self.params.hideFilter,
                systemActions: self.params.systemActions,
                tasklistFilter: typeof self.params.tasklistFilter === 'string' ? JSON.parse(self.params.tasklistFilter) : self.params.tasklistFilter
            };
            self.hideToolbar = self.params.hideToolbar;
            self.hideSystemActions = self.params.hideSystemActions;
            self.hideCustomActions = self.params.hideCustomActions;
            self.hideFromUserName = self.params.hideFromUserName;
            self.hideAssignedDate = self.params.hideAssignedDate;
            self.hideDueDate = self.params.hideDueDate;
            self.hideCreatedDate = self.params.hideCreatedDate;
            self.hideSummary = self.params.hideSummary;
            self.hideFilter = self.params.hideFilter;
            self.hideTaskDetails = self.params.hideTaskDetails;
            self.taskDetailOptions = typeof self.params.taskDetailOptions === 'string' ? JSON.parse(self.params.taskDetailOptions) : self.params.taskDetailOptions;
            self.tasklistFilter = typeof self.params.tasklistFilter === 'string' ? JSON.parse(self.params.tasklistFilter) : self.params.tasklistFilter;
            self.loadingOverlay = $('#pcs-tl-overlay', self.rootElement);
            self.confirmationDialog = $('#pcs-tasklist-actions-confirmation-dialog', self.rootElement);


            //Pre-process the data from server as per UI needs
            var processData = function(data) {
                return data.map(function(item) {
                    item.processInitials = utils.taskInitials(item.getProcessName());
                    item.boxHolderColor = utils.taskIconColor(item.getProcessName());
                    item.isSelected = ko.observable(false);
                    return item;
                });
            };

            //Fetch the tasklist data
            function fetchTaskList(params, reset) {
                //Start the loading indicator
                self.loadingOverlay.addClass('pcs-common-load-overlay');
                var promise = $.Deferred();
                service.fetchTasks(true, params).then(function(data) {
                    // Hide the loading indicator
                    self.loadingOverlay.removeClass('pcs-common-load-overlay');
                    totalRecs = data.count;
                    dataArr = processData(data);
                    //Update taskListData
                    self.tasklistData(new oj.ArrayTableDataSource(dataArr, {
                        idAttribute: 'getNumber'
                    }));
                    if (reset) {
                        resetTaskList();
                    }
                    promise.resolve();
                    setTimeout(function() {
                        self.rootElement.trigger('tasklist:loaded');
                    }, 2000);
                });
                return promise;
            }

            //Load more tasks by setting the cursor for a paged call
            self.loadMoreTasks = function() {
                var limit = taskParams.limit + defaultLimit;
                if (limit > totalRecs) {
                    limit = totalRecs;
                }
                taskParams.orderBy = lastOrderBy;
                taskParams.limit = limit;
                fetchTaskList(taskParams, true).then(function() {
                    showPagingText();
                });
            };

            function showPagingText() {
                if (totalRecs > taskParams.limit) {
                    self.hasMoreRecs(true);
                } else {
                    self.hasMoreRecs(false);
                }
                var pageLimit = taskParams.limit > totalRecs ? totalRecs : taskParams.limit;
                if (pageLimit === 0) {
                    self.pagingInfoText('');
                    return;
                }
                var pagingTxt = self.bundle.pcs.tasklist.pagingTxt.replace('{0}', pageLimit.toString()).replace('{1}', totalRecs.toString());
                self.pagingInfoText(pagingTxt);
            }

            var init = function() {
                service = new TaskList();
                if (!ko.components.isRegistered('tasklistActions')) {
                    ko.components.register('tasklistActions', {
                        template: {
                            require: 'text!pcs/tasklistActions/templates/pcs-tasklist-toolbar.html'
                        },
                        viewModel: {
                            createViewModel: function(params, componentInfo) {
                                var taskToolbarVM = require('pcs/tasklistActions/viewModel/tasklistToolbarVM');
                                return new taskToolbarVM(params, componentInfo);
                            }
                        }
                    });
                }
                if (self.tasklistFilter) {
                    setTaskFilterOptions(self.tasklistFilter);
                }
            };
            //call init function to fetch initial data
            init();

            //Subscribe to selection of a task
			self.selectedTaskSubscription = self.selectedTask.subscribe(function(data) {
                if (data.length === 0) {
                    return;
                }

                checkAllTasks(false);
                var taskNumber = data[0]();

                if (!self.hideTaskDetails) {
                    var taskDetail = $('#taskDetail', self.rootElement);
                    disposeWidget(taskDetail);
                    var options = self.taskDetailOptions;
                    options.taskNumber = taskNumber;
                    options.hideResize = false;
                    options.viewExpanded = true;
                    $('#pcs-tl-list', self.rootElement).animate({
                        width: '0.05%'
                    }, {
                        duration: 100,
                        complete: function() {
                            taskDetail.taskdetail(options).width('99.95%');
                            taskDetail.show();
                        }
                    });
                }
                self.rootElement.trigger('tasklist:taskSelect', [taskNumber]);
            });



            function handleExpandDetailView(event, isExpanded) {
                var tlWidth;
                var tdWidth;
                if (isExpanded) {
                    tlWidth = '0.05%';
                    tdWidth = '99.95%';
                } else {
                    tlWidth = '40%';
                    tdWidth = '60%';
                }
                var taskDetail = $('#taskDetail', self.rootElement);
                var options = self.taskDetailOptions;
                $('#pcs-tl-list', self.rootElement).animate({
                    width: tlWidth
                }, {
                    duration: 100,
                    complete: function() {
                        taskDetail.taskdetail(options).width(tdWidth);
                        taskDetail.show();
                    }
                });
            }
            $(self.rootElement).on('taskdetail:expandDetailView', handleExpandDetailView);


            function handleSelectAll(event, isChecked) {
                if (isChecked) {
                    resetTaskList();
                }
                checkAllTasks(isChecked);
            }
            $(self.rootElement).on('tasklistAction:selectAll', handleSelectAll);

            //Check/Uncheck the tasks and fire notification event
            function checkAllTasks(isChecked) {
                dataArr.map(function(item) {
                    if ((item.isSelected() && isChecked) || (!item.isSelected() && !isChecked)) {
                        return;
                    }
                    item.isSelected(isChecked);
                    //toggle check mark style
                    $('#taskCheck' + item.getNumber(), self.rootElement).toggleClass('checked');
                });
                self.rootElement.trigger('tasklist:taskCheck', [dataArr]);
            }

            //Handle close event from taskdetail
            function handleTaskdetailClose() {
                resetTaskList();
            }
            $(self.rootElement).on('taskdetail:close', handleTaskdetailClose);

            function handleTaskdetailSave() {
                taskParams.orderBy = lastOrderBy;
                //fetch the tasklist to update any params like priority
                fetchTaskList(taskParams, false);
            }
            $(self.rootElement).on('taskdetail:save', handleTaskdetailSave);

            //handle action event of taskdetail
            function handleTaskdetailSubmit() {
                taskParams.orderBy = lastOrderBy;
                dataArr = [];
                fetchTaskList(taskParams, true).then(function() {
                    showPagingText();
                });
            }
            $(self.rootElement).on('taskdetail:submit', handleTaskdetailSubmit);

            //Reset the task list to original state
            function resetTaskList() {
                self.selectedTask([]);
                $('#pcs-tl-list', self.rootElement).animate({
                    width: '100%'
                }, {
                    duration: 100,
                    start: function() {
                        var taskDetail = $('#taskDetail', self.rootElement);
                        disposeWidget(taskDetail);
                        taskDetail.hide();
                    }
                });
            }

            //Dispose the Widget
            function disposeWidget(taskDetail) {
                if (taskDetail && taskDetail.data() && !$.isEmptyObject(taskDetail.data())) {
                    taskDetail.taskdetail('destroy');
                }
				ko.cleanNode(taskDetail[0]);
                //Un apply the bindings for the node and its children, also remove the childrens
				utils.unApplyBindings(taskDetail, true);
            }

            //Event handler for event RefreshTaskList
            /* TODO:: Not used because as a result of fix for Bug 25463904 - Refresh button in Task List does not respect filter setting
            function handleRefresh(event,refreshTime, selectedSort, srtDirection) {
            	taskParams = {limit: defaultLimit, showAction: true, noPagingFlag:false};
            	taskParams.orderBy = (selectedSort && srtDirection) ? selectedSort + ':' + srtDirection : lastOrderBy;
            	lastOrderBy = taskParams.orderBy;
            	fetchTaskList(taskParams, true).then(function(){showPagingText();});
            	self.rootElement.trigger('tasklist:taskCheck', []);
            } */

            $(self.rootElement).on('tasklistAction:refresh', (function(event) {
                return handleFilterSearch(event, this.tasklistFilter);
            }).bind(self));
            //TODO:: do we need to call handeFilterSearch on submit????
            $(self.rootElement).on('taskAction:submit', (function(event) {
                return handleFilterSearch(event, this.tasklistFilter);
            }).bind(self));

            function setTaskFilterOptions(options) {
                self.tasklistFilter = options;
                taskParams = {
                    limit: defaultLimit,
                    showAction: true,
                    noPagingFlag: false
                };
                if (options) {
                    if (options.hasOwnProperty('keyword')) {
                        taskParams.keyword = options.keyword;
                    }
                    if (options.hasOwnProperty('assignees')) {
                        taskParams.assignment = options.assignees ? options.assignees : null;
                    }
                    if (options.hasOwnProperty('status')) {
                        taskParams.status = options.status.toString();
                    }
                    if (options.hasOwnProperty('fromUser')) {
                        taskParams.fromuser = options.fromUser;
                    }
                    if (options.hasOwnProperty('applications')) {
                        taskParams.process = options.applications.toString();
                    }
                    if (options.hasOwnProperty('toDueDate') && options.toDueDate !== null) {
                        taskParams.dueDateTo = options.toDueDate;
                    }
                    if (options.hasOwnProperty('fromDueDate') && options.fromDueDate !== null) {
                        taskParams.dueDateFrom = options.fromDueDate;
                    }
                }
            }

            function handleFilterSearch(event, options) {
                setTaskFilterOptions(options);
                taskParams.orderBy = lastOrderBy;
                fetchTaskList(taskParams, true).then(function() {
                    showPagingText();
                });
                self.rootElement.trigger('tasklist:taskCheck', []);
            }
            $(self.rootElement).on('taskSearch:searchByStandardFilters', handleFilterSearch);

            function handleAdvancedSearch(event, taskQueryJSON) {
                queryTasksBySearchableFields(taskQueryJSON);
            }
            $(self.rootElement).on('taskSearch:searchBySearchableFields', handleAdvancedSearch);

            //query the tasklist data
            function queryTasksBySearchableFields(params) {
                //Start the loading indicator
                self.loadingOverlay.addClass('pcs-common-load-overlay');
                var promise = $.Deferred();
                service.queryTasksBySearchableFields(true, params).then(function(data) {
                    //Stop the loading indicator
                    self.loadingOverlay.removeClass('pcs-common-load-overlay');
                    dataArr = processData(data);
                    //Update taskListData
                    self.tasklistData(new oj.ArrayTableDataSource(dataArr, {
                        idAttribute: 'getNumber'
                    }));
                    resetTaskList();
                    promise.resolve();
                });
                return promise;
            }


            //Event handler for event SortOrderChange
            function handleSortSelect(event, selectedSort, srtDirection) {
                taskParams.orderBy = (selectedSort && srtDirection) ? selectedSort + ':' + srtDirection : lastOrderBy;
                self.lastSelectedSort(selectedSort);
                lastOrderBy = taskParams.orderBy;
                taskParams.limit = defaultLimit;
                fetchTaskList(taskParams, true).then(function() {
                    showPagingText();
                });
            }
            $(self.rootElement).on('tasklistAction:sortSelect', handleSortSelect);

            //Event handler on check/uncheck of a task
            self.onTaskCheck = function(data, event) {
                event.stopImmediatePropagation();
                resetTaskList();
                //ignore keypress other than enter
                if (event.type === 'keypress' && event.keyCode !== 13) {
                    return;
                }
                var targetParent = $(event.target).parent();
                //toggle selected value for every selection
                var isSelected = data.isSelected() ? false : true;
                data.isSelected(isSelected);
                data.getNumber(targetParent[0].children[0].innerHTML);
                //toggle check mark style
                targetParent.toggleClass('checked');
                var taskNumArr = dataArr.filter(function(data) {
                    return data.isSelected();
                }).map(function(item) {
                    return item.getNumber();
                });
                self.rootElement.trigger('tasklist:taskCheck', [dataArr, taskNumArr]);
            };


            //Event handler on selection of Action menu in task
            self.onActionSelect = function(event, data) {
                event.stopImmediatePropagation();
                self.actionName(data.item.children().text());
                self.selectedTaskNumber(data.item.children().val());
                self.confirmationDialog.ojDialog('open');
            };

            self.handleSubmit = function() {
                self.submitCustomAction();
                self.confirmationDialog.ojDialog('close');
            };

            self.handleClose = function() {
                self.confirmationDialog.ojDialog('close');
            };

            self.submitCustomAction = function() {
                // Hide the loading indicator
                self.loadingOverlay.removeClass('pcs-common-load-overlay');
                service.doCustomActionOnTask({
                    getNumber: function() {
                        return self.selectedTaskNumber();
                    }
                }, self.actionName(), self.actionComments()).then(function() {
                    // Hide the loading indicator
                    self.loadingOverlay.removeClass('pcs-common-load-overlay');
                    self.rootElement.trigger('taskAction:submit', [self.actionName(), self.selectedTaskNumber()]);
                });
            };

			/**
			 * method to clean all eevnts associsated
			 */
			self.cleanEvents = function() {
				$(self.rootElement).off();
			};


			//--- toggle and swipe action start ---
            var drawer = {
                'displayMode': 'push',
                'selector': '#pcs-tl-leftMenu',
                'autoDismiss': 'none'
            };

            self.tlMainWidth = ko.observable('oj-lg-12');


            function handleLeftMenuSelect() {
                return oj.OffcanvasUtils.toggle(drawer).then(function() {
                    if (self.tlMainWidth() === 'oj-lg-12') {
                        self.tlMainWidth('oj-lg-9');
                    } else {
                        self.tlMainWidth('oj-lg-12');
                    }
                });
            }
            $(self.rootElement).on('tasklistAction:leftMenuSelect', handleLeftMenuSelect);

            //--- toggle and swipe action end ---


			/**
			 * method to clean up everything
			 */
			self.dispose = function() {
				console.log('dispose in tasklist VM');
				self.selectedTaskSubscription.dispose();

				//clear computed
				self.displayActionName.dispose();

				// clean up the events
				self.cleanEvents();
			};

		}

        return TaskListViewModel;

    });
