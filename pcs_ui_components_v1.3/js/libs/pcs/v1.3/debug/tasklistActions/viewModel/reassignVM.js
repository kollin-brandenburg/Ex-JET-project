/**
 * Created by rojv on 9/6/2016.
 */

define(['jquery', 'ojs/ojcore', 'knockout', 'pcs/tasklist/viewModel/Task', 'pcs/tasklistActions/viewModel/TaskAction', 'ojs/ojdialog', 'ojs/ojradioset', 'ojs/ojinputtext', 'pcs/pcs.identitybrowser'],
    function($, oj, ko, taskModel, TaskAction) {
        'use strict';

        function Reassign(params, componentInfo) {
            var self = this;
            self.rootElement = $(componentInfo.element);
            //Set the resourcebundle
            self.bundle = require('ojL10n!pcsMsg/nls/pcsSnippetsResource');
            self.TaskAction = TaskAction();

            self.paths = {
                'task': 'tasks/{taskNumber}'
            };

            self.loadingOverlay = $('#pcs-reassign-overlay', self.rootElement);

            // Evaluate params
            self.showInline = ko.observable(params.showInline); //ko.observable(true);
            self.tasks = params.tasks;
            self.isVisible = params.isVisible;
            self.comments = ko.observable('');
            self.action = ko.observable('REASSIGN');
            self.placeholder = ko.computed(function() {
                if (self.action() === 'REASSIGN') {
                    return self.bundle.pcs.taskActions.searchAll;
                } else {
                    return self.bundle.pcs.taskActions.searchUsers;
                }
            });
            self.scope = ko.computed(function() {
                if (self.action() === 'REASSIGN') {
                    return 'all';
                } else {
                    return 'user';
                }
            });

            self.idbConfig = {
                multiple: true
            };
            self.idbID = 'pcs-reassign-idb';


            // Method to show the appropriate wrapper component according to the 'showInline' param
            self.init = (function() {
                if (!self.showInline()) {
                    $('#pcs-reassign-dialog-content').append($('#pcs-reassign-inline-content'));
                    $('#pcs-reassign-dialog-footer').append($('#pcs-reassign-inline-footer'));
                }
            }());

            // Method to handle the 'Close' action
            self.handleClose = function() {
                self.comments('');
                self.isVisible(false);
            };

			self.isVisibleSubscription = self.isVisible.subscribe(function(newValue) {
                var elem = $('#pcs-reassign-modalDialog');
                if (!self.showInline() && newValue) {
                    elem.ojDialog('open');
                } else {
                    elem.ojDialog('close');
                }
            });

            // Method to handle the 'Reassign' action
            self.handleSubmit = function() {
                var obj = ko.contextFor(document.getElementById('pcs-reassign-idb')).$data;
                try {
                    self.loadingOverlay.addClass('pcs-common-load-overlay');
                    var payloadObj = {
                        identityId: obj.getUserIDs(),
                        identityType: obj.getUserTypes(),
                        userComment: self.comments(),
                        reassignType: self.action()
                    };
                    self.TaskAction.reassignTasks(self.tasks(), payloadObj).then(function() {
                        self.loadingOverlay.removeClass('pcs-common-load-overlay');
                        self.handleClose();
                        obj.setValue([]);
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
				console.log('dispose in ReassignVM');
				self.isVisibleSubscription.dispose();

				//clear computed
				self.placeholder.dispose();
				self.scope.dispose();

				// clean up the events
			};
        }
        return Reassign;
    });
