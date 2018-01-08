/**
 * Created by srayker on 05/23/2016.
 */



define(['ojs/ojcore', 'knockout', 'text!./view/idBrowser.html', './viewModel/IdentityViewModel'],

    function(oj, ko, view, viewModel) {
        'use strict';
        // oj.Composite.register('pcs-idBrowser', {
        //     view: {
        //         inline: view
        //     },
        //     viewModel: {
        //         inline: viewModel
        //     },
        //     metadata: {
        //         inline: JSON.parse(metadata)
        //     }
        // });


        if (!ko.components.isRegistered('pcs-identity-browser')) {
            ko.components.register('pcs-identity-browser', {
                template: {
                    require: 'text!pcs/identityBrowser/view/idBrowser.html'
                },
                viewModel: {
                    createViewModel: function(params, componentInfo) {
                        return new viewModel(params, componentInfo);
                    }
                }
            });
            console.log('pcs-idBrowser registered');
        }
    }
);
