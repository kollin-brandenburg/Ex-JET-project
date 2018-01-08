/**
 * Created by lwagner on 4/12/2016.
 */


define(['jquery', 'pcs/util/pcsUtil'],
    function($, pcsUtil) {
        'use strict';

        function CommentsDataService() {
            var self = this;

            self.paths = {
                'taskCommentList': 'tasks/{taskId}/comments',
                'ProcessesCommentList': 'processes/{processId}/comments'
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

            // wrapper function for HTTP POST
            var doPost = function(url, payload, contentType) {
                //Dummy ADF call
                pcsUtil.adfProxyCall();

                console.log(payload);

                //var bytes = new Uint8Array(payload.length);
                //for (var i=0; i<payload.length; i++)
                //  bytes[i] = payload.charCodeAt(i);

                return $.ajax({
                    type: 'POST',
                    url: url,
                    //cache : false,
                    //processData : false,
                    data: payload,
                    contentType: contentType,
                    dataType: 'json',
                    beforeSend: function(xhr) {
                        xhr.setRequestHeader('Authorization', pcsUtil.getAuthInfo());
                        if (pcsUtil.isTestMode()) {
                            xhr.setRequestHeader('pcs_mode', 'dev');
                        }
                    },
                    xhrFields: {
                        withCredentials: true
                    }
                });
            };

            self.getCommentList = function(mode, id) {
                var serverPath;
                if (mode === 'task') {
                    serverPath = pcsUtil.getRestURL() + self.paths.taskCommentList.replace('{taskId}', id);
                } else if (mode === 'processes') {
                    serverPath = pcsUtil.getRestURL() + self.paths.ProcessesCommentList.replace('{processId}', id);
                }
                return doGet(serverPath);
            };

            self.postComment = function(mode, id, payload, contentType) {
                var serverPath;
                if (mode === 'task') {
                    serverPath = pcsUtil.getRestURL() + self.paths.taskCommentList.replace('{taskId}', id);
                } else if (mode === 'processes') {
                    serverPath = pcsUtil.getRestURL() + self.paths.ProcessesCommentList.replace('{processId}', id);
                }
                return doPost(serverPath, payload, contentType);
            };

        }

        return new CommentsDataService();
    }
);
