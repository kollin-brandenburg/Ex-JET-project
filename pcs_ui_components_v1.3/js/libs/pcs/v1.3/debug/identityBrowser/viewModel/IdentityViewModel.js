/**
 * Created by rojv on 9/23/2016.
 */

define(['knockout', 'pcs/identityBrowser/viewModel/IdentityService','pcs/composer/idBrowser/ojidentity.min'], function(ko, IdentityService) {
    'use strict';

    function IdentityViewModel(params) {
        var self = this;
        //Set the resourcebundle
        self.bundle = require('ojL10n!pcsMsg/nls/pcsSnippetsResource');
        self.service = new IdentityService();
        //self.value = ko.observableArray([]); //ko observable array
        self.value = params.hasOwnProperty('value') ? params.value : ko.observableArray([]); //ko observable array
		self.valueSubscription = self.value.subscribe(function(value) {
            self.service.setSelectedIdentities(value);
        });
        self.multiple = params.hasOwnProperty('multiple') && ko.utils.unwrapObservable(params.multiple) === true;
        self.scope = (params.hasOwnProperty('scope') ? ko.utils.unwrapObservable(params.scope) : 'user');
        if(!self.scope){
        	self.scope = 'all';
		}
        self.placeholder = (params.hasOwnProperty('placehoderTxt') ? ko.utils.unwrapObservable(params.placehoderTxt) : self.bundle.pcs.idBrowser.placeholderTxt);
        self.idbID = (params.hasOwnProperty('idbID') ? ko.utils.unwrapObservable(params.idbID) : 'identityBrowser');

		/**
		 * method to clean up everything
		 */
		self.dispose = function() {
			console.log('dispose in IVM');
			self.valueSubscription.dispose();

			// clean up the events
		};
    }

    IdentityViewModel.prototype = {
        //set the default selected Identities
        setValue: function(value) {
            this.value(value);
        },
        getValue: function() {
            return this.service.getSelectedIdentities();
        },
        getUserIDs: function() {
            var values = this.service.getSelectedIdentities();
            return values.map(function(item) {
                return item.id;
            });
        },
        getUserTypes: function() {
            var values = this.service.getSelectedIdentities();
            return values.map(function(item) {
                return item.type;
            });
        },
        //this will return promise that will resolve to list of identities
        getIdentities: function(params) {
            return this.service.restCall(params);
        },
        getIdentityIndex: function(identities, identity) {
            if (!Array.isArray(identities)) {
                throw 'argument type in not array';
            }
            if (!identity) {
                return -1;
            }

            var arrLen = identities.length;
            var i = 0;
            var childElem = JSON.stringify(identity);

            for (; i < arrLen; i++) {
                // fastest way.
                // will fail if the object keys are unordered with comparing one
                var parentElem = JSON.stringify(identities[i]);

                if (parentElem === childElem) {
                    return i;
                }
            }
            return -1;
        }
    };

    return IdentityViewModel;

});
