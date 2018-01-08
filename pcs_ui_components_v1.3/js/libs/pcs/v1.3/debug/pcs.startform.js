/**
 * Created by nisabhar on 3/11/2016.
 */

define(['ojs/ojcore', 'knockout', 'jquery','ojL10n!pcsMsg/nls/pcsSnippetsResource', 'text!pcs/startform/templates/pcs-startform.html',
        'pcs/startform/viewModel/startformContainer', 'text!pcs/startform/templates/pcs-startform-error.html',  'jqueryui-amd/widget'
    ],
    function(oj, ko, $, bundle, tmpl, startform, errortmpl) {
        'use strict';
        // define your widget under pcs namespace
        $.widget('pcs.startform', {

            //Options to be used as defaults
            options: {
                //Data Object needed to get the startForm object
                startformData: {
                    processDefId: '',
                    processName: '',
                    serviceName: '',
                    title: '',
                    description: '',
                    operation: '',
                    startType: 'START_FORM',
                    isDocsEnabled: false
                },
                //Hidden option for PM's to pre populate form data
                payload: {},
                // to hide submit button or not
                hideSubmit: false,
                /**/
                // to hide save button or not
                hideSave: false,
                // to hide discard button or not
                hideDiscard: false,
                // to hide hideAttachment or not
                hideAttachment: false,
				//to automatically reload after submit
				reloadOnSubmit: true,
				//to automatically reload after save
				reloadOnSave: true,
                //Height for the form Iframe
                formHeight: '',
                // submit button label string
                submitLabel: bundle.pcs.startform.submit
            },


            // Check if the Required options are provided to the widget
            _isValid: function() {
                if (this.options.startformData === undefined || this.options.startformData.processDefId === undefined ||
                    this.options.startformData.serviceName === undefined || this.options.startformData.operation === undefined) {
                    return false;
                }
                if (this.options.startformData.processDefId === '' || this.options.startformData.serviceName === '' || this.options.startformData.operation === '') {
                    return false;
                }
                return true;
            },

            _create: function() {
                // _create will automatically run the first time
                // this widget is called. Put the initial widget
                // setup code here, then you can access the element
                // on which the widget was called via this.element.
                // The options defined above can be accessed
                // via this.options this.element.addStuff();
                var widget = this;

                // Check if PCSConenction is set
                if ($.pcsConnection === undefined) {
                    this.element.html('<div style=\'color:red\'>' + bundle.pcs.common.pcs_connection + ' </div>');
                    return;
                }

                // check if the the plugin is initialized correctly
                if (!this._isValid()) {
                    this.element.html(errortmpl);
                    return;
                }

                var data = this.options;
                data.rootElement = widget.element;

                var params = {
                    data: data
                };

                this.element.html(tmpl);
                var vm = new startform(params);
                this.model = vm;

                //ko.cleanNode(this.element['0']);
                ko.applyBindings(vm, this.element['0']);
            },

            // Destroy an instantiated plugin and clean up modifications
            // that the widget has made to the DOM
            destroy: function() {
                //t his.element.removeStuff();
                // For UI 1.8, destroy must be invoked from the base
                // widget

                $.Widget.prototype.destroy.call(this);
                // For UI 1.9, define _destroy instead and don't worry
                // about calling the base widget
            },

			_destroy: function (){
				console.log('Destroying startform');
				// clean everything up
				if (this.model) {
					this.model.dispose();
				}
			},

            // Respond to any changes the user makes to the option method
            _setOption: function(key, value) {
                this.options[key] = value;

                // For UI 1.8, _setOption must be manually invoked
                // from the base widget
                $.Widget.prototype._setOption.apply(this, arguments);
                // For UI 1.9 the _super method can be used instead
                // this._super( '_setOption', key, value );
            }
        });
    });
