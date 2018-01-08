/**
 * Created by nisabhar on 3/14/2016.
 */

define(['ojs/ojcore', 'knockout', 'pcs/startform/services/startformDataService', 'pcs/util/pcsUtil',  'pcs/pcsform/pcsFormUtil' ,'ojs/ojknockout', 'ojs/ojdialog',
        'ojs/ojbutton', 'pcs/pcs.attachments', 'ojL10n!pcsMsg/nls/pcsSnippetsResource'
    ],
    function(oj, ko, services, pcsUtil ,pcsFormUtil) {
        'use strict';
        /**
         * The view model for the main content view template
         */
        function StartformContainer(params) {
            var self = this;

            //Set the resourcebundle
            self.bundle = require('ojL10n!pcsMsg/nls/pcsSnippetsResource');

            //all the data passed to the container
            self.data = params.data;


            //the jquery element where the widget is pushed, all the selectors will work in context of this element
            self.rootElement = self.data.rootElement;

            //the main Data object of the plugin
            self.startformData = self.data.startformData;

            //Complet Frevvo form url including server path
            self.formURL = ko.observable();

            // Label for submit button
            self.submitLabel = self.data.submitLabel;

            //frevvo form URl which we get from the Rest APi , this is a relative path on the server
            self.formInstanceURL = '';

            //Error Message text we will show in the error Dialog
            self.errorMessage = ko.observable();

            //Id for pcs Form tag
			self.formRendererTagId = 'process-' + pcsUtil.getRandomInt(0,100);

            //Hack for waiting for frevvo form to Post submit message .
            // Also if the frevvo ear doent have the fix for post message
            // Its required as frevvo fires multiple Post Message
            self.waitForMessage = false;

            self.componentRenderCount = 0;

            var handleComponentRenderStart = function() {
                self.componentRenderCount++;
            };

            var handleComponentRenderFinish = function() {
                console.log(self.componentRenderCount);
                self.componentRenderCount--;
                if (self.componentRenderCount === 0) {
                    setTimeout(function() {
                        self.rootElement.trigger('startform:loaded');
                    }, 1000);
                }
            };

            //This method is to get the frevvo form URL and the list of saved attachments
            function initStartForm() {

                var onloadStartFormResponse = function(e) {
                    var map;
                    var attachments;
                    var customMsg;

                    try {
                        try {
                            map = pcsUtil.multipartParse(e.currentTarget);
                            // map will have data of type fileName : content-Type ,data
                            //console.log(map);
                        } catch (error) {
                            customMsg = self.bundle.pcs.startform.form_url_error;
                            self.ajaxErrorHandler(null, customMsg);
                            //Hide loadinf
                            $('#pcs-startform-loading', self.rootElement).hide();
                        }

                        if (map) {
                            if (map.pcsFormUrl && map.pcsFormUrl.data) {
                                // CHeck if its PCS form
                                if (self.startformData.startType && self.startformData.startType === 'START_PCS_FORM') {
                                    self.loadPCSForm(map.pcsFormUrl.data);
                                } else {
                                    handleComponentRenderStart();
                                    //One of the entry in the map will be of frevvo form URl
                                    self.formInstanceURL = map.pcsFormUrl.data;
                                    self.formURL(pcsUtil.getServerURL() + self.formInstanceURL);
                                    $('#pcs-startapp-form-frame', self.rootElement).show();
                                    handleComponentRenderFinish();
                                }
                            } else {
                                customMsg = self.bundle.pcs.startform.form_unavailable_error;
                                self.ajaxErrorHandler(null, customMsg);
                            }

                            var fileName;
                            attachments = [];
                            for (fileName in map) {
                                if (fileName === 'pcsFormUrl') {
                                    //Do Nothing
                                } else {
                                    var file = map[fileName];
                                    var tmpStr = 'Saved earlier';
                                    var content;

                                    content = file.data;
                                    var attachment = {
                                        filename: fileName,
                                        fileInfoText: tmpStr,
                                        href: '',
                                        contentType: file.contentType,
                                        content: content
                                    };


                                    attachments.push(attachment);
                                }
                            }
                        }
                        if (!self.data.hideAttachment) {
                            if (self.startformData.isDocsEnabled) {
                                self._getStartFolderName(attachments);
                            } else {
                                self._attachAttachmentPlugin(attachments, '');
                            }
                        }
                    } catch (error) {
                        customMsg = self.bundle.pcs.startform.form_url_error;
                        self.ajaxErrorHandler(null, customMsg);
                        //Hide loadinf
                        $('#pcs-startform-loading', self.rootElement).hide();
                    }

                };

                var onError = function(e) {
                    self.ajaxErrorHandler(e.currentTarget, '');
                    //Hide loadinf
                    $('#pcs-startform-loading', self.rootElement).hide();
                };

                services.getStartFormObject(self.startformData.processDefId, self.startformData.serviceName, self.startformData.operation, self.startformData.startType, onloadStartFormResponse, onError);

            }


            self.loadPCSForm = function(dataString) {
                // TODO: following fix is done to revert back the multi byte chars that were translated
                //       to protect from .charCodeAt() api.
                //       Ref: Bug Bug 25560412 - Embedded PCS Start Form UI fails with multi-byte characters
                var data = JSON.parse(decodeURIComponent(window.escape(dataString)));
                var formMetadataUrl = data['form'];
				var webFormContainer = $('#pcs-startform-iframe-container', self.rootElement);

                var payload = data['payload'];
				if (payload) {
					//Do nothing
				}
				else {
					// Pre populate the form if payload is passed as an option
					if (self.data.payload && !$.isEmptyObject(self.data.payload)) {
						payload = self.data.payload;
					}
				}

				var properties = {
					formMetadataUrl : formMetadataUrl,
					payload : payload,
					webFormContainer : webFormContainer,
					formRendererId : self.formRendererTagId
				};

                handleComponentRenderStart();

				pcsFormUtil.loadPCSForm(properties)
					.then(function() {
						$('#pcs-startform-loading', self.rootElement).hide();
						handleComponentRenderFinish();
					}, function(jqXHR) {
						var msg = self.bundle.pcs.startform.form_retrieve_error;
						self.ajaxErrorHandler(jqXHR, msg);
						handleComponentRenderFinish();
					});

            };

            //Function to clean up the element and un apply its bindings
			self.cleanUpFormContainer = function(){
				if(self.startformData.startType === 'START_PCS_FORM'){
					var node = $('#pcs-startform-iframe-container', self.rootElement);
					if(node && node.length > 0){
						ko.cleanNode(node['0']);
						//Un apply the bindings for the node and its children,
						pcsUtil.unApplyBindings(node, false);
					}
				}
			};

            self._getStartFolderName = function(attachments) {
                services.getStartFolderName(self.startformData.processDefId).done(
                    function(data, textStatus, jqXHR) {
                        // console.log(data);
                        self._attachAttachmentPlugin(attachments, data);
                    }
                ).fail(
                    function(jqXHR) {
                        // Hide the loading indicator
                        $('#pcs-startform-loading', self.rootElement).hide();
                        var customMsg = self.bundle.pcs.startform.form_url_error;
                        self.ajaxErrorHandler(jqXHR, customMsg);
                    }
                );
            };

            self._attachAttachmentPlugin = function(attachments, startFolderName) {
                var attachmentDiv = $('#pcs-startform-attachment', self.rootElement);

                //if the plugin was already used  clean it up
                if (attachmentDiv && attachmentDiv.data() && !$.isEmptyObject(attachmentDiv.data())) {
                    attachmentDiv.attachments('destroy');
                }

                ko.cleanNode(attachmentDiv['0']);
                handleComponentRenderStart();
                self.attachmentPlugin = attachmentDiv.attachments({
                    attachments: attachments,
                    startFolderName: startFolderName,
                    hideTitle: true,
                    isDocsEnabled: self.startformData.isDocsEnabled
                });

                // Defining the event listeners --
                attachmentDiv.on('attachments:loaded', function(event) {
                    handleComponentRenderFinish();
                });

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
                }
                //self.errorMessage(msg);
                //$('#pcs-startform-error-dialog', self.rootElement).ojDialog('open');

                $('#pcs-startform-error-msg', self.rootElement).text(msg);
                $('#pcs-startform-error-msg-container', self.rootElement).show();
            };

            // method called when user clicks discard
            self.discardForm = function(data, event) {
                $('#pcs-startform-discard-dialog', self.rootElement).ojDialog('open');
            };

            // method called when user clicks save
            self.saveForm = function(data, event) {
                if (self.data.startformData.startType === 'START_PCS_FORM') {
                    self._saveWebForm('save');
                } else {
                    self._saveOrSubmitFrevvoForm('save');
                }
            };

            // method called when user clicks submit
            self.submitForm = function(data, event) {
                if (self.data.startformData.startType === 'START_PCS_FORM') {
                    self._submitWebForm('submit');
                } else {
                    var iframe = $('#pcs-startform-iframe', self.rootElement)[0].contentWindow;

                    //submit the form for validation
                    iframe.postMessage('formValidation', pcsUtil.getServerURL());
                    self.waitForMessage = true;

                    //Start the loading indicator
                    $('#pcs-startform-overlay').addClass('pcs-common-load-overlay');

                    //Call it when Post message fails to come back even after 5 seconds
                    setTimeout(function() {
                        if (self.waitForMessage) {
                            self.waitForMessage = false;
                            console.log('Frevvo did not respond on time submitting form without validation');
                            self._saveOrSubmitFrevvoForm('submit');
                        }
                    }, 5000); // 10 seconds
                }
            };

            function showValidationError() {
                var errorMsg = self.bundle.pcs.startform.form_validation_error;
                $('#pcs-startform-error-msg', self.rootElement).text(errorMsg);
                $('#pcs-startform-error-msg-container', self.rootElement).show().delay(5000).fadeOut(2000);
                //Hide overlay
                $('#pcs-startform-overlay').removeClass('pcs-common-load-overlay');
            }

            // method which does the post call to save the webform
            self._saveWebForm = function(action) {
				self._saveOrSubmitWebForm(action);
            };

			self._saveOrSubmitWebForm = function(action) {
				var formRender = $('form-renderer[id*=\''+self.formRendererTagId+'\']', self.rootElement);

				$('#pcs-startform-overlay', self.rootElement).addClass('pcs-common-load-overlay');

				pcsFormUtil.saveOrSubmitPCSForm(formRender,action)
					.then(function(payloadToUpdate) {
						try {
							self._createProcessInstance(payloadToUpdate, action);
						} catch (err) {
							if (action == 'save'){
								self.ajaxErrorHandler(null, self.bundle.pcs.startform.form_save_error);
							}else{
								self.ajaxErrorHandler(null, self.bundle.pcs.startform.form_submit_error);
							}
							// remove overlays for loading
							$('#pcs-startform-overlay').removeClass('pcs-common-load-overlay');
						}
					}, function() {
						showValidationError();
					});
			};

            // method which does the post call to save or submit the webform
            self._submitWebForm = function(action) {
				self._saveOrSubmitWebForm(action);
            };

            // method which does the post call to save or submit the frevvo form
            self._saveOrSubmitFrevvoForm = function(action) {
                //Start the loading indicator
                $('#pcs-startform-overlay', self.rootElement).addClass('pcs-common-load-overlay');

                // First try to get the form payload
                services.getFormPayload(self.startformData.processDefId, self.startformData.serviceName, self.startformData.operation, self.formInstanceURL).done(
                    function(data) {
                        //using the payload perform the action
                        self._createProcessInstance(data, action);
                    }
                ).fail(
                    function(jqXHR) {
                        var customMsg;
                        if (action === 'save') {
                            customMsg = self.bundle.pcs.startform.form_save_error;
                        } else {
                            customMsg = self.bundle.pcs.startform.form_submit_error;
                        }
                        self.ajaxErrorHandler(jqXHR, customMsg);

                        // remove overlays for loading
                        $('#pcs-startform-overlay').removeClass('pcs-common-load-overlay');
                    }
                );
            };

            // method which crete the pOST payload and perfor the POST call
            self._createProcessInstance = function(formPayload, action) {

                // Remove the /n from the form payload as save doent work without it
                formPayload = formPayload.replace(/\n\s*/g, '');

                // To be removed once fix from REST is in: Workaround for the current mismatch in payload and wat REST expects
                //if(self.data.startformData.startType !== 'START_PCS_FORM') {
                //  var indexOf = formPayload.indexOf('>');
                //  formPayload = formPayload.substring(indexOf + 1);
                //  var lastIndexOf = formPayload.lastIndexOf('<');
                //  formPayload = formPayload.substring(0, lastIndexOf);
                //  formPayload = '<payload>' + formPayload + '</payload>';
                //}

                var payload = {
                    'action': action,
                    'operation': self.startformData.operation,
                    'payload': formPayload,
                    'processDefId': self.startformData.processDefId,
                    'serviceName': self.startformData.serviceName
                };

                // ---- Create boundary part data ------
                var boundary = 'Boundary_' + '123456789_123456789';
                var header = '--' + boundary + '\r\n';

                var footer = '\r\n--' + boundary + '--\r\n';

                var contentType = 'multipart/mixed; boundary=' + boundary;

                // Put the payload to the multipart data
                var contents = header;
                contents += 'Content-Type: application/json\r\n';
                contents += 'Content-Disposition: form-data; name=\'json\'\r\n';
                contents += 'Content-Length: ' + JSON.stringify(payload).length + '\r\n\r\n';
                //contents += JSON.stringify(payload) + '\r\n';
                // TODO: following fix is done to 'protect the multi byte UTF-8 chars in the future when they
                //       undergo .charCodeAt() api.
                //       Ref: Bug Bug 25560412 - Embedded PCS Start Form UI fails with multi-byte characters
                contents += window.unescape(encodeURIComponent(JSON.stringify(payload))) + '\r\n';

                if (!self.data.hideAttachment) {
                    // Put the attachments to the multipart data
                    var attachments = self.attachmentPlugin.attachments('getAttachments');
                    //var widget = $('#pcs-startform-attachment',self.rootElement).data('pcs-attachments');
                    //var attachments = widget.getAttachments();

                    for (var i = 0, len = attachments.length; i < len; i++) {
                        var attachment = attachments[i];
                        contents += header;
                        contents += 'Content-Type: ' + attachment.contentType + '\r\n';
                        contents += 'Content-Transfer-Encoding: binary\r\n';
                        /*jshint validthis:true */
                        contents += 'Content-Disposition: form-data; filename="' + attachment.filename + '"; name="BPM-Attachment"\r\n';
                        contents += 'Content-Length: ' + attachment.content.length + '\r\n';
                        contents += 'Content-Transfer-Encoding: binary\r\n\r\n';
                        contents += attachment.content;
                        if (i !== attachments.length - 1) {
                            contents += '\r\n';
                        }
                    }
                }

                // close the boundary
                contents += footer;

                services.createProcessInstance(contents, contentType).done(
                    function(data) {
                        // remove overlays for loading
                        $('#pcs-startform-overlay').removeClass('pcs-common-load-overlay');

                        //Trigger the event
                        self.rootElement.trigger('startform:' + action, [self.startformData, data]);

                        var msg = '';

                        if (action === 'save') {
                            msg = self.bundle.pcs.startform.action_save;
                        } else {
                            msg = self.bundle.pcs.startform.action_submit;
                            msg = oj.Translations.applyParameters(msg, {
                                '0': data.title
                            });
                        }

						self.cleanUpFormContainer();
                        //Load the form again
						if((action === 'save' && self.data.reloadOnSave) || (action === 'submit' && self.data.reloadOnSubmit)){
							//Show local Message
							$('#pcs-startform-success-msg', self.rootElement).text(msg).show(1000).delay(2000).fadeOut();
							initStartForm();
						}else{
							$('#pcs-startform-mainContainer', self.rootElement).hide();
							$('#pcs-startform-mainContainer-submitted', self.rootElement).show();
							$('#pcs-startform-success-msg-submitted', self.rootElement).text(msg);
						}

                    }
                ).fail(
                    function(jqXHR) {
                        var customMsg;
                        if (action === 'save') {
                            customMsg = self.bundle.pcs.startform.form_save_error;
                        } else {
                            customMsg = self.bundle.pcs.startform.form_submit_error;
                        }
                        self.ajaxErrorHandler(jqXHR, customMsg);
                        // remove overlays for loading
                        $('#pcs-startform-overlay').removeClass('pcs-common-load-overlay');
                    }
                );
            };

            // Method called when yest button clicked on the discard dialog
            self.yesDiscardDialog = function() {
                $('.pcs-startform-discard-dialog').ojDialog('close');
                self.rootElement.trigger('startform:discard', [self.startformData]);
                self.cleanUpFormContainer();
            };

            // Method called when yest button clicked on the discard dialog
            self.noDiscardDialog = function() {
                $('.pcs-startform-discard-dialog').ojDialog('close');
            };

            // Method called when closed button clicked on the Error dialog
            self.closeErrorDialog = function() {
                $('.pcs-startform-error-dialog').ojDialog('close');
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

                        self._saveOrSubmitFrevvoForm('submit');
                    }
                }

                //If its a form submit error,  Show error message
                if (data.startsWith('formValidation:error')) {
                    if (self.waitForMessage) {
                        self.waitForMessage = false;
                        var errorMsg = self.bundle.pcs.startform.form_validation_error;
                        var msg = data.substring('formValidation:error'.length + 1);
                        errorMsg = errorMsg + '\r\n\r\n' + msg;

                        //Show local Message
                        $('#pcs-startform-error-msg', self.rootElement).text(errorMsg);
                        $('#pcs-startform-error-msg-container', self.rootElement).show().delay(5000).fadeOut(2000);
                        //Hide overlay
                        $('#pcs-startform-overlay').removeClass('pcs-common-load-overlay');
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


                    $('#pcs-startform-iframe', self.rootElement).css('height', height);
                }
                // console.log( '   ;recieved Message from frame-' +data);
            };

            //Method to attach to Iframe load event to hide the loading indicator
            self.attachEvents = (function() {
                $('#pcs-startform-iframe', self.rootElement).load(function() {
                    $('#pcs-startform-loading', self.rootElement).hide();
                    if (self.data.formHeight && self.data.formHeight !== '') {
                        $('#pcs-startform-iframe', self.rootElement).css('height', self.data.formHeight);
                    }
                });
            }());

            /**
             * method to clean all eevnts associsated
             */
            self.cleanEvents = function() {
                // Remove the PostMessage handler
                pcsUtil.eventHandler.removeHandler(window, 'message', self.receivePostMessage);
				$('#pcs-startform-attachment', self.rootElement).off();
				$(self.rootElement).off();
            };


			/**
			 * method to clean up everything
			 */
			self.dispose = function() {
				console.log('dispose in startform Containor');

				// clean up the events
				self.cleanEvents();
				self.cleanUpFormContainer();
			};

            /**
             * method to add evebnts
             */
            self.addEvents = (function() {
                // Add the PostMessage handler
                pcsUtil.eventHandler.addHandler(window, 'message', self.receivePostMessage);
            }());

            // Method to read widget options and do required UI tweaking
            self.readOptions = (function() {
                if (self.data.hideDiscard) {
                    $('#pcs-startform-discard', self.rootElement).hide();
                }
                if (self.data.hideSave) {
                    $('#pcs-startform-save', self.rootElement).hide();
                }
                if (self.data.hideSubmit) {
                    $('#pcs-startform-submit', self.rootElement).hide();
                }
                if (self.data.hideAttachment) {
                    $('#pcs-startform-attachment-area', self.rootElement).hide();
                }
                if (self.data.formHeight && self.data.formHeight !== '') {
                    $('#pcs-startform-form-frame', self.rootElement).css('height', self.data.formHeight);
                }
            }());

            //Load the form
            initStartForm();
        }

        return StartformContainer;
    });
