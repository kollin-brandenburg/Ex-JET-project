/**
 * Created by rojv on 9/6/2016.
 */

define(['jquery', 'ojs/ojcore', 'knockout', 'pcs/tasklist/viewModel/Task', 'pcs/tasklistActions/viewModel/TaskAction', 'ojs/ojdialog', 'ojs/ojradioset', 'ojs/ojinputtext', 'pcs/pcs.identitybrowser'],
    function($, oj, ko, taskModel, TaskAction) {
        'use strict';

        function RequestInfoModel(params, componentInfo) {
            var self = this;
            self.rootElement = $(componentInfo.element);
            //Set the resourcebundle
            self.bundle = require('ojL10n!pcsMsg/nls/pcsSnippetsResource');
            self.TaskAction = TaskAction();

            self.paths = {
                'task': 'tasks/{taskNumber}'
            };
            self.loadingOverlay = $('#pcs-requestInfo-overlay', self.rootElement);

            // Evaluate params
            self.showInline = ko.observable(params.showInline); //ko.observable(true);
            self.tasks = params.tasks;
            self.isVisible = params.isVisible;

            self.idbConfig = {
                multiple: false
            };

            self.username = ko.observable('weblogic');

            self.comments = ko.observable('');

            self.action = ko.observable('INFO_REQUEST');
            self.placeholder = ko.observable(self.bundle.pcs.taskActions.searchUsers);
            self.idbID = 'pcs-requestInfo-idb';
            self.scope = 'user';

            // Method to show the appropriate wrapper component according to the 'showInline' param
            self.init = (function() {
                if (!self.showInline()) {
                    $('#pcs-requestinfo-dialog-content').append($('#pcs-requestinfo-inline-content'));
                    $('#pcs-requestinfo-dialog-footer').append($('#pcs-requestinfo-inline-footer'));
                }
            }());

            // Method to handle the Close action
            self.handleClose = function() {
                self.comments('');
                self.isVisible(false);
            };

			self.isVisibleSubscription = self.isVisible.subscribe(function(newValue) {
                var elem = $('#pcs-requestinfo-modalDialog');
                if (!self.showInline() && newValue) {
                    elem.ojDialog('open');
                } else {
                    elem.ojDialog('close');
                }
            });

            // Method to handle the Submit action
            self.handleSubmit = function() {
                var obj = ko.contextFor(document.getElementById('pcs-requestInfo-idb')).$data;
                try {
                    self.loadingOverlay.addClass('pcs-common-load-overlay');
                    //if(self.action()=='back') // TODO : No backend support yet
                    self.TaskAction.requestInfo(self.tasks(), obj.getUserIDs(), obj.getUserTypes(), self.comments()).then(function() {
                        self.loadingOverlay.removeClass('pcs-common-load-overlay');
                        self.handleClose();
                        obj.setValue(null);
                        self.rootElement.trigger('tasklistAction:refresh', []);
                        self.rootElement.trigger('taskAction:submit', [self.action()]);
                    });
                } catch (err) {
                    console.log('Error - to be handled');
                }
            };

			/**
			 * method to clean up everything
			 */
			self.dispose = function() {
				console.log('dispose in ReqInfoVM');
				self.isVisibleSubscription.dispose();

				// clean up the events
			};
        }
        return RequestInfoModel;
    });
