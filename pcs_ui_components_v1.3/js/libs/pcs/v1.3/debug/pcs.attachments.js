/**
 * Created by lwagner on 3/11/2016.
 */

define(['ojs/ojcore', 'knockout', 'jquery', 'text!pcs/attachments/templates/pcs-attachments.html', 'ojL10n!pcsMsg/nls/pcsSnippetsResource', 'jqueryui-amd/widget',
        'pcs/attachments/viewModel/attachmentsContainer', 'text!pcs/attachments/view/attachmentsContainer.html'
    ],
    function(oj, ko, $, tmpl, bundle) {
        'use strict';
        // define your widget under pcs namespace
        $.widget('pcs.attachments', {

            //Options to be used as defaults
            options: {
                hideDelete: false,
                hideUploadLink: false,
                hideTitle: false,
                attachments: [],
                startFolderName: '',
                mode: 'start',
                id: -1,
                readOnly: false,
                isDocsEnabled: false
            },

            _create: function() {
                // _create will automatically run the first time
                // this widget is called. Put the initial widget
                // setup code here, then you can access the element
                // on which the widget was called via this.element.
                // The options defined above can be accessed
                // via this.options this.element.addStuff();
                var widget = this;

                if ($.pcsConnection === undefined) {
                    this.element.html('<div style=\'color:red\'>' + bundle.pcs.common.pcs_connection + ' </div>');
                    return;
                }

                var data = {
                    rootElement: widget.element,
                    hideDelete: widget.options.hideDelete,
                    hideUploadLink: widget.options.hideUploadLink,
                    hideTitle: widget.options.hideTitle,
                    attachments: widget.options.attachments,
                    startFolderName: widget.options.startFolderName,
                    mode: widget.options.mode,
                    id: widget.options.id,
                    isDocsEnabled: widget.options.isDocsEnabled
                };

                function Model() {
                    var self = this;

                    if (!ko.components.isRegistered('attachmentComponent')) {
                        ko.components.register('attachmentComponent', {
                            template: {
                                require: 'text!pcs/attachments/view/attachmentsContainer.html'
                            },
                            viewModel: {
                                require: 'pcs/attachments/viewModel/attachmentsContainer'
                            }
                        });
                    }
                    self.data = data;

                    if (widget.options.readOnly) {
                        self.data.hideUploadLink = true;
                        self.data.hideDelete = true;
                    }
                }

                var vm = new Model();

                widget.model = vm;

                this.element.html(tmpl);

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
				console.log('Destroying attachments');
				// clean everything up
				if (this.model && this.model.data && this.model.data.container) {
					this.model.data.container.dispose();
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
            },

            getAttachments: function() {
                var data = this.model.data.container.attachmentList();
                return data;
            }
        });
    });
