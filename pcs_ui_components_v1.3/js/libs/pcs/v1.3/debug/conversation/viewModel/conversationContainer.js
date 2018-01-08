/**
 * Created by nisabhar on 8/26/2016.
 */

define(['knockout', 'pcs/conversation/services/conversationDataService',
        'pcs/util/pcsUtil', 'ojL10n!pcsMsg/nls/pcsSnippetsResource'
    ],
    function(ko, services, pcsUtil) {
        'use strict';
        /**
         * The view model for the main content view template
         */
        function ConversationContainer(params) {
            var self = this;

            //Set the resourcebundle
            self.bundle = require('ojL10n!pcsMsg/nls/pcsSnippetsResource');

            //all the data passed to the container
            self.data = params.data;

            //the jquery element where the widget is pushed, all the selectors will work in context of this element
            self.rootElement = self.data.rootElement;

            function loadOSNAppLink(appLink, user) {
                var parsedAppLink = JSON.parse(appLink); //extractOSNInfo(appLink);
                var appLinkURL = parsedAppLink.appLinkURL;
                var converstationDetail = appLinkURL.substring(appLinkURL.indexOf('/conversations'), appLinkURL.length);
                var token = parsedAppLink.accessToken;
                //var cListURL = 'https://socialnetwork71482-lab5osndoc10081pr1-social.vfarm.oraclecorp.com/osn/web/cList?hide=navMenu+sidebar+fullView+search+uploadAndCopy+documents+help';
                var cListURL = appLinkURL.substring(0, appLinkURL.indexOf('/conversations')) + '?hide=navMenu+sidebar+fullView+search+uploadAndCopy+documents+help';
                $('#pcs-conv-applink', self.rootElement)[0].src = 'about:blank';
                $('#pcs-conv-applink', self.rootElement).hide();

                var iframeReady = $.Deferred();

                iframeReady.done(function() {
                    $(window).one('message', function(event) {
                        var evt = event;

                        if (evt.originalEvent.data.message === 'navigate-ack') {
                            console.log('Event message received::' + evt.originalEvent.data.message);
                            //Hide loading
                            $('#pcs-conv-loading', self.rootElement).hide();
                            $('#pcs-conv-loading-msg', self.rootElement).hide();

                            $('#pcs-conv-applink', self.rootElement).css('height', '500px').show();
                        } else {
                            console.log('OOPS - stray postMessage caused listener to stop; retry last action');
                        }
                    });

                    var message = {
                        message: 'navigate',
                        path: converstationDetail,
                        accessToken: token,
                        highlight: user
                    };
                    console.log('Posting message: ' + message);
                    $('#pcs-conv-applink', self.rootElement)[0].contentWindow.postMessage(message, '*');
                });


                if (!$('#pcs-conv-applink', self.rootElement)[0].src || ($('#pcs-conv-applink', self.rootElement)[0].src === 'about:blank')) {
                    // eventHandler.addHandler(window,'message',tryMe);
                    $(window).one('message', function(event) {
                        var evt = event;

                        if (evt.originalEvent.data.status === 'listening') {
                            console.log('Event Message:' + evt.originalEvent.data.status);
                            iframeReady.resolve();
                        } else {
                            console.log('OOPS - stray postMessage caused listener to stop; reload');
                        }
                    });
                    $('#pcs-conv-applink', self.rootElement)[0].src = cListURL;

                    var msg = self.bundle.pcs.conversation.docs_wait;
                    $('#pcs-conv-loading-msg', self.rootElement).text(msg).show();



                } else {
                    iframeReady.resolve();
                }
            }

            // Error handler method for the plugin
            self.ajaxErrorHandler = function(jqXHR, customMsg) {
                var msg;
                if (jqXHR && jqXHR.status === 0) {
                    msg = self.bundle.pcs.common.server_not_reachable;
                }
                if (jqXHR && (jqXHR.status === 500 || jqXHR.status === 401 || jqXHR.status === 404)) {
                    msg = jqXHR.responseText;
                }

                if (msg === undefined || msg === '') {
                    msg = customMsg;
                }

                $('#pcs-conv-error-msg', self.rootElement).text(msg);
                $('#pcs-conv-error-msg-container', self.rootElement).show();

                //Hide loading
                $('#pcs-conv-loading', self.rootElement).hide();
            };


            // Method to load the conversations
            self.initConversation = function() {

                if (self.data.mode === 'task') {
                    // Get the Conversation list
                    services.getConversations(self.data.mode, self.data.id).done(
                        function(data) {
                            // Read the conversation List
                            if (data && data.conversationInstanceList && data.conversationInstanceList.length > 0) {

                                //TODO :-  For this release we ahve 1 conversation per task.
                                var link = data.conversationInstanceList[0].links[0].href;

                                //get the access token
                                services.getAppLink(link).done(
                                    function(data) {
                                        if (data && data.appLink) {
                                            var applink = data.appLink;
                                            //Get the logged in user
                                            services.getLoggedInUser().done(
                                                function(data) {
                                                    if (data && data.id) {
                                                        loadOSNAppLink(applink, data.id);
                                                    } else {
                                                        var customMsg = self.bundle.pcs.conversation.user_fetch_error;
                                                        self.ajaxErrorHandler(undefined, customMsg);
                                                    }
                                                    self.rootElement.trigger('conversations:loaded');
                                                }
                                            ).fail(
                                                function(jqXHR, textStatus, errorThrown) {
                                                    var customMsg = self.bundle.pcs.conversation.user_fetch_error;
                                                    self.ajaxErrorHandler(jqXHR, customMsg);
                                                    self.rootElement.trigger('conversations:loaded');
                                                }
                                            );
                                        } else {
                                            var customMsg = self.bundle.pcs.conversation.conv_connection_error;
                                            self.ajaxErrorHandler(undefined, customMsg);
                                            self.rootElement.trigger('conversations:loaded');
                                        }
                                    }
                                ).fail(
                                    function(jqXHR, textStatus, errorThrown) {
                                        var customMsg = self.bundle.pcs.conversation.conv_connection_error;
                                        self.ajaxErrorHandler(jqXHR, customMsg);
                                        self.rootElement.trigger('conversations:loaded');
                                    }
                                );
                            } else {
                                var customMsg = self.bundle.pcs.conversation.no_conversation;
                                self.ajaxErrorHandler(undefined, customMsg);
                                self.rootElement.trigger('conversations:loaded');
                            }
                        }
                    ).fail(
                        function(jqXHR, textStatus, errorThrown) {
                            var customMsg = self.bundle.pcs.conversation.conv_load_error;
                            self.ajaxErrorHandler(jqXHR, customMsg);
                            self.rootElement.trigger('conversations:loaded');
                        }
                    );
                } else if (self.data.mode === 'process') {
                    //ToDO : Add process logic
                } else {
                    var customMsg = self.bundle.pcs.conversation.conv_mode_error;
                    self.ajaxErrorHandler(undefined, customMsg);
                }
            };

            self.clearOSNFrame = function(event) {
                $('#pcs-conv-applink', self.rootElement)[0].src = 'about:blank';
                console.log('Conversation iframe src set to aboutb:blank');
            };


			/**
			 * method to clean up everything
			 */
			self.dispose = function() {
				console.log('dispose in conversation Containor');
				self.clearOSNFrame();
				// clean up the events
			};

            //Load the conversation
            self.initConversation();
        }

        return ConversationContainer;
    });
