/**
 * Created by rojv on 10/26/2016.
 */

//TODO nisabhar Fix the define it should only load pcs-task-actions.html' and taskActionsVM', rest of pcs resource should be loaded by the file which is using it
define(['ojs/ojcore', 'knockout', 'jquery',
        'text!pcs/tasklistActions/templates/pcs-task-actions.html', 'pcs/tasklistActions/viewModel/taskActionsVM',
        'text!pcs/tasklistActions/templates/pcs-reassign.html', 'pcs/tasklistActions/viewModel/reassignVM',
        'text!pcs/tasklistActions/templates/pcs-requestInfo.html', 'pcs/tasklistActions/viewModel/requestInfoVM',
        'text!pcs/tasksearch/templates/tasksearchContainer.html', 'pcs/tasksearch/viewModel/taskSearchVM',
		'pcs/pcs.identitybrowser',
        'ojL10n!pcsMsg/nls/pcsSnippetsResource', 'jqueryui-amd/widget'
    ],
    function(oj, ko, $, tmpl, taskactions) {

        'use strict';

        $.widget('pcs.taskactions', {

            //Options to be used as defaults
            options: {
                hideSystemActions: false,
                hideCustomActions: false,
                systemActions: 'SUSPEND,ESCALATE,RENEW,REASSIGN,INFO_REQUEST,WITHDRAW,ACQUIRE,PURGE,DELETE,RESUME,RELEASE',
                taskNumbers: '200007,200020,200022'
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
                    taskactionParams: data
                };

                this.element.html(tmpl);
                var vm = new taskactions(params);
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
				console.log('Destroying taskactions');
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
