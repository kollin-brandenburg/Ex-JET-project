// ---- DO NOT REMOVE THIS COMMENT  PCS Embeddable Process UI Components--------------

/**
 * Created by nisabhar on 4/6/2016.
 */

// To Be Added In form.pack.js inside frevvo.ear for PCS Embeddable Process UI Components whenver there is a frevvo.ear update

/**
 * Method to find out the form height and doing a POST for the height value
 */
function pcsHeightCalculator() {
    'use strict';
    var height = document.body.scrollHeight;
    parent.postMessage('formHeight:' + height, '*');
}

function getControlErrors(frm) {
    'use strict';
    var controls = frm.document.getElementsByClassName('f-status');
    var results = [];
    for (var i = 0; i < controls.length; i++) {
        var parent = controls[i].parentElement;
        while (parent) {
            if (parent.hasClassName('f-control') && !parent.hasClassName('f-submit')) {
                if (parent.hasClassName('s-invalid') && parent.getAttribute('cname')) {
                    var errorMsg = controls[i].children[0].innerHTML;

                    if (controls[i].style.display === 'none') {
                        errorMsg = 'Missing required value';
                    }

                    var result = {
                        id: parent.id,
                        name: parent.getAttribute('cname'),
                        error: errorMsg
                    };
                    results.push(result);
                }
                break;
            }
            parent = parent.parentElement;
        }
    }
    return results;
}

/**
 * Internal method to perform validations
 * it performs POST message formValidation:error or formValidation:success depending on validation outcome
 * @param event
 */
function formValidation(event) {
    'use strict';
    var frame = window;
    try {
        frame._frevvo.api.forms.controls.setControlValue('_action', 'SUBMIT');
    } catch (err) {
        // do nothing
    }
    var submitView = window.SubmitView;
    if (submitView) {
        var errorMsg = '';
        var result = getControlErrors(frame);
        if (result.length > 0) {
            for (var k = 0; k < result.length; k++) {
                if (k > 0) {
                    errorMsg = errorMsg + '\r\n';
                }
                errorMsg = errorMsg + result[k].name + ' - ' + result[k].error;

            }
            // Post the error Message to listeners
            event.source.postMessage('formValidation:error:' + errorMsg, event.origin);
        } else if (!submitView.isSubmitValid('Submit')) {
            // Post the error Message to listeners
            event.source.postMessage('formValidation:error:' + errorMsg, event.origin);
        } else {
            // Post the success Message to listeners
            event.source.postMessage('formValidation:success', event.origin);
        }
    }
}

/**
 * method called after the frevvo recieve a message to perform form validation
 * @param event
 */
function pcsReceiveMessage(event) {
    'use strict';
    var key = event.message ? 'message' : 'data';
    var data = event[key];

    if (data === 'formValidation') {
        formValidation(event);
    }
}




// Use below code to take care of IE also to add event listener
//window.addEventListener('message', pcsReceiveMessage, false);
// It will listen to any POST event to the page - 'formValidation'
var pcsEventMethod = window.addEventListener ? 'addEventListener' : 'attachEvent';
var pcsEventer = window[pcsEventMethod];

var pcsMessageEvent = pcsEventMethod === 'attachEvent' ? 'onmessage' : 'message';
pcsEventer(pcsMessageEvent, pcsReceiveMessage, false);

//this doesnt work in firefox
// Attach the onLoad event for finding page Height
//if(window.attachEvent) {
//    window.attachEvent('onload', pcsHeightCalculator);
//} else {
//    if(window.onload) {
//        var curronload = window.onload;
//        var newonload = function(evt) {
//            curronload(evt);
//            pcsHeightCalculator(evt);
//        };
//        window.onload = newonload;
//    } else {
//        window.onload = pcsHeightCalculator;
//    }
//}

// Attach the onLoad event for finding page Height
var pcsLoadEvent = pcsEventMethod === 'attachEvent' ? 'onload' : 'load';
pcsEventer(pcsLoadEvent, pcsHeightCalculator, false);
