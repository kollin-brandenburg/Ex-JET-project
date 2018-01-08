/**
 * Created by rojv on 9/23/2016.
 */
define([], function() {
    'use strict';

    function Identities() {
        this._identities = [];
        this._selectedIdentities = [];
    }

    Identities.prototype = {
        setIdentities: function(identities) {
            this._identities = identities;
        },

        getIdentities: function() {
            return this._identities;
        },

        setSelectedIdentities: function(identities) {
            this._selectedIdentities = identities;
        },

        getSelectedIdentities: function() {
            return this._selectedIdentities;
        }
    };

    return Identities;

});
