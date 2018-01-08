/**
 * Copyright (c) 2014, 2016, Oracle and/or its affiliates.
 * The Universal Permissive License (UPL), Version 1.0
 */
/**
 * Example of Require.js boostrap javascript
 */
requirejs.config({
    waitSeconds: 30,
    paths: {
        'knockout': 'empty:',
        'jquery': 'empty:',
        'jqueryui-amd': 'empty:',
        'promise': 'empty:',
        'hammerjs': 'empty:',
        'underscore': 'empty:',
        'ojdnd': 'empty:',
        'ojs': 'empty:',
        'ojL10n': 'empty:',
        'ojtranslations': 'empty:',
        'text': 'empty:',
        'ko-mapping': 'empty:',
        'signals': 'empty:',
        'widget': 'empty:',
        'pcsMsg': 'empty:',
        'rendererMsg': 'empty:',
    },
    shim: {
        'jquery': {
            exports: ['jQuery', '$']
        }
    }
});

require(['ojs/ojcore', 'knockout', 'jquery', 'ojs/ojmodule', 'widget'],
    function(oj, ko, $) { // this callback gets executed when all required modules are loaded
        'use strict';
        oj.ModuleBinding.defaults.modelPath = './';
        oj.ModuleBinding.defaults.viewPath = 'text!./';

        $.pcsConnection = {
            serverURL: 'http://slc07dsq.us.oracle.com:7001',
            restURI: '/bpm/api/3.0/',
            authInfo: 'Basic d2VibG9naWM6d2VibG9naWMx'
        };
    }
);
