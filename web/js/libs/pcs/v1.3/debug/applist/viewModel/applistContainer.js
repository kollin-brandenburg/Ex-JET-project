/**
 * Created by nisabhar on 3/7/2016.
 */

define(['ojs/ojcore', 'knockout', 'pcs/applist/services/applistDataService', 'pcs/util/pcsUtil', 'ojs/ojknockout', 'ojs/ojinputtext',
        'pcs/pcs.startform', 'ojs/ojdialog', 'text!pcs/applist/view/applistContainer.html', 'ojL10n!pcsMsg/nls/pcsSnippetsResource'
    ],
    function(oj, ko, services, pcsUtil) {
        'use strict';
        /**
         * The view model for the main content view template
         */
        function ApplistContainer(params) {
            var self = this;

            //Set the resourcebundle
            self.bundle = require('ojL10n!pcsMsg/nls/pcsSnippetsResource');

            // each Root View Model will be populated with data required for the plugin to work
            self.data = params.data;

            //the Html element where this plugin is pushed
            self.rootElement = self.data.rootElement;

            // the widget needs to acces the method frm the container
            self.data.container = this;

            // Hid ethe start form drill down
            self.hideStartform = self.data.hideStartform;

            // Show start form drill down in a dialog
            self.startformDialog = self.data.startformDialog;

            // List of available startform
            self.startFormList = ko.observableArray([]);

            //List of available processes
            self.processList = [];

			// List of searched startform
			self.searchedStartFormList = ko.observableArray([]);

			// Attribute to store search text
			self.searchText = ko.observable('');

            /**
             * Th e method to load the application list
             */
            function loadAppList() {
				//Start the loading indicator
				$('#pcs-applist-overlay').addClass('pcs-common-load-overlay');

                //trigger service to fetch data for appNameList
                services.getStartFormList().done(
                    function(data) {
                        self._populateStartFormListData(data);

						// Hide the loading indicator
						$('#pcs-applist-overlay').removeClass('pcs-common-load-overlay');
                    }
                ).fail(
                    function(jqXHR) {
                        var msg = self.bundle.pcs.applist.load_error;

                        if (jqXHR && jqXHR.status === 0) {
                            msg = self.bundle.pcs.common.server_not_reachable;
                        }

                        if (jqXHR && jqXHR.status === 500) {
                            msg = jqXHR.responseText;
                        } else if (jqXHR && jqXHR.status === 401) {
                            // reset valid authInfo as the current auth is invalid
                            msg = self.bundle.pcs.common.access_error_msg;
                        }

                        $('#pcs-applist-error', self.rootElement).show();
                        $('#pcs-applist-error-msg', self.rootElement).text(msg);

						// Hide the loading indicator
						$('#pcs-applist-overlay').removeClass('pcs-common-load-overlay');
                    }
                );
            }

            /**
             * Method to read the RESt data and create view model
             * @param data
             * @private
             */
            self._populateStartFormListData = function(data) {

                // clear the old data
                self.startFormList.removeAll();
                self.processList = [];
                if (data && data.items && data.items.length > 0) {
                    for (var i = 0; i < data.items.length; i++) {
                        var process = data.items[i];
                        var processItem = {
                            processDefId: process.processDefId,
                            processIcon: process.processIcon,
                            processName: process.processName,
                            revision: process.revision,
                            application: process.application,
                            domain: process.domain,
                            isDocsEnabled: process.isDocsEnabledFlag
                        };
                        self.processList.push(process);

                        //check for filtering , if processNmae is passed check for that else return the complete list
                        if (!self.data.filter || !self.data.filter.processName || self.data.filter.processName.toUpperCase() === process.processName.toUpperCase()) {
                            for (var j = 0; j < process.interfaces.length; j++) {
                                var form = process.interfaces[j];
                                //console.log(form);
                                if (form.startType && (form.startType === 'START_PCS_FORM' || form.startType === 'START_FORM')) {
                                    form.process = processItem;
                                    //create the search string
									form.searchString = process.processName + ';' + form.title;
                                    self.startFormList.push(form);
                                    //Add in search list too
									self.searchedStartFormList.push(form);
                                }
                            }
                        }
                    }
                }
            };


			//method to search as soon as user type
			self.searchStartFormList = function(searchText) {
				var prunedList = [];
				// clear the old data
				self.searchedStartFormList.removeAll();

				//Search in the stored list
				$.each(self.startFormList(), function(index, value) {
					if (value.searchString.toLowerCase().indexOf(searchText.toLowerCase()) !== -1) {
						self.searchedStartFormList.push(value);
					}
				});
			}


			/**
			 * method to search as soon as user type
			 */
			self.searchTextSubscription = self.searchText.subscribe(function(newValue) {
				self.searchStartFormList(newValue);
			});

            /**
             * Called when user click on an application link
             * @param data
             * @param event
             */
            self.launchForm = function(data, event) {

                var startformData = {
                    processDefId: data.process.processDefId,
                    processName: data.process.processName,
                    serviceName: data.serviceName,
                    title: data.title,
                    description: data.description,
                    operation: data.operation,
                    startType: data.startType,
                    isDocsEnabled: data.process.isDocsEnabled

                };
                var startform;

                //if start form is hidden do nothing
                if (!self.hideStartform) {
                    if (self.startformDialog) {
                        startform = $('#pcs-applist-startform-dialog-div', self.rootElement);
                        self._attachStartFormPlugin(startform, startformData);
                        $('#pcs-applist-startform-dialog', self.rootElement).ojDialog('open');
                    } else {
                        startform = $('#pcs-applist-startform', self.rootElement);
                        self._attachStartFormPlugin(startform, startformData);
                        $('#pcs-applist-startform', self.rootElement).show();
                        $('#pcs-applist-list-area', self.rootElement).hide();
                    }
                }

                //fire the event
                self.rootElement.trigger('applist:formSelected', [startformData]);

            };

            /**
             * Called to close the dialog, it doesnt work in the context of root element
             * because JEt bring the Dialog code outside on the top of the page
             */
            self.closeStartformDialog = function() {
                $('.pcs-applist-startform-dialog').ojDialog('close');
            };

            /**
             * Called to load startform widget
             * @param startform
             * @param startformData
             * @private
             */
            self._attachStartFormPlugin = function(startform, startformData) {

                //if the plugin was already used  clean it up
                if (startform && startform.data() && !$.isEmptyObject(startform.data())) {
                    startform.startform('destroy');
                }

                ko.cleanNode(startform['0']);
                startform.startform({
                    startformData: startformData,
                    hideSubmit: self.data.hideSubmit,
                    hideSave: self.data.hideSave,
                    hideDiscard: self.data.hideDiscard,
					reloadOnSave : false,
					reloadOnSubmit : false,
                    submitLabel: self.data.submitLabel,
                    hideAttachment: self.data.hideAttachment,
                    formHeight: self.data.formHeight
                });

                // Defining the event listeners --
                startform.on('startform:discard', function(event, startformData) {
                    self.startFormComplete();
                });

                startform.on('startform:save', function(event, startformData, instance) {
                    self.startFormComplete(self.bundle.pcs.applist.form_saved);
                    self.rootElement.trigger('applist:formSaved', [startformData, instance]);
                });

                startform.on('startform:submit', function(event, startformData, instance) {
                    var msg = self.bundle.pcs.applist.instance_created;
                    msg = oj.Translations.applyParameters(msg, {
                        '0': instance.title
                    });
                    self.startFormComplete(msg);
                    self.rootElement.trigger('applist:formSubmited', [startformData, instance]);
                });
            };

            self.startFormComplete = function(msg) {
                $('#pcs-applist-startform', self.rootElement).hide();
                $('#pcs-applist-list-area', self.rootElement).show();
                self.closeStartformDialog();

                disposeWidget();

                if (msg) {
                    $('#pcs-applist-succes-msg', self.rootElement).empty().hide().append('<span  class=\'oj-fwk-icon-status-confirmation oj-fwk-icon\' > </span>' +
                        ' <span style=\'color:green;margin-left:5px\'>' + msg + '</span>').css('font-weight', 'bold').css('white-space', 'nowrap');
                    $('#pcs-applist-succes-msg', self.rootElement).show(1500).delay(1000).fadeOut();
                }
            };

            this.handleBindingsApplied = function(info) {
            	if(self.data.hideSearchBox){
					$('#pcs-applist-search-container', self.rootElement).hide();
				}

                loadAppList();
            };

			/**
			 * method to clean all eevnts associsated
			 */
			self.cleanEvents = function() {
				$('#pcs-applist-startform-dialog-div', self.rootElement).off();
				$('#pcs-applist-startform', self.rootElement).off();
				$(self.rootElement).off();
			};

			//Dispose the Widget
			function disposeWidget() {
				var startform;

				//if start form is hidden do nothing
				if (!self.hideStartform) {
					if (self.startformDialog) {
						startform = $('#pcs-applist-startform-dialog-div', self.rootElement);
					} else {
						startform = $('#pcs-applist-startform', self.rootElement);
					}
				}

				if (startform && startform.data() && !$.isEmptyObject(startform.data())) {
					startform.startform('destroy');
					ko.cleanNode(startform[0]);

					//Un apply the bindings for the node and its children, also remove the childrens
					pcsUtil.unApplyBindings(startform, true);
				}
			}

			/**
			 * method to clean up everything
			 */
			self.dispose = function() {
				console.log('dispose in applist Containor');
				self.searchTextSubscription.dispose();

				disposeWidget();

				// clean up the events
				self.cleanEvents();
			};

        }
        return ApplistContainer;
    });
