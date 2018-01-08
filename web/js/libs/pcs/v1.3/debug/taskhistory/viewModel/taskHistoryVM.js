/**
 * Created by vijagarw on 16/09/2016.
 */

define(['ojs/ojcore', 'knockout', 'jquery', 'pcs/util/pcsUtil', 'pcs/taskhistory/viewModel/TaskHistory', 'ojs/ojknockout', 'ojs/ojcollapsible', 'ojL10n!pcsMsg/nls/pcsSnippetsResource', 'ojs/ojvalidation'],

    function(oj, ko, $, pcsUtil, TaskHistory) {
        'use strict';

        function TaskHistoryVM(params) {

            var self = this;

            self.procHistData = ko.observableArray([]);

            //var taskJSONData;
            //var taskNumber;
            //var service;

            //Set the resource bundle

            self.bundle = require('ojL10n!pcsMsg/nls/pcsSnippetsResource');

            function init() {

                var service = new TaskHistory();

                var currentTaskNumber = params.data.taskNumber;

                service.fetchTask(currentTaskNumber).then(function(taskJSON) {

                    var processInstanceID = taskJSON.processId;

                    var currentTaskNumber = taskJSON.number;

                    if (processInstanceID != null) {

                        //self.taskData = data;
                        //taskJSONData = data;
                        //getProcessAuditData(taskJSON);

                        service.fetchProcessAuditInfo(processInstanceID, currentTaskNumber).then(function(processAuditJSON) {
                            /*self.procHistData(processAuditJSON.processHistory);
                             var json = {
                             'processId' : processAuditJSON.processId
                             };
                             console.log(json);*/



                            self.buildTaskHistoryViewJSON(taskJSON, processAuditJSON);




                            //self.getTaskHistory(taskJSON, processAuditJSON);
                        });
                    }
                });
            }

            init();

            /*function getProcessAuditData(taskJSON){
             service.fetchProcessAuditInfo(taskJSON.processId).then(function(processAuditJSON){
             self.procHistData(processAuditJSON.processHistory);
             self.getTaskHistory(taskJSON, processAuditJSON);
             });
             }*/

            function downloadFile(url, success) {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.setRequestHeader('Authorization', pcsUtil.getAuthInfo());
                xhr.setRequestHeader('pcs_mode', 'dev');
                xhr.responseType = 'blob';
                xhr.onreadystatechange = function() {
                    if (xhr.status === 200 && xhr.readyState === 4) {
                        if (success) {
                            success(xhr.response);
                        }
                    }
                };
                xhr.send(null);
            }



            self.onAttachmentClick = function(data, event) {

                var attachmentURL = event.target.value;
                var attachmentName = event.target.text;

                //var win = window.open('_blank');

                downloadFile(attachmentURL, function(blob) {

                    var url = URL.createObjectURL(blob);

                    var a = document.createElement('a');
                    a.style = 'display: none';
                    a.href = url;
                    a.download = attachmentName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);


                    //win.location = url;
                });


            };

            self.buildTaskHistoryViewJSON = function(taskJSON, processAuditJSON) {

                var currentTaskNumber = taskJSON.number;

                if (taskJSON.rootTaskNumber) {
                    currentTaskNumber = taskJSON.rootTaskNumber;
                }


                var data = processAuditJSON;

                var taskHistoryJSON = {};

                taskHistoryJSON.taskNumber = currentTaskNumber;
                taskHistoryJSON.history = [];


                if (data.processHistory) {
                    for (var i = 0; i < data.processHistory.length; i++) {


                        var historyElement = {};

                        historyElement.activityType = data.processHistory[i].activityType;

                        if (data.processHistory[i].activityType === 'START_EVENT') {

                            var displayMessage = self.bundle.pcs.taskHistory.proc_inst_started;
                            displayMessage = oj.Translations.applyParameters(displayMessage, {
                                '0': data.processHistory[i].processName
                            });
                            historyElement.creationDate = self.formatTaskHistoryDate(data.processHistory[i].creationDate, 'MMM d, yyyy hh:mm:ss a');

                            if (data.processHistory[i].updatedBy) {

                                var updatedByMsg = self.bundle.pcs.taskHistory.proc_inst_started_by;

                                updatedByMsg = oj.Translations.applyParameters(updatedByMsg, {
                                    '0': data.processHistory[i].processName,
                                    '1': data.processHistory[i].updatedBy
                                });
                                displayMessage = updatedByMsg;
                            }



                            historyElement.displayMessage = displayMessage;

                        }

                        if (data.processHistory[i].activityType === 'END_EVENT') {

                            historyElement.displayMessage = self.bundle.pcs.taskHistory.proc_inst_ended;
                            historyElement.creationDate = self.formatTaskHistoryDate(data.processHistory[i].creationDate, 'MMM d, yyyy hh:mm:ss a');

                        }

                        if (data.processHistory[i].activityType === 'FUTURE_TASK') {

                            var futureTaskMsg = self.bundle.pcs.taskHistory.pcs_history_user_task_pending;
                            futureTaskMsg = oj.Translations.applyParameters(futureTaskMsg, {
                                '0': data.processHistory[i].activityName
                            });

                            historyElement.displayMessage = futureTaskMsg;

                        }


                        if (data.processHistory[i].activityType === 'USER_TASK') {

                            var displayMsg;

                            if (data.processHistory[i].userTaskTitle) {
                                displayMsg = data.processHistory[i].userTaskTitle;
                            } else {
                                displayMsg = data.processHistory[i].activityName;
                            }

                            historyElement.displayMessage = displayMsg;
                            historyElement.creationDate = self.formatTaskHistoryDate(data.processHistory[i].creationDate, 'MMM d, yyyy hh:mm:ss a');
                            historyElement.showExpanded = 'false';

                            if (currentTaskNumber == data.processHistory[i].userTaskNumber) {

                                historyElement.detailedHistory = [];
                                historyElement.showExpanded = 'true';


                                var routingType = taskJSON.routingType;

                                if (routingType === 'SINGLE') {
                                    historyElement.routingTypeImageClass = 'pcs-th-single-assignee-img';
                                    historyElement.routingTypeImageTitle = 'Single Assignee';
                                } else if (routingType === 'PARALLEL') {

                                    historyElement.routingTypeImageClass = 'pcs-th-parallel-assignee-img';
                                    historyElement.routingTypeImageTitle = 'Parallel Assignees';
                                    historyElement.routingTypeMoreInfo = 'Consensus : ' + taskJSON.outcomePercentage + ' %';

                                } else if (routingType === 'SEQUENTIAL') {

                                    historyElement.routingTypeImageClass = 'pcs-th-sequential-assignee-img';
                                    historyElement.routingTypeImageTitle = 'Sequential Assignees';

                                } else if (routingType === 'MANAGEMENT CHAIN') {

                                    historyElement.routingTypeImageClass = 'pcs-th-management-chain-assignee-img';
                                    historyElement.routingTypeImageTitle = 'Management Chain in Sequence';
                                    historyElement.routingTypeMoreInfo = 'Number of levels : ' + taskJSON.managementChainLevel;
                                }


                                historyElement.originalAssignees = [];

                                for (var k = 0; k < taskJSON.originalAssignees.items.length; k++) {

                                    var originalAssigneesElement = {};

                                    originalAssigneesElement.type = taskJSON.originalAssignees.items[k].type;
                                    originalAssigneesElement.id = taskJSON.originalAssignees.items[k].id;

                                    var type = taskJSON.originalAssignees.items[k].type;

                                    if (type === 'user') {

                                        originalAssigneesElement.assigneeTypeImageClass = 'pcs-th-history-user-img';


                                    } else if (type === 'group') {

                                        originalAssigneesElement.assigneeTypeImageClass = 'pcs-th-history-group-img';

                                    } else if (type === 'application_role') {

                                        originalAssigneesElement.assigneeTypeImageClass = 'pcs-th-history-approle-img';

                                    }

                                    historyElement.originalAssignees.push(originalAssigneesElement);
                                }

                                for (var j = 0; j < data.processHistory[i].taskHistory.length; j++) {

                                    var detailedHistoryElement = {};


                                    if (data.processHistory[i].taskHistory[j].actionName === 'System Update') {

                                        continue;
                                        // do nothing
                                    } else if (data.processHistory[i].taskHistory[j].actionName === 'Withdrawn') {

                                        var withDrawnMsg = self.bundle.pcs.taskHistory.pcs_history_withdrawn_message;
                                        withDrawnMsg = oj.Translations.applyParameters(withDrawnMsg, {
                                            '0': data.processHistory[i].taskHistory[j].displayName
                                        });
                                        detailedHistoryElement.displayMessage = withDrawnMsg;

                                        //detailedHistoryElement.displayMsg = 'Withdrawn from ' + data.processHistory[i].taskHistory[j].displayName;
                                        detailedHistoryElement.creationDate = self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a');
                                        detailedHistoryElement.imageClass = 'pcs-th-withdrawn-action-img';
                                        detailedHistoryElement.actionType = 'REGULAR';


                                        /*historyHTML = historyHTML +

                                         '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

                                         '<div style='float:left; padding-right: 15px;'>' +

                                         '<img class='pcs-th-withdrawn-action-img'>' +

                                         '</div>' +

                                         '<span style='padding-top: 11px; float: left;'>Withdrawn from ' +

                                         '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span>' +
                                         '</span>' + '&nbsp &nbsp' +
                                         '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

                                         self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +

                                         '</span>' +


                                         '</li>';*/
                                    } else if (data.processHistory[i].taskHistory[j].actionName === 'Resumed') {

                                        var resumedMesage = self.bundle.pcs.taskHistory.pcs_history_resumed_message;
                                        resumedMesage = oj.Translations.applyParameters(resumedMesage, {
                                            '0': data.processHistory[i].taskHistory[j].displayName
                                        });
                                        detailedHistoryElement.displayMessage = resumedMesage;
                                        detailedHistoryElement.actionType = 'REGULAR';

                                        //detailedHistoryElement.displayMsg = 'Resumed by ' + data.processHistory[i].taskHistory[j].displayName;
                                        detailedHistoryElement.creationDate = self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a');
                                        detailedHistoryElement.imageClass = 'pcs-th-resumed-action-img';

                                        /*historyHTML = historyHTML +

                                         '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

                                         '<div style='float:left; padding-right: 15px;'>' +

                                         '<img class='pcs-th-resumed-action-img'>' +

                                         '</div>' +

                                         '<span style='padding-top: 11px; float: left;'>Resumed by ' +

                                         '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span>' +
                                         '</span>' + '&nbsp &nbsp' +
                                         '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

                                         self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +


                                         '</span>' +


                                         '</li>';*/
                                    } else if (data.processHistory[i].taskHistory[j].actionName === 'Suspended') {

                                        var suspendedMsg = self.bundle.pcs.taskHistory.pcs_history_suspended_message;
                                        suspendedMsg = oj.Translations.applyParameters(suspendedMsg, {
                                            '0': data.processHistory[i].taskHistory[j].displayName
                                        });
                                        detailedHistoryElement.displayMessage = suspendedMsg;
                                        detailedHistoryElement.actionType = 'REGULAR';

                                        //detailedHistoryElement.displayMsg = 'Suspended by ' + data.processHistory[i].taskHistory[j].displayName;
                                        detailedHistoryElement.creationDate = self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a');
                                        detailedHistoryElement.imageClass = 'pcs-th-suspended-action-img';

                                        /*historyHTML = historyHTML +

                                         '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

                                         '<div style='float:left; padding-right: 15px;'>' +

                                         '<img class='pcs-th-suspended-action-img'>' +

                                         '</div>' +

                                         '<span style='padding-top: 11px; float: left;'>Suspended by ' +

                                         '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span>' +
                                         '</span>' + '&nbsp &nbsp' +
                                         '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

                                         self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +


                                         '</span>' +


                                         '</li>';*/
                                    } else if (data.processHistory[i].taskHistory[j].actionName === 'Escalated') {

                                        var escalatedMsg = self.bundle.pcs.taskHistory.pcs_history_escalated_message;
                                        escalatedMsg = oj.Translations.applyParameters(escalatedMsg, {
                                            '0': data.processHistory[i].taskHistory[j].displayName
                                        });
                                        detailedHistoryElement.displayMessage = escalatedMsg;
                                        detailedHistoryElement.actionType = 'REGULAR';

                                        //detailedHistoryElement.displayMsg = 'Escalated to ' + data.processHistory[i].taskHistory[j].displayName;
                                        detailedHistoryElement.creationDate = self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a');
                                        detailedHistoryElement.imageClass = 'pcs-th-escalated-action-img';

                                        /*historyHTML = historyHTML +

                                         '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

                                         '<div style='float:left; padding-right: 15px;'>' +

                                         '<img class='pcs-th-escalated-action-img'>' +

                                         '</div>' +

                                         '<span style='padding-top: 11px; float: left;'>Escalated to ' +

                                         '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span>' +
                                         '</span>' + '&nbsp &nbsp' +
                                         '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

                                         self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +

                                         '</span>' +


                                         '</li>';*/
                                    } else if (data.processHistory[i].taskHistory[j].actionName === 'Delegated') {

                                        var delegatedMsg = self.bundle.pcs.taskHistory.pcs_history_delegated_message;
                                        delegatedMsg = oj.Translations.applyParameters(delegatedMsg, {
                                            '0': data.processHistory[i].taskHistory[j].displayName
                                        });
                                        detailedHistoryElement.displayMessage = delegatedMsg;
                                        detailedHistoryElement.actionType = 'REGULAR';

                                        //detailedHistoryElement.displayMsg = 'Delegated to ' + data.processHistory[i].taskHistory[j].displayName;
                                        detailedHistoryElement.creationDate = self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a');
                                        detailedHistoryElement.imageClass = 'pcs-th-delegated-action-img';

                                        /*historyHTML = historyHTML +

                                         '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

                                         '<div style='float:left; padding-right: 15px;'>' +

                                         '<img class='pcs-th-delegated-action-img'>' +

                                         '</div>' +

                                         '<span style='padding-top: 11px; float: left;'>Delegated to ' +

                                         '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span>' +
                                         '</span>' + '&nbsp &nbsp' +
                                         '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

                                         self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +

                                         '</span>' +


                                         '</li>';*/
                                    } else if (data.processHistory[i].taskHistory[j].actionName === 'Approved') {

                                        var approvedMsg = self.bundle.pcs.taskHistory.pcs_history_approved_message;
                                        approvedMsg = oj.Translations.applyParameters(approvedMsg, {
                                            '0': data.processHistory[i].taskHistory[j].displayName
                                        });
                                        detailedHistoryElement.displayMessage = approvedMsg;
                                        detailedHistoryElement.actionType = 'REGULAR';

                                        //detailedHistoryElement.displayMsg = 'Approved by ' + data.processHistory[i].taskHistory[j].displayName;
                                        detailedHistoryElement.creationDate = self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a');
                                        detailedHistoryElement.imageClass = 'pcs-th-approved-action-img';

                                        /*historyHTML = historyHTML +

                                         '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

                                         '<div style='float:left; padding-right: 15px;'>' +

                                         '<img class='pcs-th-approved-action-img'>' +

                                         '</div>' +

                                         '<span style='padding-top: 11px; float: left;'>Approved by ' +

                                         '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span>' +
                                         '</span>' + '&nbsp &nbsp' +
                                         '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

                                         self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +

                                         '</span>' +


                                         '</li>';*/
                                    } else if (data.processHistory[i].taskHistory[j].actionName === 'Rejected') {

                                        var rejectedMsg = self.bundle.pcs.taskHistory.pcs_history_rejected_message;
                                        rejectedMsg = oj.Translations.applyParameters(rejectedMsg, {
                                            '0': data.processHistory[i].taskHistory[j].displayName
                                        });
                                        detailedHistoryElement.displayMessage = rejectedMsg;
                                        detailedHistoryElement.actionType = 'REGULAR';

                                        //detailedHistoryElement.displayMsg = 'Rejected by ' + data.processHistory[i].taskHistory[j].displayName;
                                        detailedHistoryElement.creationDate = self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a');
                                        detailedHistoryElement.imageClass = 'pcs-th-rejected-action-img';

                                        /*historyHTML = historyHTML +

                                         '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

                                         '<div style='float:left; padding-right: 15px;'>' +

                                         '<img class='pcs-th-rejected-action-img'>' +

                                         '</div>' +

                                         '<span style='padding-top: 11px; float: left;'>Rejected by ' +

                                         '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span>' +
                                         '</span>' + '&nbsp &nbsp' +
                                         '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

                                         self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +


                                         '</span>' +


                                         '</li>';*/
                                    } else if (data.processHistory[i].taskHistory[j].actionName.toString().startsWith('Task Completed')) {

                                        var actionNameStr = data.processHistory[i].taskHistory[j].actionName.toString();

                                        var strArray = actionNameStr.split('-');
                                        var action = strArray[1].trim();

                                        var detailedHistoryElementForAction = {};

                                        if (data.processHistory[i].taskHistory[j].displayName) {


                                            if (action === 'Rejected') {

                                                detailedHistoryElementForAction.imageClass = 'pcs-th-rejected-action-img';

                                            } else if (action === 'Approved') {

                                                detailedHistoryElementForAction.imageClass = 'pcs-th-approved-action-img';

                                            } else {

                                                detailedHistoryElementForAction.imageClass = 'pcs-th-undefined-action-img';
                                            }



                                            var actionMsg = self.bundle.pcs.taskHistory.pcs_history_any_action_message;
                                            actionMsg = oj.Translations.applyParameters(actionMsg, {
                                                '0': action,
                                                '1': data.processHistory[i].taskHistory[j].displayName
                                            });
                                            detailedHistoryElementForAction.displayMessage = actionMsg;


                                            //detailedHistoryElementForAction.displayMsg = action + ' by ' + data.processHistory[i].taskHistory[j].displayName;

                                            detailedHistoryElementForAction.creationDate = self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a');
                                            detailedHistoryElementForAction.actionType = 'REGULAR';
                                            historyElement.detailedHistory.push(detailedHistoryElementForAction);
                                        }

                                        var taskCompletedMsg = self.bundle.pcs.taskHistory.pcs_history_task_completed;
                                        detailedHistoryElement.displayMessage = taskCompletedMsg;
                                        detailedHistoryElement.actionType = 'REGULAR';

                                        //detailedHistoryElement.displayMsg = taskCompletedString;
                                        detailedHistoryElement.creationDate = self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a');
                                        detailedHistoryElement.imageClass = 'pcs-th-task-Completed-action-img';


                                        /*var actionNameStr = data.processHistory[i].taskHistory[j].actionNameStr.toString();

                                         var strArray = actionNameStr.split('-');
                                         var taskCompletedString = strArray[0].trim();
                                         var action = strArray[1].trim();


                                         if(data.processHistory[i].taskHistory[j].displayName) {
                                         historyHTML = historyHTML +

                                         '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

                                         '<div style='float:left; padding-right: 15px;'>';

                                         if (action === 'Rejected') {

                                         historyHTML = historyHTML +
                                         '<img class='pcs-th-rejected-action-img'>';
                                         }
                                         else if (action === 'Approved') {

                                         historyHTML = historyHTML +
                                         '<img class='pcs-th-approved-action-img'>';
                                         } else {

                                         historyHTML = historyHTML +
                                         '<img class='pcs-th-undefined-action-img'>';
                                         }


                                         historyHTML = historyHTML +

                                         '</div>' +

                                         '<span style='padding-top: 11px; float: left;'>' +

                                         action + ' by ' +

                                         '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span>' +
                                         '</span>' + '&nbsp &nbsp' +
                                         '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

                                         self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +

                                         '</span>' +


                                         '</li>';
                                         }

                                         historyHTML = historyHTML +

                                         '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

                                         '<div style='float:left; padding-right: 15px;'>' +

                                         '<img class='pcs-th-task-Completed-action-img'>' +

                                         '</div>' +

                                         '<span style='padding-top: 11px; float: left;'>' +

                                         taskCompletedString +

                                         '</span>' + '&nbsp &nbsp' +

                                         '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

                                         self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +

                                         '</span>' +


                                         '</li>';*/


                                    } else if (data.processHistory[i].taskHistory[j].actionName === 'Information Submitted') {

                                        var infoSubmittedMsg = self.bundle.pcs.taskHistory.pcs_history_info_submitted_message;
                                        infoSubmittedMsg = oj.Translations.applyParameters(infoSubmittedMsg, {
                                            '0': data.processHistory[i].taskHistory[j].displayName,
                                            '1': data.processHistory[i].taskHistory[j].infoSubmittedTo
                                        });
                                        //updatedByMsg = oj.Translations.applyParameters(updatedByMsg, { '1' :data.processHistory[i].taskHistory[j].displayName});
                                        detailedHistoryElement.displayMessage = infoSubmittedMsg;
                                        detailedHistoryElement.actionType = 'REGULAR';


                                        //detailedHistoryElement.displayMsg = '' + 'submitted more Information to ' + data.processHistory[i].taskHistory[j].displayName;
                                        detailedHistoryElement.creationDate = self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a');
                                        detailedHistoryElement.imageClass = 'pcs-th-info-submitted-action-img';

                                        /*historyHTML = historyHTML +

                                         '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

                                         '<div style='float:left; padding-right: 15px;'>' +

                                         '<img class='pcs-th-info-submitted-action-img'>' +

                                         '</div>' +

                                         '<span style='padding-top: 11px; float: left;'>' +

                                         '<span class='pcs-th-history-user-name'>' + '' + '</span> ' +

                                         'submitted more Information to ' + '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '&nbsp &nbsp' + '</span> ' +

                                         '</span>' +

                                         '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

                                         self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +

                                         '</span>' +

                                         '</li>';*/
                                    } else if (data.processHistory[i].taskHistory[j].actionName === 'Task Updated') {



                                        if (data.processHistory[i].taskHistory[j].displayName) {

                                            var taskHistoryUpdatedMsg = self.bundle.pcs.taskHistory.pcs_history_task_updated_message;
                                            taskHistoryUpdatedMsg = oj.Translations.applyParameters(taskHistoryUpdatedMsg, {
                                                '0': data.processHistory[i].taskHistory[j].displayName
                                            });
                                            detailedHistoryElement.displayMessage = taskHistoryUpdatedMsg;
                                            detailedHistoryElement.actionType = 'REGULAR';

                                            //detailedHistoryElement.displayMsg = 'Task updated by ' + data.processHistory[i].taskHistory[j].displayName;
                                            detailedHistoryElement.creationDate = self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a');
                                            detailedHistoryElement.imageClass = 'pcs-th-task-updated-action-img';
                                        }

                                        /*										if(data.processHistory[i].taskHistory[j].displayName)

                                         historyHTML = historyHTML +

                                         '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

                                         '<div style='float:left; padding-right: 15px;'>' +

                                         '<img class='pcs-th-task-updated-action-img'>' +

                                         '</div>' +

                                         '<span style='padding-top: 11px; float: left;'>Task updated by ' +

                                         '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span>' +
                                         '</span>' + '&nbsp &nbsp' +
                                         '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

                                         self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +

                                         '</span>' +

                                         '</li>';*/

                                    } else if (data.processHistory[i].taskHistory[j].actionName === 'Information Requested') {

                                        var infoRequestedMsg = self.bundle.pcs.taskHistory.pcs_history_info_requested_message;

                                        var infoRequestedFrom = data.processHistory[i].taskHistory[j].infoRequestedFrom;

                                        infoRequestedMsg = oj.Translations.applyParameters(infoRequestedMsg, {
                                            '0': data.processHistory[i].taskHistory[j].displayName,
                                            '1': infoRequestedFrom
                                        });

                                        //updatedByMsg = oj.Translations.applyParameters(updatedByMsg, { '1' : infoRequestedFrom});

                                        detailedHistoryElement.displayMessage = infoRequestedMsg;
                                        detailedHistoryElement.actionType = 'REGULAR';

                                        //detailedHistoryElement.displayMsg = data.processHistory[i].taskHistory[j].displayName + 'requested for more Information from ' + '' ;
                                        detailedHistoryElement.creationDate = self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a');
                                        detailedHistoryElement.imageClass = 'pcs-th-info-requested-action-img';

                                        /*historyHTML = historyHTML +

                                         '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

                                         '<div style='float:left; padding-right: 15px;'>' +

                                         '<img class='pcs-th-info-requested-action-img'>' +

                                         '</div>' +

                                         '<span style='padding-top: 11px; float: left;'>' +

                                         '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span> ' +

                                         'requested for more Information from ' + '<span class='pcs-th-history-user-name'>' + '' + '&nbsp &nbsp' + '</span> ' +

                                         '</span>' +

                                         '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

                                         self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +


                                         '</span>' +


                                         '</li>';*/

                                    } else if (data.processHistory[i].taskHistory[j].actionName === 'Reassigned') {

                                        var reassignedMsg = self.bundle.pcs.taskHistory.pcs_history_reassigned_message;
                                        reassignedMsg = oj.Translations.applyParameters(reassignedMsg, {
                                            '0': data.processHistory[i].taskHistory[j].displayName
                                        });
                                        detailedHistoryElement.displayMessage = reassignedMsg;
                                        detailedHistoryElement.actionType = 'REGULAR';

                                        //detailedHistoryElement.displayMsg = 'Reassigned to ' + data.processHistory[i].taskHistory[j].displayName;
                                        detailedHistoryElement.creationDate = self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a');
                                        detailedHistoryElement.imageClass = 'pcs-th-reassigned-action-img';

                                        /*historyHTML = historyHTML +

                                         '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

                                         '<div style='float:left; padding-right: 15px;'>' +

                                         '<img class='pcs-th-reassigned-action-img'>' +

                                         '</div>' +

                                         '<span style='padding-top: 11px; float: left;'>Reassigned to ' +

                                         '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span>' +
                                         '</span>' + '&nbsp &nbsp' +
                                         '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

                                         self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +

                                         '</span>' +


                                         '</li>';*/

                                    } else if (data.processHistory[i].taskHistory[j].actionName === 'Assigned') {

                                        var assignedMsg = self.bundle.pcs.taskHistory.pcs_history_assigned_message;
                                        assignedMsg = oj.Translations.applyParameters(assignedMsg, {
                                            '0': data.processHistory[i].taskHistory[j].displayName
                                        });
                                        detailedHistoryElement.displayMessage = assignedMsg;
                                        detailedHistoryElement.actionType = 'REGULAR';
                                        //detailedHistoryElement.displayMsg = 'Assigned to ' + data.processHistory[i].taskHistory[j].displayName;
                                        detailedHistoryElement.creationDate = self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a');
                                        detailedHistoryElement.imageClass = 'pcs-th-assigned-action-img';

                                        /*historyHTML = historyHTML +

                                         '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

                                         '<div style='float:left; padding-right: 15px;'>' +

                                         '<img class='pcs-th-assigned-action-img'>' +

                                         '</div>' +

                                         '<span style='padding-top: 11px; float: left;'>Assigned to ' +

                                         '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span>' +
                                         '</span>' + '&nbsp &nbsp' +
                                         '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +


                                         self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +


                                         '</span>' +


                                         '</li>';*/
                                    } else if (data.processHistory[i].taskHistory[j].actionName === 'Attachment Added') {

                                        var attachmentAddedMsg = self.bundle.pcs.taskHistory.pcs_history_doc_attached_message;
                                        attachmentAddedMsg = oj.Translations.applyParameters(attachmentAddedMsg, {
                                            '0': data.processHistory[i].taskHistory[j].displayName
                                        });
                                        detailedHistoryElement.displayMessage = attachmentAddedMsg;
                                        detailedHistoryElement.attachmentName = data.processHistory[i].taskHistory[j].reason;
                                        detailedHistoryElement.actionType = 'ATTACHMENT_ADDED';
                                        detailedHistoryElement.attachmentURL = data.processHistory[i].taskHistory[j].attachmentUri.href + '/stream';

                                        //detailedHistoryElement.displayMsg = 'Document attached by ' + data.processHistory[i].taskHistory[j].displayName;
                                        detailedHistoryElement.creationDate = self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a');
                                        detailedHistoryElement.imageClass = 'pcs-th-att-added-action-img';

                                        /*var attURL = data.processHistory[i].taskHistory[j].attachmentUri.href;
                                         var attachmentLinkHTML = '';


                                         doGet(attURL, 'application/json', 'json').done(
                                         function(attJSON){

                                         var mimeType = attJSON.mimeType;
                                         var attName = attJSON.attachmentName;
                                         var attURI = attJSON.uri.href;

                                         doGet(attURI, mimeType, 'text').done(
                                         function(attContent){

                                         var content = attContent.toString();

                                         var hrefStr = 'data:'+ mimeType + ';charset=utf-8,' + content;

                                         attachmentLinkHTML = attachmentLinkHTML +
                                         '<a href='' + hrefStr + '' download='' + attName + ''>' + attName + '</a>';


                                         historyHTML = historyHTML + '<li class='pcs-th-history-user-task-other-rows'>' +

                                         '<div style='float:left; padding-right: 15px;'>' +

                                         '<img class='pcs-th-att-added-action-img'>' +

                                         '</div>' +

                                         'Document attached by ' +

                                         '<span class='pcs-th-history-user-name'>' +

                                         data.processHistory[i].taskHistory[j].displayName + '&nbsp &nbsp' +

                                         '</span>' +


                                         '<span class='pcs-th-history-date pcs-th-history-date-float-right'>' +

                                         self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +



                                         '</span>' +
                                         '<br>' +

                                         attachmentLinkHTML +

                                         '</li>';


                                         }
                                         ).fail(
                                         function(jqXHR, textStatus, errorThrown){
                                         alert('Attachment rest call failed');
                                         }
                                         );
                                         }
                                         ).fail(function(jqXHR, textStatus, errorThrown){
                                         alert('The JSON REST call for attachment failed');
                                         }
                                         );*/
                                    } else if (data.processHistory[i].taskHistory[j].actionName === 'Attachment Removed') {

                                        var attachmentreemovedMsg = self.bundle.pcs.taskHistory.pcs_history_doc_removed_message;
                                        attachmentreemovedMsg = oj.Translations.applyParameters(attachmentreemovedMsg, {
                                            '0': data.processHistory[i].taskHistory[j].displayName
                                        });
                                        detailedHistoryElement.displayMessage = attachmentreemovedMsg;
                                        //detailedHistoryElement.attachmentName = data.processHistory[i].taskHistory[j].reason;
                                        detailedHistoryElement.actionType = 'REGULAR';

                                        detailedHistoryElement.creationDate = self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a');
                                        detailedHistoryElement.imageClass = 'pcs-th-att-removed-action-img';

                                    } else if (data.processHistory[i].taskHistory[j].actionName === 'Comment Added') {

                                        var commentedMsg = self.bundle.pcs.taskHistory.pcs_history_commented_message;
                                        commentedMsg = oj.Translations.applyParameters(commentedMsg, {
                                            '0': data.processHistory[i].taskHistory[j].displayName
                                        });
                                        detailedHistoryElement.displayMessage = commentedMsg;


                                        //detailedHistoryElement.displayMsg = 'Commented by ' + data.processHistory[i].taskHistory[j].displayName;
                                        detailedHistoryElement.creationDate = self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a');
                                        detailedHistoryElement.imageClass = 'pcs-th-comment-added-action-img';
                                        detailedHistoryElement.comments = '' + data.processHistory[i].taskHistory[j].reason + '';
                                        detailedHistoryElement.actionType = 'COMMENT_ADDED';


                                        /*historyHTML = historyHTML + '<li class='pcs-th-history-user-task-other-rows'>' +


                                         '<div style='float:left; padding-right: 13px;'>' +

                                         '<img class='pcs-th-comment-added-action-img'>' +

                                         '</div>' +

                                         'Commented by ' +

                                         '<span class='pcs-th-history-user-name'>' +

                                         data.processHistory[i].taskHistory[j].displayName +

                                         '</span>' + '&nbsp &nbsp' +


                                         '<span class='pcs-th-history-date pcs-th-history-date-float-right'>' +

                                         self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +

                                         '</span>' +

                                         '<br>' +

                                         '<span class='pcs-th-history-comment'>' +

                                         ''' +

                                         data.processHistory[i].taskHistory[j].reason +

                                         ''' +

                                         '</span>' +

                                         '</li>';*/
                                    } else {

                                        var resumedMsg = self.bundle.pcs.taskHistory.pcs_history_resumed_message;
                                        resumedMsg = oj.Translations.applyParameters(resumedMsg, {
                                            '0': data.processHistory[i].taskHistory[j].displayName
                                        });
                                        detailedHistoryElement.displayMessage = resumedMsg;

                                        //for all custom actions. We can not hardcode custom actions
                                        var actionName = data.processHistory[i].taskHistory[j].actionName;

                                        detailedHistoryElement.displayMessage = actionName + ' by ' + data.processHistory[i].taskHistory[j].displayName;
                                        detailedHistoryElement.creationDate = self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a');
                                        detailedHistoryElement.imageClass = 'pcs-th-custom-action-img';
                                        detailedHistoryElement.actionType = 'REGULAR';

                                        /*//for all custom actions. We can not hardcode custom actions
                                         var actionNameStr = data.processHistory[i].taskHistory[j].actionNameStr;

                                         if(data.processHistory[i].taskHistory[j].displayName)

                                         historyHTML = historyHTML +

                                         '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

                                         '<div style='float:left; padding-right: 15px;'>' +

                                         '<img class='pcs-th-custom-action-img'>' +

                                         '</div>' +

                                         '<span style='padding-top: 11px; float: left;'>' +

                                         actionNameStr + ' by ' +

                                         '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span>' +
                                         '</span>' + '&nbsp &nbsp' +
                                         '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

                                         self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +

                                         '</span>' +


                                         '</li>';*/


                                    }


                                    historyElement.detailedHistory.push(detailedHistoryElement);
                                }


                            }
                        }





                        taskHistoryJSON.history.push(historyElement);

                    }
                }




                self.procHistData(taskHistoryJSON.history);
                console.log(taskHistoryJSON);

            };



            // wrapper function for HTTP GET

            self.formatTaskHistoryDate = function formatDate(dateISOStr, pattern) {
                var options = {
                    formatType: 'date',
                    pattern: pattern
                };
                var dateConverter = oj.Validation.converterFactory('datetime').createConverter(options);
                return dateConverter.format(oj.IntlConverterUtils.dateToLocalIso(new Date(dateISOStr)));
            };



			/**
			 * method to clean up everything
			 */
			self.dispose = function() {
				console.log('dispose in taskHistoryVm');

				// clean up the events
			};






            /*self.getTaskHistory = function (taskJSON, processAuditJSON) {

             var currentTaskNumber = taskJSON.number;

             if(taskJSON.parentTaskPresentFlag)
             currentTaskNumber = taskJSON.parentTaskNumber;

             var data = processAuditJSON;

             var historyHTML = '';

             for (var i = 0; i < data.processHistory.length; i++) {

             if(data.processHistory[i].activityType === 'START_EVENT') {


             historyHTML = historyHTML +

             '<li class='pcs-th-green-dot-image'>' +

             self.bundle.pcs.taskHistory.proc_inst_started +

             '<br>' +

             '<span class='pcs-th-history-date'>' +

             self.formatTaskHistoryDate(data.processHistory[i].creationDate, 'MMM d, yyyy hh:mm:ss a' ) +

             '</span>' +

             '<br><br><br>' +

             '</li>';
             }

             if(data.processHistory[i].activityType === 'FUTURE_TASK') {

             historyHTML = historyHTML +

             '<li class='pcs-th-grey-dot-image'>' +

             'User Task ' +

             '<span class='pcs-th-history-task-title'>' +

             data.processHistory[i].activityName +

             '</span>' +

             ' is pending' +

             '<br><br><br>' +

             '</li>';

             }

             if(data.processHistory[i].activityType === 'END_EVENT') {

             historyHTML = historyHTML +

             '<li class='pcs-th-green-dot-image'>' +

             'Process Instance Ended' +

             '<br>' +

             '<span class='pcs-th-history-date'>' +

             self.formatTaskHistoryDate(data.processHistory[i].creationDate, 'MMM d, yyyy hh:mm:ss a' ) +

             '</span>' +

             '<br><br><br>' +

             '</li>';

             }


             if(data.processHistory[i].activityType === 'USER_TASK') {

             if(currentTaskNumber === data.processHistory[i].userTaskNumber) {


             var assigneesHTMLTable = '';
             var routingType = taskJSON.routingType;

             var routingTypeTable = '';

             if(routingType === 'SINGLE') {

             routingTypeTable = routingTypeTable +

             '<table>' +
             '<tr>' +
             '<td class='pcs-th-assignee-table'>' +

             '<img class='pcs-th-single-assignee-img' title='Single Assignee'>' +

             '</td>' +
             '</tr>' +

             '</table>';

             }
             else if(routingType === 'PARALLEL') {

             routingTypeTable = routingTypeTable +

             '<table>' +
             '<tr>' +
             '<td class='pcs-th-assignee-table'>' +

             '<img class='pcs-th-parallel-assignee-img' title='Parallel Assignees'>' +

             '</td>' +
             '</tr>' +

             '<tr>' +
             '<td class='pcs-th-assignee-table'>' +

             'Consensus : ' +  taskJSON.outcomePercentage + ' %' +

             '</td>' +
             '</tr>' +

             '</table>';

             }
             else if(routingType === 'SEQUENTIAL'){

             routingTypeTable = routingTypeTable +

             '<table>' +
             '<tr>' +
             '<td class='pcs-th-assignee-table'>' +

             '<img class='pcs-th-sequential-assignee-img' title='Sequential Assignees'>' +

             '</td>' +
             '</tr>' +



             '</table>';

             }
             else if(routingType === 'MANAGEMENT CHAIN'){
             routingTypeTable = routingTypeTable +

             '<table>' +
             '<tr>' +
             '<td class='pcs-th-assignee-table'>' +

             '<img class='pcs-th-management-chain-assignee-img' title='Management Chain in Sequence'>' +

             '</td>' +
             '</tr>' +

             '<tr>' +
             '<td class='pcs-th-assignee-table'>' +

             'Number of levels : ' + taskJSON.managementChainLevel +

             '</td>' +
             '</tr>' +

             '</table>';
             }

             assigneesHTMLTable = assigneesHTMLTable +

             '<table>' +
             '<tr>' +

             '<td rowspan='2' style='padding-left: 0px'>' +

             routingTypeTable +

             '</td>';

             for (var k = 0; k < taskJSON.originalAssignees.items.length; k++) {

             var type = taskJSON.originalAssignees.items[k].type;

             if(type === 'user'){

             assigneesHTMLTable = assigneesHTMLTable +
             '<td class='pcs-th-assignee-table'>' +

             '<img class='pcs-th-history-user-img'>' +

             '</td>';

             } else if(type === 'group'){

             assigneesHTMLTable = assigneesHTMLTable +
             '<td class='pcs-th-assignee-table'>' +

             '<img class='pcs-th-history-group-img'>' +

             '</td>';

             } else if(type === 'application_role') {

             assigneesHTMLTable = assigneesHTMLTable +
             '<td class='pcs-th-assignee-table'>' +

             '<img class='pcs-th-history-approle-img'>' +

             '</td>';

             }
             }

             assigneesHTMLTable = assigneesHTMLTable +

             '</tr>' +

             '<tr>';

             for (var k = 0; k < taskJSON.originalAssignees.items.length; k++) {


             assigneesHTMLTable = assigneesHTMLTable +
             '<td class='pcs-th-assignee-table'>' +
             '<span class='pcs-th-history-assignee-text'>' +
             taskJSON.originalAssignees.items[k].id +
             '</span>' +

             '</td>';
             }

             assigneesHTMLTable = assigneesHTMLTable +
             '</tr>' +

             '</table>';

             historyHTML = historyHTML +

             '<li class='pcs-th-blue-dot-image pcs-th-history-user-task-top'>' +

             /!*'<span class='pcs-th-history-task-title'>' +

             data.processHistory[i].activityName +

             '</span>' +

             ' - ' +*!/

             '<span class='pcs-th-history-task-title'>' +

             data.processHistory[i].userTaskTitle +

             '</span>' +

             '<br>' +

             '<span class='pcs-th-history-date'>' +

             self.formatTaskHistoryDate(data.processHistory[i].creationDate, 'MMM d, yyyy hh:mm:ss a' ) +

             '</span>' +

             '<br><br>' +

             assigneesHTMLTable +

             '</li>';



             for (var j = 0; j < data.processHistory[i].taskHistory.length; j++) {


             if (data.processHistory[i].taskHistory[j].actionName === 'System Update') {

             // do nothing
             }

             else if (data.processHistory[i].taskHistory[j].actionName === 'Withdrawn') {

             historyHTML = historyHTML +

             '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

             '<div style='float:left; padding-right: 15px;'>' +

             '<img class='pcs-th-withdrawn-action-img'>' +

             '</div>' +

             '<span style='padding-top: 11px; float: left;'>Withdrawn from ' +

             '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span>' +
             '</span>' + '&nbsp &nbsp' +
             '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

             self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +

             '</span>' +


             '</li>';
             }

             else if (data.processHistory[i].taskHistory[j].actionName === 'Resumed') {

             historyHTML = historyHTML +

             '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

             '<div style='float:left; padding-right: 15px;'>' +

             '<img class='pcs-th-resumed-action-img'>' +

             '</div>' +

             '<span style='padding-top: 11px; float: left;'>Resumed by ' +

             '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span>' +
             '</span>' + '&nbsp &nbsp' +
             '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

             self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +


             '</span>' +


             '</li>';
             }

             else if (data.processHistory[i].taskHistory[j].actionName === 'Suspended') {

             historyHTML = historyHTML +

             '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

             '<div style='float:left; padding-right: 15px;'>' +

             '<img class='pcs-th-suspended-action-img'>' +

             '</div>' +

             '<span style='padding-top: 11px; float: left;'>Suspended by ' +

             '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span>' +
             '</span>' + '&nbsp &nbsp' +
             '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

             self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +


             '</span>' +


             '</li>';
             }

             else if (data.processHistory[i].taskHistory[j].actionName === 'Escalated') {

             historyHTML = historyHTML +

             '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

             '<div style='float:left; padding-right: 15px;'>' +

             '<img class='pcs-th-escalated-action-img'>' +

             '</div>' +

             '<span style='padding-top: 11px; float: left;'>Escalated to ' +

             '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span>' +
             '</span>' + '&nbsp &nbsp' +
             '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

             self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +

             '</span>' +


             '</li>';
             }

             else if (data.processHistory[i].taskHistory[j].actionName === 'Delegated') {

             historyHTML = historyHTML +

             '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

             '<div style='float:left; padding-right: 15px;'>' +

             '<img class='pcs-th-delegated-action-img'>' +

             '</div>' +

             '<span style='padding-top: 11px; float: left;'>Delegated to ' +

             '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span>' +
             '</span>' + '&nbsp &nbsp' +
             '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

             self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +

             '</span>' +


             '</li>';
             }

             else if (data.processHistory[i].taskHistory[j].actionName === 'Approved') {

             historyHTML = historyHTML +

             '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

             '<div style='float:left; padding-right: 15px;'>' +

             '<img class='pcs-th-approved-action-img'>' +

             '</div>' +

             '<span style='padding-top: 11px; float: left;'>Approved by ' +

             '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span>' +
             '</span>' + '&nbsp &nbsp' +
             '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

             self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +

             '</span>' +


             '</li>';
             }

             else if (data.processHistory[i].taskHistory[j].actionName === 'Rejected') {

             historyHTML = historyHTML +

             '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

             '<div style='float:left; padding-right: 15px;'>' +

             '<img class='pcs-th-rejected-action-img'>' +

             '</div>' +

             '<span style='padding-top: 11px; float: left;'>Rejected by ' +

             '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span>' +
             '</span>' + '&nbsp &nbsp' +
             '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

             self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +


             '</span>' +


             '</li>';
             }

             else if (data.processHistory[i].taskHistory[j].actionName.toString().startsWith('Task Completed')) {

             var actionName = data.processHistory[i].taskHistory[j].actionName.toString();

             var strArray = actionName.split('-');
             var taskCompletedString = strArray[0].trim();
             var action = strArray[1].trim();


             if(data.processHistory[i].taskHistory[j].displayName) {
             historyHTML = historyHTML +

             '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

             '<div style='float:left; padding-right: 15px;'>';

             if (action === 'Rejected') {

             historyHTML = historyHTML +
             '<img class='pcs-th-rejected-action-img'>';
             }
             else if (action === 'Approved') {

             historyHTML = historyHTML +
             '<img class='pcs-th-approved-action-img'>';
             } else {

             historyHTML = historyHTML +
             '<img class='pcs-th-undefined-action-img'>';
             }


             historyHTML = historyHTML +

             '</div>' +

             '<span style='padding-top: 11px; float: left;'>' +

             action + ' by ' +

             '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span>' +
             '</span>' + '&nbsp &nbsp' +
             '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

             self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +

             '</span>' +


             '</li>';
             }

             historyHTML = historyHTML +

             '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

             '<div style='float:left; padding-right: 15px;'>' +

             '<img class='pcs-th-task-Completed-action-img'>' +

             '</div>' +

             '<span style='padding-top: 11px; float: left;'>' +

             taskCompletedString +

             '</span>' + '&nbsp &nbsp' +

             '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

             self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +

             '</span>' +


             '</li>';


             }

             else if (data.processHistory[i].taskHistory[j].actionName === 'Information Submitted') {

             historyHTML = historyHTML +

             '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

             '<div style='float:left; padding-right: 15px;'>' +

             '<img class='pcs-th-info-submitted-action-img'>' +

             '</div>' +

             '<span style='padding-top: 11px; float: left;'>' +

             '<span class='pcs-th-history-user-name'>' + '' + '</span> ' +

             'submitted more Information to ' + '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '&nbsp &nbsp' + '</span> ' +

             '</span>' +

             '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

             self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +

             '</span>' +

             '</li>';
             }

             else if (data.processHistory[i].taskHistory[j].actionName === 'Task Updated') {

             if(data.processHistory[i].taskHistory[j].displayName)

             historyHTML = historyHTML +

             '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

             '<div style='float:left; padding-right: 15px;'>' +

             '<img class='pcs-th-task-updated-action-img'>' +

             '</div>' +

             '<span style='padding-top: 11px; float: left;'>Task updated by ' +

             '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span>' +
             '</span>' + '&nbsp &nbsp' +
             '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

             self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +

             '</span>' +


             '</li>';

             }

             else if (data.processHistory[i].taskHistory[j].actionName === 'Information Requested') {

             historyHTML = historyHTML +

             '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

             '<div style='float:left; padding-right: 15px;'>' +

             '<img class='pcs-th-info-requested-action-img'>' +

             '</div>' +

             '<span style='padding-top: 11px; float: left;'>' +

             '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span> ' +

             'requested for more Information from ' + '<span class='pcs-th-history-user-name'>' + '' + '&nbsp &nbsp' + '</span> ' +

             '</span>' +

             '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

             self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +


             '</span>' +


             '</li>';

             }

             else if (data.processHistory[i].taskHistory[j].actionName === 'Reassigned') {

             historyHTML = historyHTML +

             '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

             '<div style='float:left; padding-right: 15px;'>' +

             '<img class='pcs-th-reassigned-action-img'>' +

             '</div>' +

             '<span style='padding-top: 11px; float: left;'>Reassigned to ' +

             '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span>' +
             '</span>' + '&nbsp &nbsp' +
             '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

             self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +

             '</span>' +


             '</li>';

             }

             else if (data.processHistory[i].taskHistory[j].actionName === 'Assigned') {

             historyHTML = historyHTML +

             '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

             '<div style='float:left; padding-right: 15px;'>' +

             '<img class='pcs-th-assigned-action-img'>' +

             '</div>' +

             '<span style='padding-top: 11px; float: left;'>Assigned to ' +

             '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span>' +
             '</span>' + '&nbsp &nbsp' +
             '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +


             self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +


             '</span>' +


             '</li>';
             }

             else if (data.processHistory[i].taskHistory[j].actionName === 'Attachment Added') {

             var attURL = data.processHistory[i].taskHistory[j].attachmentUri.href;
             var attachmentLinkHTML = '';


             /!*doGet(attURL, 'application/json', 'json').done(
             function(attJSON){

             var mimeType = attJSON.mimeType;
             var attName = attJSON.attachmentName;
             var attURI = attJSON.uri.href;

             doGet(attURI, mimeType, 'application/json').done(
             function(attContent){

             var content = attContent.toString();

             var hrefStr = 'data:'+ mimeType + ';charset=utf-8,' + content;

             attachmentLinkHTML = attachmentLinkHTML +
             '<a href='' + hrefStr + '' download='' + attName + ''>' + attName + '</a>';


             historyHTML = historyHTML + '<li class='pcs-th-history-user-task-other-rows'>' +

             '<div style='float:left; padding-right: 15px;'>' +

             '<img class='pcs-th-att-added-action-img'>' +

             '</div>' +

             'Document attached by ' +

             '<span class='pcs-th-history-user-name'>' +

             data.processHistory[i].taskHistory[j].displayName + '&nbsp &nbsp' +

             '</span>' +


             '<span class='pcs-th-history-date pcs-th-history-date-float-right'>' +

             self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +



             '</span>' +
             '<br>' +

             attachmentLinkHTML +

             '</li>';


             }
             ).fail(
             function(jqXHR, textStatus, errorThrown){
             alert('Attachment rest call failed');
             }
             );
             }
             ).fail(function(jqXHR, textStatus, errorThrown){
             alert('The JSON REST call for attachment failed');
             }
             );*!/
             }

             else if (data.processHistory[i].taskHistory[j].actionName === 'Comment Added') {
             historyHTML = historyHTML + '<li class='pcs-th-history-user-task-other-rows'>' +


             '<div style='float:left; padding-right: 13px;'>' +

             '<img class='pcs-th-comment-added-action-img'>' +

             '</div>' +

             'Commented by ' +

             '<span class='pcs-th-history-user-name'>' +

             data.processHistory[i].taskHistory[j].displayName +

             '</span>' + '&nbsp &nbsp' +


             '<span class='pcs-th-history-date pcs-th-history-date-float-right'>' +

             self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +

             '</span>' +

             '<br>' +

             '<span class='pcs-th-history-comment'>' +

             ''' +

             data.processHistory[i].taskHistory[j].reason +

             ''' +

             '</span>' +

             '</li>';
             }

             else {

             //for all custom actions. We can not hardcode custom actions
             var actionName = data.processHistory[i].taskHistory[j].actionName;

             if(data.processHistory[i].taskHistory[j].displayName)

             historyHTML = historyHTML +

             '<li class='pcs-th-history-user-task-other-rows' style='padding-bottom: 45px;'>' +

             '<div style='float:left; padding-right: 15px;'>' +

             '<img class='pcs-th-custom-action-img'>' +

             '</div>' +

             '<span style='padding-top: 11px; float: left;'>' +

             actionName + ' by ' +

             '<span class='pcs-th-history-user-name'>' + data.processHistory[i].taskHistory[j].displayName + '</span>' +
             '</span>' + '&nbsp &nbsp' +
             '<span class='pcs-th-history-date pcs-th-history-date-float-right' style='padding-top: 11px;'>' +

             self.formatTaskHistoryDate(data.processHistory[i].taskHistory[j].updatedDate, 'MMM d, yyyy hh:mm:ss a' ) +

             '</span>' +


             '</li>';


             }
             }

             historyHTML = historyHTML + '<br><br>';

             }

             else {

             historyHTML = historyHTML +

             '<li class='pcs-th-green-dot-image'>' +



             /!*'<span class='pcs-th-history-task-title'>' +

             data.processHistory[i].activityName +

             '</span>' +

             ' - ' +*!/

             '<span class='pcs-th-history-task-title'>' +

             data.processHistory[i].userTaskTitle +

             '</span>' +

             '<br>' +

             '<span class='pcs-th-history-date'>' +

             self.formatTaskHistoryDate(data.processHistory[i].creationDate, 'MMM d, yyyy hh:mm:ss a' ) +

             '</span>' +

             '<br><br><br>' +

             '</li>';

             }

             }
             }



             $('#pcs-th-taskHistoryDiv').html(historyHTML);






             };*/

        }


        return TaskHistoryVM;
    }
);
