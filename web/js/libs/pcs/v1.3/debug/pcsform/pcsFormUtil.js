/**
 * Created by nisabhar on 5/11/17.
 */

define(['ojs/ojcore', 'knockout','pcs/util/pcsUtil', 'pcs/pcsform/PCSFormService', 'pcs/composer/pcsform/forms.renderer.lib.min' ],
	function(oj, ko,pcsUtil,PCSFormService) {
		'use strict';
		/**
		 * The view model for the main content view template
		 */
		function PCSformUtil() {
			var self = this;

			var service = PCSFormService.getInstance();

			self.getConnector  = function(formDefId) {
				var connector = {};
				connector['connectorHandler'] = {
					'execute': function(callpayload) {
						return new Promise(function(sucess, reject) {
							var formValues = callpayload['formValues'];
							var payloadJson = {};
							if (formValues) {
								payloadJson['formValues']  = formValues ;
							}
							var payload = JSON.stringify(payloadJson);
							service.executePCSFormRest({
									'{formDefId}': formDefId,
									'{restExecutionId}': callpayload.id
								},
								payload).done(function(responseJson) {
								var responseContainer = {
									response: {}
								};
								if (responseJson instanceof Array) {
									//we need to add the binding wrapper to support current PCS design limitation on response arrays
									responseContainer.response[callpayload.listBinding] = responseJson;
								} else {
									responseContainer.response = responseJson;
								}
								sucess(responseContainer);
							}).fail(function(jqXHR) {
								reject(jqXHR.responseText);
							});
						});
					},
					setContext: function(context) {
						this.context = context;
					}
				};
				connector['restHandler'] = {
					execute: function(rest, params) {
						return new Promise(function(sucess, reject) {
							service.executeRest(rest.name, params).done(function(responseJson) {
								sucess(responseJson[rest.optionsListBinding]);
							}).fail(function(jqXHR) {
								reject(jqXHR.responseText);
							});
						});
					},
					setContext: function(context) {
						this.context = context;
					}
				};
				return connector;
			}


			// Check if the webform data is valid
			self.isValidWebForm = function (formRender) {
				var isValid = true;
				if (formRender.length === 1) {
					isValid = formRender.triggerHandler('validateData');
				}
				return isValid;
			};

			self.loadPCSForm =function (properties) {
				var promise = $.Deferred();

				var formMetadataUrl = properties.formMetadataUrl;
				var payload = properties.payload;
				var webFormContainer = properties.webFormContainer;
				var prefix = properties.formRendererId;

				if (formMetadataUrl && webFormContainer && prefix) {
					service.getFormMetaData(formMetadataUrl)
						.then(
							function(formmetadata) {
								webFormContainer['0'].innerHTML = '<div class=\'oj-row\' style=\'margin-top:20px\'><form-renderer id=\'' + prefix +'\' params=\'value: data\'></form-renderer></div>';

								var viewModel = {};
								var formAndPayloadModel = {};
								var form = {};
								for (var key in formmetadata) {
									if (formmetadata.hasOwnProperty(key)) {
										form[key] = formmetadata[key];
									}
								}
								var lastIndexOfSlash = formMetadataUrl.lastIndexOf('/');
								var formDefId = formMetadataUrl.substr(lastIndexOfSlash + 1);
								formAndPayloadModel['form'] = form.form;

								if(payload === undefined){
									payload = {};
								}

								form['payload'] = payload;
								formAndPayloadModel['form']['payload'] = form.payload;


								formAndPayloadModel['config'] = self.getConnector(formDefId);
								formAndPayloadModel['config']['domIdPrefix'] = prefix + '-';

								if (form.dependencies) {
									formAndPayloadModel.dependencies = form.dependencies;
								}

								viewModel['data'] = formAndPayloadModel;
								ko.cleanNode(webFormContainer['0']);

								//TODO: Temp Workaround work with form team to fix this
								// FormRendered doesnt get loaded sometime
								require(['RendererComponent'], function(rc) {

									ko.applyBindings(viewModel, webFormContainer['0']);

									promise.resolve();
								});
							}
							,function(jqXHR) {
								promise.reject(jqXHR);
							}
						);
				}

				return promise;
			};


			self.saveOrSubmitPCSForm = function(formRender,action){
				var promise = $.Deferred();

				formRender.triggerHandler(action).then(function(data) {
					//Here send data.payload to the server
					try {
						var payloadToUpdate = JSON.stringify(data.payload);
						promise.resolve(payloadToUpdate);
					} catch (err) {
						promise.reject(error);
					}
				}).catch(function() {
					promise.reject();
				});

				return promise;
			}
		}

		return new PCSformUtil;
	});
