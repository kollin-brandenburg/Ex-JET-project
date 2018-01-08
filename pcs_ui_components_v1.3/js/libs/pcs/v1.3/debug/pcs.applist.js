/**
 * Created by nisabhar on 3/7/2016.
 */

define(['ojs/ojcore', 'knockout', 'jquery', 'text!pcs/applist/templates/pcs-applist.html', 'ojL10n!pcsMsg/nls/pcsSnippetsResource',
        'jqueryui-amd/widget', 'pcs/applist/viewModel/applistContainer'
    ],
    function(oj, ko, $, tmpl, bundle) {
        'use strict';
        // define your widget under pcs namespace
        $.widget('pcs.applist', {

            //Options to be used as defaults
            options: {
                // to stop the drill down
                hideStartform: false,
				// to hide Search box
				hideSearchBox : false,
                // to show startform in a dialog
                startformDialog: false,
                // to hide submit button or not
                hideSubmit: false,
                // to hide save button or not
                hideSave: false,
                // to hide discard button or not
                hideDiscard: false,
                // to hide hideAttachment or not
                hideAttachment: false,
                // submit button label string
                submitLabel: bundle.pcs.applist.submit,
                //Height for the form Iframe
                formHeight: '',
                //to filter the list out
                filter: {
                    processName: ''
                }
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

                function Model() {
                    var self = this;
                    self.rootElement = widget.element;
                    self.hideStartform = widget.options.hideStartform;
                    self.startformDialog = widget.options.startformDialog;
                    self.hideSubmit = widget.options.hideSubmit;
                    self.hideSave = widget.options.hideSave;
                    self.hideDiscard = widget.options.hideDiscard;
                    self.hideAttachment = widget.options.hideAttachment;
                    self.submitLabel = widget.options.submitLabel;
                    self.filter = widget.options.filter;
                    self.formHeight = widget.options.formHeight;
                    self.hideSearchBox = widget.options.hideSearchBox;
                }

                var vm = new Model();

                this.element.html(tmpl);
                this.model = vm;

                //ko.cleanNode(this.element['0']);
                ko.applyBindings(vm, this.element['0']);
            },

            /**
             * getthe list of available processes on the server which have start form
             * @returns {Array}
             */
            getProcessList: function() {
                var list = this.model.container.processList;
                return list;
            },

            /**
             * Get the list of start form avaiable after applying the filter criteria
             * @returns {*}
             */
            getStartformList: function() {
                var list = this.model.container.startFormList();
                return list;
            },

            // Destroy an instantiated plugin and clean up modifications
            // that the widget has made to the DOM
            destroy: function() {
                //t his.element.removeStuff();
                // For UI 1.8, destroy must be invoked from the base
                // widget
				//Clean the events attached with the snippet


                $.Widget.prototype.destroy.call(this);
                // For UI 1.9, define _destroy instead and don't worry
                // about calling the base widget
            },

			_destroy: function (){
            	console.log('Destroying Applist');
				// clean everything up
				if (this.model && this.model.container) {
					this.model.container.dispose();
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
