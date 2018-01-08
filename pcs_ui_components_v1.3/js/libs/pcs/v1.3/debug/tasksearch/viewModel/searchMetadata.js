define(['pcs/tasksearch/viewModel/process','pcs/tasksearch/viewModel/searchableField','pcs/data-services/DataServices'],
	function(Process, SearchableField ,DataServices ) {
    'use strict';
    var resourceUrlConfig = {
            processdefinitions: '/process-definitions',
            searchablefields: '/searchfields'
        },
        dataServices = DataServices.getInstance();
    return {
        getProcessDefinitions: function() {
            var url = resourceUrlConfig.processdefinitions;
            return new Promise(function(resolve, reject) {
                //var options = {queryParams: params};
                dataServices.get(url).done(function(data) {
                    var processes = data.items.map(function(item) {
                        return new Process(item);
                    });
                    resolve(processes);
                }).fail(function(error) {
                    reject(error);
                });
            });
        },
        getSearchableFields: function(params) {
            var url = resourceUrlConfig.searchablefields;
            return new Promise(function(resolve, reject) {
                var options = {
                    queryParams: params
                };
                dataServices.get(url, options).done(function(data) {
                    var SearchableFields = data.fields.map(function(field) {
                        return new SearchableField(field);
                    });
                    resolve(SearchableFields);
                }).fail(function(error) {
                    reject(error);
                });
            });
        }
    };
});
