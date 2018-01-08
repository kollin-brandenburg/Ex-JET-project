/**
 * Created by nisabhar on 8/26/2016.
 */

define(['jquery', 'pcs/util/pcsUtil'],
    function($, pcsUtil) {
        'use strict';

        function ConversationDataService() {
            var self = this;

            self.paths = {
                'tasksConversations': 'tasks/{taskId}/conversations',
                'processConversations': 'processes/{processId}/conversations',
                'loggedInUser': 'identities/loggedInUser'
            };

            // wrapper function for HTTP GET
            var doGet = function(url) {
                //Dummy ADF call
                pcsUtil.adfProxyCall();

                return $.ajax({
                    type: 'GET',
                    url: url,
                    beforeSend: function(xhr) {
                        xhr.setRequestHeader('Authorization', pcsUtil.getAuthInfo());
                        if (pcsUtil.isTestMode()) {
                            xhr.setRequestHeader('pcs_mode', 'dev');
                        }
                    },
                    xhrFields: {
                        withCredentials: true
                    },
                    contentType: 'application/json',
                    dataType: 'json'
                });
            };

            self.getConversations = function(mode, id) {
                var serverPath;
                if (mode === 'task') {
                    serverPath = pcsUtil.getRestURL() + self.paths.tasksConversations.replace('{taskId}', id);
                } else if (mode === 'processes') {
                    serverPath = pcsUtil.getRestURL() + self.paths.processConversations.replace('{processId}', id);
                }
                return doGet(serverPath);
            };

            self.getAppLink = function(link) {
                return doGet(link);
            };

            self.getLoggedInUser = function() {
                var serverPath = pcsUtil.getRestURL() + self.paths.loggedInUser;
                return doGet(serverPath);
            };

        }

        return new ConversationDataService();
    }
);
