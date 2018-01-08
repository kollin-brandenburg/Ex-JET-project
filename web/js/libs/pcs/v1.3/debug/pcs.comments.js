/**
 * Created by lwagner on 5/12/2016.
 */

define(['ojs/ojcore', 'knockout', 'jquery', 'text!pcs/comments/templates/pcs-comments.html', 'ojL10n!pcsMsg/nls/pcsSnippetsResource', 'jqueryui-amd/widget',
        'pcs/comments/viewModel/commentsContainer', 'text!pcs/comments/view/commentsContainer.html'
    ],
    function(oj, ko, $, tmpl, bundle) {
        'use strict';
        // define your widget under pcs namespace
        $.widget('pcs.comments', {

            //Options to be used as defaults
            options: {
                readOnly: false,
                hideTitle: false,
                mode: 'task',
                id: -1
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
                    readOnly: widget.options.readOnly,
                    hideTitle: widget.options.hideTitle,
                    mode: widget.options.mode,
                    id: widget.options.id

                };

                function Model() {
                    var self = this;

                    if (!ko.components.isRegistered('commentComponent')) {
                        ko.components.register('commentComponent', {
                            template: {
                                require: 'text!pcs/comments/view/commentsContainer.html'
                            },
                            viewModel: {
                                require: 'pcs/comments/viewModel/commentsContainer'
                            }
                        });
                    }
                    self.data = data;
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
				console.log('Destroying comments');
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

            getComments: function() {
                var data = this.model.data.container.commentList();

                return data;
            }
        });
    });
