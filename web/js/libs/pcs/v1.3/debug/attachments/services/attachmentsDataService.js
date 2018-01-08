/**
 * Created by lwagner on 4/9/2016.
 */


define(['jquery', 'pcs/util/pcsUtil'],
    function($, pcsUtil) {
        'use strict';

        function AttachmentsDataService() {
            var self = this;

            self.paths = {
                'taskAttachmentList': 'tasks/{taskId}/attachments',
                'ProcessesAttachmentList': 'processes/{processId}/attachments',
                'taskDcsFolderList': 'tasks/{taskId}/folders',
                'taskDcsFolderInfo': 'tasks/{taskId}/folders/{folderId}'
            };

            // get to array buffer for binary data. Must be used for attachments
            var doGetToArrayBuffer = function(url, attachment, callback) {
                var oReq = new XMLHttpRequest();
                //oReq.onload = callback;
                oReq.onreadystatechange = function() {
                    if (oReq.readyState === 4 && oReq.status === 200) {
                        callback(attachment, oReq.response);
                    }
                };

                oReq.open('GET', url, true);
                oReq.withCredentials = true;
                oReq.responseType = 'arraybuffer';
                oReq.setRequestHeader('Authorization', pcsUtil.getAuthInfo());
                if (pcsUtil.isTestMode()) {
                    oReq.setRequestHeader('pcs_mode', 'dev');
                }

                oReq.send();

                return oReq;
            };

            // wrapper function for HTTP GET
            var doGet = function(url) {

                //Dummy ADF call
                pcsUtil.adfProxyCall();

                return $.ajax({
                    type: 'GET',
                    cache: false,

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

                var bytes = new Uint8Array(payload.length);
                for (var i = 0; i < payload.length; i++) {
                    bytes[i] = payload.charCodeAt(i);
                }

                return $.ajax({
                    type: 'POST',
                    url: url,
                    cache: false,
                    processData: false,
                    data: bytes,
                    contentType: contentType,
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

            // wrapper function for HTTP GET
            var doDelete = function(url, dataType) {
                //Dummy ADF call
                pcsUtil.adfProxyCall();

                return $.ajax({
                    type: 'DELETE',
                    url: encodeURI(url),
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
                    dataType: dataType

                });
            };

            self.getAttachmentList = function(mode, id) {
                var serverPath;
                if (mode === 'task') {
                    serverPath = pcsUtil.getRestURL() + self.paths.taskAttachmentList.replace('{taskId}', id);
                } else if (mode === 'processes') {
                    serverPath = pcsUtil.getRestURL() + self.paths.ProcessesAttachmentList.replace('{processId}', id);
                }
                return doGet(serverPath);
            };

            self.uploadAttachment = function(mode, id, payload, contentType) {
                var serverPath;
                if (mode === 'task') {
                    serverPath = pcsUtil.getRestURL() + self.paths.taskAttachmentList.replace('{taskId}', id);
                } else if (mode === 'processes') {
                    serverPath = pcsUtil.getRestURL() + self.paths.ProcessesAttachmentList.replace('{processesId}', id);
                }
                return doPost(serverPath, payload, contentType);
            };

            self.deleteAttachment = function(mode, id, attachmentName) {
                var serverPath;
                if (mode === 'task') {
                    serverPath = pcsUtil.getRestURL() + self.paths.taskAttachmentList.replace('{taskId}', id) + '/' + attachmentName;
                } else if (mode === 'processes') {
                    serverPath = pcsUtil.getRestURL() + self.paths.ProcessesAttachmentList.replace('{processesId}', id) + '/' + attachmentName;
                }
                return doDelete(serverPath);
            };

            self.getAttachmentStream = function(uri, attachment, callback) {
                return doGetToArrayBuffer(uri, attachment, callback);
            };

            self.getDcsFolders = function(mode, id) {
                var serverPath;
				if (mode === 'task') {
					serverPath = pcsUtil.getRestURL() + self.paths.taskDcsFolderList.replace('{taskId}', id);
				}
                return doGet(serverPath);
            };

            self.getDcsFolderInfo = function(mode, id, folderId) {
                var serverPath;
				if (mode === 'task') {
					serverPath = pcsUtil.getRestURL() + self.paths.taskDcsFolderInfo.replace('{taskId}', id).replace('{folderId}', folderId);
				}
                return doGet(serverPath);
            };
        }

        return new AttachmentsDataService();
    }
);
