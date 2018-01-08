/**
 * Created by rojv on 9/23/2016.
 */

define([], function() {
    'use strict';

    function Identity(identity) {
        //Identity Rest API: 1.0, 2.0, 3.0
        this.id = identity.id || identity.identityName;
        this.type = identity.type || identity.identityType;
        this.title = identity.title;
        this.firstName = identity.firstName || identity.userFirstName;
        this.lastName = identity.lastName || identity.userLastName;
        this.email = identity.email;
        this.mobile = identity.mobile || identity.userMobile;
    }

    Identity.prototype = {
        getId: function() {
            return this.id;
        },
        getType: function() {
            return this.type;
        },
        getTitle: function() {
            return this.title;
        },
        getFirstName: function() {
            return this.title;
        },
        getLastName: function() {
            return this.title;
        },
        getFullName: function() {
            return this.firstName + ' ' + this.lastName;
        },
        getEmail: function() {
            return this.email;
        },
        getMobile: function() {
            return this.email;
        }
    };

    return Identity;
});
