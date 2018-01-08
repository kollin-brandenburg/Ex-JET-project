/**
 * Created by nisabhar on 8/26/2016.
 */

define(['ojs/ojcore', 'knockout', 'jquery', 'text!pcs/conversation/templates/pcs-conversation.html',
        'pcs/conversation/viewModel/conversationContainer', 'text!pcs/conversation/templates/pcs-conversation-error.html',
        'ojL10n!pcsMsg/nls/pcsSnippetsResource', 'jqueryui-amd/widget'
    ],
    function(oj, ko, $, tmpl, conversation, errortmpl, bundle) {
        'use strict';
        // define your widget under pcs namespace
        $.widget('pcs.conversation', {

            //Options to be used as defaults
            options: {
                //Mode for task or process
                mode: 'task',
                id: '',
            },


            // Check if the Required options are provided to the widget
            _isValid: function() {
                if (this.options.id === undefined || this.options.id === '' ||
                    this.options.mode === undefined || this.options.mode === '') {
                    return false;
                }
                if (this.options.mode.toLowerCase() === 'task' || this.options.mode.toLowerCase() === 'process') {
                    return true;
                }
                return false;
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
                var vm = new conversation(params);
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
				console.log('Destroying conversation');
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
