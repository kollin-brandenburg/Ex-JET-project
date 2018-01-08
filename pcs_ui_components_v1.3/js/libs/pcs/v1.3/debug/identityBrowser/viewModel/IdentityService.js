/**
 * Created by rojv on 9/23/2016.
 */

define(['pcs/identityBrowser/viewModel/Identity', 'pcs/identityBrowser/viewModel/Identities','pcs/data-services/DataServices'],
    function(Identity, Identities, DataServices) {
        'use strict';

        var resourceUrlConfig = {
            identities: '/identities'
        };
        var dataServices = DataServices.getInstance();

        function IdentityService() {
            this._identities = new Identities();
        }

        IdentityService.prototype = {
            getIdentity: function(index) {
                return this._identities.getIdentities[index];
            },

            setIdentities: function(identities) {
                this._identities.setIdentities(this.parseIdentity(identities));
            },

            getIdentities: function() {
                return [].concat(this._identities.getIdentities());
            },

            setSelectedIdentities: function(identities) {
                this._identities.setSelectedIdentities(this.parseIdentity(identities));
            },

            getSelectedIdentities: function() {
                return this._identities.getSelectedIdentities();
            },

            parseIdentity: function(identities) {
                var _identities = [];
                if (identities && Array.isArray(identities)) {
                    for (var i = 0, len = identities.length; i < len; i++) {
                        _identities.push(new Identity(identities[i]));
                    }
                }

                return _identities;
            },


            restCall: function(params) {
                var _this = this;
                return new Promise(function(fulfill, reject) {
                    var url = resourceUrlConfig.identities;
                    var options = {
                        contentType: 'application/json; charset=utf-8',
                        queryParams: params
                    };
                    dataServices.get(url, options, null, params).then(function(data) {
                        _this.setIdentities(data.items || []);
                        fulfill(_this.getIdentities());
                    }).fail(function(error) {
                        //return the cache
                        reject(_this.getIdentities());
                    });
                });
            }

        };

        return IdentityService;

    });
