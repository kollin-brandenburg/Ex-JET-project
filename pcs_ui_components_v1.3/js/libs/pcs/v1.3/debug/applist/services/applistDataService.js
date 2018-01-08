/**
 * Created by nisabhar on 3/7/2016.
 */


define(['jquery', 'pcs/util/pcsUtil'],
    function($, pcsUtil) {
        'use strict';

        function ApplistDataService() {
            var self = this;

            self.paths = {
                'startFormList': 'process-definitions' //?interfaceFilter=form'
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

            self.getStartFormList = function(params) {
                var serverPath = pcsUtil.getRestURL() + self.paths.startFormList;
                return doGet(serverPath);
            };
        }

        return new ApplistDataService();
    }
);
