/**
 * Created by nisabhar on 5/6/2016.
 */

define(['jquery', 'pcs/util/pcsUtil'],
    function($, pcsUtil) {
        'use strict';

        function TaskdetailDataService() {

            var self = this;

            self.paths = {
                // For getting the formURL and attachments for a form
                'task': 'tasks/{taskNumber}',
                history: 'tasks/{taskNumber}/history',
                liveForm: 'tasks/{taskNumber}/form/live?getURI=true',
                taskPayload: 'tasks/{taskNumber}/payload',
                //Execute PCS form
                'executePCSFormRest': 'webforms/{formDefId}/executeRest/{restExecutionId}'
            };

            // wrapper function for HTTP GET
            var doGet = function(url, contentType, dataType) {
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
                    contentType: contentType,
                    dataType: dataType,
                    cache: false

                });
            };

            // wrapper function for HTTP POST
            var doPost = function(url, payload, contentType, dataType) {
                //Dummy ADF call
                pcsUtil.adfProxyCall();

                return $.ajax({
                    type: 'POST',
                    url: url,
                    cache: false,
                    processData: false,
                    data: payload,
                    dataType: dataType,
                    beforeSend: function(xhr) {
                        xhr.setRequestHeader('Authorization', pcsUtil.getAuthInfo());
                        if (pcsUtil.isTestMode()) {
                            xhr.setRequestHeader('pcs_mode', 'dev');
                        }
                    },
                    xhrFields: {
                        withCredentials: true
                    },
                    contentType: contentType
                });
            };

            // wrapper function for HTTP POST
            var doPut = function(url, payload) {
                //Dummy ADF call
                pcsUtil.adfProxyCall();

                //var bytes = new Uint8Array(payload.length);
                //for (var i=0; i<payload.length; i++)
                //    bytes[i] = payload.charCodeAt(i);

                return $.ajax({
                    type: 'PUT',
                    url: url,
                    cache: false,
                    processData: false,
                    data: payload,
                    beforeSend: function(xhr) {
                        xhr.setRequestHeader('Authorization', pcsUtil.getAuthInfo());
                        if (pcsUtil.isTestMode()) {
                            xhr.setRequestHeader('pcs_mode', 'dev');
                        }
                    },
                    xhrFields: {
                        withCredentials: true
                    },
                    contentType: 'application/json'
                });
            };

            var doRestGet = function(url, params, contentType) {
                pcsUtil.adfProxyCall();
                return $.ajax({
                    url: url,
                    type: 'GET',
                    dataType: 'json',
                    data: params,
                    beforeSend: function(xhr) {
                        xhr.setRequestHeader('Authorization', pcsUtil.getAuthInfo());
                        if (pcsUtil.isTestMode()) {
                            xhr.setRequestHeader('pcs_mode', 'dev');
                        }
                    },
                    xhrFields: {
                        withCredentials: true
                    },
                    contentType: contentType,
                    cache: false
                });
            };

            //To get the task object to get the content of the task
            self.getTaskObject = function(taskNumber) {
                var serverPath = pcsUtil.getRestURL() + self.paths.task.replace('{taskNumber}', taskNumber);
                return doGet(serverPath, 'application/json', 'json');
            };

            // to submit or save a process instance
            self.performTaskAction = function(taskNumber, payload) {
                var serverPath = pcsUtil.getRestURL() + self.paths.task.replace('{taskNumber}', taskNumber);
                console.log(payload);
                return doPut(serverPath, payload);
            };

            self.getTaskHistory = function(taskNumber) {
                var serverPath = pcsUtil.getRestURL() + self.paths.history.replace('{taskNumber}', taskNumber);
                return doGet(serverPath, 'application/json', 'json');
            };

            self.getFrevvoFormUrl = function(taskNumber) {
                var serverPath = pcsUtil.getRestURL() + self.paths.liveForm.replace('{taskNumber}', taskNumber);
                return doGet(serverPath, 'text/plain', 'text');
            };

            self.saveFrevvoForm = function(taskNumber, formURl) {
                var serverPath = pcsUtil.getRestURL() + self.paths.liveForm.replace('{taskNumber}', taskNumber);
                return doPut(serverPath, formURl);
            };

            self.getTaskFolderName = function(href) {
                //  var serverPath = pcsUtil.getRestURL() + self.paths.liveForm.replace('{taskNumber}', taskNumber);
                //console.log(href);
                return doGet(href, 'text/plain', 'text');
            };

            self.getFormMetaDataByURL = function(formMetadataUrl) {
                return doGet(formMetadataUrl, 'application/json', 'json');
            };

            self.getTaskPayloadByURL = function(taskPayloadUrl) {
                return doGet(taskPayloadUrl, 'application/json', 'json');
            };

            self.postTaskPayload = function(taskNumber, payload) {
                var serverPath = pcsUtil.getRestURL() + self.paths.taskPayload.replace('{taskNumber}', taskNumber);
                return doPost(serverPath, payload, 'application/json', 'text');
            };

            var replacePlaceHolders = function(str, paramsObj) {
                return str.replace(/{\w+}/g,
                    function(placeHolder) {
                        return paramsObj[placeHolder];
                    }
                );
            };

            self.executePCSFormRest = function(params, payload) {
                var serverPath = pcsUtil.getRestURL() + self.paths.executePCSFormRest;
                serverPath = replacePlaceHolders(serverPath, params);
                return doPost(serverPath, payload, 'application/json', 'json');
            };

            self.executeRest = function(restAPI, payload) {
                var serverPath = pcsUtil.getRestURL() + restAPI;
                return doRestGet(serverPath, payload, 'application/json');
            };
        }

        return new TaskdetailDataService();

    }
);
