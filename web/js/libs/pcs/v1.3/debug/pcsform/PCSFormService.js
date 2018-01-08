/**
 * Created by nisabhar on 5/12/17.
 */

define(function(require) {
	'use strict';
	var pcsUtil = require('pcs/util/pcsUtil');

	var paths = {
		//Excetue PCS form
		'executePCSFormRest': 'webforms/{formDefId}/executeRest/{restExecutionId}'
	};

	var replacePlaceHolders = function(str, paramsObj) {
		return str.replace(/{\w+}/g,
			function(placeHolder) {
				return paramsObj[placeHolder];
			}
		);
	};

	// wrapper function for HTTP POST
	var doPost = function(url, payload) {
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

	var doRestGet = function(url, params) {
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
			contentType: 'application/json',
			cache: false
		});
	};


	//making it a singleton
	var instance;

	function CreateInstance(options) {
		var _state = {};

		return {

			getFormMetaData: function (url) {

				var promise = $.Deferred();

				if ( _state.form && _state.form[url]) {
					promise.resolve(_state.form[url]);
					return promise;
				}

				var options = {};
				doRestGet(url).done(function (data) {

					if (_state.form === undefined) {
						_state.form = {};
					}
					_state.form[url] = data;
					promise.resolve(data);
				}).fail(function (error) {
					promise.reject(error);
				});

				return promise;
			},

			getFormMetaDataByURL: function (formMetadataUrl) {
				return doRestGet(formMetadataUrl);
			},

			executePCSFormRest: function (params, payload) {
				var serverPath = pcsUtil.getRestURL() + paths.executePCSFormRest;
				serverPath = replacePlaceHolders(serverPath, params);
				return doPost(serverPath, payload);
			},

			executeRest: function (restAPI, payload) {
				var serverPath = pcsUtil.getRestURL() + restAPI;
				return doRestGet(serverPath, payload);
			}
		};
	}

	return {
		getInstance: function(options) {
			if (!instance) {
				instance = new CreateInstance(options);
			}
			return instance;
		}
	};

});
