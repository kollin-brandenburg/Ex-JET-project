define(function(require) {
    'use strict';
    var $ = require('jquery'),
        pcsUtil = require('pcs/util/pcsUtil');
    return (function() {
        var instance,
            //TODO: remove hard coding, use default connection if connection info
            //is not passed
            defaultConnection = {
                credentials: pcsUtil.getAuthInfo(),
                baseUrl: pcsUtil.getServerURL() + '/bpm/api/3.0'
            },
            getBaseURL = function(version) {
                if (version) {
                    return pcsUtil.getServerURL() + '/bpm/api/' + version;
                }
                return pcsUtil.getServerURL() + '/bpm/api/3.0';
            },
            getAuthInfo = function() {
                return pcsUtil.getAuthInfo();
            },
            //callback to set authorization request header for every call
            beforeRequestCallback = function(xhr) {
                xhr.setRequestHeader('Authorization', getAuthInfo());
                if (pcsUtil.isTestMode()) {
                    xhr.setRequestHeader('pcs_mode', 'dev');
                }
            },

            serializeUrlParams = function(params) {
                var str = [];
                if (params instanceof Array) {
                    params.forEach(function(param) {
                        for (var p in param) {
                            if (param.hasOwnProperty(p)) {
                                str.push(encodeURIComponent(p) + '=' + encodeURIComponent(param[p]));
                            }
                        }
                    });
                } else {
                    for (var p in params) {
                        if (params.hasOwnProperty(p)) {
                            str.push(encodeURIComponent(p) + '=' + encodeURIComponent(params[p]));
                        }
                    }
                }
                return str.join('&');
            },

            serializeData = function(contentType, payload) {
                var data = JSON.stringify(payload);
                if (!contentType && contentType.startsWith('multipart')) {
                    data = new Uint8Array(payload.length);
                    for (var i = 0; i < payload.length; i++) {
                        data[i] = payload.charCodeAt(i);
                    }
                }
                return data;
            };

        function init() {
            return {
                get: function(url, options, version) {
                    if (url.indexOf(getBaseURL(version)) === -1) {
                        url = getBaseURL(version) + url;
                    }
                    //add URL query parameters for GET
                    if (options && options.queryParams) {
                        url += '?' + serializeUrlParams(options.queryParams);
                    }
                    //alert(url);
                    return $.ajax({
                        type: 'GET',
                        url: url,
                        beforeSend: beforeRequestCallback,
                        xhrFields: {
                            withCredentials: true
                        },
                        contentType: (options && options.contentType) ? options.contentType : 'application/json',
                        dataType: (options && options.dataType) ? options.dataType : 'json'
                    });
                },

                post: function(url, options, version) {
                    if (url.indexOf(getBaseURL(version)) === -1) {
                        url = getBaseURL(version) + url;
                    }
                    if (options.contentType == null) {
                        options.contentType = 'application/json';
                    }
                    var payload = serializeData(options.contentType, options.payload);
                    return $.ajax({
                        type: 'POST',
                        url: url,
                        cache: false,
                        processData: false,
                        data: payload,
                        beforeSend: beforeRequestCallback,
                        xhrFields: {
                            withCredentials: true
                        },
                        contentType: options.contentType,
                        dataType: (options && options.dataType) ? options.dataType : 'json'
                    });
                },

                put: function(url, options, version) {
                    if (url.indexOf(getBaseURL(version)) === -1) {
                        url = getBaseURL(version) + url;
                    }
                    if (options.contentType == null) {
                        options.contentType = 'application/json';
                    }

                    var payload = serializeData(options.contentType, options.payload);
                    return $.ajax({
                        type: 'PUT',
                        url: url,
                        cache: false,
                        processData: false,
                        data: payload,
                        beforeSend: beforeRequestCallback,
                        xhrFields: {
                            withCredentials: true
                        },
                        contentType: options.contentType,
                        dataType: (options && options.dataType) ? options.dataType : 'json'
                    });
                },

                delete: function(url, options) {

                }
            };
        }

        return {
            // Get the Singleton instance if one exists
            // or create one if it doesn't
            getInstance: function(connection) {
                if (!instance) {
                    instance = init();
                }
                if (connection) {
                    instance.connection = connection;
                } else {
                    if (defaultConnection) {
                        instance.connection = defaultConnection;
                    }
                }
                return instance;
            },

            setConnection: function(connection) {
                if (!instance) {
                    instance = init();
                }
                instance.connection = connection;
            },

            serializeUrlParams: function(params) {
                return serializeUrlParams(params);
            }

        };

    })();
});
