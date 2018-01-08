define(['ojs/ojcore', 'knockout', 'jquery', 'ojL10n!pcsMsg/nls/pcsSnippetsResource',
        'pcs/customBindingHandlers/suggestItems', 'pcs/tasksearch/filter/filter',
        'pcs/tasksearch/filter/filterOperator', 'pcs/tasksearch/filter/filterType',
        'pcs/tasksearch/filter/filterValueType', 'pcs/tasksearch/viewModel/searchMetadata',
        'pcs/tasksearch/viewModel/status', 'pcs/tasksearch/viewModel/assingee', 'pcs/tasksearch/filter/filterValue',
        'pcs/tasksearch/query/query', 'pcs/tasksearch/query/queryClause', 'pcs/tasksearch/query/stringQueryClause',
        'pcs/tasksearch/query/textQueryClause', 'pcs/tasksearch/query/wildcardQueryClause',
        'pcs/tasksearch/query/numericRangeQueryClause', 'pcs/tasksearch/query/numericRange',
        'pcs/tasksearch/query/numericRangeType', 'pcs/pcs.identitybrowser',
        'ojs/ojselectcombobox', 'ojs/ojbutton',
        'ojs/ojmenu', 'ojs/ojknockout', 'ojs/ojpopup', 'ojs/ojdialog', 'ojs/ojdatetimepicker'
    ],

    function(oj, ko, $, bundle, suggestItems, filter, filterOperator, filterType, filterValueType,
        searchMetadata, status, assingee, filterValue, query, queryClause, stringQueryClause, textQueryClause,
        wildcardQueryClause, numericRangeQueryClause, numericRange, numericRangeTypeFactory) {
        'use strict';
        /**
         * The view model for the main content view template
         */
        return function TaskSearchViewModel(params, componentInfo) {

            var self = this;
            self.rootElement = $(componentInfo.element);
            //Set the resourcebundle
            self.bundle = bundle;
            self.filterOperator = filterOperator;
            self.filterValueType = filterValueType;
            self.filterType = filterType;
            self.showFilter = params.showFilter;
            self.mode = ko.observable(params.mode || 'Search');
            self.idbID = 'pcs-search-idb';
            var fields = [{
                '@type': 'LongField',
                'name': 'systemAttributes.assignedDate',
                'type': 'Long',
                'analyzed': false
            }, {
                '@type': 'StringField',
                'name': 'systemAttributes.fromUser.displayName',
                'type': 'String',
                'analyzed': false
            }, {
                '@type': 'StringField',
                'name': 'systemAttributes.fromUser.id',
                'type': 'String',
                'analyzed': false
            }, {
                '@type': 'IntegerField',
                'name': 'systemAttributes.taskNumber',
                'type': 'Integer',
                'analyzed': false
            }, {
                '@type': 'IntegerField',
                'name': 'priority',
                'type': 'Integer',
                'analyzed': false
            }, {
                '@type': 'StringField',
                'name': 'systemAttributes.state',
                'type': 'String',
                'analyzed': false
            }, {
                '@type': 'StringField',
                'name': 'ownerRole',
                'type': 'String',
                'analyzed': false
            }, {
                '@type': 'LongField',
                'name': 'systemAttributes.updatedDate',
                'type': 'Long',
                'analyzed': false
            }, {
                '@type': 'StringField',
                'name': 'hasSubTasksFlag',
                'type': 'String',
                'analyzed': false
            }, {
                '@type': 'StringField',
                'name': 'isDocsEnabledFlag',
                'type': 'String',
                'analyzed': false
            }, {
                '@type': 'StringField',
                'name': 'isConversationEnabledFlag',
                'type': 'String',
                'analyzed': false
            }, {
                '@type': 'StringField',
                'name': 'creatorDisplayName',
                'type': 'String',
                'analyzed': false
            }, {
                '@type': 'StringField',
                'name': 'creator',
                'type': 'String',
                'analyzed': false
            }, {
                '@type': 'StringField',
                'name': 'processName',
                'type': 'String',
                'analyzed': true
            }, {
                '@type': 'StringField',
                'name': 'processId',
                'type': 'String',
                'analyzed': false
            }, {
                '@type': 'LongField',
                'name': 'dueDate',
                'type': 'Long',
                'analyzed': false
            }, {
                '@type': 'LongField',
                'name': 'systemAttributes.createdDate',
                'type': 'Long',
                'analyzed': false
            }, {
                '@type': 'DoubleField',
                'name': 'percentageComplete',
                'type': 'Double',
                'analyzed': false
            }, {
                '@type': 'StringField',
                'name': 'applicationContext',
                'type': 'String',
                'analyzed': false
            }, {
                '@type': 'StringField',
                'name': 'systemAttributes.acquiredBy',
                'type': 'String',
                'analyzed': false
            }, {
                '@type': 'StringField',
                'name': 'systemAttributes.updatedBy.id',
                'type': 'String',
                'analyzed': false
            }, {
                '@type': 'StringField',
                'name': 'systemAttributes.taskDefinitionName',
                'type': 'String',
                'analyzed': false
            }, {
                '@type': 'StringField',
                'name': 'sca.applicationName',
                'type': 'String',
                'analyzed': false
            }, {
                '@type': 'StringField',
                'name': 'sca.componentName',
                'type': 'String',
                'analyzed': false
            }, {
                '@type': 'StringField',
                'name': 'sca.compositeDN',
                'type': 'String',
                'analyzed': false
            }, {
                '@type': 'StringField',
                'name': 'sca.compositeName',
                'type': 'String',
                'analyzed': false
            }, {
                '@type': 'StringField',
                'name': 'sca.compositeVersion',
                'type': 'String',
                'analyzed': false
            }, {
                '@type': 'StringField',
                'name': 'workflowPattern',
                'type': 'String',
                'analyzed': false
            }, {
                '@type': 'StringField',
                'name': 'systemAttributes.taskNamespace',
                'type': 'String',
                'analyzed': false
            }, {
                '@type': 'StringArrayField',
                'name': 'comments',
                'type': 'String',
                'analyzed': false,
                'value': []
            }, {
                '@type': 'StringArrayField',
                'name': 'custom_actions',
                'type': 'String',
                'analyzed': false,
                'value': []
            }, {
                '@type': 'StringArrayField',
                'name': 'system_actions',
                'type': 'String',
                'analyzed': false,
                'value': []
            }, {
                '@type': 'StringField',
                'name': 'TaskDefinitionId',
                'type': 'String',
                'analyzed': false
            }, {
                '@type': 'StringField',
                'name': 'taskId',
                'type': 'String',
                'analyzed': false
            }, {
                '@type': 'StringField',
                'name': 'type',
                'type': 'String',
                'analyzed': false
            }, {
                '@type': 'StringArrayField',
                'name': 'updatedBy_history',
                'type': 'String',
                'analyzed': false,
                'value': []
            }, {
                '@type': 'StringArrayField',
                'name': 'assignee_user',
                'type': 'String',
                'analyzed': false,
                'value': []
            }, {
                '@type': 'StringArrayField',
                'name': 'assignee_application_role',
                'type': 'String',
                'analyzed': false,
                'value': []
            }, {
                '@type': 'StringField',
                'name': 'processDefId',
                'type': 'String',
                'analyzed': false
            }];

            /**
             * Constant to hold the prefix id of the searchable field of type user.
             * @type {string}
             */
            var generatedPrefixIdForSearchableFieldOfUserType = 'generatedIdForSearchableFieldOfTypeUser';

            var columns = {
                DUE_DATE: 'dueDate',
                SYSTEM_ATTRIBUTES_STATE: 'systemAttributes.state',
                SYSTEM_ATTRIBUTES_FROM_USER_ID: 'systemAttributes.fromUser.id',
                SYSTEM_ATTRIBUTES_ASSIGNEES: 'systemAttributes.assignees',
                ASSIGNEES: 'assignees',
                PROCESS_DEF_ID: 'processDefId',
                PRIORITY: 'priority',
                PUBLIC_INFO_FIELD: 'public_info_field'
            };

            var searchableFieldsNeedsToBeIgnored = [columns.DUE_DATE, columns.SYSTEM_ATTRIBUTES_STATE,
                columns.SYSTEM_ATTRIBUTES_ASSIGNEES, columns.SYSTEM_ATTRIBUTES_FROM_USER_ID
            ];

            self.init = function() {

                self.matchCriterias = [{
                    id: 'All',
                    label: bundle.pcs.tasksearch.all
                }, {
                    id: 'Any',
                    label: bundle.pcs.tasksearch.any
                }];

                // observable bound to the Buttonset:
                self.matchCriteria = ko.observable('All');

                // Search keyword.
                self.keyword = (params.tasklistFilter && params.tasklistFilter.keyword) ? ko.observableArray([params.tasklistFilter.keyword]) : ko.observable('');

                // To hold contains text field in the advance search
                self.containsText = ko.observable('');

                // To hold show advance search option field in the advance search
                self.showAdvancedOptions = ko.observable(params.showAdvancedOptions || false);

                // To hold the selected filter.
                self.selectedFilter = ko.observable();

                // To hold selected status in the advance search
                self.selectedStatus = (params.tasklistFilter && params.tasklistFilter.status) ? ko.observableArray([params.tasklistFilter.status]) : ko.observableArray([status.statusType.ASSIGNED]);

                // To hold selected assignees in the advance search
                self.selectedAssignees = (params.tasklistFilter && params.tasklistFilter.assignees) ? ko.observableArray([params.tasklistFilter.assignees]) : ko.observableArray([assingee.assigneeType.MY_AND_GROUP_ALL]);

                // To hold selected applications in the advance search
                self.selectedApplications = (params.tasklistFilter && params.tasklistFilter.applications) ? ko.observableArray([params.tasklistFilter.applications]) : ko.observableArray();

                // To hold the due date filter in the advance search
                var dueDateFilterOptions = {
                    name: columns.DUE_DATE,
                    displayName: bundle.pcs.tasksearch.duedate,
                    type: filterType.filterTypes.DATE
                };
                var dateFilter = new filter(dueDateFilterOptions);
                self.dueDateFilter = ko.observable(dateFilter);


                // To hold the selected searchable fields in the advance search
                self.selectedSearchableFields = ko.observableArray();

                // To hold the available searchable fields  in the advance search
                self.availableSearchableFields = ko.observableArray();

                // To hold the autosuggestions needs to be shown
                self.autoSuggestionsOnTextEntered = [{
                    value: 'SHOW_ADVANCE_SEARCH',
                    label: bundle.pcs.tasksearch.show_advance_search,
                    styleClass: 'advanced-icon',
                    action: self.hanldeAutoSuggestionSelection
                }];

                // To hold the list of status needs to be shown in the advance search
                self.availableStatus = [{
                    value: status.statusType.ASSIGNED,
                    label: bundle.pcs.tasksearch.assigned
                }, {
                    value: status.statusType.INFO_REQUESTED,
                    label: bundle.pcs.tasksearch.info_requested
                }, {
                    value: status.statusType.WITHDRAWN,
                    label: bundle.pcs.tasksearch.withdrawn
                }, {
                    value: status.statusType.SUSPENDED,
                    label: bundle.pcs.tasksearch.suspended
                }, {
                    value: status.statusType.ALERTED,
                    label: bundle.pcs.tasksearch.alerted
                }, {
                    value: status.statusType.ERRORED,
                    label: bundle.pcs.tasksearch.errored
                }, {
                    value: status.statusType.EXPIRED,
                    label: bundle.pcs.tasksearch.expired
                }, {
                    value: status.statusType.COMPLETED,
                    label: bundle.pcs.tasksearch.completed
                }];

                // To hold the list of priority needs to be shown in the advance search
                var availablePriorityValues = [{
                    value: '1',
                    label: bundle.pcs.tasksearch.lowest
                }, {
                    value: '2',
                    label: bundle.pcs.tasksearch.low
                }, {
                    value: '3',
                    label: bundle.pcs.tasksearch.normal
                }, {
                    value: '4',
                    label: bundle.pcs.tasksearch.high
                }, {
                    value: '5',
                    label: bundle.pcs.tasksearch.highest
                }];

                // To hold the list of assignees needs to be shown in the advance search
                self.availableAssignees = [{
                    value: assingee.assigneeType.MY,
                    label: bundle.pcs.tasksearch.my_tasks
                }, {
                    value: assingee.assigneeType.MY_AND_GROUP,
                    label: bundle.pcs.tasksearch.me_and_my_group
                }, {
                    value: assingee.assigneeType.MY_AND_GROUP_ALL,
                    label: bundle.pcs.tasksearch.me_and_my_group_all
                }, {
                    value: assingee.assigneeType.CREATOR,
                    label: bundle.pcs.tasksearch.started_by_me
                }, {
                    value: assingee.assigneeType.REPORTEES,
                    label: bundle.pcs.tasksearch.reportees
                }, {
                    value: assingee.assigneeType.PREVIOUS,
                    label: bundle.pcs.tasksearch.related
                }, {
                    value: assingee.assigneeType.REVIEWER,
                    label: bundle.pcs.tasksearch.reviewed_by_me
                }];

                // To hold the list of applications needs to be shown in the advance search
                self.availableApplications = ko.observableArray();

                //A callback Function to retrieve the list of process definitions from the backend.
                searchMetadata.getProcessDefinitions().then(function(result) {
                    result.map(function(item) {
                        if (self.mode() === 'Search') {
                            self.availableApplications.push({
                                label: item.getProcessName(),
                                value: item.getProcessDefId()
                            });
                        } else {
                            self.availableApplications.push({
                                label: item.getProcessName(),
                                value: item.getProcessName()
                            });
                        }
                    });
                });

                //handle refresh event of tasklist
                /*              TODO:: Not used as a result of fix for Bug 25463904 - Refresh button in Task List does not respect filter setting
                                function handleTasklistRefresh() {
                                    self.selectedStatus([status.statusType.ASSIGNED]);
                                    self.selectedAssignees([assingee.assigneeType.MY_AND_GROUP_ALL]);
                                    self.selectedApplications([]);
                                    self.dueDateFilter(dateFilter);
                                }
                                $(document).on('tasklistAction:refresh', handleTasklistRefresh);
                */

                // A callback function to retrieve the list of standard attributes of tasks from the backend.
                if (self.mode() === 'Search') {
                    searchMetadata.getSearchableFields().then(function(result) {
                        var filterObj = {};
                        var temp = [];
                        var options = {};
                        result.map(function(item) {
                            var isCategoryFound = false;
                            for (var i = 0; i < temp.length; i++) {
                                if (temp[i].name === item.getCategory()) {
                                    isCategoryFound = true;
                                    options = {
                                        name: item.getFieldName(),
                                        displayName: item.getDisplayName(),
                                        type: item.getDataType(),
                                        canDelete: true
                                    };
                                    if (item.getFieldName() === columns.PRIORITY) {
                                        options = {
                                            name: item.getFieldName(),
                                            displayName: item.getDisplayName(),
                                            type: item.getDataType(),
                                            canDelete: true,
                                            filterOperators: [],
                                            values: [new filterValue({
                                                type: filterValueType.valueTypes.LIST,
                                                listOfValues: availablePriorityValues
                                            })]
                                        };
                                    }
                                    filterObj = new filter(options);
                                    if (searchableFieldsNeedsToBeIgnored.indexOf(item.getFieldName()) === -1) {
                                        temp[i].items.push(filterObj);
                                    }
                                    break;
                                }
                            }
                            if (!isCategoryFound) {
                                options = {
                                    name: item.getFieldName(),
                                    displayName: item.getDisplayName(),
                                    type: item.getDataType(),
                                    canDelete: true
                                };
                                if (item.getFieldName() === columns.PRIORITY) {
                                    options = {
                                        name: item.getFieldName(),
                                        displayName: item.getDisplayName(),
                                        type: item.getDataType(),
                                        canDelete: true,
                                        filterOperators: [],
                                        values: [new filterValue({
                                            type: filterValueType.valueTypes.LIST,
                                            listOfValues: availablePriorityValues
                                        })]
                                    };
                                }
                                filterObj = new filter(options);
                                if (searchableFieldsNeedsToBeIgnored.indexOf(item.getFieldName()) === -1) {
                                    temp.push({
                                        displayName: item.getCategory(),
                                        name: item.getCategory(),
                                        items: [filterObj]
                                    });
                                }
                            }
                        });
                        self.availableSearchableFields(temp);
                    });
                }

            };

            self.init();

            self.onKeyUpSearchTextBox = function(data, event) {
                var keyCode = (event.which ? event.which : event.keyCode);
                if (keyCode === 13) {
                    performSearchBasedOnStandardFilters();
                }
            };

            // Function to handle the searchable fields/ standard filter selection.
            self.handleFilterMenuSelection = function(event, ui) {
                var text = ui.item.children('span').text();
                var object = JSON.parse(text);
                var newFilterValues = [];
                object.values.forEach(function(value) {
                    newFilterValues.push(new filterValue(value));
                });
                object.values = newFilterValues;
                var newFilter = new filter(object);
                self.selectedSearchableFields.push(newFilter);
            };

            /**
             * Function to remove the selected searchable field
             * @param index The index of the searchable field to be removed.
             */
            self.removeSelectedSearchableField = function(index) {
                var filterToBeRemoved = self.selectedSearchableFields()[index];
                self.selectedSearchableFields.remove(filterToBeRemoved);
            };

            self.handleAdvancedOptions = function() {
                var showAdvancedOptions = self.showAdvancedOptions();
                if (showAdvancedOptions) {
                    self.showAdvancedOptions(false);
                } else {
                    self.showAdvancedOptions(true);
                }
            };

            /**
             * Closes the advance search dialog.
             */
            self.closeAdvanceSearchPopup = function() {
                $('#advanceSearchPopup').ojDialog('close');
            };

            /**
             * Refresh the auto suggestion based on the text entered in the search box.
             * @param enteredText The entered text in the search box.
             * @returns {*} The newly formed auto suggestions.
             */
            self.refreshAutoSuggestions = function(enteredText) {
                if (enteredText.length === 0) {
                    return self.autoSuggestions;
                } else {
                    return [{
                        value: enteredText,
                        label: bundle.pcs.tasksearch.task_containing + ' \'' + enteredText + ' \'',
                        styleClass: 'advanced-icon',
                        action: self.hanldeAutoSuggestionSelection
                    }, {
                        value: 'SHOW_ADVANCE_SEARCH',
                        label: bundle.pcs.tasksearch.show_advance_search,
                        styleClass: 'advanced-icon',
                        action: self.hanldeAutoSuggestionSelection
                    }];
                }
            };

            /**
             * Returns the newly generated id for the searchable field of type user.
             * @param index The index of the searchable field of type user.
             * @returns {string}
             */
            self.generateUniqueIdForSearchableFieldOfTypeUser = function(index) {
                return generatedPrefixIdForSearchableFieldOfUserType + index;
            };

            self.showAdvanceSearchPopup = function(data, event) {
                $('#advanceSearchPopup').ojDialog('open');
                $('#advSearchDialog').css({
                    top: 0
                });
                window.setTimeout(function() {
                    self.rootElement.trigger('taskSearch:loaded');
                }, 100);
            };

            self.hanldeAutoSuggestionSelection = function(result) {
                var val = result.selectedAutoSuggestion.value;
                result.element.blur();
                if (val === 'SHOW_ADVANCE_SEARCH') {
                    self.selectedFilter('');
                    $('#advanceSearchPopup').ojDialog('open');
                    $('#advSearchDialog').css({
                        top: 0
                    });
                } else {
                    var taskSearchquery = new query({
                        operator: 'MUST'
                    });
                    var stringQuery, options;
                    if (val === assingee.assigneeType.MY_AND_GROUP_ALL || val === assingee.assigneeType.CREATOR ||
                        val === assingee.assigneeType.ADMIN) {
                        options = {
                            fieldName: columns.ASSIGNEES,
                            values: [val]
                        };
                        stringQuery = new stringQueryClause(options);
                        taskSearchquery.queryClauses.push({
                            stringQuery: stringQuery,
                            operator: 'MUST'
                        });
                        options = {
                            fieldName: columns.SYSTEM_ATTRIBUTES_STATE,
                            values: [status.statusType.ASSIGNED, status.statusType.INFO_REQUESTED]
                        };
                        stringQuery = new stringQueryClause(options);
                        taskSearchquery.queryClauses.push({
                            stringQuery: stringQuery,
                            operator: 'MUST'
                        });
                    } else if (val === 'DUE_SOON') {
                        var lowerBound = new Date();
                        var upperBound = new Date();
                        upperBound.setDate(upperBound.getDate() + 6);
                        if (lowerBound) {
                            lowerBound = new Date(lowerBound).getTime();
                        }
                        if (upperBound) {
                            upperBound = new Date(upperBound).getTime();
                        }
                        var numericRangeOptionsForDueSoon = {
                            type: numericRangeTypeFactory.getNumericRangeTypeBasedOnType(filterType.filterTypes.DATE),
                            minValue: lowerBound,
                            maxValue: upperBound,
                            primitiveType: numericRangeTypeFactory.getNumericRangePrimitiveTypeBasedOnType(filterType.filterTypes.DATE)
                        };
                        var numericRanges = new numericRange(numericRangeOptionsForDueSoon);
                        var numericRangeString = JSON.stringify(numericRanges).replace('type', '@type');
                        numericRanges = JSON.parse(numericRangeString);
                        var numericRangeQueryOptionsForDueDate = {
                            fieldName: columns.DUE_DATE,
                            minInclusive: true,
                            maxInclusive: true,
                            numericRanges: [numericRanges]
                        };
                        var numericRangeQuery = new numericRangeQueryClause(numericRangeQueryOptionsForDueDate);
                        taskSearchquery.queryClauses.push({
                            numericRangeQuery: numericRangeQuery,
                            operator: 'MUST'
                        });
                        options = {
                            fieldName: columns.SYSTEM_ATTRIBUTES_STATE,
                            values: [status.statusType.ASSIGNED, status.statusType.INFO_REQUESTED]
                        };
                        stringQuery = new stringQueryClause(options);
                        taskSearchquery.queryClauses.push({
                            stringQuery: stringQuery,
                            operator: 'MUST'
                        });
                    } else {
                        options = {
                            fieldName: columns.PUBLIC_INFO_FIELD,
                            values: [val]
                        };
                        stringQuery = new textQueryClause(options);
                        taskSearchquery.queryClauses.push({
                            textQuery: stringQuery,
                            operator: 'MUST'
                        });
                    }
                    var jsonToSend = {
                        query: taskSearchquery,
                        start: 0,
                        offset: 30,
                        sorts: [],
                        fields: fields,
                        language: 'en'
                    };
                    console.log(JSON.stringify(jsonToSend));
                    self.rootElement.trigger('taskSearch:searchBySearchableFields', [jsonToSend]);
                }
            };

            self.autoSuggestions = [{
                value: assingee.assigneeType.CREATOR,
                label: bundle.pcs.tasksearch.tasks_i_created,
                styleClass: 'created-tasks-icon',
                action: self.hanldeAutoSuggestionSelection
            }];

            if (params.isManager) {
                self.autoSuggestions.push({
                    value: assingee.assigneeType.MY_AND_GROUP_ALL,
                    label: bundle.pcs.tasksearch.tasks_assigned_to_my_team,
                    styleClass: 'team-tasks-icon',
                    action: self.hanldeAutoSuggestionSelection
                });
            }

            //TODO No support from backend.
            /*if(params.isAdmin) {
             self.autoSuggestions.push({value: assingee.assigneeType.ADMIN,
             label: bundle.pcs.tasksearch.tasks_that_i_administer,
             styleClass: 'created-tasks-icon', action: self.hanldeAutoSuggestionSelection})
             }*/

            self.autoSuggestions.push({
                value: 'DUE_SOON',
                label: bundle.pcs.tasksearch.tasks_due_soon,
                styleClass: 'due-icon',
                action: self.hanldeAutoSuggestionSelection
            });

            if (params.showAdvancedSearch) {
                self.autoSuggestions.push({
                    value: 'SHOW_ADVANCE_SEARCH',
                    label: bundle.pcs.tasksearch.show_advance_search,
                    styleClass: 'advanced-icon',
                    action: self.hanldeAutoSuggestionSelection
                });
            }

            /**
             * This event gets fired when the selected applications gets changed.
             */
            if (self.mode() === 'Search') {
                self.selectedApplications.subscribe(function(newValues) {
                    var temp = self.availableSearchableFields();

                    // Remove all the existing business data
                    self.availableSearchableFields().forEach(function(searchableField, index) {
                        if (searchableField.name === 'BusinessData') {
                            temp.splice(index, 1);
                        }
                    });

                    if (newValues.length > 0) {
                        var queryString = [];
                        newValues.forEach(function(newValue) {
                            queryString.push({
                                processDN: newValue
                            });
                        });

                        // Try to get the searchable fields
                        searchMetadata.getSearchableFields(queryString).then(function(result) {
                            var filterObj = {};
                            var options = {};
                            result.map(function(item) {
                                var isCategoryFound = false;
                                var processName = '';
                                for (var i = 0; i < temp.length; i++) {
                                    processName = item.getProcessName();
                                    if (temp[i].name === item.getCategory()) {
                                        isCategoryFound = true;
                                        options = {
                                            name: item.getFieldName(),
                                            displayName: item.getDisplayName(),
                                            type: item.getDataType(),
                                            canDelete: true
                                        };
                                        filterObj = new filter(options);
                                        if (processName) {
                                            var items = temp[i].items;
                                            var isProcessFound = false;
                                            for (var j = 0; j < items.length; j++) {
                                                if (items[j].name === processName) {
                                                    isProcessFound = true;
                                                    items[j].items.push(filterObj);
                                                }
                                            }
                                            if (!isProcessFound) {
                                                var processDetailsToBeAdded = {
                                                    name: processName,
                                                    displayName: processName,
                                                    items: [filterObj]
                                                };
                                                temp[i].items.push(processDetailsToBeAdded);
                                            }
                                        }
                                        break;
                                    }

                                }
                                if (!isCategoryFound) {
                                    options = {
                                        name: item.getFieldName(),
                                        displayName: item.getDisplayName(),
                                        type: item.getDataType(),
                                        canDelete: true
                                    };
                                    filterObj = new filter(options);
                                    if (processName) {
                                        var processDetails = {
                                            name: processName,
                                            displayName: processName,
                                            items: [filterObj]
                                        };
                                        temp.push({
                                            displayName: item.getCategory(),
                                            name: item.getCategory(),
                                            items: [processDetails]
                                        });
                                    }
                                }
                            });

                            self.availableSearchableFields(temp);

                        });
                    } else {
                        self.availableSearchableFields(temp);
                    }


                });
            }


            /**
             * Handles the onclick event of the addfilter button. This method tries to show the available filter menu.
             * @param data The data passed from UI.
             * @param event The event object.
             */
            self.onClickAddFilter = function refreshFilterMenu(data, event) {
                var addFilterBtn = '#' + event.currentTarget.id;
                var filterMenu = $(addFilterBtn).siblings('.pcs-ts-serachable-fields-menu');
                $(filterMenu).ojMenu('refresh');
            };



            self.handleSearch = function performSearch() {
                if (self.mode() === 'Search') {
                    performAdvanceSearch();
                } else {
                    performSearchBasedOnStandardFilters();
                }
                self.closeAdvanceSearchPopup();
            };

            function performSearchBasedOnStandardFilters() {

                var options = {};

                // Add keyword
                options.keyword = self.keyword();

                // Add selected status
                if (self.selectedStatus().length > 0) {
                    options.status = self.selectedStatus();
                }
                if (self.selectedAssignees()) {
                    options.assignees = self.selectedAssignees();
                }

                //Add fromuser.
                var formuser = $('#fromUser');
                var identityBrowser = formuser.find('#identityBrowser');
                var obj = ko.contextFor(identityBrowser[0]);
                if (obj) {
                    var data = obj.$data;
                    var objectIDS = data.getUserIDs();
                    if (objectIDS.length > 0) {
                        options.fromUser = objectIDS;
                    }
                }

                // Add selected applications
                if (self.selectedApplications().length > 0) {
                    options.applications = self.selectedApplications();
                }

                if (self.dueDateFilter().values()) {

                    // Populate the values of the searchable field to the array.
                    var valuesArray = [];
                    var selectedFilterOperator = self.dueDateFilter().filterOperator()[0];

                    self.dueDateFilter().values().forEach(function(value) {
                        if (selectedFilterOperator === self.filterOperator.operators.operator.OPERATOR_ON ||
                            selectedFilterOperator === self.filterOperator.operators.operator.OPERATOR_BETWEEN ||
                            selectedFilterOperator === self.filterOperator.operators.operator.OPERATOR_AFTER ||
                            selectedFilterOperator === self.filterOperator.operators.operator.OPERATOR_BEFORE) {
                            if (value.type() === self.filterValueType.valueTypes.DATE) {
                                if (value.value()) {
                                    valuesArray.push(value.value());
                                }
                            }
                        }
                        if (selectedFilterOperator === self.filterOperator.operators.operator.OPERATOR_IN_LAST ||
                            selectedFilterOperator === self.filterOperator.operators.operator.OPERATOR_WITH_IN) {
                            if (value.value()) {
                                if (value.type() === self.filterValueType.valueTypes.INTEGER) {
                                    valuesArray.push(value.value());
                                }
                                if (value.type() === self.filterValueType.valueTypes.LIST) {
                                    valuesArray.push(value.value()[0]);
                                }
                            }
                        }
                    });

                    // Proceed only if the values are filled in by the user.
                    if (valuesArray.length > 0) {
                        if (selectedFilterOperator === self.filterOperator.operators.operator.OPERATOR_ON) {
                            options.toDueDate = valuesArray[0];
                            options.fromDueDate = valuesArray[0];
                        }
                        if (selectedFilterOperator === self.filterOperator.operators.operator.OPERATOR_BETWEEN) {
                            options.fromDueDate = valuesArray[0];
                            options.toDueDate = valuesArray[1];
                        }
                        if (selectedFilterOperator === self.filterOperator.operators.operator.OPERATOR_AFTER) {
                            options.fromDueDate = valuesArray[0];
                            options.toDueDate = null;
                        }
                        if (selectedFilterOperator === self.filterOperator.operators.operator.OPERATOR_BEFORE) {
                            options.fromDueDate = null;
                            options.toDueDate = valuesArray[0];
                        }
                    }
                }
                self.rootElement.trigger('taskSearch:searchByStandardFilters', [options]);
            }

            function performAdvanceSearch() {

                var taskSearchquery = new query({
                    operator: 'MUST'
                });
                var stringQuery, options;

                //Add contains text.
                if (self.containsText()) {
                    options = {
                        fieldName: columns.PUBLIC_INFO_FIELD,
                        values: [self.containsText()]
                    };
                    var textQuery = new textQueryClause(options);
                    taskSearchquery.queryClauses.push({
                        textQuery: textQuery,
                        operator: 'MUST'
                    });
                }

                // Add selected status
                if (self.selectedStatus().length > 0) {
                    options = {
                        fieldName: columns.SYSTEM_ATTRIBUTES_STATE,
                        values: self.selectedStatus()
                    };
                    stringQuery = new stringQueryClause(options);
                    taskSearchquery.queryClauses.push({
                        stringQuery: stringQuery,
                        operator: self.selectedStatus().length > 1 ? 'SHOULD' : 'MUST'
                    });
                }

                // Add selected assignment filter
                if (self.selectedAssignees()) {
                    options = {
                        fieldName: columns.ASSIGNEES,
                        values: self.selectedAssignees()
                    };
                    stringQuery = new stringQueryClause(options);
                    taskSearchquery.queryClauses.push({
                        stringQuery: stringQuery,
                        operator: 'MUST'
                    });
                }

                //Add fromuser.
                var formuser = $('#fromUser');
                var identityBrowser = formuser.find('#identityBrowser');
                var obj = ko.contextFor(identityBrowser[0]);
                if (obj) {
                    var data = obj.$data;
                    var objectIDS = data.getUserIDs();
                    if (objectIDS.length > 0) {
                        options = {
                            fieldName: columns.SYSTEM_ATTRIBUTES_FROM_USER_ID,
                            values: objectIDS
                        };
                        stringQuery = new stringQueryClause(options);
                        taskSearchquery.queryClauses.push({
                            stringQuery: stringQuery,
                            operator: objectIDS.length > 1 ? 'SHOULD' : 'MUST'
                        });
                    }
                }

                // Add selected applications
                if (self.selectedApplications().length > 0) {
                    options = {
                        fieldName: columns.PROCESS_DEF_ID,
                        values: self.selectedApplications()
                    };
                    stringQuery = new stringQueryClause(options);
                    taskSearchquery.queryClauses.push({
                        stringQuery: stringQuery,
                        operator: self.selectedApplications().length > 1 ? 'SHOULD' : 'MUST'
                    });
                }

                // Add duedate filter.
                var dueDateFilter = getQueryClauseForSearchableFieldOfTypeDate(self.dueDateFilter());
                if (dueDateFilter) {
                    taskSearchquery.queryClauses.push(dueDateFilter);
                }

                // Add selected searchable fields
                self.selectedSearchableFields().forEach(function(searchableField, index) {
                    var searchableFieldQueryClause = getQueryClaues(searchableField, index);
                    if (searchableFieldQueryClause) {
                        taskSearchquery.queryClauses.push(searchableFieldQueryClause);
                    }
                });

                var jsonToSend = {
                    query: taskSearchquery,
                    start: 0,
                    offset: 30,
                    sorts: [],
                    fields: fields,
                    language: 'en'
                };
                var stringJson = JSON.stringify(jsonToSend);
                console.log(stringJson);
                self.rootElement.trigger('taskSearch:searchBySearchableFields', [jsonToSend]);
            }


            function getQueryClaues(searchableField, index) {
                if (searchableField.type() === filterType.filterTypes.STRING) {
                    return getQueryClauseForSearchableFieldOfTypeString(searchableField);
                }
                if (searchableField.type() === filterType.filterTypes.DATE) {
                    return getQueryClauseForSearchableFieldOfTypeDate(searchableField);
                }
                if (searchableField.type() === filterType.filterTypes.INTEGER ||
                    searchableField.type() === filterType.filterTypes.DOUBLE ||
                    searchableField.type() === filterType.filterTypes.FLOAT ||
                    searchableField.type() === filterType.filterTypes.LONG) {
                    return getQueryClauseForSearchableFieldOfTypeNumeric(searchableField);
                }
                if (searchableField.type() === filterType.filterTypes.USER) {
                    return getQueryClauseForSearchableFieldOfTypeUser(searchableField, index);
                }
            }


            /**
             * Returns the query clause formed for the searchable field of type Date. It can be empty if
             * unable to form the query clause.
             * @param searchableField The searchable field for which query clause needs to be formed.
             * @returns {{numericRangeQuery: *}}
             */
            function getQueryClauseForSearchableFieldOfTypeDate(searchableField) {

                if (searchableField.values()) {

                    // Populate the values of the searchable field to the array.
                    var valuesArray = [];
                    var selectedFilterOperator = searchableField.filterOperator()[0];

                    searchableField.values().forEach(function(value) {
                        if (selectedFilterOperator === self.filterOperator.operators.operator.OPERATOR_ON ||
                            selectedFilterOperator === self.filterOperator.operators.operator.OPERATOR_BETWEEN ||
                            selectedFilterOperator === self.filterOperator.operators.operator.OPERATOR_AFTER ||
                            selectedFilterOperator === self.filterOperator.operators.operator.OPERATOR_BEFORE) {
                            if (value.type() === self.filterValueType.valueTypes.DATE) {
                                if (value.value()) {
                                    valuesArray.push(value.value());
                                }
                            }
                        }
                        if (selectedFilterOperator === self.filterOperator.operators.operator.OPERATOR_IN_LAST ||
                            selectedFilterOperator === self.filterOperator.operators.operator.OPERATOR_WITH_IN) {
                            if (value.value()) {
                                if (value.type() === self.filterValueType.valueTypes.INTEGER) {
                                    valuesArray.push(value.value());
                                }
                                if (value.type() === self.filterValueType.valueTypes.LIST) {
                                    valuesArray.push(value.value()[0]);
                                }
                            }
                        }
                    });

                    // Proceed only if the values are filled in by the user.
                    if (valuesArray.length > 0) {

                        var numericRangeType, numericRangePrimitiveType, lowerBound, upperBound, numericRanges,
                            numericRangeQuery, numericRangeString, numericRangeOptions, numericRangeQueryOptions;

                        // Retrieve the numeric range and numeric range primitive type based on the searchable field type.
                        numericRangeType = numericRangeTypeFactory.getNumericRangeTypeBasedOnType(searchableField.type());
                        numericRangePrimitiveType = numericRangeTypeFactory.getNumericRangePrimitiveTypeBasedOnType(
                            searchableField.type());

                        // In case of OPERATOR_ON, numeric range query with min and max value of same value passed.
                        if (selectedFilterOperator === self.filterOperator.operators.operator.OPERATOR_ON) {
                            lowerBound = valuesArray[0] ? valuesArray[0] : null;
                            upperBound = valuesArray[0] ? valuesArray[0] : null;
                            if (lowerBound) {
                                lowerBound = new Date(lowerBound).getTime();
                            }
                            if (upperBound) {
                                upperBound = new Date(upperBound).getTime();
                            }
                            numericRangeOptions = {
                                type: numericRangeType,
                                minValue: lowerBound,
                                maxValue: upperBound,
                                primitiveType: numericRangePrimitiveType
                            };
                            numericRanges = new numericRange(numericRangeOptions);
                            numericRangeString = JSON.stringify(numericRanges).replace('type', '@type');
                            numericRanges = JSON.parse(numericRangeString);
                            numericRangeQueryOptions = {
                                fieldName: searchableField.name,
                                minInclusive: true,
                                maxInclusive: true,
                                numericRanges: [numericRanges]
                            };
                            numericRangeQuery = new numericRangeQueryClause(numericRangeQueryOptions);
                            return {
                                numericRangeQuery: numericRangeQuery,
                                operator: 'MUST'
                            };
                        }

                        // In case of OPERATOR_BEFORE, numeric range query with minValue as null and maxValue  as user
                        // entered passed.
                        if (selectedFilterOperator === self.filterOperator.operators.operator.OPERATOR_BEFORE) {
                            lowerBound = null;
                            upperBound = valuesArray[0] ? valuesArray[0] : null;
                            if (upperBound) {
                                upperBound = new Date(upperBound).getTime();
                            }
                            numericRangeOptions = {
                                type: numericRangeType,
                                minValue: lowerBound,
                                maxValue: upperBound,
                                primitiveType: numericRangePrimitiveType
                            };
                            numericRanges = new numericRange(numericRangeOptions);
                            numericRangeString = JSON.stringify(numericRanges).replace('type', '@type');
                            numericRanges = JSON.parse(numericRangeString);
                            numericRangeQueryOptions = {
                                fieldName: searchableField.name,
                                minInclusive: true,
                                maxInclusive: true,
                                numericRanges: [numericRanges]
                            };
                            numericRangeQuery = new numericRangeQueryClause(numericRangeQueryOptions);
                            return {
                                numericRangeQuery: numericRangeQuery,
                                operator: 'MUST'
                            };
                        }

                        // In case of OPERATOR_AFTER, numeric range query with maxValue as null and minValue  as user
                        // entered passed.
                        if (selectedFilterOperator === self.filterOperator.operators.operator.OPERATOR_AFTER) {
                            lowerBound = valuesArray[0] ? valuesArray[0] : null;
                            upperBound = null;
                            if (lowerBound) {
                                lowerBound = new Date(lowerBound).getTime();
                            }
                            numericRangeOptions = {
                                type: numericRangeType,
                                minValue: lowerBound,
                                maxValue: upperBound,
                                primitiveType: numericRangePrimitiveType
                            };
                            numericRanges = new numericRange(numericRangeOptions);
                            numericRangeString = JSON.stringify(numericRanges).replace('type', '@type');
                            numericRanges = JSON.parse(numericRangeString);
                            numericRangeQueryOptions = {
                                fieldName: searchableField.name,
                                minInclusive: true,
                                maxInclusive: true,
                                numericRanges: [numericRanges]
                            };
                            numericRangeQuery = new numericRangeQueryClause(numericRangeQueryOptions);
                            return {
                                numericRangeQuery: numericRangeQuery,
                                operator: 'MUST'
                            };
                        }

                        // In case of OPERATOR_BETWEEN, numeric range query with maxValue and minValue  as user
                        // entered passed.
                        if (selectedFilterOperator === self.filterOperator.operators.operator.OPERATOR_BETWEEN) {
                            lowerBound = valuesArray[0] ? valuesArray[0] : null;
                            upperBound = valuesArray[1] ? valuesArray[1] : null;
                            if (lowerBound) {
                                lowerBound = new Date(lowerBound).getTime();
                            }
                            if (upperBound) {
                                upperBound = new Date(upperBound).getTime();
                            }
                            numericRangeOptions = {
                                type: numericRangeType,
                                minValue: lowerBound,
                                maxValue: upperBound,
                                primitiveType: numericRangePrimitiveType
                            };
                            numericRanges = new numericRange(numericRangeOptions);
                            numericRangeString = JSON.stringify(numericRanges).replace('type', '@type');
                            numericRanges = JSON.parse(numericRangeString);
                            numericRangeQueryOptions = {
                                fieldName: searchableField.name,
                                minInclusive: true,
                                maxInclusive: true,
                                numericRanges: [numericRanges]
                            };
                            numericRangeQuery = new numericRangeQueryClause(numericRangeQueryOptions);
                            return {
                                numericRangeQuery: numericRangeQuery,
                                operator: 'MUST'
                            };
                        }
                    }

                }
            }

            /**
             * Returns the query clause formed for the searchable field of type string. It can be empty if
             * unable to form the query clause.
             * @param searchableField The searchable field for which query clause needs to be formed.
             * @returns {{stringQuery: *}}
             */
            function getQueryClauseForSearchableFieldOfTypeString(searchableField) {

                if (searchableField.values()) {

                    // Populate the values of the searchable field to the array.
                    var valuesArray = [];
                    searchableField.values().forEach(function(value) {
                        if (value.value()) {
                            valuesArray.push(value.value());
                        }
                    });

                    // Proceed only if the values are filled in by the user.
                    if (valuesArray.length > 0) {
                        var options = {
                            fieldName: searchableField.name,
                            values: valuesArray
                        };
                        var textQuery = new textQueryClause(options);
                        return {
                            textQuery: textQuery,
                            operator: 'MUST'
                        };
                    }
                }
            }


            /**
             * Returns the query clause formed for the searchable field of type user. It can be empty if
             * unable to form the query clause.
             * @param searchableField The searchable field for which query clause needs to be formed.
             * @param index The position of the searchable field in the array.
             * @returns {{stringQuery: *}}
             */
            function getQueryClauseForSearchableFieldOfTypeUser(searchableField, index) {

                // Retrieve the  identity browser component based on unique id.
                var id = '#' + generatedPrefixIdForSearchableFieldOfUserType + index;
                var searchUserField = $(id);
                var identityBrowser = searchUserField.find('#identityBrowser');
                var obj = ko.contextFor(identityBrowser[0]);
                if (obj) {
                    var data = obj.$data;
                    var objectIDS = data.getUserIDs();

                    //Form the query only if user has selected something.
                    if (objectIDS.length > 0) {
                        var options = {
                            fieldName: searchableField.name,
                            values: objectIDS
                        };
                        var stringQuery = new stringQueryClause(options);
                        return {
                            stringQuery: stringQuery,
                            operator: objectIDS.length > 1 ? 'SHOULD' : 'MUST'
                        };
                    }
                }
            }

            /**
             * Returns the query clause formed for the searchable field of type numeric. It can be empty if
             * unable to form the query clause.
             * @param searchableField The searchable field for which query clause needs to be formed.
             * @returns {{numericRangeQuery: *}}
             */
            function getQueryClauseForSearchableFieldOfTypeNumeric(searchableField) {

                if (searchableField.values()) {

                    // Populate the values of the searchable field to the array.
                    var valuesArray = [];
                    searchableField.values().forEach(function(value) {
                        if (value.value()) {
                            valuesArray.push(value.value());
                        }
                    });

                    // Proceed only if the values are filled in by the user.
                    if (valuesArray.length > 0) {

                        var numericRangeType, numericRangePrimitiveType, lowerBound, upperBound, numericRanges, numericRangeQuery,
                            numericRangeString, numericRangeOptions, numericRangeQueryOptions;
                        var selectedFilterOperator = searchableField.filterOperator()[0];

                        // Retrieve the numeric range and numeric range primitive type based on the searchable field type.
                        numericRangeType = numericRangeTypeFactory.getNumericRangeTypeBasedOnType(searchableField.type());
                        numericRangePrimitiveType = numericRangeTypeFactory.getNumericRangePrimitiveTypeBasedOnType(
                            searchableField.type());

                        // In case of OPERATOR_ON, numeric range query with min and max value of same value passed.
                        if (selectedFilterOperator === self.filterOperator.operators.operator.OPERATOR_IS) {
                            lowerBound = valuesArray[0];
                            upperBound = valuesArray[0];
                            numericRangeOptions = {
                                type: numericRangeType,
                                minValue: lowerBound,
                                maxValue: upperBound,
                                primitiveType: numericRangePrimitiveType
                            };
                            numericRanges = new numericRange(numericRangeOptions);
                            numericRangeString = JSON.stringify(numericRanges).replace('type', '@type');
                            numericRanges = JSON.parse(numericRangeString);
                            numericRangeQueryOptions = {
                                fieldName: searchableField.name,
                                minInclusive: true,
                                maxInclusive: true,
                                numericRanges: [numericRanges]
                            };
                            numericRangeQuery = new numericRangeQueryClause(numericRangeQueryOptions);
                            return {
                                numericRangeQuery: numericRangeQuery,
                                operator: 'MUST'
                            };
                        }

                        // In case of OPERATOR_LESSER_THAN, numeric range query with minValue as null and maxValue as
                        // user entered are passed.
                        if (selectedFilterOperator === self.filterOperator.operators.operator.OPERATOR_LESSER_THAN) {
                            lowerBound = null;
                            upperBound = valuesArray[0];
                            numericRangeOptions = {
                                type: numericRangeType,
                                minValue: lowerBound,
                                maxValue: upperBound,
                                primitiveType: numericRangePrimitiveType
                            };
                            numericRanges = new numericRange(numericRangeOptions);
                            numericRangeString = JSON.stringify(numericRanges).replace('type', '@type');
                            numericRanges = JSON.parse(numericRangeString);
                            numericRangeQueryOptions = {
                                fieldName: searchableField.name,
                                minInclusive: true,
                                maxInclusive: false,
                                numericRanges: [numericRanges]
                            };
                            numericRangeQuery = new numericRangeQueryClause(numericRangeQueryOptions);
                            return {
                                numericRangeQuery: numericRangeQuery,
                                operator: 'MUST'
                            };
                        }

                        // In case of OPERATOR_GREATER_THAN, numeric range query with maxValue as null and minValue as
                        // user entered are passed.
                        if (selectedFilterOperator === self.filterOperator.operators.operator.OPERATOR_GREATER_THAN) {
                            lowerBound = valuesArray[0];
                            upperBound = null;
                            numericRangeOptions = {
                                type: numericRangeType,
                                minValue: lowerBound,
                                maxValue: upperBound,
                                primitiveType: numericRangePrimitiveType
                            };
                            numericRanges = new numericRange(numericRangeOptions);
                            numericRangeString = JSON.stringify(numericRanges).replace('type', '@type');
                            numericRanges = JSON.parse(numericRangeString);
                            numericRangeQueryOptions = {
                                fieldName: searchableField.name,
                                minInclusive: false,
                                maxInclusive: true,
                                numericRanges: [numericRanges]
                            };
                            numericRangeQuery = new numericRangeQueryClause(numericRangeQueryOptions);
                            return {
                                numericRangeQuery: numericRangeQuery,
                                operator: 'MUST'
                            };
                        }

                        // In case of OPERATOR_GREATER_THAN, numeric range query with maxValue and minValue as
                        // user entered are passed.
                        if (selectedFilterOperator === self.filterOperator.operators.operator.OPERATOR_BETWEEN) {
                            lowerBound = valuesArray[0];
                            upperBound = valuesArray[1];
                            numericRangeOptions = {
                                type: numericRangeType,
                                minValue: lowerBound,
                                maxValue: upperBound,
                                primitiveType: numericRangePrimitiveType
                            };
                            numericRanges = new numericRange(numericRangeOptions);
                            numericRangeString = JSON.stringify(numericRanges).replace('type', '@type');
                            numericRanges = JSON.parse(numericRangeString);
                            numericRangeQueryOptions = {
                                fieldName: searchableField.name,
                                minInclusive: true,
                                maxInclusive: true,
                                numericRanges: [numericRanges]
                            };
                            numericRangeQuery = new numericRangeQueryClause(numericRangeQueryOptions);
                            return {
                                numericRangeQuery: numericRangeQuery,
                                operator: 'MUST'
                            };
                        }
                    }

                }
            }
        };
    });
