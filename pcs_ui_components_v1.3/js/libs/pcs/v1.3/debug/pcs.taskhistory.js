/**
 * Created by srayker on 8/25/2016.
 */

define(['ojs/ojcore', 'knockout', 'jquery', 'text!pcs/taskhistory/templates/pcs-task-history-container.html', 'pcs/taskhistory/viewModel/taskHistoryVM',
        'ojL10n!pcsMsg/nls/pcsSnippetsResource', 'jqueryui-amd/widget'
    ],
    function(oj, ko, $, tmpl, taskhistory) {
        'use strict';
        $.widget('pcs.taskhistory', {

            //Options to be used as defaults
            options: {
                taskNumber: '',
            },

            _create: function() {
                // _create will automatically run the first time
                // this widget is called. Put the initial widget
                // setup code here, then you can access the element
                // on which the widget was called via this.element.
                // The options defined above can be accessed
                // via this.options this.element.addStuff();
                var widget = this;

                //TODO nisabhar Check if the pcsConnection is there along with taskNumber see pcs.taskDetail.js

                var data = this.options;
                data.rootElement = widget.element;

                var params = {
                    data: data
                };

                this.element.html(tmpl);
                var vm = new taskhistory(params);
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
				console.log('Destroying history');
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
                // this._super( "_setOption", key, value );
            }
        });
    }
);
