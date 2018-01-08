define(['knockout', 'jquery'], function(ko, $) {
    'use strict';
    //TODO nisabhar shouldn't this code be under tasksearch ?

    /**
     * KO Binding for Auto suggest.
     * @type {{init: ko.bindingHandlers.suggestItems.init}}
     */
    ko.bindingHandlers.suggestItems = {
        init: function(element, valueAccessor, allBindingAccessor, viewModel) {
            var autoSuggestions = valueAccessor() || [];
            var itemSize = autoSuggestions.length;
            var selIndex = 0;

            var $s1 = $(element);

            //wrap the input text with a div and then append a div with ul for the menu autoSuggestions
            $(element).parent()
                .append('<div id=\'srchmenuroot\' class=\'pcs-ts-autosuggestion-menu-root\'><ul  class=\'pcs-ts-autosuggestion-menu-ul\'></ul></div>');
            //for each item passed, append a new li to the ul
            $(element).siblings().css({
                top: 26
            });

            //function to register mouse hover events on all list autoSuggestions
            function registerEventsOnListItems(lis, items) {
                lis.hover(function() {
                    lis.removeClass('pcs-ts-autosuggestion-menuitem-selected');
                    $(this).addClass('pcs-ts-autosuggestion-menuitem-selected');
                    selIndex = lis.index(this) + 1;
                }).mousedown(function() {
                    //calling the function passed to the items array as callback
                    items[selIndex - 1].action({
                        element: $(element),
                        selectedAutoSuggestion: items[selIndex - 1]
                    });
                });
            }

            function initItems(itemArr) {
                var lis = '';
                if (itemArr) {
                    itemArr.forEach(function(item) {
                        var label = item.label;
                        var styleClass = item.styleClass;
                        lis += '<li class=\'pcs-ts-autosuggestion-menu-items\'><span class=\'' + styleClass + '\'></span>' +
                            '<span class=\'pcs-ts-autosuggestion-menu-item\'>' + label + '</span></li>';
                    });
                    var ul = $(element).parent().find('ul');
                    $(ul).empty().append(lis);
                }
                var $lis = $(element).parent().find('li');
                registerEventsOnListItems($lis, itemArr);
            }

            //attach event handlers
            //attach focus and blur handler for input text
            $(element).focus(function() {
                $(this).siblings().width($(this).width() + 5);
                $('#srchmenuroot').show();
            }).blur(function() {
                $(this).siblings().hide();
            });

            //attach key handlers
            $s1.keyup(function(event) {
                var $lis = $s1.parent().find('li');
                var code = event.keyCode || event.which;
                switch (code) {
                    case 13: //enter key
                        if ($(element).siblings().css('display') !== 'none') {
                            var result = {};
                            var selectedItemIndex = selIndex;
                            $('li:nth-child(' + selIndex + ')', $(element).parent()).removeClass('pcs-ts-autosuggestion-menuitem-selected');
                            selIndex = 0;
                            $(element).siblings().hide();
                            result.element = $(element);
                            if (selectedItemIndex === 0) {
                                result.selectedAutoSuggestion = autoSuggestions[selectedItemIndex];
                                autoSuggestions[selectedItemIndex].action(result);
                            } else {
                                result.selectedAutoSuggestion = autoSuggestions[selectedItemIndex - 1];
                                autoSuggestions[selectedItemIndex - 1].action(result);
                            }
                        }
                        break;

                    case 27: //escape key
                        $('li:nth-child(' + selIndex + ')', $(element).parent()).removeClass('pcs-ts-autosuggestion-menuitem-selected');
                        selIndex = 0;
                        $(element).siblings().hide();
                        break;
                    case 38: //up
                        if ($(element).siblings().css('display') !== 'none') {
                            selIndex = (selIndex > 1) ? selIndex - 1 : itemSize;
                            $lis.removeClass('pcs-ts-autosuggestion-menuitem-selected');
                            $('li:nth-child(' + selIndex + ')', $(element).parent()).addClass('pcs-ts-autosuggestion-menuitem-selected');
                        }
                        break;

                    case 40: //down
                        if ($(element).siblings().css('display') !== 'none') {
                            selIndex = (selIndex < itemSize) ? selIndex + 1 : 1;
                            $lis.removeClass('pcs-ts-autosuggestion-menuitem-selected');
                            $('li:nth-child(' + selIndex + ')', $(element).parent()).addClass('pcs-ts-autosuggestion-menuitem-selected');
                        }
                        break;
                    default:
                        var isCallBackFunctionRefreshAutoSuggestionDefined = typeof viewModel.refreshAutoSuggestions === 'function';
                        if (isCallBackFunctionRefreshAutoSuggestionDefined) {
                            var refreshedAutoSuggestions = viewModel.refreshAutoSuggestions(event.currentTarget.value);
                            autoSuggestions = refreshedAutoSuggestions || {};
                            selIndex = 0;
                            itemSize = autoSuggestions.length;
                        }
                        initItems(autoSuggestions);
                        break;
                }
            });
        }
    };

});
