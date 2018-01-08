/**
 * Created by srayker on 8/25/2016.
 */

//TODO nisabhar Fix the define it should only load psc-tasklist-container.html' and tasklistVM', rest of pcs resource should be loaded by the file which is using it

define(['ojs/ojcore', 'knockout', 'jquery', 'text!pcs/tasklist/templates/psc-tasklist-container.html', 'pcs/tasklist/viewModel/tasklistVM',
        'text!pcs/tasklistActions/templates/pcs-tasklist-toolbar.html', 'pcs/tasklistActions/viewModel/tasklistToolbarVM',
        'text!pcs/tasksearch/templates/tasksearchContainer.html', 'pcs/tasksearch/viewModel/taskSearchVM',
        'text!pcs/tasklist/templates/filters.html', 'pcs/tasklist/viewModel/filters',
        'ojL10n!pcsMsg/nls/pcsSnippetsResource', 'jqueryui-amd/widget'
    ],
    function(oj, ko, $, tmpl, tasklist) {
        'use strict';
        $.widget('pcs.tasklist', {

            //Options to be used as defaults
            options: {
                hideToolbar: false,
                hideSystemActions: false,
                hideCustomActions: false,
                hideSearch: false,
                hideSort: false,
                hideRefresh: false,
                hideFromUserName: false,
                hideAssignedDate: false,
                hideDueDate: false,
                hideCreatedDate: false,
                hideSummary: false,
                pageSize: 10,
                hideFilter: false,
                hideSelectAll: false,
                selectedSortType: 'assignedDate',
                selectedSortOrder: 'ascending',
                hideTaskDetails: false,
                taskDetailOptions: '{}',
                systemActions: 'SUSPEND,ESCALATE,RENEW,REASSIGN,INFO_REQUEST,WITHDRAW,ACQUIRE,PURGE,DELETE,RESUME,RELEASE',
                tasklistFilter: '{}'
            },

            _create: function() {
                // _create will automatically run the first time
                // this widget is called. Put the initial widget
                // setup code here, then you can access the element
                // on which the widget was called via this.element.
                // The options defined above can be accessed
                // via this.options this.element.addStuff();
                var widget = this;

                //function model() {
                //  var self = this;
                //
                //  if (!ko.components.isRegistered('tasklistComponent')) {
                //      ko.components.register('tasklistComponent', {
                //          template: { require: 'text!pcs/tasklist/tamplates/psc-tasklist-container.html'},
                //          viewModel: { require: 'pcs/tasklist/viewModel/tasklistVM'}
                //      });
                //  }
                //  self.data = data;
                //}

                var data = this.options;
                data.rootElement = widget.element;

                var params = {
                    data: data
                };

                this.element.html(tmpl);
                var vm = new tasklist(params);
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
				console.log('Destroying tasklist');
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
    }
);
