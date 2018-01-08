/**
 * Created by nisabhar on 5/6/2016.
 */

define(['ojs/ojcore', 'knockout', 'pcs/taskdetail/services/taskdetailDataService', 'pcs/util/pcsUtil','pcs/pcsform/pcsFormUtil' , 'ojs/ojknockout',
        'ojs/ojdialog', 'ojs/ojinputtext', 'ojs/ojbutton', 'ojs/ojcollapsible', 'pcs/pcs.attachments', 'pcs/pcs.comments',
        'text!pcs/taskdetail/templates/pcs-task-history.html', 'pcs/taskdetail/viewModel/taskHistoryContainer', 'ojs/ojselectcombobox',
        'ojL10n!pcsMsg/nls/pcsSnippetsResource', 'pcs/pcs.conversation' ],
    function(oj, ko, services, pcsUtil,pcsFormUtil) {
        'use strict';
        /**
         * The view model for the main content view template
         */
        function TaskdetailContainer(params) {
            var self = this;

            //Set the resourcebundle
            self.bundle = require('ojL10n!pcsMsg/nls/pcsSnippetsResource');

            //all the data passed to the container
            self.data = params.data;

            //the jquery element where the widget is pushed, all the selectors will work in context of this element
            self.rootElement = self.data.rootElement;

            //the main Data object of the plugin
            self.taskNumber = self.data.taskNumber;

            // form type
            self.formType = 'frevvo';

            //Complete Frevvo form url including server path
            self.formURL = ko.observable();

            //Task object
            self.selectedTaskObject = '';
            self.taskObject = {
                customActions: ko.observableArray([]),
                systemActions: ko.observableArray([]),
                assignedDate: ko.observable(),
                createdDate: ko.observable(),
                updatedDate: ko.observable(),
                dueDate: ko.observable(),
                creator: ko.observable(),
                fromUser: ko.observable(),
                number: ko.observable(),
                owner: ko.observable(),
                priority: ko.observableArray([]),
                processName: ko.observable(),
                title: ko.observable(),
                shortSummary: ko.observable(),
                outcome: ko.observable()
            };

            self.priorityOptions = ko.observableArray([{
                value: 'HIGH',
                label: self.bundle.pcs.taskdetail.priority_high
            }, {
                value: 'NORMAL',
                label: self.bundle.pcs.taskdetail.priority_normal
            }, {
                value: 'LOW',
                label: self.bundle.pcs.taskdetail.priority_low
            }]);

            self.priorityMap = {
                1: 'HIGH',
                2: 'HIGH',
                3: 'NORMAL',
                4: 'LOW',
                5: 'LOW'
            };

            self.priorityStringMap = {
                HIGH: 1,
                NORMAL: 3,
                LOW: 5
            };

            self.showResize = ko.observable(!self.data.hideResize || false);

            self.viewExpanded = ko.observableArray((self.data.viewExpanded ? ['true'] : []));

            //Hack for waiting for frevvo form to Post submit message .
            // Also if the frevvo ear doent have the fix for post message
            // Its required as frevvo fires multiple Post Message
            self.waitForMessage = false;

            // If the task is completed
            self.readOnly = ko.observable(false);

			self.viewExpandedSubscription= self.viewExpanded.subscribe(function(newValue) {
                var isExpanded = newValue[0] === 'true';
                $('#pcs-td-expand', self.rootElement).trigger('taskdetail:expandDetailView', isExpanded);
            });

            self.componentRenderCount = 0;

            var handleComponentRenderStart = function() {
                self.componentRenderCount++;
            };

            var handleComponentRenderFinish = function() {
                console.log(self.componentRenderCount);
                self.componentRenderCount--;
                if (self.componentRenderCount === 0) {
                    setTimeout(function() {
                        self.rootElement.trigger('taskdetail:loaded');
                    }, 500);
                }
            };

            //This method is to get the task Object
            self.initTaskdetail = function() {
                //Start the loading indicator
                $('#pcs-td-overlay').addClass('pcs-common-load-overlay');

                //trigger service to fetch data for task number
                services.getTaskObject(self.taskNumber).done(
                    function(data, textStatus, jqXHR) {
                        // Hide the loading indicator
                        $('#pcs-td-overlay').removeClass('pcs-common-load-overlay');
                        $('#pcs-td-error', self.rootElement).hide();
                        $('#pcs-td-detailContainer', self.rootElement).show();

                        //populate task object
                        self._populateTaskObject(data);

                        // set form type
                        if (data['formMetadata'] && data['formMetadata'].indexOf('/webforms/')) {
                            self.formType = 'webform';
                        } else {
                            self.formType = 'frevvo';
                        }

                        //Load form
                        self.initForm(data);

                        //load attachments
                        self.initAttachment();

                        //load comments
                        self.initComments();

                        //load conversation
                        self.initConversation();

                        //set the renderFlag back to false
                        self.renderFlag = false;
                    }
                ).fail(
                    function(jqXHR) {
                        // Hide the loading indicator
                        $('#pcs-td-overlay').removeClass('pcs-common-load-overlay');

                        //Hide Task Detail UI
                        $('#pcs-td-detailContainer', self.rootElement).hide();

                        var msg = ''; //self.bundle.pcs.common.access_error_msg;
                        self.tdContainerErrorHandler(jqXHR, msg);
                    }
                );
            };

			//Function to clean up the element and un apply its bindings
            self.cleanUpFormContainer = function(){
				if (self.formType === 'webform') {
					var rootNode = $('#pcs-td-form-container', self.rootElement);
					if (rootNode && rootNode.length > 0) {
						ko.cleanNode(rootNode['0']);
						//Un apply the bindings for the node and its children
						pcsUtil.unApplyBindings(rootNode, false);
					}
				}
			};

            self.tdContainerErrorHandler = function(jqXHR, customMsg) {
                var msg = self.ajaxErrorHandler(jqXHR, customMsg);
                $('#pcs-td-error-msg', self.rootElement).text(msg);
                $('#pcs-td-error', self.rootElement).show();
            };

            self.actionErrorHandler = function(jqXHR, customMsg) {
                var msg = self.ajaxErrorHandler(jqXHR, customMsg);
                $('#pcs-td-action-error-msg', self.rootElement).text(msg);
                $('#pcs-td-action-error-msg-container', self.rootElement).show().delay(5000).fadeOut(2000);
            };

            self.formErrorHandler = function(jqXHR, customMsg) {
                var msg = self.ajaxErrorHandler(jqXHR, customMsg);

                $('#pcs-td-form-error-msg', self.rootElement).text(msg);
                $('#pcs-td-form-error-container', self.rootElement).show().delay(5000).fadeOut(2000);
            };

            // Error handler method for the plugin
            self.ajaxErrorHandler = function(jqXHR, customMsg) {
                var msg = customMsg;
                if (jqXHR && jqXHR.status === 0) {
                    msg = self.bundle.pcs.common.server_not_reachable;
                }
                if (jqXHR && jqXHR.status === 500) {
                    msg = jqXHR.responseText;
                } else if (jqXHR && jqXHR.status === 401) {
                    // reset valid authInfo as the current auth is invalid
                    msg = jqXHR.responseText; //self.bundle.pcs.common.access_error_msg;
                } else if (jqXHR && jqXHR.status === 404) {
                    // reset valid authInfo as the current auth is invalid
                    msg = self.bundle.pcs.common.not_found_error;
                }
                return msg;
            };

            function showValidationError() {
                var errorMsg = self.bundle.pcs.taskdetail.form_validation_error;
                self.formErrorHandler(null, errorMsg);
                //Hide overlay
                $('#pcs-td-overlay').removeClass('pcs-common-load-overlay');
            }


            // Method to Load appropriate form
            self.initForm = function(data) {
                if (self.formType === 'webform') {
                    self.initWebform(data);
                } else {
                    self.initFrevvoForm();
                }
            };

            // Method to Load Oracle webform
            self.initWebform = function(data) {
                //Start the loading indicator of form
                $('#pcs-td-form-loading', self.rootElement).show();

                if (data['payload'] && data['payload']['payload'] && data['payload']['payload']['href']) {
                    var payloadUrl = data['payload']['payload']['href'];
                    var formMetadataUrl = data['formMetadata'];

                    if (formMetadataUrl && payloadUrl) {
                        handleComponentRenderStart();

						services.getTaskPayloadByURL(payloadUrl)
							.done(function(payload) {
								var webFormContainer = $('#pcs-td-form-container', self.rootElement);
								var formRendererId = 'task-' + self.taskNumber ;
								var properties = {
									formMetadataUrl : formMetadataUrl,
									payload : payload,
									webFormContainer : webFormContainer,
									formRendererId : formRendererId
								};
								pcsFormUtil.loadPCSForm(properties)
									.then(function() {
										$('#pcs-td-form-loading', self.rootElement).hide();
										handleComponentRenderFinish();
									}, function(jqXHR) {
										$('#pcs-td-form-loading', self.rootElement).hide();
										var msg = self.bundle.pcs.taskdetail.form_retrieve_error;
										self.formErrorHandler(jqXHR, msg);
										handleComponentRenderFinish();
									});
							}).fail(function(jqXHR) {
								$('#pcs-td-form-loading', self.rootElement).hide();
								var msg = self.bundle.pcs.taskdetail.taskform_error;
								self.formErrorHandler(jqXHR, msg);
								handleComponentRenderFinish();
							});
                    }
                } else {
                    $('#pcs-td-form-loading', self.rootElement).hide();
                    var msg = self.bundle.pcs.taskdetail.form_retrieve_error;
                    self.formErrorHandler(null, msg);
                }
            };

            // Method to Load frevvo form
            self.initFrevvoForm = function() {
                //Start the loading indicator of form
                $('#pcs-td-form-loading', self.rootElement).show();

                handleComponentRenderStart();
                services.getFrevvoFormUrl(self.taskNumber).done(
                    function(data, textStatus, jqXHR) {
                        // Set the form URL
                        if (data && data !== '') {
                            self.formURL(data);
                        } else {
                            var customMsg = self.bundle.pcs.taskdetail.no_form;
                            self.formErrorHandler(jqXHR, customMsg);
                        }
                        handleComponentRenderFinish();
                    }
                ).fail(
                    function(jqXHR) {
                        // Hide the loading indicator
                        $('#pcs-td-form-loading', self.rootElement).hide();

                        //there is no form associated with this task
                        var msg = '';
                        if (jqXHR && jqXHR.status === 404) {
                            msg = self.bundle.pcs.taskdetail.no_form;
                        } else {
                            msg = self.bundle.pcs.taskdetail.load_error;
                        }
                        self.formErrorHandler(jqXHR, msg);
                        handleComponentRenderFinish();
                    }
                );
            };

            // Method to Load attachment snippet
            self.initAttachment = function() {
                if (!self.data.hideAttachment) {
                    self._attachAttachmentPlugin();
                }
            };

            // This use case is handled by attachment UI itself
            // Internal method to get DOCS folder
            //self._getTaskFolderName = function(href) {
            //    services.getTaskFolderName(href).done(
            //        function (data, textStatus, jqXHR) {
            //           var data= JSON.parse(data);
            //          self._attachAttachmentPlugin(data.dcsfolder);
            //        }
            //    ).fail(
            //        function (jqXHR) {
            //            // Hide the loading indicator
            //            $('#pcs-td-loading', self.rootElement).hide();
            //            var customMsg = 'Error occurred while getting attachment';
            //            $('#pcs-td-action-error-msg',self.rootElement).text(customMsg);
            //            $('#pcs-td-action-error-msg-container',self.rootElement).show().delay(5000).fadeOut(2000);
            //        }
            //    );
            //
            //};

            // Method to attach attachment plugin to the UI
            self._attachAttachmentPlugin = function() {
                //  console.log(dcsfolderName);
                var attachmentDiv = $('#pcs-td-attachment-container', self.rootElement);

                //if the plugin was already used  clean it up
                if (attachmentDiv && attachmentDiv.data() && !$.isEmptyObject(attachmentDiv.data())) {
                    attachmentDiv.attachments('destroy');
                }

                ko.cleanNode(attachmentDiv['0']);
                handleComponentRenderStart();
                self.attachmentPlugin = attachmentDiv.attachments({
                    hideTitle: true,
                    mode: 'task',
                    id: self.taskNumber,
                    readOnly: self.readOnly(),
                    isDocsEnabled: self.selectedTaskObject.isDocsEnabledFlag
                });

                // Defining the event listeners --
                attachmentDiv.on('attachments:attachmentUploaded', function(event, attachment) {
                    // console.log('attachment added');
                    self.rootElement.trigger('taskdetail:attachmentUploaded', [attachment]);
                });

                // Defining the event listeners --
                attachmentDiv.on('attachments:attachmentRemoved', function(event, attachment) {
                    // console.log('attachment remvoed');
                    self.rootElement.trigger('taskdetail:attachmentRemoved', [attachment]);
                });

                attachmentDiv.on('attachments:loaded', function(event) {
                    //console.log('Attachments');
                    handleComponentRenderFinish();
                });
            };

            // Method to Load Conversation snippet
            self.initConversation = function() {
                if (!self.data.hideConversation && self.selectedTaskObject.isConversationEnabledFlag) {
                    $('#pcs-td-conversation', self.rootElement).show();
                    $('#pcs-td-link-conversation', self.rootElement).show();
                    self._attachConversationPlugin();
                }
            };

            // Method to attach Conversation plugin to the UI
            self._attachConversationPlugin = function() {
                var conversationDiv = $('#pcs-td-conversation-container', self.rootElement);

                //if the plugin was already used  clean it up
                if (conversationDiv && conversationDiv.data() && !$.isEmptyObject(conversationDiv.data())) {
                    conversationDiv.conversation('destroy');
                }

                ko.cleanNode(conversationDiv['0']);
                handleComponentRenderStart();
                self.conversationPlugin = conversationDiv.conversation({
                    id: self.taskNumber,
                    mode: 'task'
                });

                // Defining the event listeners --
                conversationDiv.on('conversations:loaded', function(event) {
                    //console.log('Conversations');
                    handleComponentRenderFinish();
                });
            };

            // Method to Load Comments snippet
            self.initComments = function() {
                if (!self.data.hideComments) {
                    self._attachCommentPlugin();
                }
            };

            // Method to attach Comments plugin to the UI
            self._attachCommentPlugin = function() {
                var commentsDiv = $('#pcs-td-comments-container', self.rootElement);

                //if the plugin was already used  clean it up
                if (commentsDiv && commentsDiv.data() && !$.isEmptyObject(commentsDiv.data())) {
                    commentsDiv.comments('destroy');
                }

                ko.cleanNode(commentsDiv['0']);
                handleComponentRenderStart();
                self.commentsPlugin = commentsDiv.comments({
                    id: self.taskNumber,
                    readOnly: self.readOnly(),
                    hideTitle: true
                });

                // Defining the event listeners --
                commentsDiv.on('comments:commentAdded', function(event, comment) {
                    // console.log('event received');
                    self.rootElement.trigger('taskdetail:commentAdded', [comment]);
                });
                commentsDiv.on('comments:loaded', function(event) {
                    //console.log('Comments');
                    handleComponentRenderFinish();
                });
            };

            // method called when user clicks discard
            self.closeTaskDetail = function(data, event) {
                $('#pcs-td-close-dialog', self.rootElement).ojDialog('open');
            };

            // method called when user clicks save
            self.saveTaskDetail = function(data, event) {
                self.payload = {
                    action: {
                        id: 'SAVE'
                    }
                };
                if (self.formType === 'frevvo') {
                    self._saveOrSubmitTaskWithFrevvo('save');
                } else {
                    self._saveTaskWithWebform('save');
                }
            };

            // method called when user clicks submit
            self.submitTaskDetail = function(data, event) {
                var id = '';
                if (data.title === 'Submit') {
                    id = 'SUBMIT';
                } else {
                    id = data.title;
                }
                self.payload = {
                    action: {
                        id: id,
                        type: data.actionType
                    }
                };

                if (self.formType === 'frevvo') {
                    //if the frevvo form is present then do the validation first
                    var formUrl = self.formURL();
                    if (formUrl && formUrl !== '') {
                        var iframe = $('#pcs-td-form-iframe', self.rootElement)[0].contentWindow;

                        //submit the form for validation
                        iframe.postMessage('formValidation', pcsUtil.getServerURL());
                        self.waitForMessage = true;

                        //Start the loading indicator
                        $('#pcs-td-overlay', self.rootElement).addClass('pcs-common-load-overlay');

                        //Call it when Post message fails to come back even after 5 seconds
                        setTimeout(function() {
                            if (self.waitForMessage) {
                                self.waitForMessage = false;
                                self._saveOrSubmitTaskWithFrevvo('submit');
                            }
                        }, 5000); // 10 seconds
                    } else {
                        self._saveOrSubmitTaskWithFrevvo('submit');
                    }
                } else {
                    self._submitTaskWithWebform('submit');
                }
            };

            //method which saves the form first and then call method to perform action on the task
            self._saveOrSubmitTaskWithFrevvo = function(type) {

                //Start the loading indicator
                $('#pcs-td-overlay', self.rootElement).addClass('pcs-common-load-overlay');

                var formUrl = self.formURL();
                if (formUrl && formUrl !== '') {
                    //Save the frevvo form
                    services.saveFrevvoForm(self.taskNumber, self.formURL()).done(
                        function(data, textStatus, jqXHR) {
                            self._performTaskAction(type);
                        }
                    ).fail(
                        function(jqXHR) {
                            var customMsg = self.bundle.pcs.taskdetail.form_save_error;
                            self.actionErrorHandler(jqXHR, customMsg);

                            // remove overlays for loading
                            $('#pcs-td-overlay', self.rootElement).removeClass('pcs-common-load-overlay');
                        }
                    );
                } else {
                    self._performTaskAction(type);
                }
            };

            self._saveTaskWithWebform = function(type) {
				self._saveOrSubmitTaskWithWebform(type);
            };

            self._saveOrSubmitTaskWithWebform = function(type){
				var formRender = $('form-renderer[id*=\'task-'+self.taskNumber+'\']', self.rootElement);

				//Start the loading indicator
				$('#pcs-td-overlay', self.rootElement).addClass('pcs-common-load-overlay');

				pcsFormUtil.saveOrSubmitPCSForm(formRender,type)
					.then(function(payloadToUpdate) {
						try {
							services.postTaskPayload(self.taskNumber, payloadToUpdate).done(
								function(data, textStatus, jqXHR) {
									self._performTaskAction(type);
								}
							).fail(function(jqXHR) {
								self.actionErrorHandler(jqXHR, self.bundle.pcs.taskdetail.payload_update_error);
								// remove overlays for loading
								$('#pcs-td-overlay').removeClass('pcs-common-load-overlay');
							});
						} catch (err) {
							if (type == 'save'){
								self.actionErrorHandler(null, self.bundle.pcs.taskdetail.form_save_error);
							}else{
								self.actionErrorHandler(null, self.bundle.pcs.taskdetail.form_submit_error);
							}

							// remove overlays for loading
							$('#pcs-td-overlay').removeClass('pcs-common-load-overlay');
						}
					}, function() {
						showValidationError();
					});
			}

            self._submitTaskWithWebform = function(type) {
				self._saveOrSubmitTaskWithWebform(type);
            };


            self._performTaskAction = function(type) {
                var payload = self.payload;

                // Check if priority changed , if yes store it in the payload
                var currentPriority = self.priorityStringMap[self.taskObject.priority()];
                var initialPriority = self.selectedTaskObject.priority;

                if (currentPriority !== initialPriority) {
                    payload.priority = currentPriority;
                }

                // perform task action
                services.performTaskAction(self.taskNumber, JSON.stringify(payload)).done(
                    function(data) {
                        // remove overlays for loading
                        $('#pcs-td-overlay', self.rootElement).removeClass('pcs-common-load-overlay');
                        var msg;
                        //Trigger the event
                        if (type === 'submit') {
                            self.rootElement.trigger('taskdetail:submit', [data, payload.action.id]);
                            msg = self.bundle.pcs.taskdetail.action_performed;
                            msg = oj.Translations.applyParameters(msg, {
                                '0': payload.action.id
                            });
                        } else {
                            self.rootElement.trigger('taskdetail:save', [data]);
                            msg = self.bundle.pcs.taskdetail.task_saved;
                        }

						//Cleans up the form container in save flow
						self.cleanUpFormContainer();
                        //Load the taskdetail again
                        self.initTaskdetail();

                        $('#pcs-td-action-success-msg', self.rootElement).text(msg);
                        $('#pcs-td-action-success-msg-container', self.rootElement).show().delay(5000).fadeOut(2000);
                    }
                ).fail(
                    function(jqXHR) {
                        var customMsg = self.bundle.pcs.taskdetail.action_error + '\r\n\r\n' + jqXHR.responseText;
                        self.actionErrorHandler(jqXHR, customMsg);

                        // remove overlays for loading
                        $('#pcs-td-overlay', self.rootElement).removeClass('pcs-common-load-overlay');
                    }
                );

            };


            // Method called when yest button clicked on the discard dialog
            self.yesDiscardDialog = function() {
                $('.pcs-td-close-dialog').ojDialog('close');
                self.rootElement.trigger('taskdetail:close', [ko.toJS(self.taskObject)]);
				self.cleanUpFormContainer();
            };

            // Method called when yest button clicked on the discard dialog
            self.noDiscardDialog = function() {
                $('.pcs-td-close-dialog').ojDialog('close');
            };

            // Method called when closed button clicked on the Error dialog
            self.closeErrorDialog = function() {
                $('.pcs-td-error-dialog').ojDialog('close');
            };

            /*
             Method to receive postMessage , for submitting form or setting page height
             */
            self.receivePostMessage = function(event) {
                if (event.origin !== pcsUtil.getServerURL()) {
                    return;
                }

                var key = event.message ? 'message' : 'data';
                var data = event[key];

                //If its a form submit success,  submit the form
                if (data === 'formValidation:success') {
                    //console.log('trying to save')
                    if (self.waitForMessage) {
                        self.waitForMessage = false;
                        self._saveOrSubmitTaskWithFrevvo('submit');
                    }
                }

                //If its a form submit error,  Show error message
                if (data.startsWith('formValidation:error')) {
                    if (self.waitForMessage) {
                        self.waitForMessage = false;
                        var errorMsg = self.bundle.pcs.taskdetail.form_validation_error;
                        var msg = data.substring('formValidation:error'.length + 1);
                        errorMsg = errorMsg + '\r\n\r\n' + msg;

                        //Show local Message
                        self.actionErrorHandler(null, errorMsg);
                        //Hide overlay
                        $('#pcs-td-overlay', self.rootElement).removeClass('pcs-common-load-overlay');
                    }
                }

                // if its the form height , change iframe height
                if (data.startsWith('formHeight')) {
                    var formHeight = data.substring('formHeight'.length + 1);
                    var height;
                    try {
                        height = parseInt(formHeight) + 20;
                    } catch (err) {
                        height = 400;
                    }

                    // Check if the user specified form Height is more than actual form height
                    if (self.data.formHeight && self.data.formHeight !== '') {
                        try {
                            var userHeight = parseInt(self.data.formHeight, 10);
                            if (userHeight > height) {
                                height = userHeight;
                            }
                        } catch (err) {
                            height = height;
                        }
                    }

                    $('#pcs-td-form-iframe', self.rootElement).css('height', height);
                }

            };

            //Method to attach to Iframe load event to hide the loading indicator
            self.attachEvents = (function() {
                $('#pcs-td-form-iframe', self.rootElement).load(function() {
                    $('#pcs-td-form-loading', self.rootElement).hide();

                    if (self.data.formHeight && self.data.formHeight !== '') {
                        $('#pcs-td-form-iframe', self.rootElement).css('height', self.data.formHeight);
                    }
                });
            }());

            /**
             * method to clean all eevnts associsated
             */
            self.cleanEvents = function() {
                // Remove the PostMessage handler
                pcsUtil.eventHandler.removeHandler(window, 'message', self.receivePostMessage);
				$('#pcs-td-attachment-container', self.rootElement).off();
				$('#pcs-td-conversation-container', self.rootElement).off();
				$('#pcs-td-comments-container', self.rootElement).off();
				$(self.rootElement).off();
            };

            /**
             * method to add events
             */
            self.addEvents = (function() {
                // Add the PostMessage handler
                pcsUtil.eventHandler.addHandler(window, 'message', self.receivePostMessage);
            }());

            // Method to read widget options and do required UI tweaking
            self.readOptions = function() {
                if (self.data.hideActions) {
                    $('#pcs-td-custom-actions', self.rootElement).hide();
                }
                if (self.data.hideSave) {
                    $('#pcs-td-save', self.rootElement).hide();
                }
                if (self.data.hideClose) {
                    $('#pcs-td-close', self.rootElement).hide();
                }
                if (self.data.hideAttachment) {
                    $('#pcs-td-attachments', self.rootElement).hide();
                    $('#pcs-td-link-attachments', self.rootElement).hide();
                }
                if (self.data.hideComments) {
                    $('#pcs-td-comments', self.rootElement).hide();
                    $('#pcs-td-link-comments', self.rootElement).hide();
                }
                if (self.data.hideHistory) {
                    $('#pcs-td-history', self.rootElement).hide();
                    $('#pcs-td-link-history', self.rootElement).hide();
                }
                if (self.data.hideMoreInfo) {
                    $('#pcs-td-moreInfo', self.rootElement).hide();
                    $('#pcs-td-link-moreInfo', self.rootElement).hide();
                }
                if (self.data.hideConversation) {
                    $('#pcs-td-conversation', self.rootElement).hide();
                    $('#pcs-td-link-conversation', self.rootElement).hide();
                }
                if (self.data.hideLinks) {
                    $('#pcs-td-links', self.rootElement).hide();
                }

                if (self.data.formHeight && self.data.formHeight !== '') {
                    $('#pcs-td-form-frame', self.rootElement).css('height', self.data.formHeight);
                }
            };

            self.initComponents = function() {
                self.readOptions();
                self.initTaskdetail();
                self.initTaskHistory();
            };


            self.initTaskHistory = function() {
                if (!ko.components.isRegistered('taskHistory')) {
                    ko.components.register('taskHistory', {
                        template: {
                            require: 'text!pcs/taskdetail/templates/pcs-task-history.html'
                        },
                        viewModel: {
                            require: 'pcs/taskdetail/viewModel/taskHistoryContainer'
                        }
                    });
                }
            };


            self._populateTaskObject = function(task) {
                self.selectedTaskObject = task;

                self.taskObject.title(task.title);
                self.taskObject.shortSummary(task.shortSummary);
                self.taskObject.creator(task.creator);
                self.taskObject.createdDate(task.createdDate);
                self.taskObject.assignedDate(task.assignedDate);
                self.taskObject.dueDate(task.dueDate);
                self.taskObject.fromUser(task.fromUserDisplayName);
                self.taskObject.number(task.number);
                self.taskObject.outcome(task.outcome);
                self.taskObject.processName(task.processName);
                self.taskObject.updatedDate(task.updatedDate);

                self.taskObject.priority.removeAll();
                self.taskObject.priority.push(self.priorityMap[task.priority]);

                if (task.ownerRole) {
                    self.taskObject.owner(task.ownerRole + ' (' + self.bundle.pcs.taskdetail.role + ')');
                } else if (task.ownerGroup) {
                    self.taskObject.owner(task.ownerGroup + ' (' + self.bundle.pcs.taskdetail.group + ')');
                } else if (task.ownerUser) {
                    self.taskObject.owner(task.ownerUser + ' (' + self.bundle.pcs.taskdetail.user + ')');
                }

                self.taskObject.customActions.removeAll();
                self.taskObject.systemActions.removeAll();

                for (var i = 0; i < task.actionList.length; i++) {
                    var action = task.actionList[i];
                    if (action.actionType === 'System') {
                        self.taskObject.systemActions.push(action);
                    } else {
                        self.taskObject.customActions.push(action);
                    }
                }

                var outcome = task.outcome;

                // Make the detail readOnli as the task is completed
                if (outcome) {
                    self.readOnly(true);
                }

            };

            self.openComments = function(data, event) {
                $('#pcs-td-comments', self.rootElement).ojCollapsible({
                    'expanded': true
                });
                $('#pcs-td-comments-container', self.rootElement)[0].scrollIntoView(true);
            };

            self.openAttachments = function() {
                $('#pcs-td-attachments', self.rootElement).ojCollapsible({
                    'expanded': true
                });
                $('#pcs-td-attachment-container', self.rootElement)[0].scrollIntoView(true);
            };

            self.openHistory = function() {
                $('#pcs-td-history', self.rootElement).ojCollapsible({
                    'expanded': true
                });
                $('#pcs-td-history-container', self.rootElement)[0].scrollIntoView(true);
            };

            self.openMoreInfo = function() {
                $('#pcs-td-moreInfo', self.rootElement).ojCollapsible({
                    'expanded': true
                });
                $('#pcs-td-moreInfo-container', self.rootElement)[0].scrollIntoView(false);
            };

            self.openConversation = function() {
                $('#pcs-td-conversation', self.rootElement).ojCollapsible({
                    'expanded': true
                });
                $('#pcs-td-conversation-container', self.rootElement)[0].scrollIntoView(false);
            };

            //Load the components
            self.initComponents();


			/**
			 * method to clean up everything
			 */
			self.dispose = function() {
				console.log('dispose in taskdetail Containor');
				self.viewExpandedSubscription.dispose();

				// clean up the events
				self.cleanEvents();

				// clean up form
				self.cleanUpFormContainer();
			};

		}

        return TaskdetailContainer;
    });
