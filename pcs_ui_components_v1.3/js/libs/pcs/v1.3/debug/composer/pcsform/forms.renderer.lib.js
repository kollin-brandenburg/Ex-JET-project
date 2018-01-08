/**
 * @license RequireJS text 2.0.12 Copyright (c) 2010-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/requirejs/text for details
 */
/*jslint regexp: true */
/*global require, XMLHttpRequest, ActiveXObject,
  define, window, process, Packages,
  java, location, Components, FileUtils */

define('text',['module'], function (module) {
    'use strict';

    var text, fs, Cc, Ci, xpcIsWindows,
        progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'],
        xmlRegExp = /^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,
        bodyRegExp = /<body[^>]*>\s*([\s\S]+)\s*<\/body>/im,
        hasLocation = typeof location !== 'undefined' && location.href,
        defaultProtocol = hasLocation && location.protocol && location.protocol.replace(/\:/, ''),
        defaultHostName = hasLocation && location.hostname,
        defaultPort = hasLocation && (location.port || undefined),
        buildMap = {},
        masterConfig = (module.config && module.config()) || {};

    text = {
        version: '2.0.12',

        strip: function (content) {
            //Strips <?xml ...?> declarations so that external SVG and XML
            //documents can be added to a document without worry. Also, if the string
            //is an HTML document, only the part inside the body tag is returned.
            if (content) {
                content = content.replace(xmlRegExp, "");
                var matches = content.match(bodyRegExp);
                if (matches) {
                    content = matches[1];
                }
            } else {
                content = "";
            }
            return content;
        },

        jsEscape: function (content) {
            return content.replace(/(['\\])/g, '\\$1')
                .replace(/[\f]/g, "\\f")
                .replace(/[\b]/g, "\\b")
                .replace(/[\n]/g, "\\n")
                .replace(/[\t]/g, "\\t")
                .replace(/[\r]/g, "\\r")
                .replace(/[\u2028]/g, "\\u2028")
                .replace(/[\u2029]/g, "\\u2029");
        },

        createXhr: masterConfig.createXhr || function () {
            //Would love to dump the ActiveX crap in here. Need IE 6 to die first.
            var xhr, i, progId;
            if (typeof XMLHttpRequest !== "undefined") {
                return new XMLHttpRequest();
            } else if (typeof ActiveXObject !== "undefined") {
                for (i = 0; i < 3; i += 1) {
                    progId = progIds[i];
                    try {
                        xhr = new ActiveXObject(progId);
                    } catch (e) {}

                    if (xhr) {
                        progIds = [progId];  // so faster next time
                        break;
                    }
                }
            }

            return xhr;
        },

        /**
         * Parses a resource name into its component parts. Resource names
         * look like: module/name.ext!strip, where the !strip part is
         * optional.
         * @param {String} name the resource name
         * @returns {Object} with properties "moduleName", "ext" and "strip"
         * where strip is a boolean.
         */
        parseName: function (name) {
            var modName, ext, temp,
                strip = false,
                index = name.indexOf("."),
                isRelative = name.indexOf('./') === 0 ||
                             name.indexOf('../') === 0;

            if (index !== -1 && (!isRelative || index > 1)) {
                modName = name.substring(0, index);
                ext = name.substring(index + 1, name.length);
            } else {
                modName = name;
            }

            temp = ext || modName;
            index = temp.indexOf("!");
            if (index !== -1) {
                //Pull off the strip arg.
                strip = temp.substring(index + 1) === "strip";
                temp = temp.substring(0, index);
                if (ext) {
                    ext = temp;
                } else {
                    modName = temp;
                }
            }

            return {
                moduleName: modName,
                ext: ext,
                strip: strip
            };
        },

        xdRegExp: /^((\w+)\:)?\/\/([^\/\\]+)/,

        /**
         * Is an URL on another domain. Only works for browser use, returns
         * false in non-browser environments. Only used to know if an
         * optimized .js version of a text resource should be loaded
         * instead.
         * @param {String} url
         * @returns Boolean
         */
        useXhr: function (url, protocol, hostname, port) {
            var uProtocol, uHostName, uPort,
                match = text.xdRegExp.exec(url);
            if (!match) {
                return true;
            }
            uProtocol = match[2];
            uHostName = match[3];

            uHostName = uHostName.split(':');
            uPort = uHostName[1];
            uHostName = uHostName[0];

            return (!uProtocol || uProtocol === protocol) &&
                   (!uHostName || uHostName.toLowerCase() === hostname.toLowerCase()) &&
                   ((!uPort && !uHostName) || uPort === port);
        },

        finishLoad: function (name, strip, content, onLoad) {
            content = strip ? text.strip(content) : content;
            if (masterConfig.isBuild) {
                buildMap[name] = content;
            }
            onLoad(content);
        },

        load: function (name, req, onLoad, config) {
            //Name has format: some.module.filext!strip
            //The strip part is optional.
            //if strip is present, then that means only get the string contents
            //inside a body tag in an HTML string. For XML/SVG content it means
            //removing the <?xml ...?> declarations so the content can be inserted
            //into the current doc without problems.

            // Do not bother with the work if a build and text will
            // not be inlined.
            if (config && config.isBuild && !config.inlineText) {
                onLoad();
                return;
            }

            masterConfig.isBuild = config && config.isBuild;

            var parsed = text.parseName(name),
                nonStripName = parsed.moduleName +
                    (parsed.ext ? '.' + parsed.ext : ''),
                url = req.toUrl(nonStripName),
                useXhr = (masterConfig.useXhr) ||
                         text.useXhr;

            // Do not load if it is an empty: url
            if (url.indexOf('empty:') === 0) {
                onLoad();
                return;
            }

            //Load the text. Use XHR if possible and in a browser.
            if (!hasLocation || useXhr(url, defaultProtocol, defaultHostName, defaultPort)) {
                text.get(url, function (content) {
                    text.finishLoad(name, parsed.strip, content, onLoad);
                }, function (err) {
                    if (onLoad.error) {
                        onLoad.error(err);
                    }
                });
            } else {
                //Need to fetch the resource across domains. Assume
                //the resource has been optimized into a JS module. Fetch
                //by the module name + extension, but do not include the
                //!strip part to avoid file system issues.
                req([nonStripName], function (content) {
                    text.finishLoad(parsed.moduleName + '.' + parsed.ext,
                                    parsed.strip, content, onLoad);
                });
            }
        },

        write: function (pluginName, moduleName, write, config) {
            if (buildMap.hasOwnProperty(moduleName)) {
                var content = text.jsEscape(buildMap[moduleName]);
                write.asModule(pluginName + "!" + moduleName,
                               "define(function () { return '" +
                                   content +
                               "';});\n");
            }
        },

        writeFile: function (pluginName, moduleName, req, write, config) {
            var parsed = text.parseName(moduleName),
                extPart = parsed.ext ? '.' + parsed.ext : '',
                nonStripName = parsed.moduleName + extPart,
                //Use a '.js' file name so that it indicates it is a
                //script that can be loaded across domains.
                fileName = req.toUrl(parsed.moduleName + extPart) + '.js';

            //Leverage own load() method to load plugin value, but only
            //write out values that do not have the strip argument,
            //to avoid any potential issues with ! in file names.
            text.load(nonStripName, req, function (value) {
                //Use own write() method to construct full module value.
                //But need to create shell that translates writeFile's
                //write() to the right interface.
                var textWrite = function (contents) {
                    return write(fileName, contents);
                };
                textWrite.asModule = function (moduleName, contents) {
                    return write.asModule(moduleName, fileName, contents);
                };

                text.write(pluginName, nonStripName, textWrite, config);
            }, config);
        }
    };

    if (masterConfig.env === 'node' || (!masterConfig.env &&
            typeof process !== "undefined" &&
            process.versions &&
            !!process.versions.node &&
            !process.versions['node-webkit'])) {
        //Using special require.nodeRequire, something added by r.js.
        fs = require.nodeRequire('fs');

        text.get = function (url, callback, errback) {
            try {
                var file = fs.readFileSync(url, 'utf8');
                //Remove BOM (Byte Mark Order) from utf8 files if it is there.
                if (file.indexOf('\uFEFF') === 0) {
                    file = file.substring(1);
                }
                callback(file);
            } catch (e) {
                if (errback) {
                    errback(e);
                }
            }
        };
    } else if (masterConfig.env === 'xhr' || (!masterConfig.env &&
            text.createXhr())) {
        text.get = function (url, callback, errback, headers) {
            var xhr = text.createXhr(), header;
            xhr.open('GET', url, true);

            //Allow plugins direct access to xhr headers
            if (headers) {
                for (header in headers) {
                    if (headers.hasOwnProperty(header)) {
                        xhr.setRequestHeader(header.toLowerCase(), headers[header]);
                    }
                }
            }

            //Allow overrides specified in config
            if (masterConfig.onXhr) {
                masterConfig.onXhr(xhr, url);
            }

            xhr.onreadystatechange = function (evt) {
                var status, err;
                //Do not explicitly handle errors, those should be
                //visible via console output in the browser.
                if (xhr.readyState === 4) {
                    status = xhr.status || 0;
                    if (status > 399 && status < 600) {
                        //An http 4xx or 5xx error. Signal an error.
                        err = new Error(url + ' HTTP status: ' + status);
                        err.xhr = xhr;
                        if (errback) {
                            errback(err);
                        }
                    } else {
                        callback(xhr.responseText);
                    }

                    if (masterConfig.onXhrComplete) {
                        masterConfig.onXhrComplete(xhr, url);
                    }
                }
            };
            xhr.send(null);
        };
    } else if (masterConfig.env === 'rhino' || (!masterConfig.env &&
            typeof Packages !== 'undefined' && typeof java !== 'undefined')) {
        //Why Java, why is this so awkward?
        text.get = function (url, callback) {
            var stringBuffer, line,
                encoding = "utf-8",
                file = new java.io.File(url),
                lineSeparator = java.lang.System.getProperty("line.separator"),
                input = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file), encoding)),
                content = '';
            try {
                stringBuffer = new java.lang.StringBuffer();
                line = input.readLine();

                // Byte Order Mark (BOM) - The Unicode Standard, version 3.0, page 324
                // http://www.unicode.org/faq/utf_bom.html

                // Note that when we use utf-8, the BOM should appear as "EF BB BF", but it doesn't due to this bug in the JDK:
                // http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4508058
                if (line && line.length() && line.charAt(0) === 0xfeff) {
                    // Eat the BOM, since we've already found the encoding on this file,
                    // and we plan to concatenating this buffer with others; the BOM should
                    // only appear at the top of a file.
                    line = line.substring(1);
                }

                if (line !== null) {
                    stringBuffer.append(line);
                }

                while ((line = input.readLine()) !== null) {
                    stringBuffer.append(lineSeparator);
                    stringBuffer.append(line);
                }
                //Make sure we return a JavaScript string and not a Java string.
                content = String(stringBuffer.toString()); //String
            } finally {
                input.close();
            }
            callback(content);
        };
    } else if (masterConfig.env === 'xpconnect' || (!masterConfig.env &&
            typeof Components !== 'undefined' && Components.classes &&
            Components.interfaces)) {
        //Avert your gaze!
        Cc = Components.classes;
        Ci = Components.interfaces;
        Components.utils['import']('resource://gre/modules/FileUtils.jsm');
        xpcIsWindows = ('@mozilla.org/windows-registry-key;1' in Cc);

        text.get = function (url, callback) {
            var inStream, convertStream, fileObj,
                readData = {};

            if (xpcIsWindows) {
                url = url.replace(/\//g, '\\');
            }

            fileObj = new FileUtils.File(url);

            //XPCOM, you so crazy
            try {
                inStream = Cc['@mozilla.org/network/file-input-stream;1']
                           .createInstance(Ci.nsIFileInputStream);
                inStream.init(fileObj, 1, 0, false);

                convertStream = Cc['@mozilla.org/intl/converter-input-stream;1']
                                .createInstance(Ci.nsIConverterInputStream);
                convertStream.init(inStream, "utf-8", inStream.available(),
                Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

                convertStream.readString(inStream.available(), readData);
                convertStream.close();
                inStream.close();
                callback(readData.value);
            } catch (e) {
                throw new Error((fileObj && fileObj.path || '') + ': ' + e);
            }
        };
    }
    return text;
});


define('text!iconTemplate',[],function () { return '<img src="#" alt="" class="icon" data-bind="attr:{src: icon.getDataValue(), alt: alt}, css: styleClass"/>\n<img src="#" alt="" class="icon-hover" data-bind="attr:{src: icon.getDataHover(), alt: alt}, css: styleClass + \'-hover\'"/>\n<img src="#" alt="" class="icon-active" data-bind="attr:{src: icon.getDataActive(), alt: alt}, css: styleClass + \'-active\'"/>';});


define('text!rendererControl',[],function () { return '<div class="oj-row row-control" data-bind="asyncTemplate: {name:\'columnControl\', foreach: $data.controls, as: \'control\',pageSize: 1, afterLazyRenderAll: context.registerAsyncTemplate(context, $data.controls())},visible: !hide()">\n\n</div>\n';});


define('text!rendererMoneyControl',[],function () { return '<!-- ko with: properties -->\n<div data-bind="template:{afterRender: $parent.afterRenderMoney}">\n    <label data-bind="attr: {for : $parent.domIdPrefix + $parent.id}, text: label, style: {\'color\': formattedStyle().labelColor, \'font-size\': formattedStyle().labelSize}"></label>\n    <input data-bind="attr: {id: $parent.domIdPrefix + $parent.id, name: $parent.name, autofocus: autoFocus() ? \'autofocus\' : null, autocomplete: autoComplete() ? \'on\' : \'off\', style: parsedStyle},\n                        ojComponent: {\n                                        component: \'ojInputNumber\',\n                                        title: hint,\n                                        validators: $parent.validators,\n                                        readOnly: $parent.readOnly() || readonly(),\n                                        value: $parent.value,\n                                        rawValue: $parent.rawValue,\n                                        max: maxValue,\n                                        min: minValue,\n                                        step: step,\n                                        required: required,\n                                        disabled: $parent.readOnly() ? !$parent.readOnly() : disabled(),\n                                        help: {definition: help()},\n                                        converter: converterOptions()\n                                      }, handleEvents: $parent"/>\n</div>\n<!-- /ko -->';});


define('text!rendererButtonControl',[],function () { return '<!-- ko with: properties -->\n<div>\n    <button type="button" data-bind="attr: {id: $parent.domIdPrefix + $parent.id, name: $parent.name, autofocus: autoFocus() ? \'autofocus\' : null, style: parsedStyle},\n                                    ojComponent: {component: \'ojButton\', label: label, disabled: $parent.readOnly() ||disabled()}, handleEvents: $parent" class="button-control">\n    </button>\n</div>\n<!-- /ko -->';});


define('text!rendererChecklistControl',[],function () { return '<!-- ko with: properties -->\n<label data-bind ="attr: {for: $parent.domIdPrefix + $parent.id, id: $parent.id + \'_mainLabel\'}, text: label(), style: {\'color\': formattedStyle().labelColor, \'font-size\': formattedStyle().labelSize}"></label>\n<div data-bind = "attr: {id: $parent.domIdPrefix + $parent.id, style: parsedStyle}, ojComponent: {\n    component: \'ojCheckboxset\',\n    validators: $parent.validators,\n\tinvalidComponentTracker: $parent.tracker,\n\tdisabled: $parent.readOnly() || disabled(),\n\tvalue: $parent.value,\n\trawValue: $parent.rawValue,\n\thelp: {definition: help()},\n    required: required}, handleEvents: $parent,\n    refresh: computedOptions">\n\t<!-- ko foreach: computedOptions -->\n\t    <span class ="oj-choice-row" data-bind="attr: {id: $parents[1].id + \'_row\' + $index()}, css: {\'oj-choice-row-inline\': $parent.inline() === true}">\n\t      <input data-bind="value: value, attr:{id: $parents[1].id + \'_choice\' +  $index(), autofocus: $parent.autoFocus()[0] === value ? \'autofocus\' : null}"  type ="checkbox">\n\t      <label data-bind="for: $parents[1].id + \'_choice\' + $index(), text: label, style: {\'fontSize\': $parent.formattedStyle().fontSize}"></label>\n\t    </span>\n\t<!-- /ko -->\n</div>\n<!-- /ko -->';});


define('text!rendererCheckboxControl',[],function () { return '<!-- ko with: properties -->\n<div data-bind = "attr: {id: $parent.domIdPrefix + $parent.id, style: parsedStyle}, ojComponent: {\n    component: \'ojCheckboxset\',\n    validators: $parent.validators,\n\tinvalidComponentTracker: $parent.tracker,\n\tdisabled: $parent.readOnly() || disabled(),\n\tvalue: $parent.checkboxValue,\n\trawValue: $parent.rawValue,\n\thelp: {definition: help()},\n    required: required}, handleEvents: $parent">\n\t<span class ="oj-choice-row" data-bind="attr: {id: $parent.id + \'_check\'}">\n\t\t<input data-bind="value: \'true\', attr:{id: $parent.id + \'_checked\'}"  type ="checkbox">\n\t\t<label data-bind ="attr: {for: $parent.domIdPrefix + $parent.id, id: $parent.id + \'_mainLabel\'}, text: label(), style: {\'color\': formattedStyle().labelColor, \'font-size\': formattedStyle().labelSize}"></label>\n\t</span>\n</div>\n<!-- /ko -->';});


define('text!rendererDateControl',[],function () { return '<!-- ko with: properties -->\n<div data-bind="template:{afterRender: $parent.afterRenderDate}">\n    <label data-bind="attr: {for: $parent.domIdPrefix + $parent.id}, text: label, style: {\'color\': formattedStyle().labelColor, \'font-size\': formattedStyle().labelSize}"></label>\n    <input data-bind="attr: {id: $parent.domIdPrefix + $parent.id, name: $parent.name, style: parsedStyle, autofocus: autoFocus() ? \'autofocus\' : null},\n                        ojComponent: {component: \'ojInputDate\',\n                            validators: $parent.validators,\n                            disabled: disabled,\n                            placeholder: placeHolder,\n                            readOnly: $parent.readOnly() || readonly(),\n                            required: required,\n\t\t\t\t\t\t\thelp: {definition: help()},\n                            value: $parent.value,\n                            rawValue: $parent.rawValue,\n                            max: maxValue,\n                            min: minValue,\n                            invalidComponentTracker: $parent.tracker,\n                            converter: dateConverter,\n                            datePicker: {\n                              changeMonth: \'none\',\n                              changeYear: \'none\'\n                            }\n                        }, handleEvents: $parent"/>\n    </div>\n\n<!-- /ko -->';});


define('text!rendererDateTimeControl',[],function () { return '<!-- ko with: properties -->\n<div data-bind="template:{afterRender: $parent.afterRenderTime}">\n    <label data-bind="attr: {for: $parent.domIdPrefix + $parent.id}, text: label, style: {\'color\': formattedStyle().labelColor, \'font-size\': formattedStyle().labelSize}"></label>\n    <input data-bind="attr: {id: $parent.domIdPrefix + $parent.id, name: $parent.name, style: parsedStyle, autofocus: autoFocus() ? \'autofocus\' : null},\n                        ojComponent: {component: \'ojInputDateTime\',\n                            validators: $parent.validators,\n                            disabled: disabled,\n                            placeholder: placeHolder,\n                            readOnly: $parent.readOnly() || readonly(),\n                            required: required,\n                            value: $parent.value,\n                            rawValue: $parent.rawValue,\n                            invalidComponentTracker: $parent.tracker,\n                            max: maxValue,\n                            min: minValue,\n                            help: {definition: help()},\n                            converter: dateConverter,\n                            datePicker: {\n                              changeMonth: \'none\',\n                              changeYear: \'none\'\n                            },\n                            timePicker: {\n                                timeIncrement: step()[0]\n                            }\n                        }, handleEvents: $parent"/>\n</div>\n<!-- /ko -->';});


define('text!rendererEmailControl',[],function () { return '<!-- ko with: properties -->\n<label data-bind="attr: {for: $parent.domIdPrefix + $parent.id}, text: label, style: {\'color\': formattedStyle().labelColor, \'font-size\': formattedStyle().labelSize}"></label>\n<input data-bind="attr: {id: $parent.domIdPrefix + $parent.id, name: $parent.name, autocomplete: autoComplete() ? \'on\' : \'off\', style: parsedStyle, autofocus: autoFocus() ? \'autofocus\' : null},\n\t\t\t\t\tojComponent: {\n\t\t\t\t\t\t\t\t\tcomponent: \'ojInputText\',\n\t\t\t\t\t\t\t\t \ttitle: hint,\n\t\t\t\t\t\t\t\t \tplaceholder: placeHolder,\n\t\t\t\t\t\t\t\t \tvalidators: $parent.validators,\n\t\t\t\t\t\t\t\t \treadOnly: $parent.readOnly() || readonly(),\n\t\t\t\t\t\t\t\t \trequired: required,\n\t\t\t\t\t\t\t\t \tinvalidComponentTracker: $parent.tracker,\n\t\t\t\t\t\t\t\t \tvalue: $parent.value,\n\t\t\t\t\t\t\t\t \trawValue: $parent.rawValue,\n\t\t\t\t\t\t\t\t \tdisabled: disabled,\n\t\t\t\t\t\t\t\t \thelp: {definition: help()}\n\t\t\t\t\t\t\t\t }, handleEvents: $parent"/>\n<!-- /ko -->';});


define('text!rendererLinkControl',[],function () { return '<!-- ko with: properties -->\r\n<div>\r\n\t<a class="anchorLink" data-bind="text: (labelVal() === \'\') ? defaultLabel : labelVal  , attr: {id: $parents[1].domIdPrefix + $parents[1].id, name: $parents[1].name, style: parsedStyle,\r\n\t\t href : ($parent.value() === \'\') ? undefined : $parent.value ,\r\n\t\t target: anchor() ? null : target},  handleEvents: $parent" />\r\n\r\n</div>\r\n<!-- /ko -->';});


define('text!rendererMessageControl',[],function () { return '<!-- ko with: properties -->\n    <!-- ko template: {name: \'renderer\' +  type()[0] + \'Template\', data: {properties: $data, message: $parent.value()}} -->\n    <!-- /ko -->\n<!-- /ko -->';});


define('text!rendererMessageTypeParagraphTemplate',[],function () { return '<p data-bind="attr: {id: $parents[1].domIdPrefix + $parents[1].id, name: $parents[1].name, style: properties.parsedStyle}, text: message"></p>';});


define('text!rendererMessageTypeHeading1Template',[],function () { return '<h1 data-bind="attr: {id: $parents[1].domIdPrefix + $parents[1].id, name: $parents[1].name, style: properties.parsedStyle}, text: message"></h1>';});


define('text!rendererMessageTypeHeading2Template',[],function () { return '<h2 data-bind="attr: {id: $parents[1].domIdPrefix + $parents[1].id, name: $parents[1].name, style: properties.parsedStyle}, text: message"></h2>';});


define('text!rendererMessageTypeHeading3Template',[],function () { return '<h3 data-bind="attr: {id: $parents[1].domIdPrefix + $parents[1].id, name: $parents[1].name, style: properties.parsedStyle}, text: message"></h3>';});


define('text!rendererMessageTypeHeading4Template',[],function () { return '<h4 data-bind="attr: {id: $parents[1].domIdPrefix + $parents[1].id, name: $parents[1].name, style: properties.parsedStyle}, text: message"></h4>';});


define('text!rendererMessageTypeHeading5Template',[],function () { return '<h5 data-bind="attr: {id: $parents[1].domIdPrefix + $parents[1].id, name: $parents[1].name, style: properties.parsedStyle}, text: message"></h5>';});


define('text!rendererMessageTypeHeading6Template',[],function () { return '<h6 data-bind="attr: {id: $parents[1].domIdPrefix + $parents[1].id, name: $parents[1].name, style: properties.parsedStyle}, text: message"></h6>';});


define('text!rendererNumberControl',[],function () { return '<!-- ko with: properties -->\n<div data-bind="template:{afterRender: $parent.afterRenderNumber}">\n    <label data-bind="attr: {for:$parent.domIdPrefix + $parent.id}, text: label, style: {\'color\': formattedStyle().labelColor, \'font-size\': formattedStyle().labelSize}"></label>\n    <input data-bind="attr: {id: $parent.domIdPrefix + $parent.id, name: $parent.name, autocomplete: autoComplete() ? \'on\' : \'off\', style: parsedStyle, autofocus: autoFocus() ? \'autofocus\' : null},\n                        ojComponent: {\n                                        component: \'ojInputNumber\',\n                                        title: hint,\n                                        validators: $parent.validators,\n                                        readOnly: $parent.readOnly() || readonly(),\n                                        required: required,\n                                        max: maxValue,\n                                        min: minValue,\n                                        step: step,\n                                        invalidComponentTracker: $parent.tracker,\n                                        value: $parent.value,\n                                        rawValue: $parent.rawValue,\n                                        disabled: $parent.readOnly() ? !$parent.readOnly() : disabled(),\n                                        help: {definition: help()}\n                                     }, handleEvents: $parent"/>\n</div>\n<!-- /ko -->';});


define('text!rendererRadioButtonControl',[],function () { return '<!-- ko with: properties -->\n<label data-bind ="attr: {for: $parent.domIdPrefix + $parent.id, id: $parent.id + \'_mainLabel\'}, text: label, style: {\'color\': formattedStyle().labelColor, \'font-size\': formattedStyle().labelSize}"></label>\n<!-- ko if: !optionsFeed().optionsResolver().loading() -->\n<div data-bind = "attr: {id: $parent.domIdPrefix + $parent.id, style: parsedStyle}, ojComponent: {\n    component: \'ojRadioset\',\n    validators: $parent.validators,\n\tdisabled: $parent.readOnly() ||disabled(),\n\thelp: {definition: help()},\n\tmessagesCustom: optionsFeed().optionsResolver().customValidationMessages(),\n\tvalue: $parent.value}, handleEvents: $parent,\n    refresh: computedOptions">\n    <!-- ko foreach: computedOptions -->\n\t    <span class ="oj-choice-row" data-bind="css: {\'oj-choice-row-inline\': $parent.inline() === true}">\n\t      <input data-bind="value: value, attr:{id: $parents[1].id + $index(), name: $parents[1].name, autofocus: $parent.autoFocus()[0] === value ? \'autofocus\' : null}" type ="radio">\n\t      <label data-bind="for: $parents[1].id + $index(), text: label, style: {\'fontSize\': $parent.formattedStyle().fontSize}"></label>\n\t    </span>\n    <!-- /ko -->\n</div>\n<!-- /ko -->\n\n<!-- ko if: optionsFeed().optionsResolver().loading -->\n<div class="loadingControl" data-bind="ojComponent:{\n\t  component: \'ojProgressbar\',\n\t  value: -1}">\n</div >\n<!-- /ko -->\n\n<!-- /ko -->';});


define('text!rendererSelectControl',[],function () { return '<!-- ko with: properties -->\n<div data-bind="template:{afterRender: $parent.afterRenderSelect}">\n    <label data-bind="attr: {for: $parent.domIdPrefix + $parent.id}, text: label, style: {\'color\': formattedStyle().labelColor, \'font-size\': formattedStyle().labelSize}"></label>\n    <!-- ko if: !optionsFeed().optionsResolver().loading() -->\n\n    <!-- ko template: multiple() ? \'rendererMultiSelectTemplate\' : \'rendererSingleSelectTemplate\'-->\n    <!-- /ko -->\n    <!-- /ko -->\n</div>\n\n<!-- ko if: optionsFeed().optionsResolver().loading -->\n<div class="loadingControl" data-bind="ojComponent:{\n\t  component: \'ojProgressbar\',\n\t  value: -1}">\n</div >\n<!-- /ko -->\n\n<!-- /ko -->';});


define('text!rendererSingleSelectTemplate',[],function () { return '<select data-bind="attr: {autofocus: autoFocus() ? \'autofocus\' : null, id: $parent.domIdPrefix + $parent.id, name: $parent.name}, ojComponent: {component: \'ojSelect\',\n                                    disabled: $parent.readOnly() ||disabled(),\n                                    title: hint,\n                                    help: {\n                                        definition: help()\n                                    },\n                                    placeholder: placeHolder,\n                                    required: required,\n                                    value: $parent.value,\n                                    rawValue: $parent.rawValue,\n                                    invalidComponentTracker: $parent.tracker,\n                                    messagesCustom: optionsFeed().optionsResolver().customValidationMessages(),\n                                    validators: $parent.validators}, handleEvents: $parent">\n    <!-- ko foreach: computedOptions() -->\n        <option data-bind="value: value, text:label"></option>\n    <!-- /ko -->\n</select>';});


define('text!rendererMultiSelectTemplate',[],function () { return '<select data-bind="attr: {autofocus: autoFocus() ? \'autofocus\' : null, id: $parent.domIdPrefix + $parent.id, name: $parent.name}, ojComponent: {component: \'ojSelect\',\n                                    disabled: $parent.readOnly() ||disabled(),\n                                    title: hint,\n                                    placeholder: placeHolder,\n                                    help: {\n                                        definition: help()\n                                    },\n                                    required: required,\n                                    value: $parent.value,\n                                    rawValue: $parent.rawValue,\n                                    multiple: true,\n                                    invalidComponentTracker: $parent.tracker,\n                                    messagesCustom: optionsFeed().optionsResolver().customValidationMessages(),\n                                    validators: $parent.validators}, handleEvents: $parent">\n    <!-- ko foreach: computedOptions() -->\n        <option data-bind="value: value, text:label"></option>\n    <!-- /ko -->\n</select>';});


define('text!rendererTextAreaControl',[],function () { return '<!-- ko with: properties -->\r\n<label data-bind="attr: {for: $parent.domIdPrefix + $parent.id}, text: label, style: {\'color\': formattedStyle().labelColor, \'font-size\': formattedStyle().labelSize}"></label>\r\n<textarea data-bind="attr: {id: $parent.domIdPrefix + $parent.id, name: $parent.name, autocomplete: autoComplete() ? \'on\' : \'off\', autofocus: autoFocus() ? \'autofocus\' : null, rows: rows, style: parsedStyle},\r\n                    ojComponent: {\r\n                        component: \'ojTextArea\',\r\n                        title: hint,\r\n                        placeholder: placeHolder,\r\n                        validators: $parent.validators,\r\n                        readOnly: $parent.readOnly() || readonly(),\r\n                        required: required,\r\n                        value: $parent.value,\r\n                        rawValue: $parent.rawValue,\r\n                        disabled: disabled,\r\n                        invalidComponentTracker: $parent.tracker,\r\n                        help: {\r\n                            definition: help()\r\n                            }\r\n                        }, handleEvents: $parent"></textarea>\r\n<!-- /ko -->';});


define('text!rendererTextControl',[],function () { return '<!-- ko with: properties -->\r\n<label data-bind="attr: {for: $parent.domIdPrefix + $parent.id}, text: label, style: {\'color\': formattedStyle().labelColor, \'font-size\': formattedStyle().labelSize}"></label>\r\n<input data-bind="attr: {id: $parent.domIdPrefix + $parent.id, name: $parent.name, autofocus: autoFocus() ? \'autofocus\' : null, autocomplete: autoComplete() ? \'on\' : \'off\', style: parsedStyle},\r\n\t\t\t\t\tojComponent: {\r\n\t\t\t\t\t\t\t\t\tcomponent: \'ojInputText\',\r\n\t\t\t\t\t\t\t\t \ttitle: hint,\r\n\t\t\t\t\t\t\t\t \tplaceholder: placeHolder,\r\n\t\t\t\t\t\t\t\t \tvalidators: $parent.validators,\r\n\t\t\t\t\t\t\t\t \treadOnly: $parent.readOnly() || readonly(),\r\n\t\t\t\t\t\t\t\t \trequired: required,\r\n\t\t\t\t\t\t\t\t \tvalue: $parent.value,\r\n\t\t\t\t\t\t\t\t \tdisabled: disabled,\r\n\t\t\t\t\t\t\t\t \thelp: {definition: help()},\r\n\t\t\t\t\t\t\t\t \trawValue: $parent.rawValue,\r\n\t\t\t\t\t\t\t\t \tinvalidComponentTracker: $parent.tracker\r\n\t\t\t\t\t\t\t\t }, handleEvents: $parent"/>\r\n<!-- /ko -->';});


define('text!rendererTimeControl',[],function () { return '<!-- ko with: properties -->\n<div data-bind="template:{afterRender: $parent.afterRenderTime}">\n    <label data-bind="attr: {for: $parent.domIdPrefix + $parent.id}, text: label, style: {\'color\': formattedStyle().labelColor, \'font-size\': formattedStyle().labelSize}"></label>\n    <input data-bind="attr: {id: $parent.domIdPrefix + $parent.id, name: $parent.name, style: parsedStyle, autofocus: autoFocus() ? \'autofocus\' : null},\n                        ojComponent: {component: \'ojInputTime\',\n                            validators: $parent.validators,\n                            disabled: disabled,\n                            placeholder: placeHolder,\n                            readOnly: $parent.readOnly() || readonly(),\n                            required: required,\n                            value: $parent.value,\n                            rawValue: $parent.rawValue,\n                            max: maxValue,\n                            min: minValue,\n                            invalidComponentTracker: $parent.tracker,\n                            help: {definition: help()},\n                            timePicker: {\n                                timeIncrement: step()[0]\n                            }},\n                        }, handleEvents: $parent"/>\n</div>\n<!-- /ko -->';});


define('text!rendererUrlControl',[],function () { return '<!-- ko with: properties -->\n<label data-bind="attr: {for: $parent.domIdPrefix + $parent.id}, text: label, style: {\'color\': formattedStyle().labelColor, \'font-size\': formattedStyle().labelSize} "></label>\n<input data-bind="attr: {id: $parent.domIdPrefix + $parent.id, name: $parent.name, autocomplete: autoComplete() ? \'on\' : \'off\', style: parsedStyle, autofocus: autoFocus() ? \'autofocus\' : null},\n\t\t\t\t\tojComponent: {\n\t\t\t\t\t\t\t\t\tcomponent: \'ojInputText\',\n\t\t\t\t\t\t\t\t \ttitle: hint,\n\t\t\t\t\t\t\t\t \tplaceholder: placeHolder,\n\t\t\t\t\t\t\t\t \tvalidators: $parent.validators,\n\t\t\t\t\t\t\t\t \treadOnly: $parent.readOnly() || readonly(),\n\t\t\t\t\t\t\t\t \trequired: required,\n\t\t\t\t\t\t\t\t \tvalue: $parent.value,\n\t\t\t\t\t\t\t\t \trawValue: $parent.rawValue,\n\t\t\t\t\t\t\t\t \tinvalidComponentTracker: $parent.tracker,\n\t\t\t\t\t\t\t\t \tdisabled: disabled,\n\t\t\t\t\t\t\t\t \thelp: {definition: help()}\n\t\t\t\t\t\t\t\t }, handleEvents: $parent"/>\n<!-- /ko -->';});


define('text!rendererPhoneControl',[],function () { return '<!-- ko with: properties -->\n<label data-bind="attr: {for : $parent.domIdPrefix + $parent.id}, text: label, style: {\'color\': formattedStyle().labelColor, \'font-size\': formattedStyle().labelSize}"></label>\n<input data-bind="attr: {id: $parent.domIdPrefix + $parent.id, name: $parent.name, autocomplete: autoComplete() ? \'on\' : \'off\', style: parsedStyle, autofocus: autoFocus() ? \'autofocus\' : null},\n\t\t\t\t\tojComponent: {\n\t\t\t\t\t\t\t\t\tcomponent: \'ojInputText\',\n\t\t\t\t\t\t\t\t \tplaceholder: placeHolder,\n\t\t\t\t\t\t\t\t \ttitle: hint,\n\t\t\t\t\t\t\t\t \tvalidators: $parent.validators,\n\t\t\t\t\t\t\t\t \treadOnly: $parent.readOnly() ||readonly(),\n\t\t\t\t\t\t\t\t \trequired: required,\n\t\t\t\t\t\t\t\t \tvalue: $parent.value,\n\t\t\t\t\t\t\t\t \trawValue: $parent.rawValue,\n\t\t\t\t\t\t\t\t \tdisabled: disabled,\n\t\t\t\t\t\t\t\t \thelp: {definition: help()},\n\t\t\t\t\t\t\t\t }, handleEvents: $parent"/>\n<!-- /ko -->\n';});


define('text!rendererImageControl',[],function () { return '<!-- ko with: properties -->\n<label class=\'oj-label\' data-bind="attr: {for : $parent.domIdPrefix + $parent.id}, text: label, style: {\'color\': formattedStyle().labelColor, \'font-size\': formattedStyle().labelSize}"></label>\n<img class="image-control" data-bind="attr: {\n                    id: $parent.domIdPrefix + $parent.id,\n                    name: $parent.name,\n                    style: parsedStyle,\n                    alt : alt,\n                    src: $parent.value}, handleEvents: $parent"/>\n\n<!-- /ko -->\n\n\n';});


define('text!rendererFormReferenceControl',[],function () { return '<!-- ko with: properties -->\n    <!-- ko if: $parent.isValidReference() -->\n        <label data-bind="attr: {for: $parent.domIdPrefix + $parent.id}, text: label, style: {\'color\': formattedStyle().labelColor, \'font-size\': formattedStyle().labelSize}" class="oj-label oj-component oj-inputtext-label"></label>\n        <form-renderer data-bind="attr: {id: $parent.domIdPrefix + $parent.id}" params="value: { form: $parent.selectedPresentation(),\n            controlBindings: control.context.payloadContext.getBindingControlFor(control),\n            bindingContext: control.context.payloadContext.getFullBindingContextFor(control),\n            config: $parent.getConfig()}, formId: $parent.properties.reference().formId,\n            onValidStateChange: $parent.onValidStateChange,\n            presentationId: $parent.properties.reference().presentationId,\n            loadedCallback: $parent.loadedCallback">\n        </form-renderer>\n    <!-- /ko -->\n\n    <!-- ko if: !$parent.isValidReference() -->\n        <label data-bind="text: label, style: {\'color\': formattedStyle().labelColor, \'font-size\': formattedStyle().labelSize}" class="oj-label oj-component oj-inputtext-label"></label>\n        <div class="broken-reference">\n            <span class="broken-reference-text" data-bind="text: $parent.msg.FAILED_TO_LOAD_FORM_CONTENT, attr: {title: $parent.msg.FAILED_TO_LOAD_FORM_CONTENT}">Failed to load form content</span>\n        </div>\n    <!-- /ko -->\n<!-- /ko -->';});


define('text!rendererVideoControl',[],function () { return '<!-- ko with: properties -->\n<label class="oj-label" data-bind="attr: {for: $parent.domIdPrefix + $parent.id}, text: label, style: {\'color\': formattedStyle().labelColor, \'font-size\': formattedStyle().labelSize}"></label>\n\n<div class="wrapper" data-bind="attr: {\'style\': parsedStyle}">\n    <iframe data-bind="attr: {\n                        id: $parent.domIdPrefix + $parent.id,\n                        name: $parent.name,\n                    allowfullscreen : allowFullScreen() ? \'allowfullscreen\' : null,\n                    msallowfullscreen : allowFullScreen() ? \'msallowfullscreen\' : null,\n                    mozallowfullscreen : allowFullScreen() ? \'mozallowfullscreen\' : null,\n                    oallowfullscreen : allowFullScreen() ? \'oallowfullscreen\' : null,\n                    webkitallowfullscreen : allowFullScreen() ? \'webkitallowfullscreen\' : null,\n                    src: parsedVideoSrcLink\n                    }, handleEvents: $parent">\n    </iframe>\n</div>\n<!-- /ko -->\n';});


define('text!rendererIdentityControl',[],function () { return '<div data-bind="template:{afterRender: afterRenderIdentity}">\r\n    <label data-bind="attr: {for: domIdPrefix + id},\r\n                            text: properties.label,\r\n                            style: {\'color\': properties.formattedStyle().labelColor,\r\n                                \'font-size\': properties.formattedStyle().labelSize}"></label>\r\n    <select data-bind="attr: {autofocus: properties.autoFocus() ? \'autofocus\' : null,\r\n                            id: domIdPrefix + id, name: name}, ojComponent: ojIdentityObj, handleEvents: $parent">\r\n    </select>\r\n</div>';});


define('text!rendererTemplate',[],function () { return '<div class="oj-row form-container" id="form-renderer-container" data-bind="subscribe:{afterRender: registerCustomEvents, beforeRemove: detachCustomListeners}, clean: rendererContext.getScope()">\n    <div class="oj-sm-12 oj-md-12 oj-col">\n        <form id="rForm" class="form-horizontal" role="form">\n            <div class="canvas-container">\n                <div class="canvas" data-bind="with: form()">\n                    <div id="creatorLoading" class="spinnerContainer" style="display: none">\n                        <div id="spinner" class="spinner">\n                            <div id="bounce1" class="spinner__bounce spinner-object spinner-object-1"></div>\n                            <div id="bounce2" class="spinner__bounce spinner-object spinner-object-2"></div>\n                            <div id="bounce3" class="spinner__bounce spinner-object spinner-object-3"></div>\n                        </div>\n                    </div>\n                    <div class="canvas__header"></div>\n                    <div class="canvas__content oj-panel js-renderer-container"\n                         data-bind="style: {\'border-color\' : properties.borderColor ? properties.borderColor() : \'null\',\n                                                                                         \'border-width\': properties.borderWidth ? properties.borderWidth() : \'null\',\n                                                                                         \'border-style\' : properties.borderStyle? properties.borderStyle() : \'null\',\n                                                                                         \'background-color\' : properties.backgroundColor? properties.backgroundColor() : \'null\'}">\n                        <!--  if: shouldRender -->\n                        <div data-bind="asyncTemplate:{name: \'rendererControl\', foreach: controls(), afterLazyRenderAll: afterRenderingRowControls.bind($data), pageSize: 1, hideLoading: true}"></div>\n                        <!-- / -->\n                    </div>\n                    <div class="canvas__footer"></div>\n                </div>\n            </div>\n        </form>\n    </div>\n</div>';});


define('text!rendererPanelControl',[],function () { return '<div class="oj-row panel" data-bind="attr: {style: $data.properties.parsedStyle}" style="width:100%; min-height: 50px;">\n    <label class="oj-label" data-bind="text:  $data.properties.label, visible: $data.properties.label() !== \'\'"></label>\n    <div data-bind="asyncTemplate: {name:\'rendererPanelItem\', foreach: $data.controls(), as: \'control\', pageSize: 2, afterLazyRenderAll: context.registerAsyncTemplate(context, $data.controls())}"></div>\n</div>';});


define('text!rendererSectionControl',[],function () { return '<div class="oj-row panel" style="width:100%; min-height: 50px;" data-bind="ojComponent: {component: \'ojCollapsible\',\n    expanded: $data.properties.expanded}, attr: {id: \'section-\' + id, style: $data.properties.parsedStyle}, handleEvents: $data" >\n    <div style="display: flex;" data-bind="template: { name: \'renderer\' + properties.headerType()[0] + \'Template\', data: {properties: properties, message: properties.label }}, css:{isContentInvalid:!isValid()}"></div>\n\n        <!-- ko if: $data.renderContent -->\n    <div data-bind="asyncTemplate: {name:\'rendererSectionRow\', foreach: $data.controls(), pageSize: 2, afterLazyRenderAll: $data.registerAsyncTemplate(context, $data.controls()),hideLoading: true}">\n    </div>\n    <!-- /ko -->\n</div>\n';});


define('text!rendererTableControl',[],function () { return '\n\n<div style="height: 25px; z-index: 1000" data-bind="visible: properties.canAddDelete">\n    <button type="button" class="definition-action delete remove-row" data-bind="event: {click: removeSelectedRow.bind($data), touchend: removeSelectedRow.bind($data)},\n    disable: (selectedRows().length === 0 || readOnly()), css: {disabled: (selectedRows().length === 0 || readOnly())}">\n        <actionable-icon params="{icon: removeColumnIcon, styleClass:  \'definition-img\', alt: msg.DELETE}"></actionable-icon>\n    </button>\n    <button type="button" class="definition-action add add-row" data-bind="disable: (!canAddRows() || readOnly()), css: {disabled: (!canAddRows() || readOnly())},\n    event:{click: addRow.bind($data),touchend: addRow.bind($data)}">\n        <actionable-icon params="{icon: addColumnIcon, styleClass:  \'definition-img\', alt: msg.CREATE}"></actionable-icon>\n    </button>\n</div>\n\n<div class="oj-table oj-table-container table-container" style="width: 100%; max-height: 100%; table-layout: fixed">\n    <label class="oj-label" data-bind="text:  properties.label, visible: properties.label() !== \'\', style: {\'color\': properties.formattedStyle().labelColor, \'font-size\': properties.formattedStyle().labelSize}"></label>\n    <table class="table-control table-control-renderer oj-table-element">\n        <thead class="oj-table-header">\n        <tr class="oj-table-header-row">\n            <th style="width: 10px"></th>\n            <!-- ko foreach: controls -->\n            <th class="oj-table-column-header-cell" data-bind="attr:{title: properties.label}, style: {\'width\': properties.formattedStyle().tableColumnWidth}">\n                <div class="oj-table-column-header">\n                    <div class="oj-table-column-header-text" data-bind="text: properties.label"></div>\n                </div>\n            </th>\n            <!-- /ko -->\n        </tr>\n        </thead>\n        <tbody class="oj-table-body" data-bind="css: {hideTableLabels: properties.hideLabels()}, asyncTemplate:{name:\'rendererTableRow\', foreach: dataSource, pageSize: 5, afterLazyRenderAll: context.registerAsyncTemplate(context, dataSource), hideLoading: true}">\n        </tbody>\n    </table>\n    <!-- ko if: dataSource().length === 0 -->\n    <div class="oj-table-body-row oj-table-hgrid-lines" style="padding-top: 20px">\n        <span style="padding: 5px;" data-bind="text: msg.NO_ROWS"></span>\n    </div>\n    <!-- /ko -->\n    <!-- ko if: dataSource().length > properties.maxRows() -->\n    <div class="oj-table-body-row oj-table-hgrid-lines" style="padding-top: 20px">\n        <span style="padding: 5px;" data-bind="text: StringUtils.format(msg.TOO_MANY_ROWS, properties.maxRows(), dataSource().length)"></span>\n    </div>\n    <!-- /ko -->\n</div>\n\n<script type="text/html" id="renderer-table-cell">\n    <!-- ko if: controls().length > 0 -->\n    <!-- ko with: controls()[0] -->\n    <div class="oj-row">\n        <div data-bind="attr: { id: \'renderer-control-\' + id }">\n            <div data-bind="template: {name: controlTemplate, data: $data, as: \'control\', afterRender: $data.afterRender}, visible: !properties.hide()"></div>\n        </div>\n    </div>\n    <!-- /ko -->\n    <!-- /ko -->\n</script>';});


define('text!rendererRepeatableSectionControl',[],function () { return '\n\n<div data-bind="visible: properties.canAddDelete" style="z-index: 1000">\n    <button type="button" class="definition-action delete remove-row" data-bind="event: {click: removeSelectedRow.bind($data), touchend: removeSelectedRow.bind($data)},\n    disable: (selectedRows().length === 0 || readOnly()), css: {disabled: (selectedRows().length === 0 || readOnly())}">\n        <actionable-icon params="{icon: removeColumnIcon, styleClass:  \'definition-img\', alt: msg.DELETE}"></actionable-icon>\n    </button>\n    <button type="button" class="definition-action add add-row" data-bind="disable: (!canAddRows() || readOnly()), css: {disabled: (!canAddRows() || readOnly())},\n    event: {click: addRow.bind($data), touchend: addRow.bind($data)}">\n        <actionable-icon params="{icon: addColumnIcon, styleClass:  \'definition-img\', alt: msg.CREATE}"></actionable-icon>\n    </button>\n</div>\n\n<div data-bind="asyncTemplate:{name:\'rendererRepeatableRow\', foreach: dataSource, pageSize: 1, afterLazyRenderAll: context.registerAsyncTemplate(context, dataSource), hideLoading: true}">\n</div>\n\n<!-- ko if: dataSource().length === 0 -->\n<div class="oj-panel oj-row panel repeatable-section" style="padding: 20px 20px 20px 30px;">\n    <span data-bind="text: msg.NO_ROWS"></span>\n</div>\n<!-- /ko -->\n<!-- ko if: dataSource().length > properties.maxRows() -->\n<div class="oj-panel oj-row panel repeatable-section" style="padding: 20px 20px 20px 30px;">\n    <span data-bind="text: StringUtils.format(msg.TOO_MANY_ROWS, properties.maxRows(), dataSource().length)"></span>\n</div>\n<!-- /ko -->\n';});


define('text!rendererTabControl',[],function () { return '<div class="oj-row panel" style="width:100%; min-height: 50px;"\n     data-bind="asyncTemplate: {name:\'rendererSectionRow\', foreach: $data.controls(), pageSize: 2, afterLazyRenderAll: context.registerAsyncTemplate(context, $data.controls()), hideLoading: true}">\n</div>\n\n';});


define('text!rendererTableRow',[],function () { return '<tr class="oj-table-body-row oj-table-hgrid-lines"\n    data-bind="css:{\'oj-selected\': isRowSelected},\n                attr: {id: \'renderer-control-\' + $parent.domIdPrefix + id}"> <!--oj-hover && oj-selected -->\n    <td>\n        <input type="checkbox" data-bind="checked: isRowSelected"/>\n    </td>\n    <!-- ko foreach: controls -->\n    <td class="table-cell oj-table-data-cell oj-table-vgrid-lines" data-bind="\n                css:{\'oj-selected\': $parent.isRowSelected},\n                template:{name: \'renderer-table-cell\', data: $data}"></td>\n    <!-- /ko -->\n</tr>';});


define('text!rendererRepeatableRow',[],function () { return '<div class="oj-panel oj-row panel repeatable-section" data-bind="attr: {style: $parent.properties.parsedStyle, id: \'renderer-control-\' + $parent.domIdPrefix + id},\n            css:{\'oj-selected\': isRowSelected}" style="width:100%; min-height: 50px;">\n    <span>\n        <input type="checkbox" data-bind="checked: isRowSelected"/>\n        <label class="oj-label" data-bind="text:  properties.label, visible: properties.label() !== \'\',style: {\'color\': $parent.properties.formattedStyle().labelColor, \'font-size\': $parent.properties.formattedStyle().labelSize}"></label>\n    </span>\n    <div data-bind="asyncTemplate: {name:\'rendererRepeatableItem\', foreach: $data.controls(), pageSize: 2, afterLazyRenderAll: context.registerAsyncTemplate(context, $data.controls())}"></div>\n</div>';});


define('text!columnControl',[],function () { return '<div class="oj-col" data-bind="css: $parent.columnSpan.getStyle($data, $data.selectedMedia().value)">\n    <div class="control-container-renderer" data-bind="attr: { id: \'renderer-control-\' + domIdPrefix + $data.id }">\n        <div data-bind="template: {name: $data.controlTemplate, data: $data, afterRender: $data.afterRender}, visible: !$data.properties.hide(), style: {\'text-align\' : $data.properties.formattedStyle().controlAlign}, css: $data.properties.formattedStyle().controlClassName"></div>\n    </div>\n</div>';});


define('text!rendererSectionRow',[],function () { return '<div data-bind="visible: !$data.properties.hide() || $data.properties.visible && $data.properties.visible()">\n    <div data-bind="attr: { id: \'renderer-control-\' + domIdPrefix + $data.id }">\n        <div data-bind="template: {name: $data.controlTemplate, data: $data, afterRender: $data.afterRender}, style: {\'text-align\' : $data.properties.formattedStyle().controlAlign}, css: $data.properties.formattedStyle().controlClassName"></div>\n    </div>\n</div>';});


define('text!rendererPanelItem',[],function () { return '<div data-bind="css: $parent.colStyle($data, $data.selectedMedia().value)">\n    <div data-bind="attr: { id: \'renderer-control-\' + domIdPrefix + $data.id }">\n        <div data-bind="template: {name: $data.controlTemplate, data: $data, afterRender: $data.afterRender}, visible: !$data.properties.hide(), style: {\'text-align\' : $data.properties.formattedStyle().controlAlign}, css: $data.properties.formattedStyle().controlClassName"></div>\n    </div>\n</div>';});


define('text!rendererRepeatableItem',[],function () { return '<div data-bind="css: $parents[1].colStyle($data, $data.selectedMedia().value)">\n    <div data-bind="attr: { id: \'renderer-control-\' + domIdPrefix + $data.id }">\n        <div data-bind="template: {name: $data.controlTemplate, data: $data, afterRender: $data.afterRender}, visible: !$data.properties.hide()"></div>\n    </div>\n</div>\n\n<!--TODO check how to merge with rendererPanelItem-->';});


define('text!rendererTabContainerControl',[],function () { return '<!-- tablet and desktop version -->\n<div data-bind="ifMedia: \'oj-md\'" data-bind="handleEvents: $data">\n    <div class="tab-container" data-bind="ojComponent:{component: \'ojTabs\', disabledTabs: $data.disabledTabs, \'selected\': properties.selectedPosition}">\n        <!-- tab bar -->\n        <ul>\n            <!-- ko foreach: { data: $data.controls(), as: \'control\'} -->\n                <li data-bind="visible: !control.properties.hide()">\n                    <span data-bind="text: control.properties.label, css:{isContentInvalid:!control.isValid()}"></span>\n                </li>\n            <!-- /ko -->\n        </ul>\n\n        <!-- tab contents -->\n        <!-- ko foreach: { data: $data.controls(), as: \'control\'} -->\n            <div data-bind="visible: !control.properties.hide(), style: {\'text-align\' : control.properties.formattedStyle().controlAlign}, css: control.properties.formattedStyle().controlClassName, handleEvents: control">\n                <!-- ko if: control.rendered -->\n                <div data-bind="template: {name: control.controlTemplate, data: control, afterRender: control.afterRender}"></div>\n                <!-- /ko -->\n            </div>\n        <!-- /ko -->\n    </div>\n</div>\n\n<!-- mobile version (accordion) -->\n<div data-bind="ifMedia: \'oj-sm-only\'">\n    <div class="tab-container" data-bind="ojComponent: {component: \'ojAccordion\', \'expanded\': properties.selectedPositionAsArrayComputed}">\n        <!-- ko foreach: { data: $data.controls(), as: \'control\'} -->\n        <div data-bind="visible: !control.properties.hide(), ojComponent: {component: \'ojCollapsible\', disabled: control.properties.disabled}">\n            <span data-bind="text: control.properties.label"></span>\n            <div data-bind="style: {\'text-align\' : control.properties.formattedStyle().controlAlign}, css: control.properties.formattedStyle().controlClassName">\n                <!-- ko if: control.rendered -->\n                <div data-bind="template: {name: control.controlTemplate, data: control, afterRender: control.afterRender}"></div>\n                <!-- /ko -->\n            </div>\n        </div>\n        <!-- /ko -->\n    </div>\n</div>';});

/**
 * Copyright (c) 2014, 2016, Oracle and/or its affiliates.
 * The Universal Permissive License (UPL), Version 1.0
 */

define('ojidentity',['require','ojs/ojcore','jquery','ojs/ojeditablevalue'],function (require) {
	/**
	 * Copyright (c) 2014, Oracle and/or its affiliates.
	 * All rights reserved.
	 */

	/**
	 * @preserve Copyright 2012 Igor Vaynberg
	 *
	 * This software is licensed under the Apache License, Version 2.0 (the "Apache License") or the GNU
	 * General Public License version 2 (the "GPL License"). You may choose either license to govern your
	 * use of this software only upon the condition that you accept all of the terms of either the Apache
	 * License or the GPL License.
	 *
	 * You may obtain a copy of the Apache License and the GPL License at:
	 *
	 * http://www.apache.org/licenses/LICENSE-2.0
	 * http://www.gnu.org/licenses/gpl-2.0.html
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under the
	 * Apache License or the GPL Licesnse is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
	 * CONDITIONS OF ANY KIND, either express or implied. See the Apache License and the GPL License for
	 * the specific language governing permissions and limitations under the Apache License and the GPL License.
	 */
	/**
	 * @private
	 */
	var oj  = require('ojs/ojcore'),
	    $   = require('jquery');

	require('ojs/ojeditablevalue');

	var _IdentityUtils = {
		// native renderMode: marker class for generated options list
		GENERATED_OPTIONS_SELECTOR: "oj-select-options-generated",

		KEY: {
			TAB      : 9,
			ENTER    : 13,
			ESC      : 27,
			SPACE    : 32,
			LEFT     : 37,
			UP       : 38,
			RIGHT    : 39,
			DOWN     : 40,
			SHIFT    : 16,
			CTRL     : 17,
			ALT      : 18,
			PAGE_UP  : 33,
			PAGE_DOWN: 34,
			HOME     : 36,
			END      : 35,
			BACKSPACE: 8,
			DELETE   : 46,

			isControl: function (e) {
				var k = e.which;
				switch (k) {
					case _IdentityUtils.KEY.SHIFT:
					case _IdentityUtils.KEY.CTRL:
					case _IdentityUtils.KEY.ALT:
						return true;
				}
				if (e.metaKey || e.ctrlKey)
					return true;
				return false;
			},

			isFunctionKey: function (k) {
				k = k.which ? k.which : k;
				return k >= 112 && k <= 123;
			}
		},

		/**
		 * The default delay in milliseconds between when a keystroke occurs
		 * and when a search is performed to get the filtered options.
		 */
		DEFAULT_QUERY_DELAY: 70,

		ValueChangeTriggerTypes: {
			ENTER_PRESSED      : "enter_pressed",
			OPTION_SELECTED    : "option_selected",
			OPTION_REMOVED     : "option_removed",
			BLUR               : "blur",
			SEARCH_ICON_CLICKED: "search_icon_clicked"
		},

		lastMousePosition: {
			x: 0,
			y: 0
		},
		nextUid          : (function () {
			var counter = 1;
			return function () {
				return counter++;
			};
		}()),

		//TODO:
		scrollBarDimensions: null,

		//_IdentityUtils
		/*
		 * 4-10 times faster .each replacement
		 * it overrides jQuery context of element on each iteration
		 */
		each2: function (list, c) {
			var j = $.isFunction(list[0]) ? $(list[0]()) : $(list[0]),
			    i = -1,
			    l = list.length;
			while (
			++i < l &&
			(j.context = j[0] = ($.isFunction(list[0]) ? list[i]() : list[i])) &&
			c.call(j[0], i, j) !== false //i=index, j=jQuery object
				) {
			}
			;
			return list;
		},

		//_IdentityUtils
		measureScrollbar: function () {
			var $template = $("<div class='oj-listbox-measure-scrollbar'></div>");
			$template.appendTo('body'); // @HTMLUpdateOK
			var dim = {
				width : $template.width() - $template[0].clientWidth,
				height: $template.height() - $template[0].clientHeight
			};
			$template.remove();
			return dim;
		},

		//_IdentityUtils
		/*
		 * Splits the string into an array of values, trimming each value.
		 * An empty array is returned for nulls or empty
		 */
		splitVal: function (string, separator) {
			var val,
			    i,
			    l;
			if (string === null || string.length < 1)
				return [];
			val = string.split(separator);
			for (i = 0, l = val.length; i < l; i = i + 1)
				val[i] = $.trim(val[i]);
			return val;
		},

		//_IdentityUtils
		getSideBorderPadding: function (element) {
			return element.outerWidth(false) - element.width();
		},

		//_IdentityUtils
		installKeyUpChangeEvent: function (element) {
			var key = "keyup-change-value";
			element.on("keydown", function () {
				if ($.data(element, key) === undefined) {
					$.data(element, key, element.val());
				}
			});

			element.on("keyup", function (e) {
				if (e.which === _IdentityUtils.KEY.ENTER) {
					e.stopPropagation();
					return;
				}
				var val = $.data(element, key);
				if (val !== undefined && element.val() !== val) {
					$.removeData(element, key);
					element.trigger("keyup-change");
				}
			});
		},

		//_IdentityUtils
		/*
		 * filters mouse events so an event is fired only if the mouse moved.
		 *
		 * filters out mouse events that occur when mouse is stationary but
		 * the elements under the pointer are scrolled.
		 */
		installFilteredMouseMove: function (element) {
			element.on("mousemove", function (e) {
				var lastpos = _IdentityUtils.lastMousePosition;
				if (lastpos === undefined || lastpos.x !== e.pageX || lastpos.y !== e.pageY) {
					$(e.target).trigger("mousemove-filtered", e);
					_IdentityUtils.lastMousePosition.x = e.pageX;
					_IdentityUtils.lastMousePosition.y = e.pageY;
				}
			});
		},

		//_IdentityUtils
		thunk: function (formula) {
			var evaluated = false,
			    value;
			return function () {
				if (evaluated === false) {
					value     = formula();
					evaluated = true;
				}
				return value;
			};
		},

		//_IdentityUtils
		_focus: function ($el) {
			if ($el[0] === document.activeElement)
				return;

			/* set the focus in a timeout - that way the focus is set after the processing
			 of the current event has finished - which seems like the only reliable way
			 to set focus */
			window.setTimeout(function () {
				var el  = $el[0],
				    pos = $el.val().length,
				    range;
				$el.focus();

				/* make sure el received focus so we do not error out when trying to manipulate the caret.
				 sometimes modals or others listeners may steal it after its set */
				if ($el.is(":visible") && el === document.activeElement) {
					/* after the focus is set move the caret to the end, necessary when we val()
					 just before setting focus */
					if (el.setSelectionRange)
						el.setSelectionRange(pos, pos);
					else if (el.createTextRange) {
						range = el.createTextRange();
						range.collapse(false);
						range.select();
					}
				}
				// Set a 40 timeout. In voiceover mode, previous partial value was read. See
				// This happens on ios Safari only, not Chrome. Setting a 40 timeout fixes the issue
				// on Safari in voiceover.
			}, 40);
		},

		//_IdentityUtils
		getCursorInfo: function (el) {
			el         = $(el)[0];
			var offset = 0;
			var length = 0;
			if ('selectionStart' in el) {
				offset = el.selectionStart;
				length = el.selectionEnd - offset;
			} else if ('selection' in document) {
				el.focus(); //Fixed???
				var sel = document.selection.createRange();
				length  = document.selection.createRange().text.length;
				sel.moveStart('character', -el.value.length);
				offset = sel.text.length - length;
			}
			return {
				offset: offset,
				length: length
			};
		},

		//_IdentityUtils
		killEvent: function (event) {
			event.preventDefault();
			event.stopPropagation();
		},

		//_IdentityUtils
		killEventImmediately: function (event) {
			event.preventDefault();
			event.stopImmediatePropagation();
		},

		//_IdentityUtils
		defaultEscapeMarkup: function (markup) {
			var replace_map = {
				'\\': '&#92;',
				'&' : '&amp;',
				'<' : '&lt;',
				'>' : '&gt;',
				'"' : '&quot;',
				"'" : '&#39;'
			};

			return String(markup).replace(/[&<>"'\\]/g, //@HTMLUpdateOK
				function (match) {
					return replace_map[match];
				});
		},

		//_IdentityUtils
		/*
		 * Produces a query function that works with a local array
		 */
		local: function (options, optKeys) {
			var data = options, // data elements
			    dataText,
			    tmp,
			    // function used to retrieve the text portion of a data item that is matched against the search
			    text = function (item) {
				    return "" + item['label'];
			    };

			if ($.isArray(data)) {
				tmp  = data;
				data = {
					results: tmp
				};
			}
			if ($.isFunction(data) === false) {
				tmp  = data;
				data = function () {
					return tmp;
				};
			}
			var dataItem = data();
			//select with no options
			if (dataItem && dataItem.text) {
				text = dataItem.text;
				// if text is not a function we assume it to be a key name
				if (!$.isFunction(text)) {
					// we need to store this in a separate variable because in the next step data gets reset
					// and data.text is no longer available
					dataText = dataItem.text;
					text     = function (item) {
						return item[dataText];
					};
				}
			}
			return function (query) {
				var t        = query.term,
				    filtered = {
					    results: []
				    };

				// if optionsKeys is set, we need to do the key mapping, don't return
				if (t === "" && !optKeys) {
					query.callback(data());
					return;
				}

				if (data()) {
					_IdentityUtils.each2($(data().results), function (i, datum) {
						_IdentityUtils._processData(query, datum, filtered.results,
							optKeys, true, text);
					});
				}
				query.callback(filtered);
			};
		},

		// native renderMode
		cleanupResults: function (container) {
			container.children().remove();
			container.removeClass("oj-listbox-result-with-children");
		},

		//_IdentityUtils
		/*
		 * Produces a query function that works with a remote data
		 */
		remote: function (options, optKeys) {
			return function (query) {
				var context     = {}; //{"component": this.ojContext} : manpasin
				var self        = this;
				var processData = function (data) {
					var filtered     = {
						results: []
					};
					self.inputSearch = context.searchPattern;

					_IdentityUtils.each2($(data), function (i, datum) {
						_IdentityUtils._processData(query, datum, filtered.results, optKeys,
							false);
					});

					query.callback(filtered);
				};

				if (query.value) {
					processData(query.value);
				} else {
					var term = $.trim(query.term);
					if (term) {
						context["searchPattern"] = (term !== "*" ? "*" + query.term + "*" : term);
					}

					$.extend(true, context, {
						scope: this.defaultScope
					});

					if (!context.searchPattern) {
						processData(this.results || []);
						return;
					}
					if (this.inputSearch && this.inputSearch === context.searchPattern) {
						processData(this.results);
					} else {
						clearTimeout(this.queryTimer);
						this.queryTimer = setTimeout(function () {
							if (!self.loading.hasClass('identity-show-inline')) {
								self.loading.addClass('identity-show-inline');
							}
							options(context).then(function (data) {
								self.results = data && Array.isArray(data) ? data : [];
								processData(self.results);
								self.loading.removeClass('identity-show-inline');
								self.ojContext._setOption('messagesCustom', []);
							}).catch(function (error) {
								self.loading.removeClass('identity-show-inline');
								self.ojContext._setOption('messagesCustom', [new oj.Message(error)]);
							});
						}, 1000);
					}
				}
			};
		},

		//_IdentityUtils
		/*
		 * Maps the optionsKeys and options array and creates the array of
		 * Label-Value objects. If options array is local data then
		 * it filters the result array based on the term entered in the search field.
		 */
		_processData: function (query, datum, collection, keys, isLocal, text) {
			var group,
			    attr;

			var data = {};

			$.extend(true, data, datum[0]);

			// key mappings
			if (datum[0]['label'] && (keys && keys['label'] && keys['label'] !== 'label')) {
				data[keys['label']] = datum[0]['label'];
				delete data.label;
			}

			if (datum[0]['value'] && (keys && keys['value'] && keys['label'] !== 'value')) {
				data[keys['value']] = datum[0]['value'];
				delete data.value;
			}

			if (!data['children'] && (keys && keys['children'])) {
				data['children'] = data[keys['children']];
				delete data[keys['children']];
			}

			if (data['children']) {
				group = {};
				for (attr in data) {
					if (data.hasOwnProperty(attr))
						group[attr] = data[attr];
				}
				group.children = [];
				_IdentityUtils.each2($(data['children']), function (i, childDatum) {
					_IdentityUtils._processData(query, childDatum, group.children,
						((keys && keys['childKeys']) ? keys['childKeys'] : null),
						isLocal, text);
				});

				// - group labels participate in the filtering
				//Reverted. In the nested data case, group may be selectable. Without putting the
				//group data in the collection, we will find no match and new entry may be created for combobox
				if (!isLocal || group.children.length || query.matcher(query.term, group[keys['label']], data)) {
					collection.push(group);
				}
			} else {
				if (!isLocal || query.matcher(query.term, data[keys['label']], data)) {
					collection.push(data);
				}
			}
		},

		//_IdentityUtils
		/*
		 * Creates a new class
		 */
		clazz: function (SuperClass, methods) {
			var constructor = function () {
			};
			oj.Object.createSubclass(constructor, SuperClass, '');
			constructor.prototype = $.extend(constructor.prototype, methods);
			return constructor;
		},

		//_IdentityUtils
		LAST_QUERY_RESULT  : "last-query-result",
		getLastQueryResult : function (context) {
			var queryResult = $.data(context.container,
				context._classNm + "-" + _IdentityUtils.LAST_QUERY_RESULT);

			return queryResult;
		},
		saveLastQueryResult: function (context, queryResult) {
			$.data(context.container,
				context._classNm + "-" + _IdentityUtils.LAST_QUERY_RESULT, queryResult);
		}
	};

	var _AbstractOjIdentity = _IdentityUtils.clazz(Object, {
		//_AbstractOjIdentity
		_bind: function (func) {
			var self = this;
			return function () {
				func.apply(self, arguments);
			};
		},

		//_AbstractOjIdentity
		_init: function (opts) {
			var results,
			    search,
			    className       = this._classNm,
			    elemName        = this._elemNm,
			    resultsSelector = ".oj-listbox-results";

			this.ojContext = opts.ojContext;
			this.opts      = opts = this._prepareOpts(opts);
			this.id                = opts.id;
			this.headerInitialized = false;

			// destroy if called on an existing component
			if (opts.element.data(elemName) !== undefined &&
				opts.element.data(elemName) !== null) {
				opts.element.data(elemName)._destroy();
			}
			this.container = this._createContainer();

			// - ojselect - rootAttributes are not propagated to generated jet component
			var rootAttr     = this.opts.rootAttributes;
			this.containerId = (rootAttr && rootAttr.id) ?
				rootAttr.id :
			"ojChoiceId_" + (opts.element.attr("id") || "autogen" + _IdentityUtils.nextUid());

			this.containerSelector = "#" + this.containerId.replace(/([;&,\.\+\*\~':"\!\^#$%@\[\]\(\)=>\|])/g, '\\$1'); //@HTMLUpdateOK
			this.container.attr("id", this.containerId);
			// cache the body so future lookups are cheap
			this.body = _IdentityUtils.thunk(function () {
				return $("#__oj_zorder_container").length ? $("#__oj_zorder_container") : opts.element.closest("body");
			});
			this.container.attr("style", opts.element.attr("style"));
			this.elementTabIndex = this.opts.element.attr("tabindex");

			// 'opts.element' is initialized in _setup() menthod in component files
			// ojcombobox.js, ojselect.js and ojInputSearch.js.
			if (this.opts.showScopeFilter) {
				this.container.addClass('hasFilter');
				this.container.find(".oj-identity-filter").addClass('showFilter');
			}

			// swap container for the element
			this.opts.element
				.data(elemName, this)
				.attr("tabindex", "-1")
				.before(this.container); // @HtmlUpdateOk
			this.container.data(elemName, this);
			this.dropdown = this.container.find(".oj-listbox-drop");
			this.dropdown.data('ojlistbox', this);

			if (this.opts.showScopeFilter) {
				this.container.on('click', ".oj-identity-filter", $.proxy(this._showFilter, this));
			}

			this.opts.loading = this.container.find('.oj-identity-loading-container');

			// link the shared dropdown dom to the target component instance
			var containerId = this.containerId;
			this.dropdown.attr("data-oj-containerid", containerId);

			this.results = results = this.container.find(resultsSelector);
			this.results.on("click", _IdentityUtils.killEvent);
			// if html ul element is provided, use it instead
			if (opts['list'] && $('#' + opts['list']).is("ul")) {
				var dropdownList        = $('#' + opts['list']);
				this.dropdownListParent = dropdownList.parent();
				dropdownList.addClass("oj-listbox-results").attr("role", "listbox");
				this.results.replaceWith(dropdownList); //@HTMLUpdateOK
				this.results = results = this.container.find(resultsSelector);
				this.results.css("display", '');
			}

			if (className == "oj-select")
				search = this.container.find("input.oj-listbox-input");
			else
				search = this.container.find("input." + className + "-input");
			this.search = search;

			this.queryCount  = 0;
			this.resultsPage = 0;
			this.context     = null;

			// initialize the container
			this._initContainer();
			this.container.on("click", _IdentityUtils.killEvent);
			_IdentityUtils.installFilteredMouseMove(this.results);
			this.dropdown.on("mousemove-filtered touchstart touchmove touchend", resultsSelector, this._bind(this._highlightUnderEvent));
			// do not propagate change event from the search field out of the component
			$(this.container).on("change", "." + className + "-input", function (e) {
				e.stopPropagation();
			});
			$(this.dropdown).on("change", "." + className + "-input", function (e) {
				e.stopPropagation();
			});

			var self = this;
			_IdentityUtils.installKeyUpChangeEvent(search);
			search.on("keyup-change input paste", this._bind(this._updateResults));
			search.on("focus", function () {
				search.addClass(className + "-focused");

				if (className !== "oj-select")
					self.container.addClass("oj-focus");
			});
			search.on("blur", function () {
				search.removeClass(className + "-focused");

				if (className !== "oj-select")
					self.container.removeClass("oj-focus");
			});
			this.dropdown.on("mouseup", resultsSelector, this._bind(function (e) {
				var targetInst       = $(e.target);
				this._selectionEvent = e;
				if (targetInst.closest(".oj-listbox-result-selectable").length > 0) {
					var selected = false;
					if (this.opts.multiple && this.opts.selectAll && targetInst.hasClass("oj-identity-checkbox")) {
						var selectedValues = this.getVal();
						var data           = targetInst.closest(".oj-listbox-result").data(this._elemNm);
						var val            = selectedValues ? selectedValues.slice(0) : [];
						var context        = {
							optionMetadata: {
								"trigger": _IdentityUtils.ValueChangeTriggerTypes.OPTION_SELECTED
							}
						};

						if (!targetInst.hasClass("selected")) {
							val.push(data);

						} else {
							val.splice(this.opts.indexOf.call(val, data), 1);
							context.optionMetadata["trigger"] = _IdentityUtils.ValueChangeTriggerTypes.OPTION_REMOVED;
							targetInst.attr("checked", false);
						}
						if (this.opts.contains.call(this.opts.results, val)) {
							this.opts.checkAll.addClass("selected");
						} else {
							this.opts.checkAll.removeClass("selected");
						}
						targetInst.toggleClass("selected");
						this.setVal(val, e, context);
					} else {
						this._highlightUnderEvent(e);
						this._selectHighlighted(null, e);
					}
				} else if (this.opts.multiple && this.opts.selectAll && targetInst.hasClass("oj-identity-checkbox")) {
					var checkboxes     = targetInst.parent().nextAll().find(".oj-identity-checkbox");
					var self           = this;
					var selectedValues = this.getVal();
					var val            = selectedValues ? selectedValues.slice(0) : [];
					var dataList       = []
					var context        = {
						optionMetadata: {
							"trigger": _IdentityUtils.ValueChangeTriggerTypes.OPTION_SELECTED
						}
					};

					targetInst.toggleClass("selected")

					var allSelected = targetInst.hasClass("selected");

					checkboxes.each(function () {
						var data = $(this.parentNode).data(self._elemNm);
						allSelected ? val.push(data) : val.splice(self.opts.indexOf.call(val, data), 1);
						;
					});

					if (!allSelected) {
						context.optionMetadata["trigger"] = _IdentityUtils.ValueChangeTriggerTypes.OPTION_REMOVED;
						targetInst.attr("checked", false);
						checkboxes.removeClass("selected");
					} else {
						checkboxes.addClass("selected");
					}

					this.setVal(val, e, context);
				}
			}));
			// trap all mouse events from leaving the dropdown. sometimes there may be a modal that is listening
			// for mouse events outside of itself so it can close itself. since the dropdown is now outside the combobox's
			// dom it will trigger the popup close, which is not what we want
			this.dropdown.on("click mouseup mousedown", function (e) {
				e.stopPropagation();
			});
			if ($.isFunction(this.opts.initSelection)) {
				///support ko options-binding
				this._initSelection();
			}
			var disabled = opts.element.prop("disabled");
			if (disabled === undefined)
				disabled = false;
			this._enable(!disabled);
			var readonly = opts.element.prop("readonly");
			if (readonly === undefined)
				readonly = false;
			this._readonly(readonly);
			// Calculate size of scrollbar
			_IdentityUtils.scrollBarDimensions = _IdentityUtils.scrollBarDimensions ||
				_IdentityUtils.measureScrollbar();
			this.autofocus                     = opts.element.prop("autofocus");
			opts.element.prop("autofocus", false);
			if (this.autofocus)
				this._focus();
		},

		_showFilter: function (event) {
			var target = event.target;
			event      = $.Event(event);
			if (!this._enabled) {
				return;
			}
			if (!this.filterDropdown) {
				var self            = this;
				var filterList      = this.opts.scopesOptions || [];
				var uuid            = _IdentityUtils.nextUid();
				this.filterDropdown = $('<div class="oj-identity-filter-drop"></div>');

				this.filterDropdown.appendTo(document.body);
				this.filterDropdown.ojPopup();
				this.filterDropdown.ojPopup("option", {
					tail    : 'none',
					modality: 'modeless'
				});

				for (var i = 0, len = filterList.length; i < len; i++) {
					var item = $('<div><input type="radio" name="oj-identity-' + uuid + '" value="' + filterList[i].value + '" ' +
						((filterList[i].value == self.opts.defaultScope) ? 'checked ' : '') + '/> ' +
						filterList[i].label + '</div>');
					this.filterDropdown.append(item);
				}
				;

				this.filterDropdown.on('click', 'input', function () {
					self.opts.defaultScope = $(this).val();
				});

			}

			this.filterDropdown.ojPopup('open', target);
		},

		//_AbstractOjIdentity
		_clickAwayHandler: function (event) {

			var dropdown = this.dropdown,
			    self;

			if ($(event.target).closest(dropdown).length ||
				$(event.target).closest("#" + dropdown.attr("data-oj-containerid")).length)
				return;

			if (dropdown.length > 0) {
				self = dropdown.data('ojlistbox');
				if (self)
					self.close(event);
			}
		},

		//_AbstractOjIdentity
		_surrogateRemoveHandler: function () {
			if (this.dropdown) {
				this.dropdown.remove();
			}
		},

		//_AbstractOjIdentity
		_destroy: function () {
			var closeDelayTimer = this._closeDelayTimer;
			if (!isNaN(closeDelayTimer)) {
				delete this._closeDelayTimer;
				window.clearTimeout(closeDelayTimer);
			}

			var element = this.opts.element,
			    ojcomp  = element.data(this._elemNm);

			this.close();
			if (this.propertyObserver) {
				delete this.propertyObserver;
				this.propertyObserver = null;
			}

			// 'results' is initialized in _init() method and it can not be changed by an external developer.

			// clean up the ul list
			if (this.opts['list'] && this.results) {
				this._cleanupList(this.results);
				// Move to original parent
				if (this.dropdownListParent)
					this.dropdownListParent.append(this.results); // @HtmlUpdateOk
			}

			if (ojcomp !== undefined) {
				ojcomp.container.remove();
				ojcomp.dropdown.remove();
				element
					.removeAttr("aria-hidden")
					.removeData(this._elemNm)
					.off("." + this._classNm)
					.prop("autofocus", this.autofocus || false);
				if (this.elementTabIndex) {
					element.attr({
						tabindex: this.elementTabIndex
					});
				} else {
					element.removeAttr("tabindex");
				}
				element.show();
			}
		},

		//_AbstractOjIdentity
		/*
		 * Clean up the html list provided by app
		 */
		_cleanupList: function (list) {
			if (list && list.is("ul")) {
				list.removeClass("oj-listbox-results oj-listbox-result-sub");
				list.removeAttr("role");
				for (var i = list.children().length - 1; i >= 0; i--) {
					this._cleanupList($(list.children()[i]));
				}
			} else if (list.is("li")) {
				if (list.hasClass("oj-listbox-placeholder") ||
					list.hasClass("oj-listbox-no-results"))
					list.remove();

				// remove added li classes starts with oj-listbox-
				if (list.attr('class'))
					list.attr('class', list.attr('class').replace(/\oj-listbox-\S+/g, ''));

				// remove wrapping div
				var wrappingDiv = list.children(".oj-listbox-result-label");
				if (wrappingDiv)
					wrappingDiv.contents().unwrap();

				if (list.css('display') == 'none')
					list.css('display', '');

				this._cleanupList(list.children("ul"));
			}
		},

		//_AbstractOjIdentity
		/*
		 * Processes option/optgroup/li element and return data object
		 */
		_optionToData: function (element) {
			if (element.is("option")) {
				return {
					value   : element.prop("value"),
					label   : element.text(),
					element : element.get(),
					css     : element.attr("class"),
					disabled: element.prop("disabled"),
					locked  : (element.attr("locked") === "locked") || (element.data("locked") === true)
				};
			} else if (element.is("optgroup")) {
				return {
					label   : element.attr("label"),
					children: [],
					element : element.get(),
					css     : element.attr("class")
				};
			} else if (element.is("li")) {
				var itemLabel,
				    groupData    = null,
				    elemChildren = element.children();
				if (elemChildren && elemChildren.length > 0 && elemChildren.is("ul")) {
					itemLabel = element.attr("oj-data-label") ? element.attr("oj-data-label") :
						element.clone().children().remove().end().text().trim();
					groupData = [];
				} else {
					itemLabel = element.attr("oj-data-label") ? element.attr("oj-data-label") :
						element.text().trim();
				}

				return {
					value   : element.attr("oj-data-value"),
					label   : itemLabel,
					element : element.get(),
					css     : element.attr("class"),
					children: groupData
				};
			}
		},

		//_AbstractOjIdentity
		/*
		 * Prepares the option items to display in the drop down
		 */
		_prepareOpts: function (opts) {
			var element,
			    datalist,
			    self = this;

			// clone the options array if optionsKeys is specified
			if (opts['options'] && Array.isArray(opts['options']) && opts['optionsKeys'])
				opts['options'] = $.extend(true, [], opts['options']);

			element     = opts.element;
			var tagName = element.get(0).tagName.toLowerCase();
			if (tagName === "input" && element.attr("list")) {
				this.datalist = datalist = $('#' + element.attr("list"));
			}
			///ojselect
			else if (tagName === "select" && element.children().length > 0) {
				this.datalist = datalist = element;
			}
			// if html ul list is provided
			else if (opts['list']) {
				this.datalist = datalist = $('#' + opts['list']);
			}

			opts = $.extend({}, {
				populateResults: function (container, results, query, showPlaceholder) {
					var populate,
					    id   = $.proxy(this.opts.id, this),
					    self = this;

					var optionRenderer = this.opts.optionRenderer;
					if (typeof optionRenderer !== "function") {
						// cannot be non-function
						optionRenderer = null;
					}

					populate = function (resultsParent, results, container, depth, showPlaceholder) {
						var i,
						    l,
						    result,
						    selectable,
						    disabled,
						    node,
						    label,
						    innerContainer,
						    formatted;

						var processChildren = function (node, result) {
							if (result.children && result.children.length > 0) {
								var nestedList = result.element && $(result.element[0]).is("li") &&
									$(result.element[0]).children("ul");

								var innerContainer = nestedList ? $(result.element[0]).children("ul") :
									$("<ul></ul>");

								if (!innerContainer.hasClass("oj-listbox-result-sub"))
									innerContainer.addClass("oj-listbox-result-sub");

								populate(result, result.children, innerContainer, depth + 1, false);

								if (!nestedList)
									node.append(innerContainer); // @HTMLUpdateOK
							}
						};

						var termHighlight = function (highlighterSection,
						                              highlighterClass, pattern) {
							function innerHighlight (node, pat) {
								var skip = 0;
								if (node.nodeType === 3) {
									var pos = node.data.toUpperCase().indexOf(pat);
									if (pos >= 0) {
										var spannode       = document.createElement("span");
										spannode.className = highlighterClass;
										var middlebit      = node.splitText(pos);
										var endbit         = middlebit.splitText(pat.length);
										var middleclone    = middlebit.cloneNode(true);

										spannode.appendChild(middleclone); // @HTMLUpdateOK
										middlebit.parentNode.replaceChild(spannode, middlebit); // @HtmlUpdateOk

										skip = 1;
									}
								} else if (node.nodeType === 1 && node.childNodes && !/(script|style)/i.test(node.tagName)) {

									// This function is to highlight the text appeared in the passed-in node.
									// So recursively it checks for child nodes also.
									// But need not to highlight the text appeared in <script> and <style> tags, so skipping them.
									for (var i = 0; i < node.childNodes.length; ++i) {
										i += innerHighlight(node.childNodes[i], pat);
									}
								}
								return skip;
							}

							if (highlighterSection.length && pattern && pattern.length) {
								highlighterSection.each(function () {
									innerHighlight(this, pattern.toUpperCase());
								});
							}
						};

						var createLabelContent = function (labelNode, result) {
							if (optionRenderer) {
								var context = {
									"index"        : i,
									"depth"        : depth,
									"leaf"         : !result.children,
									"parent"       : resultsParent,
									"data"         : result,
									"component"    : opts.ojContext,
									"parentElement": labelNode.get(0)
								};

								// if an element is returned from the renderer and
								// the parent of that element is null, we will append
								// the returned element to the parentElement.
								// If non-null, we won't do anything, assuming that the
								// rendered content has already added into the DOM somewhere.
								var content = optionRenderer.call(opts.ojContext, context);
								if (content !== null) {
									// allow return of document fragment from jquery create or
									// js document.createDocumentFragment
									if (content["parentNode"] === null ||
										content["parentNode"] instanceof DocumentFragment) {
										labelNode.appendChild(content); // @HTMLUpdateOK
									}
								}
							} else {
								formatted = opts.formatResult(result);
								if (formatted !== undefined) {
									labelNode.text(formatted);
								}
							}

							if (!(query.initial === true)) {
								var highlighterSection = labelNode
									.find(".oj-listbox-highlighter-section");
								if (!highlighterSection.length) {
									highlighterSection = labelNode;
								}

								termHighlight(highlighterSection, "oj-listbox-highlighter",
									query.term);
							}
						};

						// - ojselect does not show placeholder text when data option is specified
						///ojselect only add placeholder to dropdown if there is no search filter
						var createPlaceholder = function (placeholder) {
							if (!opts._placeholderData) {
								result = {};

								result[opts.optionsKeys.label] = placeholder;
								if (opts.optionsKeys.label !== opts.optionsKeys.value) {
									result[opts.optionsKeys.value] = "";
								}
								opts._placeholderData = result;
							}

							node = $("<li></li>");
							node.addClass("oj-listbox-placeholder oj-listbox-results-depth-0 oj-listbox-result oj-listbox-result-selectable");
							node.attr("role", "presentation");

							label = $(document.createElement("div"));
							label.addClass("oj-listbox-result-label");
							label.attr("id", "oj-listbox-result-label-" + _IdentityUtils.nextUid());
							label.attr("role", "option");

							/* formatted = opts.formatResult(result); //not required for placeholder: manpasin
							 if (formatted !== undefined)*/
							label.text(opts._placeholderData[opts.optionsKeys.label]);

							node.append(label); // @HTMLUpdateOK

							node.data(self._elemNm, opts._placeholderData);
							container.prepend(node); // @HTMLUpdateOK
						};
						var placeholder       = self._getPlaceholder();
						var selectedValues    = self.getVal();
						if (selectedValues && selectedValues.length !== 0) {
							//if (showPlaceholder && placeholder && !query.term &&
							// container.find(".oj-listbox-placeholder").length <= 0) {
							if (showPlaceholder && placeholder && !query.term) {
								//create placeholder item
								createPlaceholder(placeholder)

							} else if (!opts.multiple) {
								//createEmptyPlaceholder
								createPlaceholder("");
								opts.placeholder = "";
							}
						}

						var renderCheckbox = opts.multiple && opts.selectAll;

						//set the results to opts
						opts.results = results;

						selectedValues = self.getVal();
						if (renderCheckbox) {
							var selectAll  = $("<li class='oj-listbox-results-depth-0' role='presentation'></li>");
							var selectUUID = _IdentityUtils.nextUid();
							var checkbox   = $(document.createElement("input"));
							var checked    = false;

							if (selectedValues && Array.isArray(selectedValues)) {
								checked = opts.contains.call(results, selectedValues);
							}

							var selectLabel = $(document.createElement("span"));
							selectLabel.addClass("oj-listbox-result-label");
							selectLabel.attr("id", "oj-listbox-result-label-" + selectUUID);
							selectLabel.attr("role", "option");
							selectLabel.text(opts.selectLabel);

							checkbox.attr({
								"id"     : "oj-checkbox-" + selectUUID,
								"class"  : "oj-identity-checkbox",
								"type"   : "checkbox",
								"checked": checked
							});

							var checkboxLabel = $(document.createElement("label"));
							checkboxLabel.attr({
								"for"       : "oj-checkbox-" + selectUUID,
								"class"     : "oj-identity-checkbox" + (checked ? " selected" : ""),
								"aria-label": checked ? "selected" : "unselected"
							});

							opts.checkAll = checkboxLabel;
							selectAll.append([/*checkbox,*/ checkboxLabel, selectLabel]);
							container.prepend(selectAll);
						}

						var templateDefined = !!(opts.resultTemplateKeys && Array.isArray(opts.resultTemplateKeys));

						for (i = 0, l = results.length; i < l; i = i + 1) {
							result     = results[i];
							disabled   = (result.disabled === true);
							selectable = (!disabled) && (id(result) !== undefined);

							var isList = result.element && $(result.element[0]).is("li");
							node       = isList ? $(result.element[0]) : $("<li></li>");

							if (node.hasClass("oj-listbox-result")) {
								if (result.children && result.children.length > 0)
									processChildren(node, result);

								$(result.element[0]).css('display', '');
							} else {
								var uuid = _IdentityUtils.nextUid();
								node.addClass("oj-listbox-results-depth-" + depth);
								node.addClass("oj-listbox-result");
								node.addClass(selectable ? "oj-listbox-result-selectable" : "oj-listbox-result-unselectable");
								if (disabled) {
									node.addClass("oj-disabled");
								}
								if (result.children) {
									node.addClass("oj-listbox-result-with-children");
								}
								node.attr("role", "presentation");

								if (renderCheckbox) {
									var checked = false;
									if (selectedValues && Array.isArray(selectedValues)) {
										checked = opts.indexOf.call(selectedValues, result) !== -1;
									}

									var checkboxLabel = $(document.createElement("label"));
									checkboxLabel.attr({
										"for"       : "oj-checkbox-" + uuid,
										"class"     : "oj-identity-checkbox" + (checked ? " selected" : ""),
										"aria-label": checked ? "selected" : "unselected"
									});
									node.append(checkboxLabel);
								}

								var identityType = result.identityType ? result.identityType : '';

								if (!identityType) {
									identityType = result.type || "";
								}

								if (identityType) {
									var identityTypeImage = $(document.createElement("span"));
									identityTypeImage.attr("class", "oj-identity-type " + identityType);
									node.append(identityTypeImage);
								}

								label = $(document.createElement("div"));
								label.addClass("oj-listbox-result-label");
								label.attr("id", "oj-listbox-result-label-" + uuid);
								label.attr("role", "option");
								if (disabled)
									label.attr("aria-disabled", "true");

								// append label to node
								if (!isList) {
									createLabelContent(label, result);

									if (templateDefined) {
										var templateKeys = opts.resultTemplateKeys;
										for (var index = 0, keyLen = templateKeys.length; index < keyLen; index++) {
											if (result.hasOwnProperty(templateKeys[index]) && result[templateKeys[index]]) {
												label.append([$("<span> | </span>"), $("<span class='info'> " + result[templateKeys[index]] + "</span>")]);
											}
										}
									} else if (result.email) {
										label.append([$("<span> | <span>"), $("<span class='info'> " + result.email + "</span>")]);
									}

									label[0].title = label.text();
									node.append(label); // @HTMLUpdateOK
								}

								// process children
								if (result.children && result.children.length > 0)
									processChildren(node, result);

								node.data(self._elemNm, result);
								if (!isList) {
									container.append(node); // @HTMLUpdateOK
								} else {
									// wrap the li contents except the nested ul with wrapping div
									$(result.element[0]).contents().filter(function () {
										return this.tagName !== "UL";
									}).wrapAll(label); // @HTMLUpdateOK
									$(result.element[0]).css('display', '');
								}
							}
						}
					};

					///ojselect placehholder
					populate(null, results, container, 0, showPlaceholder);
				}
			}, _ojIdentity_defaults, opts);

			opts.id = function (e) {
				return e[this.opts.optionsKeys['value']];
			};

			opts.formatResult = function (result) {
				return (!isNaN(result[this.optionsKeys['label']]) ? this.ojContext._formatValue(result[this.optionsKeys['label']]) : result[this.optionsKeys['label']]);
			};

			opts.formatSelection = function (data) {
				return (data && data[this.optionsKeys['label']]) ? (!isNaN(data[this.optionsKeys['label']]) ? this.ojContext._formatValue(data[this.optionsKeys['label']]) : data[this.optionsKeys['label']]) : undefined;
			};

			if (tagName !== "select" && opts["manageNewEntry"] !== null) {
				opts["manageNewEntry"] = function (term) {
					var entry                        = {};
					entry[opts.optionsKeys['value']] = entry[opts.optionsKeys['label']] = $.trim(term);
					return entry;
				}
			}

			if (datalist) {
				opts.query = this._bind(function (query) {
					var data = {
						    results: [],
						    more   : false
					    },
					    term = query.term,
					    children,
					    process;

					process = function (element, collection) {
						var group;
						var nestedLi = element.children() && element.children().length > 0 &&
							element.children().is("ul");
						if (element.is("option") || (element.is("li") && !nestedLi)) {
							if (query.matcher(term, element.text(), element)) {
								collection.push(self._optionToData(element));
							}
						} else if (element.is("optgroup") || (element.is("li") && nestedLi)) {
							group = self._optionToData(element);
							_IdentityUtils.each2(element.is("optgroup") ? element.children() : element.children("ul").children(), function (i, elm) {
								process(elm, group.children);
							});
							if (group.children.length > 0) {
								collection.push(group);
							}
						}
					};

					children = datalist.children();

					///ojselect remove existing placeholder item
					if (this._getPlaceholder() !== undefined && children.length > 0 &&
						children.first().attr("value") == "") {
						children = children.slice(1);
					}

					_IdentityUtils.each2(children, function (i, elm) {
						process(elm, data.results);
					});
					query.callback(data);
				});
			} else if ("options" in opts) {
				if ($.isFunction(opts.options)) {
					opts.query = _IdentityUtils.remote(opts.options, opts.optionsKeys ? opts.optionsKeys : null);
				} else {
					opts.query = _IdentityUtils.local(opts.options, opts.optionsKeys ? opts.optionsKeys : null);
				}
			}

			return opts;
		},

		//_AbstractOjIdentity
		_createHeader: function () {
			var headerElem = this.opts.element.find(".oj-listbox-header");
			if (headerElem.length) {
				this.header = $("<li>", {
					"class": "oj-listbox-result-header oj-listbox-result-unselectable",
					"role" : "presentation"
				});

				this.header.append(headerElem.children()); // @HTMLUpdateOK
				this._initializeHeaderItems();

				var resultsNHeaderContainer = $("<ul>", {
					"class": "oj-listbox-results-with-header",
					"role" : "listbox"
				});

				resultsNHeaderContainer.append(this.header); // @HTMLUpdateOK
				resultsNHeaderContainer.appendTo(this.results.parent()); // @HTMLUpdateOK

				var resultsWrapper = $("<li>", {
					"role": "presentation"
				});
				resultsNHeaderContainer.append(resultsWrapper); // @HTMLUpdateOK

				this.results.attr("role", "presentation");
				this.results.appendTo(resultsWrapper); // @HTMLUpdateOK
			}

			this.headerInitialized = true;
		},

		_initializeHeaderItems: function () {
			this.headerItems = this.header.find("li[role='option'], li:not([role])");
			this.headerItems.uniqueId();

			this.header.find("ul").attr("role", "presentation");
			this.header.find("li:not([role])").attr("role", "option");

			var selector = "a, input, select, textarea, button, object, .oj-component-initnode";
			this.header.find(selector).each(function () {
				$(this).attr("tabIndex", -1);
			});
		},

		_isHeaderItem: function (item) {
			var isHeaderItem = false;

			this.headerItems.each(function () {
				if ($(this).attr("id") === item) {
					isHeaderItem = true;
					return false;
				}
			});

			return isHeaderItem;
		},

		_getNextHeaderItem: function (currentItem) {
			if (!this.headerItems) {
				return null;
			}

			if (!currentItem) {
				return this.headerItems.first();
			}

			var foundCurrentItem = false;
			var nextItem         = null;
			this.headerItems.each(function () {
				if (foundCurrentItem) {
					nextItem = $(this);
					return false;
				}

				foundCurrentItem = ($(this).attr("id") === currentItem);
			});

			return nextItem;
		},

		_getPreviousHeaderItem: function (currentItem) {
			if (!this.headerItems) {
				return null;
			}

			var previousItem = null;
			this.headerItems.each(function () {
				if ($(this).attr("id") === currentItem)
					return false;

				previousItem = $(this);
			});

			return previousItem;
		},

		_setFocusOnHeaderItem: function (item) {
			var focusable = item.find(".oj-component .oj-enabled").first();
			if (focusable.length === 0) {
				var selector = "a, input, select, textarea, button, object, .oj-component-initnode";
				focusable    = item.find(selector).first();
				if (focusable.length === 0) {
					focusable = item.children().first();
				}
			}
			if (focusable) {
				focusable.addClass("oj-focus");
			}
		},

		_removeHighlightFromHeaderItems: function () {
			if (this.headerItems) {
				this.headerItems.find(".oj-focus").removeClass("oj-focus");
			}
		},

		//_AbstractOjIdentity
		_triggerSelect: function (data) {
			var evt = $.Event(this._elemNm + "-selecting", {
				val   : this.id(data),
				object: data
			});
			this.opts.element.trigger(evt);
			return !evt.isDefaultPrevented();
		},

		//_AbstractOjIdentity
		_isInterfaceEnabled: function () {
			return this.enabledInterface === true;
		},

		//_AbstractOjIdentity
		_enableInterface: function () {
			var enabled  = this._enabled && !this._readonly,
			    disabled = !enabled;

			if (enabled === this.enabledInterface)
				return false;

			this.container.toggleClass("oj-disabled", disabled);
			this.close();
			this.enabledInterface = enabled;

			return true;
		},

		//_AbstractOjIdentity
		_enable: function (enabled) {
			if (enabled === undefined)
				enabled = true;
			if (this._enabled === enabled)
				return;
			this._enabled = enabled;

			this.opts.element.prop("disabled", !enabled);
			this.container.toggleClass("oj-enabled", enabled);
			this.container.find(".oj-identity-filter").toggleClass("disabled-filter", !enabled);

			this._enableInterface();
		},

		//_AbstractOjIdentity
		_disable: function () {
			this._enable(false);
		},

		//_AbstractOjIdentity
		_readonly: function (enabled) {
			if (enabled === undefined)
				enabled = false;
			if (this._readonly === enabled)
				return false;
			this._readonly = enabled;

			this.opts.element.prop("readonly", enabled);
			this._enableInterface();
			return true;
		},

		//_AbstractOjIdentity
		_opened: function () {
			return this.container.hasClass("oj-listbox-dropdown-open");
		},

		//_AbstractOjIdentity
		_usingHandler: function (pos, props) {

			// if the input part of the component is clipped in overflow, implicitly close the dropdown popup.
			if (isAligningPositionClipped(props)) {
				this._closeDelayTimer = window.setTimeout($.proxy(this.close, this), 1);
				return;
			}

			var container = this.container;
			var dropdown  = props["element"]["element"];
			dropdown.css(pos);

			if ("bottom" === props["vertical"]) {
				container.addClass("oj-listbox-drop-above");
				dropdown.addClass("oj-listbox-drop-above");
			} else {
				container.removeClass("oj-listbox-drop-above");
				dropdown.removeClass("oj-listbox-drop-above");
			}
		},

		//_AbstractOjIdentity
		_getDropdownPosition: function () {
			var position = {
				'my'       : 'start top',
				'at'       : 'start bottom',
				'of'       : this.container.children().first(),
				'collision': 'flip',
				'using'    : $.proxy(this._usingHandler, this)
			};
			var isRtl    = readingDirection() === "rtl";
			return normalizeHorizontalAlignment(position, isRtl);
		},

		//_AbstractOjIdentity
		_positionDropdown: function () {
			this.dropdown.css('width', this.container.outerWidth());
			this.dropdown.position(this._getDropdownPosition());
		},

		//_AbstractOjIdentity
		// beforeExpand
		_shouldOpen: function (e) {
			if (this._opened())
				return (false || $.isFunction(this.opts.options));
			if (this._enabled === false || this._readonly === true)
				return false;

			var eventData = {
				'component': this.opts.element
			};

			return this.ojContext._trigger("beforeExpand", e, eventData);
		},

		//_AbstractOjIdentity
		_clearDropdownAlignmentPreference: function () {
			// clear the classes used to figure out the preference of where the dropdown should be opened
			this.container.removeClass("oj-listbox-drop-above");
			this.dropdown.removeClass("oj-listbox-drop-above");
		},

		//_AbstractOjIdentity
		/**
		 * Opens the dropdown
		 *
		 * @return {boolean} whether or not dropdown was opened. This method will return false if, for example,
		 * the dropdown is already open, or if the 'open' event listener on the element called preventDefault().
		 * @ignore
		 */
		open: function (e, dontUpdateResults) {
			if (!this._shouldOpen(e))
				return false;
			this._opening(e, dontUpdateResults);
			return true;
		},

		//_AbstractOjIdentity
		_opening: function () {
			if (!this.headerInitialized)
				this._createHeader();

			//this._clearPlaceholder();
			this.container.addClass("oj-listbox-dropdown-open");
		},

		//_AbstractOjIdentity
		_showDropDown: function () {
			if (!this._opened()) {
				// Just to make sure that _opening() method is called before calling
				// the _showDropDown().
				return;
			}

			this.windowEventBind   = $.proxy(this._positionDropdown, this);
			this.documentEventBind = $.proxy(this._clickAwayHandler, this);

			window.addEventListener("resize", this.windowEventBind, true);
			window.addEventListener("scroll", this.windowEventBind, true);
			/*document.documentElement.addEventListener('focus');
			 document.documentElement.addEventListener('keydown', $.proxy(this._surrogateRemoveHandler, this), true);*/
			document.documentElement.addEventListener('mousedown', this.documentEventBind, true);

			var alreadyExpanded = this._getActiveContainer().attr("aria-expanded");
			if (alreadyExpanded === "true") {
				return;
			}

			this._clearDropdownAlignmentPreference();

			if (this.dropdown[0] !== this.body().children().last()[0]) {
				this.dropdown.detach().appendTo(this.body()); // @HTMLUpdateOK
			}

			this.dropdown.appendTo(this.body()); // @HTMLUpdateOK

			if (this.header) {
				this.dropdown.find(".oj-listbox-results-with-header").prepend(this.header); // @HTMLUpdateOK
				this.header.show();
			}

			this.dropdown.position(this._getDropdownPosition()).show();

			// move the global id to the correct dropdown
			$("#oj-listbox-drop").removeAttr("id");
			this.dropdown.attr("id", "oj-listbox-drop");

			var containerId = this.containerId;
			this.dropdown.attr("data-oj-containerid", containerId);

			// show the elements
			this._positionDropdown();

			///select: accessibility
			this._getActiveContainer().attr("aria-expanded", true);
		},

		//_AbstractOjIdentity
		close: function (event) {
			if (!this._opened())
				return;

			if (this._selectionEvent && this._selectionEvent.target && $(this._selectionEvent.target).hasClass("oj-identity-checkbox")) {
				this._selectionEvent = null;
				return;
			}

			this.container.removeClass("oj-listbox-dropdown-open");

			var dropDownVisible = this._getActiveContainer().attr("aria-expanded");
			if (!dropDownVisible || dropDownVisible === "false") {
				return;
			}

			window.removeEventListener("resize", this.windowEventBind, true);
			window.removeEventListener("scroll", this.windowEventBind, true);
			document.documentElement.removeEventListener('mousedown', this.documentEventBind, true);

			var cid    = this.containerId,
			    scroll = "scroll." + cid,
			    resize = "resize." + cid,
			    orient = "orientationchange." + cid;

			// unbind event listeners
			this.container.parents().add(window).each(function () {
				$(this).off(scroll).off(resize).off(orient);
			});

			this._clearDropdownAlignmentPreference();

			/** @type {!Object.<oj.PopupService.OPTION, ?>} */
			// var psOptions = {};
			// psOptions[oj.PopupService.OPTION.POPUP] = this.dropdown;
			// oj.PopupService.getInstance().close(psOptions);

			if (this.header) {
				// When popup opened header will be shown in the popup.
				// But once it is closed contents of the popup will be removed,
				// but the header should not be detached from the DOM,
				// because knockout binding will be lost. That is why header will be
				// moved under the component container. And when again popup opened
				// it will be added back to the popup.
				this.header.hide();
				this.header.appendTo(this.container); // @HTMLUpdateOK
			}

			this.dropdown.removeAttr("data-oj-containerid");
			this.dropdown.removeAttr("id");

			if (!this.opts["list"]) {
				this.dropdown.detach();
				this.results.empty();
			} else
				this._removeHighlight();

			///select: accessibility
			this._getActiveContainer().attr("aria-expanded", false);

			if (this.ojContext._IsRequired()) {
				this.ojContext.validate();
			}
		},

		//_AbstractOjIdentity
		_clearSearch: function () {
		},

		//_AbstractOjIdentity
		_ensureHighlightVisible: function () {
			var results = this.results,
			    children,
			    index,
			    child,
			    hb,
			    rb,
			    y,
			    more;

			index = this._highlight();

			if (index < 0)
				return;

			if (index == 0) {
				// if the first element is highlighted scroll all the way to the top,
				// that way any unselectable headers above it will also be scrolled
				// into view
				results.scrollTop(0);
				return;
			}

			children = this._findHighlightableChoices().find(".oj-listbox-result-label");
			child    = $(children[index]);
			hb       = child.offset().top + child.outerHeight(true);

			// if this is the last child lets also make sure oj-combobox-more-results is visible
			if (index === children.length - 1) {
				more = results.find("li.oj-listbox-more-results");
				if (more.length > 0) {
					hb = more.offset().top + more.outerHeight(true);
				}
			}

			rb = results.offset().top + results.outerHeight(true);
			if (hb > rb) {
				results.scrollTop(results.scrollTop() + (hb - rb));
			}
			y = child.offset().top - results.offset().top;

			// make sure the top of the element is visible
			if (y < 0 && child.css('display') != 'none') {
				results.scrollTop(results.scrollTop() + y); // y is negative
			}
		},

		//_AbstractOjIdentity
		_findHighlightableChoices: function () {
			return this.results.find(".oj-listbox-result-selectable:not(.oj-disabled, .oj-selected)")
				.filter(function () {
					return $(this).css('display') != 'none';
				});
		},

		//_AbstractOjIdentity
		_moveHighlight: function (delta) {
			var choices = this._findHighlightableChoices(),
			    index   = this._highlight();

			if (this.header && (index <= 0 || index === (choices.length - 1))) {
				var activeDescendant = this._getActiveContainer().attr("aria-activedescendant");
				var isHeaderItem     = this._isHeaderItem(activeDescendant);
				if (!isHeaderItem)
					activeDescendant = null;

				var headerItem = null;
				if (delta > 0 && (index < 0 || index === (choices.length - 1))) {
					headerItem = this._getNextHeaderItem(activeDescendant);
				} else if (delta < 0 && ((isHeaderItem && index < 0) || index === 0)) {
					headerItem = this._getPreviousHeaderItem(activeDescendant);
				}

				if (headerItem) {
					this._removeHighlight();
					this._setFocusOnHeaderItem(headerItem);

					this._getActiveContainer().attr("aria-activedescendant",
						headerItem.attr("id"));

					return;
				} else if (isHeaderItem && delta < 0) {
					index = 0;
				}
			}

			while (index >= -1 && index < choices.length) {
				index += delta;

				// support cycling through the first/last item
				if (index == choices.length)
					index = 0;
				else if (index == -1)
					index = choices.length - 1;

				var choice = $(choices[index]);
				if (choice.hasClass("oj-listbox-result-selectable") && !choice.hasClass("oj-disabled") && !choice.hasClass("oj-selected")) {
					this._highlight(index);
					break;
				}
			}
		},

		//_AbstractOjIdentity
		_highlight: function (index) {
			var choices = this._findHighlightableChoices(),
			    choice,
			    data;

			if (arguments.length === 0) {
				// If no argumnets passed then currently highlighted
				// option will be returned.
				var curSelected = choices.filter(".oj-hover");
				if (!curSelected.length) {
					curSelected = choices.children(".oj-hover")
						.closest(".oj-listbox-result");
				}
				return choices.get().indexOf(curSelected[0]);
			}

			if (index >= choices.length)
				index = choices.length - 1;
			if (index < 0)
				index = 0;

			this._removeHighlight();

			choice = $(choices[index]);

			if (choice.hasClass("oj-listbox-result-with-children")) {
				choice.children(".oj-listbox-result-label").addClass("oj-hover");
			} else {
				choice.addClass("oj-hover");
			}

			// ensure assistive technology can determine the active choice
			///select: accessibility
			this._getActiveContainer().attr("aria-activedescendant",
				choice.find(".oj-listbox-result-label").attr("id"));

			this._ensureHighlightVisible();
		},

		//_AbstractOjIdentity
		_removeHighlight: function () {
			this.results.find(".oj-hover").removeClass("oj-hover");
			this._removeHighlightFromHeaderItems();
		},

		//_AbstractOjIdentity
		_highlightUnderEvent: function (event) {
			var el = $(event.target).closest(".oj-listbox-result-selectable");
			if (el.length > 0 && !el.is(".oj-hover")) {
				var choices = this._findHighlightableChoices();
				this._highlight(choices.index(el));
			} else if (el.length == 0) {
				// if we are over an unselectable item remove all highlights
				this._removeHighlight();
			}
		},

		//_AbstractOjIdentity
		_updateResults: function (initial) {
			var search   = this.search,
			    self     = this,
			    term     = search.val(),
			    lastTerm = $.data(this.container, this._classNm + "-last-term");

			// prevent duplicate queries against the same term
			if (initial !== true && lastTerm && (term === lastTerm))
				return;

			// In IE even for chnage of placeholder fires 'input' event,
			// so in such cases we don't need to query for results.
			if (!lastTerm && !term && initial && initial.type === "input")
				return;

			$.data(this.container, this._classNm + "-last-term", term);

			var minLength = this.opts.minLength || 0;
			if (term.length >= minLength) {
				clearTimeout(this.queryTimer);
				if (!initial || initial === true) {
					this._queryResults(initial);
				} else {
					this.queryTimer = setTimeout(function () {
						self._queryResults(initial);
					}, _IdentityUtils.DEFAULT_QUERY_DELAY);
				}
			} else {
				this.close();
			}
		},

		//_AbstractOjIdentity
		_queryResults: function (initial) {
			var search  = this.search,
			    results = this.results,
			    opts    = this.opts,
			    self    = this,
			    input,
			    term    = search.val(),
			    // sequence number used to drop out-of-order responses
			    queryNumber;

			var minLength = opts.minLength || 0;
			if (minLength > term.length) {
				this.close();
				return;
			} else {
				this.open(null, true);
			}

			function postRender () {
				self._positionDropdown();

				if (self.header && self.headerItems.length) {
					var highlightableChoices = self._findHighlightableChoices();
					var totalOptions         = self.headerItems.length +
						highlightableChoices.length;

					self.headerItems.attr("aria-setsize", totalOptions);
					if (highlightableChoices.length) {
						var highlightableOptions = highlightableChoices.children("[role='option']");
						highlightableOptions.attr("aria-setsize", totalOptions);
						highlightableOptions.first().attr("aria-posinset", self.headerItems.length + 1);
					}
				}
			}

			queryNumber = ++this.queryCount;

			this._removeHighlight();
			input = this.search.val();
			if (input !== undefined && input !== null &&
				(initial !== true || opts.inputSearch || opts.minLength > 0)) {
				term = input;
			} else {
				term = "";
			}

			this.resultsPage = 1;

			opts.query({
				element : opts.element,
				term    : term,
				page    : this.resultsPage,
				context : null,
				matcher : opts.matcher,
				callback: this._bind(function (data) {
					// ignore old responses
					//not needed as it will async responses and it is handled in remote method
					/*if (queryNumber !== this.queryCount) {
					 return;
					 }*/

					// ignore a response if the oj-combobox has been closed before it was received
					if (!this._opened()) {
						return;
					}

					// save context, if any
					this.context = (!data || data.context === undefined) ? null : data.context;
					// create a default choice and prepend it to the list

					if ((!data || data.results.length === 0)) {
						//if ((this._classNm === "oj-select" && this.opts['multiple'] !== true)
						if ((this._classNm === "oj-select" && this.opts['multiple'] !== true) || (this.opts.inputSearch && $.trim(this.opts.inputSearch) !== "") || this.header) {
							var li = $("<li>");
							li.addClass("oj-listbox-no-results");
							li.text(opts.noMatchesFound);
							this._showDropDown();
							this._preprocessResults(results);
							results.append(li); //@HTMLUpdateOK
							postRender();
						} else {
							//this.close();
						}
						return;
					}

					_IdentityUtils.saveLastQueryResult(this, data.results);

					this._showDropDown();
					this._preprocessResults(results);

					self.opts.populateResults.call(this, results, data.results, {
							term   : search.val(),
							page   : this.resultsPage,
							context: null,
							initial: initial
						},
						this._showPlaceholder()
					);
					this._postprocessResults(data, initial);
					postRender();
				})
			});
		},

		//_AbstractOjIdentity
		_preprocessResults: function (results) {
			if (!this.opts["list"])
				results.empty();
			else {
				var resultList = results.children();
				// hide the list items
				this._hideResultList(resultList);
			}
		},

		//_AbstractOjIdentity
		_hideResultList: function (resultList) {
			for (var i = 0; i < resultList.length; i++) {
				if ($(resultList[i]).is("LI")) {
					if ($(resultList[i]).hasClass("oj-listbox-no-results") ||
						$(resultList[i]).hasClass("oj-listbox-placeholder"))
						$(resultList[i]).remove();

					$(resultList[i]).css('display', 'none');
					if ($(resultList[i]).hasClass("oj-selected"))
						$(resultList[i]).removeClass("oj-selected")
				}
				var nested = $(resultList[i]).children("ul");
				if (nested && nested.children())
					this._hideResultList(nested.children());
			}
		},

		//_AbstractOjIdentity
		_cancel: function (event) {
			this.close(event);
		},

		//_AbstractOjIdentity
		_focusSearch: function () {
			_IdentityUtils._focus(this.search);
		},

		//_AbstractOjIdentity
		_selectHighlighted: function (options, event) {
			if (this.header) {
				var activeDescendant = this._getActiveContainer().attr("aria-activedescendant");
				if (this._isHeaderItem(activeDescendant)) {
					// There can be clickable elements in the custom header and
					// which can also be selected through UP/DOWN arrow keys.
					// When such header elements selected through keyboard
					// they should work as if they have clicked.
					// That is why simulating the click on header options.

					var activeItem = $("#" + activeDescendant);
					var selector   = "a, input, select, textarea, button, object";
					var clickable  = activeItem.find(selector).first();
					if (clickable.length === 0) {
						clickable = activeItem.children();
					}
					if (clickable.length) {
						clickable[0].click();
					}

					this.close(event);
					return;
				}
			}

			var index       = this._highlight(),
			    highlighted = this.results.find(".oj-hover"),
			    data        = highlighted.closest(".oj-listbox-result").data(this._elemNm);

			if (data) {
				this._highlight(index);

				options         = options || {};
				options.trigger = _IdentityUtils.ValueChangeTriggerTypes.OPTION_SELECTED;
				if (data !== this.opts._placeholderData) {
					this._onSelect(data, options, event);
				} else {
					this._onSelect([], options, event);
				}
			} else if (options && options.noFocus) {
				this.close(event);
			}
		},

		//_AbstractOjIdentity
		_getPlaceholder: function () {
			return this.opts.element.attr("placeholder") ||
				this.opts.element.attr("data-placeholder") || // jquery 1.4 compat
				this.opts.element.data("placeholder") ||
				this.opts.placeholder;
		},

		//_AbstractOjIdentity
		_setPlaceholder: function () {
			var placeholder = this._getPlaceholder();

			if (!placeholder)
				return;
			this.search.attr("placeholder", placeholder);
			this.container.removeClass(this._classNm + "-allowclear");
		},

		//_AbstractOjIdentity
		_initContainerWidth: function () {
			function resolveContainerWidth () {
				var style,
				    attrs,
				    matches,
				    i,
				    l,
				    attr;

				// check if there is inline style on the element that contains width
				style = this.opts.element.attr('style');
				if (style !== undefined) {
					attrs = style.split(';');
					for (i = 0, l = attrs.length; i < l; i = i + 1) {
						attr    = attrs[i].replace(/\s/g, ''); //@HTMLUpdateOK
						matches = attr.match(/^width:(([-+]?([0-9]*\.)?[0-9]+)(px|em|ex|%|in|cm|mm|pt|pc))/i);
						if (matches !== null && matches.length >= 1)
							return matches[1];
					}
				}
			};

			var width = resolveContainerWidth.call(this);
			if (width !== null) {
				this.container.css("width", width);
			}
		},

		//_AbstractOjIdentity
		getVal: function () {
			return this.ojContext.option("value");
		},

		//_AbstractOjIdentity
		///pass original event
		setVal: function (val, event, context) {

			var options = {
				doValueChangeCheck: false
			};
			if (context)
				options["_context"] = context;

			if (typeof val === "string" || !Array.isArray(val)) {
				val = [val];
			}
			this.opts.element.val(val.length !== 0 ? val : null);

			this.ojContext._updateValue(val, event, options);
		},

		//_AbstractOjIdentity
		///ojselect placeholder
		_showPlaceholder: function () {
			return false;
		},

		//_AbstractOjIdentity
		///select: accessibility
		_getActiveContainer: function () {
			return this.search;
		},

		//_AbstractOjIdentity
		_hasSearchBox: function () {
			return (this.opts.minimumResultsForSearch !== undefined &&
			this.container._hasSearchBox !== undefined);
		},

		_findItem: function (list, value) {
			for (var i = 0; i < list.length; i++) {
				if ($(list[i]).data(this._elemNm)["value"] === value)
					return list[i];
			}
			return null;
		}

	});

	var _ojIdentity_defaults = {
		closeOnSelect: true,
		openOnEnter  : true,
		id           : function (e) {
			return e.id;
		},
		matcher      : function (term, text) {
			return ('' + text).toUpperCase().indexOf(('' + term).toUpperCase()) >= 0;
		},

		separator: ","
	};

	/**
	 * Copyright (c) 2014, Oracle and/or its affiliates.
	 * All rights reserved.
	 */

	/**
	 * @preserve Copyright 2012 Igor Vaynberg
	 *
	 * This software is licensed under the Apache License, Version 2.0 (the "Apache License") or the GNU
	 * General Public License version 2 (the "GPL License"). You may choose either license to govern your
	 * use of this software only upon the condition that you accept all of the terms of either the Apache
	 * License or the GPL License.
	 *
	 * You may obtain a copy of the Apache License and the GPL License at:
	 *
	 * http://www.apache.org/licenses/LICENSE-2.0
	 * http://www.gnu.org/licenses/gpl-2.0.html
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under the
	 * Apache License or the GPL Licesnse is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
	 * CONDITIONS OF ANY KIND, either express or implied. See the Apache License and the GPL License for
	 * the specific language governing permissions and limitations under the Apache License and the GPL License.
	 */
	/**
	 * @private
	 */
	var _AbstractSingleIdentity = _IdentityUtils.clazz(_AbstractOjIdentity, {
		//_AbstractSingleIdentity
		_enableInterface: function () {
			if (_AbstractSingleIdentity.superclass._enableInterface.apply(this, arguments)) {
				this.search.prop("disabled", !this._isInterfaceEnabled());
			}
		},

		//_AbstractSingleIdentity
		_focus: function () {
			if (this._opened()) {
				this.close();
			}
		},

		//_AbstractSingleIdentity
		_destroy: function () {
			$("label[for='" + this.search.attr('id') + "']")
				.attr('for', this.opts.element.attr("id"));
			_AbstractSingleIdentity.superclass._destroy.apply(this, arguments);
		},

		//_AbstractSingleIdentity
		_clear: function (event) {
			var data = this.selection.data(this._elemNm);
			this.search.val("");
			this.selection.removeData(this._elemNm);
			this._setPlaceholder();
		},

		//_AbstractSingleIdentity
		_initSelection: function () {
			var element = this.opts.element;
			this.opts.initSelection.call(null, element, this._bind(this._updateSelectedOption));
		},

		//_AbstractSingleIdentity
		_containerKeydownHandler: function (e) {
			if (!this._isInterfaceEnabled())
				return;

			if (e.which === _IdentityUtils.KEY.PAGE_UP || e.which === _IdentityUtils.KEY.PAGE_DOWN) {
				// prevent the page from scrolling
				_IdentityUtils.killEvent(e);
				return;
			}

			switch (e.which) {
				case _IdentityUtils.KEY.UP:
				case _IdentityUtils.KEY.DOWN:
					if (this._opened()) {
						this._moveHighlight((e.which === _IdentityUtils.KEY.UP) ? -1 : 1);
					} else {
						this.open(e);
					}
					_IdentityUtils.killEvent(e);
					return;

				case _IdentityUtils.KEY.ENTER:
					this._selectHighlighted(null, e);
					_IdentityUtils.killEvent(e);
					if (!this._opened()) {
						this._userTyping = false;
					}
					return;

				case _IdentityUtils.KEY.TAB:
					this.close(e);
					this._userTyping = false;
					return;

				case _IdentityUtils.KEY.ESC:
					if (this._opened()) {
						this._cancel(e);
						_IdentityUtils.killEvent(e);
					}
					this._userTyping = false;
					return;
			}

			///ojidentity: used by select
			this._userTyping = true;
		},

		//_AbstractSingleIdentity
		_containerKeyupHandler: function (e) {
			if (this._isInterfaceEnabled()) {
				if (!this._opened())
					this.open(e);
			}
		},

		//_AbstractSingleIdentity
		_initContainer: function () {
			var selection,
			    container = this.container,
			    dropdown  = this.dropdown,
			    elementLabel;

			// - ojidentity id attribute on oj-select-choice div is not meaningful
			var rootAttr = this.opts.rootAttributes;
			var idSuffix = (rootAttr && rootAttr.id) ?
				rootAttr.id :
				(this.opts.element.attr("id") || _IdentityUtils.nextUid());

			this.selection = selection = container.find("." + this._classNm + "-choice");
			// - ojidentity missing id attribute on oj-select-choice div
			selection.attr("id", this._classNm + "-choice-" + idSuffix);

			elementLabel = $("label[for='" + this.opts.element.attr("id") + "']");
			if (!elementLabel.attr("id"))
				elementLabel.attr('id', this._classNm + "-label-" + idSuffix);

			// add aria associations
			selection.find("." + this._classNm + "-input").attr("id", this._classNm + "-input-" + idSuffix);
			if (!this.results.attr("id"))
				this.results.attr("id", "oj-listbox-results-" + idSuffix);

			this.search.attr("aria-owns", this.results.attr("id"));
			this.search.attr("aria-labelledby", elementLabel.attr("id"));
			this.opts.element.attr("aria-labelledby", elementLabel.attr("id"));

			if (this.search.attr('id'))
				elementLabel.attr('for', this.search.attr('id'));

			if (this.opts.element.attr("aria-label"))
				this.search.attr("aria-label", this.opts.element.attr("aria-label"));

			if (this.opts.element.attr("aria-controls"))
				this.search.attr("aria-controls", this.opts.element.attr("aria-controls"));

			selection.on("keydown", this._bind(this._containerKeydownHandler));
			//selection.on("keyup-change input", this._bind(this._containerKeyupHandler));

			selection.on("mousedown", "abbr", this._bind(function (e) {
				if (!this._isInterfaceEnabled())
					return;
				this._clear(e);
				_IdentityUtils.killEventImmediately(e);
				this.close(e);
				this.selection.focus();
			}));

			selection.on("mousedown", this._bind(function (e) {
				///prevent user from focusing on disabled select
				if (this.opts.element.prop("disabled"))
					_IdentityUtils.killEvent(e);

				if (this._opened()) {
					this.close(e);
				} else if (this._isInterfaceEnabled()) {
					this.open(e);
				}

				// - keyboard flashes briefly on ios.
				var hidden = this.search.parent().attr("aria-hidden");
				if (hidden && hidden == "true")
					this.selection.focus();
				else
					this.search.focus();

				this.container.addClass("oj-active");
			}));

			selection.on("mouseup", this._bind(function (e) {
				this.container.removeClass("oj-active");
			}));

			selection.on("focus", this._bind(function (e) {
				_IdentityUtils.killEvent(e);
			}));

			this.search.on("blur keyup", this._bind(function (e) {
				if (e.type === 'keyup' && e.keyCode !== 10 && e.keyCode !== 13) return;

				if (this.search.val() !== undefined && this.results.find(".oj-hover").length <= 0) {
					// Call _onSelect if no previous data and there is typed in text
					// or the previous data is different from typed in text
					if (this.opts["manageNewEntry"]) {
						var selectionData = this.selection.data(this._elemNm);
						if ((!selectionData && this.search.val() !== "") ||
							(selectionData && (selectionData.label !== this.search.val() || !this.ojContext.isValid()))) {
							var data = this.opts["manageNewEntry"](this.search.val());

							var trigger = e.type === "blur" ?
								_IdentityUtils.ValueChangeTriggerTypes.BLUR :
								_IdentityUtils.ValueChangeTriggerTypes.ENTER_PRESSED;
							var options = {
								trigger: trigger
							};

							this._onSelect(data, options, e);
						}
					} else if (this.opts["manageNewEntry"] == null) {
						var data = this.selection.data(this._elemNm);
						if (this.search.val() == "")
							this._clear(e);
						//not needed if user press enter
						/*else if (!data && this.search.val() !== "")
						 this._clearSearch();*/
						// - typing in search text & pressing enter, changes user entered search text
						else if (this._classNm !== "oj-select") {
							var formatted = this.opts.formatSelection(data);
							if (formatted !== undefined) {
								this.search.val(formatted);
							}
						}
					}
				}
				this.search.removeClass(this._classNm + "-focused");
				this.container.removeClass("oj-focus");
			}));

			this._initContainerWidth();

			this.opts.element.hide()
				.attr("aria-hidden", true);

			this._setPlaceholder();

		},

		//_AbstractSingleIdentity
		_prepareOpts: function () {
			var opts           = _AbstractSingleIdentity.superclass._prepareOpts.apply(this, arguments),
			    self           = this,
			    selectedValues = this.getVal();

			///ojidentity set initial selected value
			var tagName = opts.element.get(0).tagName.toLowerCase();
			if ((tagName === "input" && opts.element.attr("list")) ||
				(tagName === "select" && opts.element.children().length > 0) ||
				opts['list']) {
				var eleName = opts['list'] ? "li" : "option";

				// install the selection initializer
				opts.initSelection = function (element, callback) {
					var selected;
					var value = self.getVal();
					if (Array.isArray(value))
						value = value[0];

					if (value !== undefined && value !== null) {
						selected = self._optionToData(element.find(eleName).filter(function () {
							if (eleName == "li")
								return this.getAttribute("oj-data-value") === value;
							else if (eleName == "option")
								return this.value === value;
						}));
					} else {
						selected = self._optionToData(element.find(eleName).filter(function () {
							if (eleName == "li")
								return this.getAttribute("oj-data-selected") === true;
							else if (eleName == "option")
								return this.selected;
						}));
					}
					callback(selected);
				};

				// - ojidentity should ignore the invalid value set programmatically
				opts.validate = function (element, value) {
					var selected;

					if (value !== undefined && value !== null) {
						selected = self._optionToData(element.find(eleName).filter(function () {
							if (eleName == "li")
								return this.getAttribute("oj-data-value") === value;
							else if (eleName == "option")
								return this.value === value;
						}));
					}

					return !!selected;
				};
			} else if ("options" in opts || (selectedValues && selectedValues.length > 0)) {
				if ($.isFunction(opts.options)) {
					// install default initSelection when applied to hidden input
					// and getting data from remote
					opts.initSelection = function (element, callback) {
						var findOption = function (results, optionValue) {
							for (var i = 0, l = results.length; i < l; i++) {
								var result = results[i];
								if (JSON.stringify(optionValue) === JSON.stringify(result)) {
									return result;
								}

								if (result.children) {
									var found = findOption(result.children, optionValue);
									if (found)
										return found;
								}
							}

							return null;
						};

						selectedValues = self.getVal();
						var id         = "";
						if (selectedValues && selectedValues.length) {
							id = selectedValues[0];
						}

						var match = null;
						if (!id) {
							callback(match);
							return;
						}

						// This data will be saved after querying the options.
						var queryResult = _IdentityUtils.getLastQueryResult(self);
						if (queryResult) {
							match = findOption(queryResult, id);
						}

						if (!match) {
							// currentItem will hold the selected object with value and label.
							// Which updated everytime value is changed.
							var currentItem = self.currentItem;
							if (currentItem && currentItem.length &&
								id === currentItem[0]) {
								match = currentItem[0];
							}
						}

						// valueChangeTrigger will have one of the values from
						// _IdentityUtils._ValueChangeTriggerTypes, which represents the
						// what triggered the value change. But if value is programmatically
						// updated this will be null. So if valueChangeTrigger is null
						// querying for the options again as component will not have list
						// of options in case value is updated programmatically.
						if (!match && !self.valueChangeTrigger) {
							opts.query({
								value   : [id],
								callback: !$.isFunction(callback) ? $.noop : function (queryResult) {
									if (queryResult && queryResult.results) {
										match = findOption(queryResult.results, id);
									}
									callback(match);
								}
							});
						} else {
							callback(match);
						}
					};
					if (!opts.validate) {
						//this method should be override on remote call: manpasin
						opts.validate = function (element, value) {
							return true;
						}
					}
				} else {
					// install default initSelection when applied to hidden input and data is local
					// - ojidentity does not display selected value
					opts.initSelection = function (element, callback) {
						var id         = "";
						selectedValues = self.getVal();
						if (selectedValues && selectedValues.length)
							id = selectedValues[0];

						//search in data by id, storing the actual matching item
						//            var first = null;
						// - ojidentity - validator error message is not shown
						//initialize first = placeholder if we have a placeholder and select value is not required
						var usePlaceholder = (tagName == "select") &&
							self.ojContext._HasPlaceholderSet() && !self.ojContext._IsRequired();
						var first          = usePlaceholder ? self._getPlaceholder() : null;

						var match = null;
						opts.query({
							matcher : function (term, text, el) {
								var is_match = (JSON.stringify(id) === JSON.stringify(el));
								if (is_match) {
									match = el;
								}
								///ojidentity save the 1st option
								if (first == null) {
									first = el;
								}
								return is_match;
							},
							callback: !$.isFunction(callback) ? $.noop : function () {
								///ojidentity if no match, pick the 1st option
								if (!match && tagName === "select") {
									match = first;
								}
								callback(match);
							}
						});
					};

					// - ojidentity should ignore the invalid value set programmatically
					opts.validate = function (element, value) {
						var id = value;

						//search in data by id, storing the actual matching item
						var match = null;
						opts.query({
							matcher : function (term, text, el) {
								var is_match = (JSON.stringify(id) === JSON.stringify(el));
								if (is_match) {
									match = el;
								}
								return is_match;
							},
							callback: $.noop
						});

						return !!match;
					};
				}
			}
			return opts;
		},

		//_AbstractSingleIdentity
		_postprocessResults: function (data, initial, noHighlightUpdate) {
			var selected = -1,
			    self     = this,
			    highlightableChoices;

			highlightableChoices = this._findHighlightableChoices();
			_IdentityUtils.each2(highlightableChoices, function (i, elm) {
				var selectedValues = self.getVal();
				if (selectedValues && selectedValues[0] === self.id(elm.data(self._elemNm))) {
					selected = i;
					return false;
				}
			});

			// and highlight it
			if (noHighlightUpdate !== false) {
				if (initial === true && selected >= 0) {
					this._highlight(selected);
				}
			}
		},

		//_AbstractSingleIdentity
		///pass original event
		_onSelect: function (data, options, event) {
			if (!this._triggerSelect(data))
				return;

			var context;
			if (options && options.trigger) {
				context = {
					optionMetadata: {
						"trigger": options.trigger
					}
				};
			}

			this.setVal(!data ? [] : data, event, context);
			this.close(event);
			this._focusSearch();
		},

		//_AbstractSingleIdentity
		_clearSearch: function () {
			this.search.val("");
		}

	});

	/**
	 * Copyright (c) 2014, Oracle and/or its affiliates.
	 * All rights reserved.
	 */

	/**
	 * @preserve Copyright 2012 Igor Vaynberg
	 *
	 * This software is licensed under the Apache License, Version 2.0 (the "Apache License") or the GNU
	 * General Public License version 2 (the "GPL License"). You may choose either license to govern your
	 * use of this software only upon the condition that you accept all of the terms of either the Apache
	 * License or the GPL License.
	 *
	 * You may obtain a copy of the Apache License and the GPL License at:
	 *
	 * http://www.apache.org/licenses/LICENSE-2.0
	 * http://www.gnu.org/licenses/gpl-2.0.html
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under the
	 * Apache License or the GPL Licesnse is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
	 * CONDITIONS OF ANY KIND, either express or implied. See the Apache License and the GPL License for
	 * the specific language governing permissions and limitations under the Apache License and the GPL License.
	 */
	/**
	 * @private
	 */
	var _OjSingleIdentity = _IdentityUtils.clazz(_AbstractSingleIdentity, {
		_elemNm    : "ojidentity",
		_classNm   : "oj-select",
		_userTyping: false,

		//_OjSingleIdentity
		_createContainer: function () {
			var container = $(document.createElement("div")).attr({
				"class": "oj-identity oj-select oj-component"
			}).html([
				"<div class='oj-select-choice' tabindex='0' role='combobox' ",
				"     aria-autocomplete='none' aria-expanded='false' aria-ready='true'>",
				"  <span class='oj-select-chosen'></span>",
				"  <abbr class='oj-select-search-choice-close' role='presentation'></abbr>",
				"  <a class='oj-select-arrow oj-component-icon oj-clickable-icon-nocontext oj-select-open-icon' role='presentation'>",
				"</a></div>",
				"<span class='oj-identity-filter'></span>",
				"<div class='oj-listbox-drop oj-identity-container' style='display:none' role='presentation'>",

				"  <div class='oj-listbox-search-wrapper'>",

				"  <div class='oj-listbox-search'>",
				"    <input type='text' autocomplete='off' autocorrect='off' autocapitalize='off'",
				"           spellcheck='false' class='oj-listbox-input' title='Search field' ",
				"           role='combobox' aria-expanded='false' aria-autocomplete='list' />",

				"    <span class='oj-listbox-spyglass-box'>",
				"      <span class='oj-component-icon oj-clickable-icon-nocontext oj-listbox-search-icon' role='presentation'>",
				"       <b role='presentation'></b></span>",
				"    </span>",
				"    <span class='oj-identity-loading-container oj-select-loading'>",
				"      <span class='oj-identity-loading' role='presentation'>",
				"       &nbsp;</span>",
				"    </span>",
				"  </div>",

				"  </div>",

				"   <ul class='oj-listbox-results' role='listbox'>",
				"   </ul>",
				"</div>"

			].join("")); //@HTMLUpdateOK

			return container;
		},

		//_OjSingleIdentity
		_enable: function (enabled) {
			_OjSingleIdentity.superclass._enable.apply(this, arguments);

			// - dropdown icon is in disabled state after enabling ojidentity
			if (this._enabled) {
				this.container.find(".oj-select-choice").attr("tabindex", "0");
				this.container.find(".oj-select-arrow").removeClass("oj-disabled");
			} else {
				//Don't allow focus on a disabled "select"
				this.container.find(".oj-select-choice").attr("tabindex", "-1");
				// - disabled select icon hover still shows changes
				this.container.find(".oj-select-arrow").addClass("oj-disabled");
			}
		},

		//_OjSingleIdentity
		close: function (event) {
			if (!this._opened())
				return;
			_OjSingleIdentity.superclass.close.apply(this, arguments);

			this.container.find(".oj-select-choice")
				.attr("aria-expanded", false);

			// - required validation err is not displayed when user tabs out
			//always clear search text when dropdown close
			if (!this._testClear(event))
				this._clearSearch();

			// - ojidentity input field grabs focus on paste
			//don't set focus on the select box if event target is not select element
			if (!(event instanceof MouseEvent) ||
				event.target == this.selection || event.target == this.search) {
				_IdentityUtils._focus(this.selection);
			}

			///remove "mouse click" listeners on spyglass
			this.container.find(".oj-listbox-spyglass-box").off("mouseup click");
		},

		//_OjSingleIdentity
		_opening: function (event, dontUpdateResults) {
			_OjSingleIdentity.superclass._opening.apply(this, arguments);

			var searchText;
			// - start typing 1 letter on select box, but 2 letters displayed on searchbox
			//In case of chrome/IE, typed key is added on search element as we move focus from select element to search
			//But this is not happening on firefox and hence we need to set it as part of select element's event
			//and kill the event to avoid duplicate charecters on search field later in IE/chrome.
			//Dropdown popup will be opened on up/down/left/right arrows so excluding those as search text.
			if (event && event.type == "keydown" && !(event.which == _IdentityUtils.KEY.UP || event.which == _IdentityUtils.KEY.DOWN ||
				event.which == _IdentityUtils.KEY.LEFT || event.which == _IdentityUtils.KEY.RIGHT)) {
				searchText = String.fromCharCode(event.which);
				_IdentityUtils.killEvent(event); // kill event to prevent duplicate keys in search field.
			}

			//if searchbox is already opened
			if (this._opened()) {
				searchText = this.search.val();
			}
			//select: focus still stay on the selectBox if open dropdown by mouse click
			this._showSearchBox(searchText);

			if (!dontUpdateResults) {
				if (searchText)
					this._updateResults();
				else
					this._updateResults(true);
			}
		},

		//_OjSingleIdentity
		_showDropDown: function () {
			if (!this._opened()) {
				// Just to make sure that _opening() method is called before calling
				// the _showDropDown().
				return;
			}

			_OjSingleIdentity.superclass._showDropDown.apply(this, arguments);
			this.container.find(".oj-select-choice").attr("aria-expanded", true);

			var el,
			    range,
			    len;

			//James: tab out of an expanded poplist, focus is going all the way to the top of the page.
			if (this._hasSearchBox()) {
				el = this.search.get(0);
				if (el.createTextRange) {
					range = el.createTextRange();
					range.collapse(false);
					range.select();
				} else if (el.setSelectionRange) {
					len = this.search.val().length;
					el.setSelectionRange(len, len);
				}
			}
		},

		//_OjSingleIdentity
		_initContainer: function () {
			///ojidentity placeholder
			var selectedId = this.containerId + "_selected";
			this.text      = this.container.find(".oj-select-chosen").attr("id", selectedId);

			_OjSingleIdentity.superclass._initContainer.apply(this, arguments);

			///select: accessibility
			this.container.find(".oj-select-choice")
				.attr({
					"aria-owns"       : this.search.attr("aria-owns"),
					"aria-labelledby" : this.search.attr("aria-labelledby"),
					"aria-describedby": selectedId
				});

			// - missing select label
			var label = this.opts.element.attr("aria-label");
			if (label)
				this.selection.attr("aria-label", label);

			this.search.on("keydown", this._bind(this._containerKeydownHandler));
			this.search.on("keyup-change input", this._bind(this._containerKeyupHandler));

			// - nls: hardcoded string 'search field' in select component
			//this.search.attr("title", this.ojContext.getTranslatedString("seachField"));

			// - required validation err is not displayed when user tabs out
			var self = this;
			this.selection.on("blur", function (e) {
				self._testClear(e);
			});

		},

		//_OjSingleIdentity
		_initSelection: function () {
			if (this._isPlaceholderOptionSelected()) {
				this._updateSelection(null);
				this.close();
				this._setPlaceholder();
			} else {
				_OjSingleIdentity.superclass._initSelection.apply(this, arguments);
			}

		},

		//_OjSingleIdentity
		_updateSelectedOption: function (selected) {
			if (selected !== undefined && selected !== null) {
				//ojIdentity by default use first option if user set a value which is not listed in original option items.
				//So need to update options to reflect the correct value in component state.
				var value = this.getVal();
				value     = Array.isArray(value) ? value[0] : value;

				if (JSON.stringify(value) !== JSON.stringify(selected)) {
					//no previous value
					if (value === undefined || value === null) {
						this.ojContext.options['value'] = Array.isArray(selected) ? selected : [selected];
					}
					//fire optionChange event
					else {
						this.setVal(Array.isArray(selected) ? selected : [selected]);
					}
				}
				this._updateSelection(selected);
				this.close();
			}

		},

		//_OjSingleIdentity
		_updateSelection: function (data) {
			this.selection.data(this._elemNm, data);
			// - ojet select displaying values incorrectly
			if (data !== null) {
				this.text.text(data[this.opts.optionsKeys['label']]);
			}
			///ojidentity placeholder
			///reduce number of call to setVal
			///this.setVal(data? this.opts.id(data) : data);

			//make sure placeholder text has "oj-select-default" class
			if (data && data.id != "")
				this.text.removeClass(this._classNm + "-default");

			if (this.opts.allowClear) {
				this.container.addClass(this._classNm + "-allowclear");
			}
		},

		//_OjSingleIdentity
		_getActiveContainer: function () {
			var expanded = this.search.attr("aria-expanded");
			return (expanded && this._hasSearchBox()) ? this.search : this.selection;
		},

		//_OjSingleIdentity
		_isPlaceholderOptionSelected: function () {
			var placeholderOption;
			///ojidentity allow placeholder to be an empty string
			if (this._getPlaceholder() === null)
				return false; // no placeholder specified so no option should be considered

			var cval = this.getVal();
			cval     = Array.isArray(cval) ? cval[0] : cval;
			//This method is used to check whether placeholder text need to be displayed in ui or not and hence checking current value should be fine.
			return (cval === "") ||
				(cval === undefined) ||
				(cval === null);
		},

		//_OjSingleIdentity
		///ojidentity placeholder this method should be in AbstractOjChoice
		_getPlaceholder: function () {
			return this.opts.placeholder;
		},

		//_OjSingleIdentity
		///ojidentity placeholder
		_showPlaceholder: function () {
			return true;
		},

		//_OjSingleIdentity
		_setPlaceholder: function () {
			var placeholder = this._getPlaceholder();

			if (this._isPlaceholderOptionSelected() && placeholder !== undefined) {
				if (placeholder === undefined)
					placeholder = "";
				this.text.text(placeholder).addClass(this._classNm + "-default");
				this.container.removeClass(this._classNm + "-allowclear");
			}
		},

		//_OjSingleIdentity
		setVal: function (val, event, context) {
			///pass original event
			_OjSingleIdentity.superclass.setVal.call(this, val, event, context);
			this.selection.data("selectVal", val);
		},

		//_OjSingleIdentity
		_containerKeydownHandler: function (e) {
			// - strange text show up after type in "<" in the select component
			if ((_IdentityUtils.KEY.isControl(e) && e.which != _IdentityUtils.KEY.SHIFT) ||
				_IdentityUtils.KEY.isFunctionKey(e)) {
				return;
			}

			switch (e.which) {
				case _IdentityUtils.KEY.TAB:
					/*
					 this._selectHighlighted(
					 {
					 noFocus : true
					 }, e   ///pass original event
					 );
					 */
					this.close(e);
					//James: tab out of an expanded poplist, focus is going all the way to the top of the page.
					this.selection.focus();

					// - required validation err is not displayed when user tabs out
					this._testClear(e);
					return;

				// open dropdown on Enter
				case _IdentityUtils.KEY.ENTER:
					if (e.target === this.selection[0] && !this._opened()) {
						this.open(e);
						_IdentityUtils.killEvent(e);
						return;
					}
					break;
			}

			var hasSearchBoxAlready = this._hasSearchBox();
			_OjSingleIdentity.superclass._containerKeydownHandler.apply(this, arguments);

			if (this._userTyping && !this._opened())
				this.open(e);

			// 19556686 show searchbox when it is not already shown  in dropdown and user starts typing text
			if (!hasSearchBoxAlready && this._userTyping) {
				var c;
				if (e.which != _IdentityUtils.KEY.LEFT && e.which != _IdentityUtils.KEY.RIGHT) {
					c = String.fromCharCode(e.which);
				}
				this._showSearchBox(c);
				this._updateResults();
				// - start typing 1 letter on select box, but 2 letters displayed on searchbox
				// Need to kill event to prevent duplicate characters on ie/chrome.
				_IdentityUtils.killEvent(e);
			}

		},

		//_OjSingleIdentity
		// - required validation err is not displayed when user tabs out
		_testClear: function (event) {
			if (this.text.text() == "") {
				this._clear(event);
				return true;
			}
			return false;
		},

		//_OjSingleIdentity
		_showSearchBox: function (searchText) {
			var focusOnSearchBox = false;
			var searchBox        = this.dropdown.find(".oj-listbox-search");
			if (searchBox) {
				//hide and show the search box
				if (this._hasSearchBox()) {
					this.dropdown.find(".oj-listbox-search-wrapper")
						.removeClass("oj-helper-hidden-accessible");

					$(searchBox).removeAttr("aria-hidden");
					this.search.val(searchText);
					focusOnSearchBox = true;

				} else {
					this.dropdown.find(".oj-listbox-search-wrapper")
						.addClass("oj-helper-hidden-accessible");

					$(searchBox).attr("aria-hidden", "true");

				}
			}

			//if search box is being displayed, focus on the search box otherwise focus on the select box
			_IdentityUtils._focus(focusOnSearchBox ? this.search : this.selection);

			///disable "click" on spyglass
			if (focusOnSearchBox) {
				var self = this;
				searchBox.find(".oj-listbox-spyglass-box").on("mouseup click", function (e) {
					self.search.focus();
					e.stopPropagation();
				});
			}

		},

		//_OjSingleIdentity
		_hasSearchBox: function () {
			var threshold = this.opts.minimumResultsForSearch;
			var len;
			if (this.opts['list'])
				len = $("#" + this.opts['list']).find("li").length;
			else
				len = this.datalist ? this.datalist[0].length : (this.opts.options ? this.opts.options.length : 0);

			return (len > threshold || this._userTyping || $.isFunction(this.opts.options));
		}

	});

	/**
	 * Copyright (c) 2014, Oracle and/or its affiliates.
	 * All rights reserved.
	 */

	/**
	 * @preserve Copyright 2012 Igor Vaynberg
	 *
	 * This software is licensed under the Apache License, Version 2.0 (the "Apache License") or the GNU
	 * General Public License version 2 (the "GPL License"). You may choose either license to govern your
	 * use of this software only upon the condition that you accept all of the terms of either the Apache
	 * License or the GPL License.
	 *
	 * You may obtain a copy of the Apache License and the GPL License at:
	 *
	 * http://www.apache.org/licenses/LICENSE-2.0
	 * http://www.gnu.org/licenses/gpl-2.0.html
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under the
	 * Apache License or the GPL Licesnse is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
	 * CONDITIONS OF ANY KIND, either express or implied. See the Apache License and the GPL License for
	 * the specific language governing permissions and limitations under the Apache License and the GPL License.
	 */
	/**
	 * @private
	 */
	var _AbstractMultiIdentity = _IdentityUtils.clazz(_AbstractOjIdentity, {
		_prepareOpts: function () {
			var opts = _AbstractMultiIdentity.superclass._prepareOpts.apply(this, arguments),
			    self = this;

			var tagName = opts.element.get(0).tagName.toLowerCase();
			if ((tagName === "input" && opts.element.attr("list")) ||
				(tagName === "select" && opts.element.children().length > 0) ||
				opts["list"]) {
				var eleName = opts['list'] ? "li" : "option";

				// install the selection initializer
				opts.initSelection = function (element, callback) {
					var data           = [],
					    selectedValues = self.getVal();
					var selected;
					if (selectedValues) {
						var ids = selectedValues;
						for (var i = 0; i < ids.length; i++) {
							var id   = ids[i];
							selected = element.find(eleName).filter(function () {
								if (eleName === "option")
									return this.value === id;
								else if (eleName === "li")
									return this.getAttribute("oj-data-value") === id;
							});
							if (selected && selected.length) {
								data.push(self._optionToData(selected));
							} else {
								// If user entered value which is not listed in predefiend options
								data.push({
									'value': id,
									'label': id
								});
							}

						}
					}
					// don't do this for select since it returns the first option as selected by default
					else if (tagName !== "select") {
						selected = element.find(eleName).filter(function () {
							if (eleName === "option")
								return this.selected;
							else if (eleName === "li")
								return this.getAttribute("oj-data-selected") === true;
						});
						_IdentityUtils.each2(selected, function (i, elm) {
							data.push(self._optionToData(elm));
						});
					}
					callback(data);
				};
			} else if ("options" in opts) {
				if ($.isFunction(opts.options)) {
					// install default initSelection when applied to hidden input and data is remote
					opts.initSelection = function (element, callback) {
						var findOptions = function (results, optionValues) {
							var foundOptions = [];
							for (var i = 0, l = results.length; i < l; i++) {
								var result = results[i];
								var idx    = opts.indexOf.call(results, result);
								if (idx >= 0) {
									foundOptions.push(result);
								}

								if (result.children) {
									var childOptions = findOptions(result.children, optionValues);
									if (childOptions && childOptions.length)
										$.merge(foundOptions, childOptions);
								}
							}

							return foundOptions;
						};

						var ids     = self.getVal();
						//search in data by array of ids, storing matching items in a list
						var matches = [];

						// This data will be saved after querying the options.
						var queryResult = _IdentityUtils.getLastQueryResult(self);
						if (queryResult) {
							matches = findOptions(queryResult, ids);
						}

						var reorderOptions = function () {
							// Reorder matches based on the order they appear in the ids array because right now
							// they are in the order in which they appear in data array.
							// If not found in the current result, then will check in the saved current item.
							var ordered = [];
							for (var i = 0; i < ids.length; i++) {
								var id    = ids[i];
								var found = false;
								for (var j = 0; j < matches.length; j++) {
									var match = matches[j];
									if (JSON.stringify(id) === JSON.stringify(match)) {
										ordered.push(match);
										matches.splice(j, 1);
										found = true;
										break;
									}
								}
								if (!found) {
									// currentItem will hold the selected object with value and label.
									// Which updated everytime value is changed.
									var currentItem = self.currentItem;
									if (currentItem && currentItem.length) {
										for (var k = 0; k < currentItem.length; k++) {
											if (JSON.stringify(id) === JSON.stringify(currentItem[k])) {
												ordered.push(currentItem[k]);
												found = true;
												break;
											}
										}
									}

									if (!found) {
										//If user entered value which is not listed in predefiend options
										ordered.push(id);
									}
								}
							}

							callback(ordered);
						};

						// valueChangeTrigger will have one of the values from
						// _IdentityUtils._ValueChangeTriggerTypes, which represents the
						// what triggered the value change. But if value is programmatically
						// updated this will be null. So if valueChangeTrigger is null
						// querying for the options again as component will not have list
						// of options in case value is updated programmatically.
						if (!self.valueChangeTrigger) {
							opts.query({
								value   : ids,
								callback: function (queryResult) {
									if (queryResult && queryResult.results) {
										var results = findOptions(queryResult.results, ids);
										if (results && results.length)
											$.merge(matches, results);
									}
									reorderOptions();
								}
							});
						} else {
							reorderOptions();
						}
					};
				} else {
					// install default initSelection when applied to hidden input and data is local
					//for multipleselect
					opts.initSelection = opts.initSelection || function (element, callback) {
							var ids     = self.getVal();
							//search in data by array of ids, storing matching items in a list
							var matches = [];
							opts.query({
								matcher : function (term, text, el) {
									var is_match = $.grep(ids, function (id) {
										return JSON.stringify(id) === JSON.stringify(el);
									}).length;
									if (is_match) {
										matches.push(el);
									}
									return is_match;
								},
								callback: !$.isFunction(callback) ? $.noop : function () {
									// reorder matches based on the order they appear in the ids array because right now
									// they are in the order in which they appear in data array
									var ordered = [];
									for (var i = 0; i < ids.length; i++) {
										var id    = ids[i];
										var found = false;
										for (var j = 0; j < matches.length; j++) {
											var match = matches[j];
											if (JSON.stringify(id) === JSON.stringify(match)) {
												ordered.push(match);
												matches.splice(j, 1);
												found = true;
												break;
											}
										}
										if (!found) {
											//If user entered value which is not listed in predefiend options
											ordered.push(id);
										}
									}
									callback(ordered);
								}
							});
						};
				}
			}
			return opts;
		},

		_selectChoice: function (choice) {
			var selected = this.container.find("." + this._classNm + "-selected-choice.oj-focus");
			if (selected.length && choice && choice[0] == selected[0]) {
			} else {
				if (selected.length) {
					this.opts.element.trigger("choice-deselected", selected);
				}
				selected.removeClass("oj-focus");
				if (choice && choice.length) {
					this.close();
					choice.addClass("oj-focus");
					this.container.find("." + this._classNm + "-description").text(choice.attr("valueText") + ". Press back space to delete.")
						.attr("aria-live", "assertive");
					this.opts.element.trigger("choice-selected", choice);
				}
			}
		},

		_destroy: function () {
			$("label[for='" + this.search.attr('id') + "']")
				.attr('for', this.opts.element.attr("id"));
			_AbstractMultiIdentity.superclass._destroy.apply(this, arguments);
		},

		_initContainer: function () {
			var selector = "." + this._classNm + "-choices",
			    selection,
			    idSuffix = _IdentityUtils.nextUid(),
			    elementLabel;

			this.searchContainer = this.container.find("." + this._classNm + "-search-field");
			this.selection       = selection = this.container.find(selector);

			var _this = this;
			this.selection.on("click", "." + this._classNm + "-selected-choice:not(." + this._classNm + "-locked)", function (e) {
				_this.search[0].focus(); //Fixed??
				_this._selectChoice($(this));
			});

			elementLabel = $("label[for='" + this.opts.element.attr("id") + "']");
			if (!elementLabel.attr("id"))
				elementLabel.attr('id', this._classNm + "-label-" + idSuffix);

			// add aria associations
			selection.find("." + this._classNm + "-input").attr("id", this._classNm + "-input-" + idSuffix);
			if (!this.results.attr("id"))
				this.results.attr("id", "oj-listbox-results-" + idSuffix);
			this.search.attr("aria-owns", this.results.attr("id"));
			this.search.attr("aria-labelledby", elementLabel.attr("id"));
			this.opts.element.attr("aria-labelledby", elementLabel.attr("id"));

			if (this.search.attr('id'))
				elementLabel.attr('for', this.search.attr('id'));

			if (this.opts.element.attr("aria-label"))
				this.search.attr("aria-label", this.opts.element.attr("aria-label"));

			if (this.opts.element.attr("aria-controls"))
				this.search.attr("aria-controls", this.opts.element.attr("aria-controls"));

			this.search.attr("tabindex", this.elementTabIndex);
			this.keydowns = 0;
			this.search.on("keydown", this._bind(function (e) {
				if (!this._isInterfaceEnabled())
					return;

				++this.keydowns;
				var selected = selection.find("." + this._classNm + "-selected-choice.oj-focus");
				var prev     = selected.prev("." + this._classNm + "-selected-choice:not(." + this._classNm + "-locked)");
				var next     = selected.next("." + this._classNm + "-selected-choice:not(." + this._classNm + "-locked)");
				var pos      = _IdentityUtils.getCursorInfo(this.search);

				if (selected.length &&
					(e.which == _IdentityUtils.KEY.LEFT || e.which == _IdentityUtils.KEY.RIGHT || e.which == _IdentityUtils.KEY.BACKSPACE || e.which == _IdentityUtils.KEY.DELETE || e.which == _IdentityUtils.KEY.ENTER)) {
					var selectedChoice = selected;
					if (e.which == _IdentityUtils.KEY.LEFT && prev.length) {
						selectedChoice = prev;
					} else if (e.which == _IdentityUtils.KEY.RIGHT) {
						selectedChoice = next.length ? next : null;
					} else if (e.which === _IdentityUtils.KEY.BACKSPACE) {
						this._unselect(selected.first(), e);
						this.search.width(10);
						selectedChoice = prev.length ? prev : next;
					} else if (e.which == _IdentityUtils.KEY.DELETE) {
						this._unselect(selected.first(), e);
						this.search.width(10);
						selectedChoice = next.length ? next : null;
					} else if (e.which == _IdentityUtils.KEY.ENTER) {
						selectedChoice = null;
					}

					this._selectChoice(selectedChoice);
					_IdentityUtils.killEvent(e);
					if (!selectedChoice || !selectedChoice.length) {
						this.open();
					}
					return;
				} else if (((e.which === _IdentityUtils.KEY.BACKSPACE && this.keydowns == 1) ||
					e.which == _IdentityUtils.KEY.LEFT) && (pos.offset == 0 && !pos.length)) {
					this._selectChoice(selection.find("." + this._classNm + "-selected-choice:not(." + this._classNm + "-locked)").last());
					_IdentityUtils.killEvent(e);
					return;
				} else {
					this._selectChoice(null);
				}

				if (this._opened()) {
					switch (e.which) {
						case _IdentityUtils.KEY.UP:
						case _IdentityUtils.KEY.DOWN:
							this._moveHighlight((e.which === _IdentityUtils.KEY.UP) ? -1 : 1);
							_IdentityUtils.killEvent(e);
							return;
						case _IdentityUtils.KEY.ENTER:
							this._selectHighlighted(null, e);
							_IdentityUtils.killEvent(e);
							return;
						case _IdentityUtils.KEY.TAB:
							this.close(e);
							return;
						case _IdentityUtils.KEY.ESC:
							this._cancel(e);
							_IdentityUtils.killEvent(e);
							return;
					}
				}

				if (e.which === _IdentityUtils.KEY.TAB || _IdentityUtils.KEY.isControl(e) || _IdentityUtils.KEY.isFunctionKey(e) ||
					e.which === _IdentityUtils.KEY.ESC) {
					return;
				}

				// when user typed in text and hit enter, we don't want to open drop down
				if (e.which === _IdentityUtils.KEY.ENTER && this.search.val() && this._elemNm === "ojcombobox")
					return;

				switch (e.which) {
					case _IdentityUtils.KEY.UP:
					case _IdentityUtils.KEY.DOWN:
						this.open();
						_IdentityUtils.killEvent(e);
						return;
					case _IdentityUtils.KEY.PAGE_UP:
					case _IdentityUtils.KEY.PAGE_DOWN:
						// prevent the page from scrolling
						_IdentityUtils.killEvent(e);
						return;
					case _IdentityUtils.KEY.ENTER:
						// prevent form from being submitted
						_IdentityUtils.killEvent(e);
						return;
				}
			}));

			this.search.on("keyup", this._bind(function (e) {
				this.keydowns = 0;
			}));

			this.search.on("blur keyup", this._bind(function (e) {
				if (e.type === 'keyup' && e.keyCode !== 10 && e.keyCode !== 13) return;

				if (this.opts["manageNewEntry"] && this.search.val() && this.results.find(".oj-hover").length <= 0) {
					var data = this.opts["manageNewEntry"](this.search.val());

					var trigger = e.type === "blur" ?
						_IdentityUtils.ValueChangeTriggerTypes.BLUR :
						_IdentityUtils.ValueChangeTriggerTypes.ENTER_PRESSED;
					var options = {
						trigger: trigger
					};

					this._onSelect(data, options, e);
				}
				this.search.removeClass(this._classNm + "-focused");
				this.container.removeClass("oj-focus");
				this._selectChoice(null);
				if (!this._opened())
					this._clearSearch();
				e.stopImmediatePropagation();
			}));

			this.container.on("click touchstart", selector, this._bind(function (e) {
				if (!this._isInterfaceEnabled())
					return;
				if ($(e.target).closest("." + this._classNm + "-selected-choice").length > 0) {
					// clicked inside a selected choice, do not open
					return;
				}
				this._selectChoice(null);
				if (this._opened()) {
					this.close(e);
				} else {
					this.open();
					this._focusSearch();
				}
				e.preventDefault();
			}));

			this.container.on("focus", selector, this._bind(function () {
				if (!this._isInterfaceEnabled())
					return;
			}));

			this._initContainerWidth();
			this.opts.element.hide()
				.attr("aria-hidden", true);

			// set the placeholder if necessary
			this._clearSearch();
		},

		_enableInterface: function () {
			if (_AbstractMultiIdentity.superclass._enableInterface.apply(this, arguments)) {
				this.search.prop("disabled", !this._isInterfaceEnabled());
			}
		},

		_initSelection: function () {
			var selectedValues = this.getVal();
			if ((selectedValues === null || selectedValues.length === 0) && (this._classNm === "oj-select" || this.opts.element.text() === "")) {
				this._updateSelection([]);
				this.close();
				// set the placeholder if necessary
				this._clearSearch();
			}
			if (selectedValues !== null && selectedValues.length) {
				var self    = this,
				    element = this.opts.element;
				this.opts.initSelection.call(null, element, function (data) {
					if (data !== undefined && data !== null && data.length !== 0) {
						self._updateSelection(data);
						self.close();
						// set the placeholder if necessary
						self._clearSearch();
					}
				});
			}
		},

		_clearSearch: function () {
			var placeholder    = this._getPlaceholder(),
			    maxWidth       = this._getMaxSearchWidth(),
			    selectedValues = this.getVal();

			if (placeholder !== undefined && (!selectedValues || selectedValues.length === 0)) {
				this.search.attr("placeholder", placeholder);
				// stretch the search box to full width of the container so as much of the placeholder is visible as possible
				// we could call this._resizeSearch(), but we do not because that requires a sizer and we do not want to create one so early because of a firefox bug, see #944
				this.search.val("").width(maxWidth > 0 ? maxWidth : this.container.css("width"));

				//  when the component is pre-created, the input box would get the default size
				this.searchContainer.width("100%");
			} else {
				this.search.attr("placeholder", "");
				this.search.val("").width(10);

				// reset the search container, so the input doesn't go to the next line if there is still room
				this.searchContainer.width("auto");
			}
		},

		_opening: function (event, dontUpdateResults) {
			//if beforeExpand is not cancelled
			// beforeExpand event will be triggered in base class _shouldOpen method
			this._resizeSearch();
			_AbstractMultiIdentity.superclass._opening.apply(this, arguments);
			this._focusSearch();

			if (!dontUpdateResults)
				this._updateResults(true);

			this.search.focus();
		},

		close: function (event) {
			if (!this._opened())
				return;
			_AbstractMultiIdentity.superclass.close.apply(this, arguments);
		},

		_focus: function () {
			this.close();
			this.search.focus();
		},

		_updateSelection: function (data) {
			var ids      = [],
			    filtered = [],
			    self     = this;

			// filter out duplicates
			$(data).each(function () {
				if (self.opts.indexOf.call(ids, this) < 0) {
					ids.push(this);
					filtered.push(this);
				}
			});
			data = filtered;
			this.selection.find("." + this._classNm + "-selected-choice").remove();
			$(data).each(function () {
				self._addSelectedChoice(this);
			});

			// Storing this data so that it will be used when setting the display value.
			this.currentItem = data;

			this.opts.element.val(ids.length === 0 ? [] : ids);

			self._postprocessResults();

			//re-position after selection
			setTimeout(function () {
				self._positionDropdown();
			}, 0);
		},

		_onSelect: function (data, options, event) {
			if (!this._triggerSelect(data)) {
				return;
			}

			var self = this;
			var context;

			if (options && options.trigger) {
				context = {
					optionMetadata: {
						"trigger": options.trigger
					}
				};
			}

			//selection will be added when _SetValue is called
			//this._addSelectedChoice(data);
			//var id = this.id(data);
			//Clone the value before invoking setVal(), otherwise it will not trigger change event.
			var selectedValues = this.getVal();
			var val            = selectedValues ? selectedValues.slice(0) : [];

			$(data).each(function () {
				if (self.opts.indexOf.call(val, this) < 0) {
					val.push(this);
				}
			});
			this.setVal(val, event, context);
			if (this.select || !this.opts.closeOnSelect)
				this._postprocessResults(data, false, this.opts.closeOnSelect === true);
			if (this.opts.closeOnSelect) {
				this.close(event);
				this.search.width(10);
			}

			if (!options || !options.noFocus)
				this._focusSearch();
		},

		_cancel: function (event) {
			this.close(event);
			this._focusSearch();
		},

		_addSelectedChoice: function (data) {
			var enableChoice = !data.locked,
			    enabledItem  = $(
				    "<li class='" + this._classNm + "-selected-choice'>" +
				    "    <div></div>" +
				    "    <a href='#' onclick='return false;' role='button' aria-label='remove' class='" + this._classNm + "-clear-entry " +
				    "      oj-component-icon oj-clickable-icon-nocontext " + this._classNm + "-clear-entry-icon' tabindex='-1'>" +
				    "    </a>" +
				    "</li>"),
			    disabledItem = $(
				    //"<li class='oj-combobox-selected-choice oj-combobox-locked'>" +
				    "<li class='" + this._classNm + "-selected-choice " + this._classNm + "-locked'>" +
				    "<div></div>" +
				    "</li>");
			var choice       = enableChoice ? enabledItem : disabledItem,
			    id           = this.id(data),
			    formatted;

			formatted = this.opts.formatSelection(data);
			if (formatted !== undefined) {
				choice.find("div").addClass(this._classNm + "-selected-choice-label").text(formatted);
				choice.find("." + this._classNm + "-clear-entry").attr("aria-label", formatted + " remove");
				choice.attr("valueText", formatted);
			}
			if (enableChoice) {
				choice.find("." + this._classNm + "-clear-entry")
					.on("mousedown", _IdentityUtils.killEvent)
					.on("click dblclick", this._bind(function (e) {
						if (!this._isInterfaceEnabled())
							return;

						$(e.target).closest("." + this._classNm + "-selected-choice").fadeOut('fast', this._bind(function () {
							this._unselect($(e.target), e);
							this.selection.find("." + this._classNm + "-selected-choice.oj-focus").removeClass("oj-focus");
							this.close(e);
							this._focusSearch();
						})).dequeue();
						_IdentityUtils.killEvent(e);
					}));
			}
			choice.data(this._elemNm, data);

			// searchContainer is initialized in _initContainer() method.
			// And this can not be changed by an external developer. It is constructed by component only.
			choice.insertBefore(this.searchContainer); // @HtmlUpdateOk

		},

		_unselect: function (selected, event) {
			var selectedValues = this.getVal();
			var val            = selectedValues ? selectedValues.slice(0) : [],
			    data,
			    index,
			    self           = this;
			selected           = selected.closest("." + this._classNm + "-selected-choice");

			if (selected.length === 0) {
				//TODO: translation string
				throw "Invalid argument: " + selected + ". Must be ." + this._classNm + "-selected-choice";
			}
			data = selected.data(this._elemNm);
			if (!data) {
				// prevent a race condition when the 'x' is clicked really fast repeatedly the event can be queued
				// and invoked on an element already removed
				return;
			}

			// If the component is invalid, we will not get all the values matching the displayed value
			/*if (!this.ojContext.isValid())
			 val = _IdentityUtils.splitVal(this.opts.element.val(), this.opts.separator);*/
			var removedElem;

			while ((index = self.opts.indexOf.call(val, data)) >= 0) {
				removedElem = val.splice(index, 1);
				this.setVal(val, event);
				if (this.select)
					this._postprocessResults();
			}
			if (!(this.ojContext._IsRequired() && val.length === 0)) {
				selected.remove();
			}

			if (this.ojContext._IsRequired()) {
				this.ojContext.validate();
			}
		},

		_postprocessResults: function (data, initial, noHighlightUpdate) {
			var selectedValues = this.getVal(),
			    val            = (selectedValues && (this.opts.element.val() || this.ojContext.isValid())) ? selectedValues : [],
			    choices        = this.results.find(".oj-listbox-result"),
			    self           = this;

			_IdentityUtils.each2(choices, function (i, choice) {
				var id = self.id(choice.data(self._elemNm));
				if (val && self.opts.indexOf.call(val, id) >= 0) {
					choice.addClass("oj-selected");
					// mark all children of the selected parent as selected
					choice.find(".oj-listbox-result-selectable").addClass("oj-selected");
				}
			});

			if (!choices.filter('.oj-listbox-result:not(.oj-selected)').length > 0)
				this.close();
		},

		_getMaxSearchWidth: function () {
			return this.selection.width() - _IdentityUtils.getSideBorderPadding(this.search);
		},

		_textWidth: function (text) {
			var textSpan = document.createElement("span"),
			    textNode = document.createTextNode(text);

			textSpan.style.display = "none";
			textSpan.appendChild(textNode); //@HTMLUpdateOK
			$('body').append(textSpan); //@HTMLUpdateOK
			var width = $('body').find('span:last').width();
			$('body').find('span:last').remove();
			return width;
		},

		_resizeSearch: function () {
			var minimumWidth,
			    left,
			    maxWidth,
			    containerLeft,
			    searchWidth,
			    sideBorderPadding = _IdentityUtils.getSideBorderPadding(this.search);

			minimumWidth  = this._textWidth(this.search.val()) + 10;
			left          = this.search.offset().left;
			maxWidth      = this.selection.width();
			containerLeft = this.selection.offset().left;
			searchWidth   = maxWidth - (left - containerLeft) - sideBorderPadding;
			if (searchWidth < minimumWidth) {
				searchWidth = maxWidth - sideBorderPadding;
			}
			if (searchWidth < 40) {
				searchWidth = maxWidth - sideBorderPadding;
			}
			if (searchWidth <= 0) {
				searchWidth = minimumWidth;
			}
			this.search.width(Math.floor(searchWidth));
		},

		setVal: function (val, event, context) {
			var unique = [],
			    self   = this;

			if (typeof val === "string")
				val = _IdentityUtils.splitVal(val, this.opts.separator);
			// filter out duplicates
			for (var i = 0; i < val.length; i++) {
				if (self.opts.indexOf.call(unique, val[i]) < 0)
					unique.push(val[i]);
			}

			var options = {
				doValueChangeCheck: false
			};
			if (context)
				options["_context"] = context;

			//this.opts.element.val(unique.length !== 0 ? 'DUMMY_VALUE' : null);
			this.opts.element.val(val.length !== 0 ? val : null);

			this.ojContext._updateValue(unique, event, options);

			this.search.attr("aria-activedescendant", this.opts.element.attr("id"));
		}
	});

	/**
	 * Copyright (c) 2014, Oracle and/or its affiliates.
	 * All rights reserved.
	 */

	/**
	 * @preserve Copyright 2012 Igor Vaynberg
	 *
	 * This software is licensed under the Apache License, Version 2.0 (the "Apache License") or the GNU
	 * General Public License version 2 (the "GPL License"). You may choose either license to govern your
	 * use of this software only upon the condition that you accept all of the terms of either the Apache
	 * License or the GPL License.
	 *
	 * You may obtain a copy of the Apache License and the GPL License at:
	 *
	 * http://www.apache.org/licenses/LICENSE-2.0
	 * http://www.gnu.org/licenses/gpl-2.0.html
	 *
	 * Unless required by applicable law or agreed to in writing, software distributed under the
	 * Apache License or the GPL Licesnse is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
	 * CONDITIONS OF ANY KIND, either express or implied. See the Apache License and the GPL License for
	 * the specific language governing permissions and limitations under the Apache License and the GPL License.
	 */
	/**
	 * @private
	 */
	var _OjMultiIdentity = _IdentityUtils.clazz(_AbstractMultiIdentity, {
		_elemNm : "ojidentity",
		_classNm: "oj-select",

		_createContainer: function () {
			var container = $(document.createElement("div")).attr({
				"class": "oj-identity oj-select oj-select-multi oj-component"
			}).html([ //@HTMLUpdateOK
				"<div class='oj-identity-select'>",
				"  <ul class='oj-select-choices'>",
				"    <li class='oj-select-search-field'>",
				"      <input type='text' role='combobox' aria-expanded='false' aria-autocomplete='list' autocomplete='off' autocorrect='off' autocapitalize='off' spellcheck='false' class='oj-listbox-input'>",
				"    <span class='oj-identity-loading-container oj-multi-loading'>",
				"      <span class='oj-identity-loading' role='presentation'>",
				"       &nbsp;</span>",
				"    </li>",
				"  </ul>",
				"</div>",
				"<span class='oj-identity-filter multiple'></span>",
				"<div class='oj-select-description oj-helper-hidden-accessible'/>",
				"<div class='oj-listbox-drop oj-identity-container oj-listbox-drop-multi' style='display:none'>",
				"   <ul class='oj-listbox-results' role='listbox'>",
				"   </ul>",
				"</div>"
			].join(""));
			return container;
		}
	});

	var registerWidget = function (name, base, prototype, isHidden) {
		$.widget(name, base, prototype);

		if (isHidden) {
			var globalName = name.split('.')[1];
			delete $['fn'][globalName];
		}

		// create single-OJ pseudo-selector for component, e.g. ":oj-menu", in addition to the ":oj-ojMenu" that $.widget() creates.
		// for private components it will begin with an underscore, e.g.,  ":_oj-radio"
		{
			if (name.substring(0, 5) === "oj.oj" || name.substring(0, 6) === "oj._oj")
				var nameArray = name.split(".");
			var namespace  = nameArray[0];
			var simpleName = nameArray [1];
			var fullName   = namespace + "-" + simpleName;
			var isPrivate  = simpleName.substring(0, 1) === "_";
			// if private, make the single-oj pseudo-selector start with an underscore, like this -> "_oj-radio"
			var modifiedFullName; // "oj-Menu", "_oj-Radio".  Lowercased below.
			if (isPrivate) {
				modifiedFullName = "_" + namespace + "-" + simpleName.substring(3);
			}
			else {
				modifiedFullName = namespace + "-" + simpleName.substring(2);
			}

			// Capitalization doesn't seem to matter with JQ pseudos, e.g. for the existing double-oj pseudo, both $(":oj-ojMenu") and $(":oj-ojmenu") work.
			// So, follow JQUI's pattern of using toLowerCase here, which will lowercase not only the "M' in "Menu", but also any camelcased chars after that.
			$.expr[":"][modifiedFullName.toLowerCase()] = function (elem) {
				return !!$.data(elem, fullName);
			};
		}
	};

	var readingDirection = function () {
		var dir = document.documentElement.getAttribute("dir");
		if (dir)
			dir = dir.toLowerCase();
		return (dir === "rtl") ? "rtl" : "ltr";
	};

	var getCSSLengthAsInt = function (cssLength) {
		if (!isNaN(cssLength))
			return cssLength;

		if (cssLength && cssLength.length > 0 && cssLength != "auto") {
			var intLength = parseInt(cssLength, 10);

			if (isNaN(intLength))
				intLength = 0;

			return intLength;
		}
		else {
			return 0;
		}
	};

	var getCSSLengthAsFloat = function (cssLength) {
		if (!isNaN(cssLength))
			return cssLength;

		if (cssLength && cssLength.length > 0) {
			var floatLength = parseFloat(cssLength);

			if (isNaN(floatLength))
				floatLength = 0;

			return floatLength;
		}
		else {
			return 0;
		}
	};

	var getScrollBarWidth = (function () {
		var scrollBarWidth = 20;
		if ($.isNumeric(scrollBarWidth))
			return scrollBarWidth;

		/** @type {jQuery} **/
		var scrollBarMeasure = $("<div />");
		$(document.body).append(scrollBarMeasure);
		scrollBarMeasure.width(50).height(50)
			.css({
				'overflow'  : 'scroll',
				'visibility': 'hidden',
				'position'  : 'absolute'
			});

		/** @type {jQuery} **/
		var scrollBarMeasureContent = $("<div />");
		scrollBarMeasureContent.height(1);
		scrollBarMeasure.append(scrollBarMeasureContent);

		var insideWidth  = scrollBarMeasureContent.width();
		var outsideWitdh = scrollBarMeasure.width();
		scrollBarMeasure.remove();

		scrollBarWidth = outsideWitdh - insideWidth;
		return scrollBarWidth;
	})();

	var isWithinViewport = function (element, checkBrowserViewport) {

		function isVisible (alignBox, containerBox) {
			// 1px fudge factor for rounding errors
			if ((alignBox["bottom"] - containerBox["top"]) < -1)
				return false;

			var scrollBarWidth = (containerBox["overflowY"] === "auto" || containerBox["overflowY"] === "scroll") ?
				getScrollBarWidth : 0;
			if ((containerBox["bottom"] - scrollBarWidth) - alignBox["top"] < 1)
				return false;

			scrollBarWidth = ((containerBox["overflowX"] === "auto" || containerBox["overflowX"] === "scroll") &&
			readingDirection() === "rtl") ? getScrollBarWidth : 0;
			if ((alignBox["right"] - (containerBox["left"] + scrollBarWidth)) < -1)
				return false;

			scrollBarWidth = ((containerBox["overflowX"] === "auto" || containerBox["overflowX"] === "scroll") &&
			readingDirection() === "ltr") ? getScrollBarWidth : 0;
			if ((alignBox["left"] - (containerBox["right"] - scrollBarWidth)) > -1)
				return false;

			return true;
		};

		function hasOverflow (element) {
			return "visible" !== element.css("overflow-x") ||
				"visible" !== element.css("overflow-y");
		};

		function getRect (element) {
			var domElement = element[0];
			if (domElement.nodeType === 1) {
				var rec          = domElement.getBoundingClientRect();
				rec["overflowX"] = element.css("overflow-x");
				rec["overflowY"] = element.css("overflow-y");
				return rec;
			}
			else if ($.isWindow(domElement)) {
				var rec =
				    {
					    'width' : domElement['innerWidth'],
					    'height': domElement['innerHeight'],
					    'top'   : 0,
					    'bottom': domElement['innerHeight'],
					    'left'  : 0,
					    'right' : domElement['innerWidth']
				    };
				return rec;
			}
			return {'height': 0, 'width': 0};
		};

		if (!element)
			return false;

		var alignBox = getRect(element);

		// is the element visible in the browser viewport.
		if (checkBrowserViewport && !isVisible(alignBox, getRect($(window))))
			return false;

		// check that the element is not hidden in overflow
		var isWithinViewPort = true;
		var parent           = element.parent();
		while (isWithinViewPort && parent && parent.length > 0 && parent[0].nodeType === 1) {
			if (hasOverflow(parent)) {
				var parentBox = getRect(parent);
				// ignore elements with empty border-boxes
				if (parentBox['height'] > 0 && parentBox['width'] > 0) {
					isWithinViewPort = isVisible(alignBox, parentBox);
				}
			}
			parent = parent.parent();
		}

		return isWithinViewPort;
	};

	var isAligningPositionClipped = function (props) {
		// Alignment can be to an element, event or a rect but we only care to make this
		// check if alignment is to an element - .
		if (props["target"] && props["target"]["height"] > 0 && props["target"]["width"] > 0) {
			// if the target has a width and height greater than zero then it's an element
			/** @type {jQuery} */
			var positionOf = props["target"]["element"];
			return !isWithinViewport(positionOf);
		}
		else
			return false;
	};

	var normalizeHorizontalAlignment = function (position, isRtl) {
		// This assertion prevents security testing: someone could pass in a bogus position
		//oj.Assert.assertObject(position, "position");
		var target = $.extend({}, position);
		for (var i = 0; i < _ALIGN_RULE_PROPERTIES.length; i++) {
			var propName = _ALIGN_RULE_PROPERTIES[i];
			var align    = target[propName];
			if (align)
				target[propName] = align.replace("start", (isRtl ? "right" : "left"))
					.replace("end", (isRtl ? "left" : "right"))
					.replace("<", (isRtl ? "+" : "-"))
					.replace(">", (isRtl ? "-" : "+"));
		}

		return target;
	};

	var _ALIGN_RULE_PROPERTIES = ['my', 'at'];

	var identityWidget = {
		defaultElement   : "<select>",
		widgetEventPrefix: "oj",
		options          : {
			/**
			 * The threshold for showing the search box in the dropdown when it's expanded.
			 * The search box is always displayed when the results size is greater than
			 * the threshold, otherwise the search box is initially turned off.
			 * However, the search box is displayed as soon as the user starts typing.
			 * This property only applies to single-select.
			 *
			 * @expose
			 * @memberof! oj.ojIdentity
			 * @instance
			 * @type {number}
			 * @default <code class="prettyprint">10</code>
			 */
			minimumResultsForSearch: 10,
			noMatchesFound: 'No matches found',

			/**
			 * The placeholder text to set on the element.<p>
			 * If the <code class="prettyprint">placeholder</code> option is specified to a string, ojidentity will adds a placeholder item at the beginning of the dropdown list with
			 *<ul>
			 *<li>displayValue: placeholder text</li>
			 *<li>value: an empty string</li>
			 *</ul>
			 * The placeholder item in the dropdown is selectable. However, it's not a valid choice, i.e. validation will fail if the select component is a required field.<p>
			 * The placeholder item doesn't participate in the filtering, so it will not appear in the result list with a filter specified.<p>
			 * Placeholder text can be an empty string, please see the select placeholder cookbook demo.
			 *
			 * @example <caption>Initialize the select with the <code class="prettyprint">placeholder</code> option specified:</caption>
			 * $( ".selector" ).ojIdentity( { "placeholder": "Please select ..." } );
			 *
			 * @default <code class="prettyprint">undefined</code>
			 *
			 * @expose
			 * @access public
			 * @instance
			 * @memberof! oj.ojIdentity
			 * @type {string|null|undefined}
			 */
			placeholder: null,

			/**
			 * The id of the html list for the select.
			 *
			 * @example <caption>Initialize the select with the <code class="prettyprint">list</code> option specified:</caption>
			 * $( ".selector" ).ojIdentity( { "list": "list" } );
			 *
			 * @example <caption>The <code class="prettyprint">list</code> points to a html <code class="prettyprint">ul</code> element.
			 * The value for the list item should be specified with <code class="prettyprint">oj-data-value</code> field. By default, we use the first text node for search filtering. An optional <code class="prettyprint">oj-data-label</code> field can be added to the list item, in which case it will take precedence over the text node.</caption></caption>
			 * &lt;ul id="list"&gt;
			 * &lt;li oj-data-value="li1"&gt;Item 1&lt;/li&gt;
			 * &lt;li oj-data-value="li2"&gt;Item 2&lt;/li&gt;
			 * &lt;/ul&gt;
			 *
			 * @expose
			 * @memberof! oj.ojIdentity
			 * @instance
			 * @type {string|null|undefined}
			 */
			list: undefined,

			/**
			 * If multi-select is enabled for the select.
			 *
			 * @expose
			 * @memberof! oj.ojIdentity
			 * @instance
			 * @type {boolean}
			 * @default <code class="prettyprint">false</code>
			 *
			 * @example <caption>Initialize the Select with the <code class="prettyprint">multiple</code> option specified:</caption>
			 * $( ".selector" ).ojIdentity( { "multiple": true } );
			 */
			multiple: true,

			/**
			 * The option items for the Select. Instead of providing a list of option items, they can be specified as an array of objects containing value and label.
			 * The value is used as the value of the option item and label as the label.
			 *
			 * @expose
			 * @memberof! oj.ojIdentity
			 * @instance
			 * @type {Array}
			 *
			 * @example <caption>Initialize the Select with the <code class="prettyprint">options</code> option specified:</caption>
			 * $( ".selector" ).ojIdentity( { "options": [{value: 'option1', label: 'option1'}, {value: 'option2', label: 'option2'}, {value: 'option3', label: 'option3'},] } );
			 * @example <caption>Initialize the Select with group data:</caption>
			 * $( ".selector" ).ojIdentity( { "options": [{label : 'group1', children: [{value: 'option1', label: 'option1'}, {value: 'option2', label: 'option2'}]}, {label: 'group2', children: [{value: 'option3', label: 'option3'}]} ] } );
			 */
			options: null,

			/**
			 * Specify the key names to use in the options array.
			 *
			 * @expose
			 * @memberof! oj.ojIdentity
			 * @instance
			 * @type {Object}
			 *
			 * @example <caption>Initialize the Select with <code class="prettyprint">optionsKeys</code> specified. This allows the key names to be redefined in the options array.</caption>
			 * $( ".selector" ).ojIdentity( { "optionsKeys": {value : "state_abbr", label : "state_name"} } );
			 * @example <caption>Redefine keys for data with subgroups.</caption>
			 * $( ".selector" ).ojIdentity( { "optionsKeys": {label : "regions", children : "states", childKeys : {value : "state_abbr", label : "state_name"}} } );
			 */
			optionsKeys: {
				label: 'id',
				value: 'id'
			},

			/**
			 * Triggered immediately before the Select drop down is expanded.
			 *
			 * @expose
			 * @event
			 * @memberof! oj.ojIdentity
			 * @instance
			 * @property {Event} event <code class="prettyprint">jQuery</code> event object
			 * @property {Object} ui Parameters
			 *
			 * @example <caption>Initialize the Select with the <code class="prettyprint">beforeExpand</code> callback specified:</caption>
			 * $( ".selector" ).ojIdentity({
        		 *     "beforeExpand": function( event ) {}
        		 * });
			 *
			 * @example <caption>Bind an event listener to the <code class="prettyprint">ojbeforeexpand</code> event:</caption>
			 * $( ".selector" ).on( "ojbeforeexpand", function( event, ui ) {} );
			 */
			beforeExpand: null,

			/**
			 * Render the checkbox for select All
			 */
			selectAll      : true,
			selectLabel    : "Select All",
			defaultScope   : "user",
			showScopeFilter: false,
			scopesOptions  : [{
				label: 'All',
				value: 'all'
			}, {
				label: 'User',
				value: 'user'
			}, {
				label: 'Group',
				value: 'group'
			}, {
				label: 'Role',
				value: 'role'
			}],

			/**
			 * array with objects only
			 * this will return index.
			 * Use this function as indexOf.call(arrayContext, object)
			 * if array contains object then object key should be in same order in both parent and child array**/
			indexOf: function (childElem) {
				if (!childElem) {
					return -1;
				}

				var arrLen = this.length;
				var i      = 0;
				childElem  = JSON.stringify(childElem);

				for (; i < arrLen; i++) {
					// fastest way.
					// will fail if the object keys are unordered with comparing one-manpasin
					var parentElem = JSON.stringify(this[i]);

					if (parentElem === childElem) {
						return i;
					}
				}
				return -1;
			},

			/** this will return true if given array is a subset of parent array.
			 * Use this function as contains.call(arrayContext, childArray)
			 * if array contains object then object key should be in same order in both parent and child array**/
			contains: function (array) {
				if (!array) {
					return false;
				}

				var childLen  = array.length;
				var parentLen = this.length;
				var i         = 0,
				    j         = 0,
				    matched   = 0;

				for (; i < parentLen; i++) {
					// fastest way.
					// will fail if the object keys are unordered with comparing one-manpasin
					var parentStr = JSON.stringify(this[i]);

					for (j = 0; j < childLen; j++) {
						var childStr = JSON.stringify(array[j]);

						if (parentStr === childStr) {
							++matched;
							break;
						}
					}
				}
				return matched === parentLen;
			}

			/**
			 * The value of the select component. The data type of value is array. For a single select, only the first element of the array is used.
			 *
			 * @example <caption>Initialize the select with the <code class="prettyprint">value</code> option specified:</caption>
			 * $(".selector").ojIdentity({"value": ["option1"]});<br/>
			 *
			 * @example <caption>Get or set the <code class="prettyprint">value</code> option, after initialization:</caption>
			 * // Getter: returns value
			 * $(".selector").ojIdentity("option", "value");
			 * // Setter: sets value with array containing "option1"
			 * $(".selector").ojIdentity("option", "value", ["option1"]);
			 *
			 * @member
			 * @name  value
			 * @access public
			 * @instance
			 * @default When the value option is not set, the first option is used as its initial value if it exists.
			 * @memberof! oj.ojIdentity
			 * @type {Array}
			 */
		},

		/**
		 * Returns a jQuery object containing the element visually representing the select.
		 *
		 * <p>This method does not accept any arguments.
		 *
		 * @expose
		 * @memberof! oj.ojIdentity
		 * @instance
		 * @return {jQuery} the select
		 */
		widget: function () {
			if(this.select) {
				return this.select.container;
			} else {
				return this.element.parent();
			}
		},

		/**
		 * @override
		 * @private
		 * @memberof! oj.ojIdentity
		 */
		_ComponentCreate: function () {
			this._super();
			this._setup();
		},

		// native renderMode
		_nativeSetDisabled: function (disabled) {
			if (disabled) {
				this.element.attr("disabled", "");
				this.element.parent()
					.addClass("oj-disabled")
					.removeClass("oj-enabled");
			} else {
				this.element.removeAttr("disabled");
				this.element.parent()
					.removeClass("oj-disabled")
					.addClass("oj-enabled");
			}
		},

		_nativeChangeHandler: function (event) {
			//do nothing here
		},

		// native renderMode
		_jetSetup: function () {
			var opts     = {},
			    multiple = this.options.multiple;

			opts.element   = this.element;
			opts.ojContext = this;
			opts           = $.extend(this.options, opts);

			this.select = multiple ? new _OjMultiIdentity() : new _OjSingleIdentity();
			this.select._init(opts);
			var selectOptions = this.select.opts;

			this.select.container.addClass("oj-select-jet oj-form-control");
			this.element.val = function (val) {
				if (arguments.length) {
					selectOptions.value = val;
				}
				return selectOptions.value || [];
			}
		},

		//ojidentity
		_setup: function () {
			this._jetSetup();
		},

		/**
		 * Refreshes the visual state of the select. JET components require a <code class="prettyprint">refresh()</code> or re-init after the DOM is programmatically changed underneath the component.
		 *
		 * <p>This method does not accept any arguments.
		 *
		 * @expose
		 * @memberof! oj.ojIdentity
		 * @instance
		 */
		refresh: function () {
			this._super();

			// cleanup the old HTML and setup the new HTML markups
			this._cleanup();

			this._setup();
			//TODO: apply value in options for the selected value
		},

		/**
		 * @override
		 * @private
		 * @memberof! oj.ojIdentity
		 */
		_destroy: function () {
			this._super();
			this._cleanup();
		},

		//19670760, dropdown popup should be closed on subtreeDetached notification.
		_NotifyDetached: function () {
			this.select.close();
		},

		//19670760, dropdown popup should be closed on subtreeHidden notification.
		_NotifyHidden: function () {
			this.select.close();
		},

		/**
		 * Set the placeholder.
		 * @override
		 * @protected
		 * @memberof! oj.ojIdentity
		 */
		_SetPlaceholder: function (value) {
			/*
			 * Commented out the content to fix the side effect from
			 * the change made in EditableValue._initComponentMessaging (Revision: 9016).
			 * EditableValue called SetPlaceholder with an empty string which made
			 * every ojidentity to have an empty placeholder in the dropdown.
			 * Note: don't remove the method because there is more calls from EditableValue
			 * to ojidentity before this.select is initialized.
			 * ex: _GetContentElement

			 if (this.select)
			 {
			 this.select.opts.placeholder = value;
			 this.select._setPlaceholder();
			 }
			 */

		},

		_updateValue: function (val, event, options) {
			if (event) {
				options["_context"] = options["_context"] || {};
				$.extend(true, options["_context"], {
					"optionMetadata": {
						"trigger"  : "option_selected",
						"writeback": "shouldWrite"
					},
					"originalEvent" : event.originalEvent || event,
				});
				this.valueUpdated = true;
				this.option({value: val}, options);
				this.select._initSelection();
			}

			if (this._IsRequired() && val.length !== 0) {
				this.select.container.removeClass('oj-invalid');
				this.select.container.find('.oj-messaging-inline-container').remove();
			}
		},

		//for minification access: manpasin
		_SetPlaceholderOption: function (val) {
			this._super(val);
		},

		/**
		 * whether the placeholder option is set
		 *
		 * @memberof! oj.ojIdentity
		 * @instance
		 * @protected
		 */
		_HasPlaceholderSet: function () {
			// - an empty placeholder shows up if data changed after first binding
			return typeof this.options['placeholder'] === 'string';
		},

		/**
		 * Whether the component is required.
		 *
		 * @return {boolean} true if required; false
		 *
		 * @memberof oj.editableValue
		 * @instance
		 * @protected
		 */
		_IsRequired: function () {
			return this.options['required'];
		},

		/**
		 * Clear the placeholder option
		 *
		 * @memberof! oj.ojIdentity
		 * @instance
		 * @protected
		 */
		_ClearPlaceholder: function () {
			// - an empty placeholder shows up if data changed after first binding
			this._SetPlaceholderOption(null);
			this._SetPlaceholder(null);
		},

		//ojidentity
		_InitOptions: function (originalDefaults, constructorOptions) {
			var props = [{
				attribute     : "disabled",
				validateOption: true
			}, {
				attribute: "placeholder"
			}, {
				attribute     : "required",
				coerceDomValue: true,
				validateOption: true
			}, {
				attribute: "title"
			}
				// {attribute: "value", defaultOptionValue: null}
			];

			this._super(originalDefaults, constructorOptions);
			oj.EditableValueUtils.initializeOptionsFromDom(props, constructorOptions, this);

			// TODO: PAVI - Let's discuss
			if (this.options['value'] === undefined) {
				this.options['value'] = (this.element.attr('value') !== undefined) ? _IdentityUtils.splitVal(this.element.val(), ",") : null;
			} else {
				//clone the value, otherwise _setDisplayValue will not be invoked on binding value to ko observableArray.
				//TODO: Need to revisit this once 18724975 is fixed.
				var value = this.options['value'];
				if (Array.isArray(value)) {
					value = value.slice(0);
				}
				/*
				 else if(typeof value ==='string') {
				 value = [value];
				 }
				 */
				this.options['value'] = value;
			}
		},

		/**
		 * Updates display value.
		 * @override
		 * @protected
		 * @memberof! oj.ojIdentity
		 */
		_SetDisplayValue: function (displayValue) {
			//do nothing here
		},

		/**
		 * @return {object} identity object
		 */
		_GetDisplayValue: function () {
			return this.select.opts.value;
		},

		_updateDisplayValue: function () {
			if (!this.valueUpdated) {
				this.select._initSelection();
			} else {
				this.valueUpdated = false;
			}
		},

		/**
		 * Handles options specific to select.
		 * @override
		 * @protected
		 * @memberof! oj.ojIdentity
		 */
		_setOption: function (key, value, flags) {
			if (key === "value") {
				var element = this.select.opts.element;

				if (!value) {
					value = [];
				}
				// turn value to an array
				if (!Array.isArray(value))
					value = [value];

				// - ojidentity should ignore the invalid value set programmatically
				var newArr = [];
				for (var i = 0; i < value.length; i++) {
					//Note multi select doesn't have a validate method
					if (this.options['multiple'] || this.select.opts.validate(element, value[i]))
						newArr.push(value[i]);
				}

				this._super(key, newArr, flags);
				this._updateDisplayValue();
				return;
			} else if (key === "placeholder") {
				this.select.opts.placeholder = value ? value : null;
				this.select._setPlaceholder();
			} else if (key === "minimumResultsForSearch") {
				this.select.opts.minimumResultsForSearch = value;
			} else if (key === 'multiple') {
				this.options.multiple = value;
				this.refresh();
			} else if (key === 'defaultScope') {
				this.options.defaultScope = value;
				this.refresh();
			}

			if (key === "disabled") {
				if (value)
					this.select._disable();
				else
					this.select._enable();
			} else if (key === "options") {
				// - an empty placeholder shows up if data changed after first binding
				// - ojidentity - validator error message is not shown
				// - ojidentity tooltip no longer appears once options and value observables change
				this.select.opts.options = value;
				this.select.opts         = this.select._prepareOpts(this.select.opts);

				//make sure the value still valid
				this._super("value", this.select.getVal());
			} else {
				this._super(key, value, flags);
			}

		},

		_getDropdown: function () {
			// native renderMode
			if (this.select && this.select._opened()) {
				// - certain subids does not work inside a popup or dialog
				var dropdown = this.select.dropdown;
				if (dropdown &&
					dropdown.attr("data-oj-containerid") === this.select.containerId)
					return dropdown;
			}
			return null;
		},

		// native renderMode
		_cleanup: function () {
			this.select._destroy();
			this.select = undefined;
		},

		//////////////////     SUB-IDS     //////////////////

		/**
		 * <p>Sub-ID for the selected text in the select box. This is not available in the native renderMode.</p>
		 *
		 * @ojsubid oj-select-chosen
		 * @deprecated This sub-ID is not needed since it is not an interactive element.
		 * @memberof oj.ojIdentity
		 * @instance
		 *
		 * @example <caption>Get the selected text</caption>
		 * var node = $( ".selector" ).ojIdentity( "getNodeBySubId", {'subId': 'oj-select-chosen'} );
		 */

		/**
		 * <p>Sub-ID for the dropdown box. See the <a href="#minimumResultsForSearch">minimumResultsForSearch</a> option for details. This is not available in the native renderMode.</p>
		 *
		 * @ojsubid oj-select-drop
		 * @deprecated This sub-ID is not needed since it is not an interactive element.
		 * @memberof oj.ojIdentity
		 *
		 * @example <caption>Get the dropdown box</caption>
		 * var node = $( ".selector" ).ojIdentity( "getNodeBySubId", {'subId': 'oj-select-drop'} );
		 */

		/**
		 * <p>Sub-ID for the search box. Note:</p>
		 * <ul>
		 * <li>the search box is not always visible</li>
		 * <li>the Sub-Id is not available in the native renderMode</li>
		 * </ul>
		 * <p>See the <a href="#minimumResultsForSearch">minimumResultsForSearch</a> option for details.
		 * <p>See the <a href="#getNodeBySubId">getNodeBySubId</a> and
		 * <a href="#getSubIdByNode">getSubIdByNode</a> methods for details.
		 *
		 * @ojsubid oj-select-search
		 * @deprecated This sub-ID is not needed since it is not an interactive element.
		 * @memberof oj.ojIdentity
		 *
		 * @example <caption>Get the search box</caption>
		 * var node = $( ".selector" ).ojIdentity( "getNodeBySubId", {'subId': 'oj-select-search'} );
		 */

		/**
		 * <p>Sub-ID for the search input element. Note:</p>
		 * <ul>
		 * <li>the search input is not always visible</li>
		 * <li>the Sub-Id is not available in the native renderMode</li>
		 * </ul>
		 *
		 * <p>See the <a href="#minimumResultsForSearch">minimumResultsForSearch</a> option for details.</p>
		 *
		 * @ojsubid oj-listbox-input
		 * @deprecated please see oj-select-input
		 * @memberof oj.ojIdentity
		 */

		/**
		 * <p>Sub-ID for the filtered result list. This Sub-Id is not available in the native renderMode.</p>
		 *
		 * @ojsubid oj-select-results
		 * @deprecated This sub-ID is not needed since it is not an interactive element.
		 * @memberof oj.ojIdentity
		 *
		 * @example <caption>Get the filtered result list</caption>
		 * var node = $( ".selector" ).ojIdentity( "getNodeBySubId", {'subId': 'oj-select-results'} );
		 */

		/**
		 * <p>Sub-ID for the filtered result item. Note:</p>
		 * <ul>
		 * <li>To lookup a filtered result item, the dropdown must be open and the locator object should have:
		 *     subId: 'oj-listbox-result-label' and index: number.
		 * </li>
		 * <li>the Sub-Id is not available in the native renderMode</li>
		 * </ul>
		 *
		 * @ojsubid oj-listbox-result-label
		 * @deprecated This sub-ID is not needed since it is not an interactive element.
		 * @memberof oj.ojIdentity
		 *
		 * @example <caption>Get the filtered result item</caption>
		 * var node = $( ".selector" ).ojIdentity( "getNodeBySubId", {'subId': 'oj-listbox-result-label'} );
		 */

		/**
		 * <p>Sub-ID for the search input field. For a single select, it's only visible when the results size is greater than the minimumResultsForSearch threshold or when user starts typing into the select box. This Sub-Id is not available in the native renderMode.</p>
		 * @ojsubid oj-select-input
		 * @memberof oj.ojIdentity
		 *
		 * @example <caption>Get the input field element</caption>
		 * var node = $( ".selector" ).ojIdentity( "getNodeBySubId", {'subId': 'oj-select-input'} );
		 */

		/**
		 * <p>Sub-ID for the drop down arrow of single-select select. This Sub-Id is not available in the native renderMode.</p>
		 *
		 * @ojsubid oj-select-arrow
		 * @memberof oj.ojIdentity
		 *
		 * @example <caption>Get the drop down arrow of the single-select select</caption>
		 * var node = $( ".selector" ).ojIdentity( "getNodeBySubId", {'subId': 'oj-select-arrow'} );
		 */

		/**
		 * <p>Sub-ID for the list item. This Sub-Id is not available in the native renderMode.</p>
		 *
		 * @ojsubid oj-listitem
		 * @memberof oj.ojIdentity
		 *
		 * @example <caption>Get the listitem corresponding to value "myVal"</caption>
		 * var node = $( ".selector" ).ojIdentity( "getNodeBySubId", {'subId': 'oj-listitem', 'value': 'myVal'} );
		 */

		/**
		 * <p>Sub-ID for the remove icon of selected item for multi-select select. This Sub-Id is not available in the native renderMode.</p>
		 *
		 * @ojsubid oj-select-remove
		 * @memberof oj.ojIdentity
		 *
		 * @example <caption>Get the element corresponding to the remove icon for the selected item with
		 * value "myVal"</caption>
		 * var node = $( ".selector" ).ojIdentity( "getNodeBySubId", {'subId': 'oj-select-remove', 'value': 'myVal'} );
		 */

		getNodeBySubId: function (locator) {
			var node = null,
			    subId;
			if (locator == null) {
				var container = this.widget();
				return container ? container[0] : null;
			}
			// doesn't support any sub ID in native mode
			else if (this._isNative()) {
				return null;
			} else {
				node = this._super(locator);
			}

			if (!node) {
				var dropdown = this._getDropdown();

				subId = locator['subId'];
				switch (subId) {
					case "oj-select-drop":
						if (dropdown) {
							node = dropdown[0];
						}
						break;
					case "oj-select-results":
						if (dropdown)
							node = dropdown.find(".oj-listbox-results")[0];
						break;
					case "oj-select-search":
						if (dropdown)
							node = dropdown.find(".oj-listbox-search")[0];
						break;
					case "oj-select-input":
					case "oj-listbox-input":
						if (this.options['multiple'] === true)
							node = this.widget().find(".oj-listbox-input")[0];
						else {
							if (dropdown)
								node = dropdown.find(".oj-listbox-input")[0];
						}
						break;
					case "oj-select-choice":
					case "oj-select-chosen":
					case "oj-select-arrow":
						node = this.widget().find("." + subId)[0];
						break;
					case "oj-listitem":
						if (dropdown) {
							var list = dropdown.find(".oj-listbox-result");
							node     = this.select._findItem(list, locator['value']);
						}
						break;
					case "oj-select-remove":
						var selectedItems = this.widget().find(".oj-select-selected-choice");
						var item          = this.select._findItem(selectedItems, locator['value']);
						node              = item ? $(item).find(".oj-select-clear-entry-icon")[0] : null;
						break;

					// - ojidentity - not able to attach id for generated jet component
					case "oj-listbox-result-label":
						if (dropdown) {
							//list of 'li'
							var ddlist = $("#" + this.select.results.attr("id")).children();
							var index  = locator['index'];

							if (ddlist.length && index < ddlist.length) {
								node = ddlist.eq(index).find("." + subId)[0];
							}
						}
						break;
				}
			}
			// Non-null locators have to be handled by the component subclasses
			return node || null;
		},

		/**
		 * Returns the subId object for the given child DOM node.  For more details, see
		 * <a href="#getNodeBySubId">getNodeBySubId</a>.
		 *
		 * @expose
		 * @override
		 * @memberof oj.ojIdentity
		 * @instance
		 *
		 * @param {!Element} node - child DOM node
		 * @return {Object|null} The subId for the DOM node, or <code class="prettyprint">null</code> when none is found.
		 *
		 * @example <caption>Get the subId for a certain DOM node:</caption>
		 * var subId = $( ".selector" ).ojIdentity( "getSubIdByNode", node );
		 */
		getSubIdByNode: function (node) {
			if (this._isNative())
				return this._super(node);

			var subId = null;
			if (node != null) {
				var nodeCached = $(node);

				if (nodeCached.hasClass('oj-listbox-input'))
					subId = {
						'subId': 'oj-select-input'
					};
				else if (nodeCached.hasClass('oj-select-arrow'))
					subId = {
						'subId': 'oj-select-arrow'
					};
				else if (nodeCached.hasClass('oj-listbox-result'))
					subId = {
						'subId': 'oj-listitem',
						'value': nodeCached.data('ojidentity')['value']
					};
				else if (nodeCached.hasClass('oj-select-clear-entry-icon'))
					subId = {
						'subId': 'oj-select-remove',
						'value': nodeCached.closest('.oj-select-selected-choice').data('ojidentity')['value']
					};
			}

			return subId;
		},

		/**
		 * Returns the default styleclass for the component. Currently this is
		 * used to pass to the _ojLabel component, which will append -label and
		 * add the style class onto the label. This way we can style the label
		 * specific to the input component. For example, for inline labels, the
		 * radioset/checkboxset components need to have margin-top:0, whereas all the
		 * other inputs need it to be .5em. So we'll have a special margin-top style
		 * for .oj-label-inline.oj-radioset-label
		 * All input components must override
		 *
		 * @return {string}
		 * @expose
		 * @memberof! oj.ojIdentity
		 * @override
		 * @protected
		 */
		_GetDefaultStyleClass: function () {
			return "oj-select";
		},

		/**
		 * Returns the messaging launcher element i.e., where user sets focus that triggers the popup.
		 * Usually this is the element input or select that will receive focus and on which the popup
		 * for messaging is initialized.
		 *
		 * @override
		 * @protected
		 * @memberof! oj.ojIdentity
		 * @return {Object} jquery element which represents the messaging launcher component
		 */
		_GetMessagingLauncherElement: function () {
			// native renderMode
			if (this.select)
				return this.select.selection;
			else
				return this.element;
		},

		// Fragments:

		/**
		 * <table class="keyboard-table">
		 *   <thead>
		 *     <tr>
		 *       <th>Target</th>
		 *       <th>Gesture</th>
		 *       <th>Action</th>
		 *     </tr>
		 *   </thead>
		 *   <tbody>
		 *     <tr>
		 *       <td>Select box or Arrow button</td>
		 *       <td><kbd>Tap</kbd></td>
		 *       <td>If the drop down is not open, expand the drop down list. Otherwise, close the drop down list.</td>
		 *     </tr>
		 *     <tr>
		 *       <td>Option item</td>
		 *       <td><kbd>Tap</kbd></td>
		 *       <td>Tap on a option item in the drop down list to select/add a new item.</td>
		 *     </tr>
		 *     <tr>
		 *       <td>Selected Item with Clear Entry Button</td>
		 *       <td><kbd>Tap</kbd></td>
		 *       <td>Remove item from the selected items list by taping on the clear button next to the data item.</td>
		 *     </tr>
		 *     <tr>
		 *       <td>Drop down</td>
		 *       <td><kbd>swipe up/down</kbd></td>
		 *       <td>Scroll the drop down list vertically</td>
		 *     </tr>
		 *   </tbody>
		 * </table>
		 *
		 * @ojfragment touchDoc - Used in touch gesture section of classdesc, and standalone gesture doc
		 * @memberof oj.ojIdentity
		 */

		/**
		 * <table class="keyboard-table">
		 *   <thead>
		 *     <tr>
		 *       <th>Target</th>
		 *       <th>Key</th>
		 *       <th>Action</th>
		 *     </tr>
		 *   </thead>
		 *   <tbody>
		 *     <tr>
		 *       <td>Option item</td>
		 *       <td><kbd>Enter</kbd></td>
		 *       <td>Select the highlighted choice from the drop down list.</tr>
		 *     </tr>
		 *     <tr>
		 *       <td>Drop down</td>
		 *       <td><kbd>UpArrow or DownArrow</kbd></td>
		 *       <td>Highlight the option item in the direction of the arrow. If the drop down is not open, expand the drop down list.</tr>
		 *     </tr>
		 *     <tr>
		 *       <td>Drop down</td>
		 *       <td><kbd>Esc</kbd></td>
		 *       <td>Collapse the drop down list. If the drop down is already closed, do nothing.</tr>
		 *     </tr>
		 *     <tr>
		 *       <td>Select box or search box</td>
		 *       <td><kbd>any characters for the search term</kbd></td>
		 *       <td>filter down the results with the search term.</td>
		 *     </tr>
		 *   </tbody>
		 * </table>
		 *
		 * <p>Disabled option items receive no highlight and are not selectable.
		 *
		 * @ojfragment keyboardDoc - Used in keyboard section of classdesc, and standalone gesture doc
		 * @memberof oj.ojIdentity
		 */

	}

	registerWidget("oj.ojIdentity", $['oj']['editableValue'], identityWidget);
});

define('RendererTemplateLoader',['require','knockout','ojs/ojcore','!text!iconTemplate','!text!rendererControl','!text!rendererMoneyControl','!text!rendererButtonControl','!text!rendererChecklistControl','!text!rendererCheckboxControl','!text!rendererDateControl','!text!rendererDateTimeControl','!text!rendererEmailControl','!text!rendererLinkControl','!text!rendererMessageControl','!text!rendererMessageTypeParagraphTemplate','!text!rendererMessageTypeHeading1Template','!text!rendererMessageTypeHeading2Template','!text!rendererMessageTypeHeading3Template','!text!rendererMessageTypeHeading4Template','!text!rendererMessageTypeHeading5Template','!text!rendererMessageTypeHeading6Template','!text!rendererNumberControl','!text!rendererRadioButtonControl','!text!rendererSelectControl','!text!rendererSingleSelectTemplate','!text!rendererMultiSelectTemplate','!text!rendererTextAreaControl','!text!rendererTextControl','!text!rendererTimeControl','!text!rendererUrlControl','!text!rendererPhoneControl','!text!rendererImageControl','!text!rendererFormReferenceControl','!text!rendererVideoControl','!text!rendererIdentityControl','!text!rendererTemplate','!text!rendererPanelControl','!text!rendererSectionControl','!text!rendererTableControl','!text!rendererRepeatableSectionControl','!text!rendererTabControl','!text!rendererTableRow','!text!rendererRepeatableRow','!text!columnControl','!text!rendererSectionRow','!text!rendererPanelItem','!text!rendererRepeatableItem','!text!rendererTabContainerControl','ojs/ojknockout','ojs/ojcheckboxset','ojs/ojradioset','ojs/ojselectcombobox','ojs/ojinputnumber','ojs/ojdatetimepicker','ojs/ojknockout-validation','ojidentity'],function(require) {

    'use strict';
    //region dependencies
    var ko = require('knockout'),
        oj = require('ojs/ojcore'),
        templates = {
            iconTemplate: require('!text!iconTemplate'),
            rendererControl: require('!text!rendererControl'),
            rendererMoneyControl: require('!text!rendererMoneyControl'),
            rendererButtonControl: require('!text!rendererButtonControl'),
            rendererChecklistControl: require('!text!rendererChecklistControl'),
            rendererCheckboxControl: require('!text!rendererCheckboxControl'),
            rendererDateControl: require('!text!rendererDateControl'),
            rendererDateTimeControl: require('!text!rendererDateTimeControl'),
            rendererEmailControl: require('!text!rendererEmailControl'),
            rendererLinkControl: require('!text!rendererLinkControl'),
            rendererMessageControl: require('!text!rendererMessageControl'),
            rendererMessageTypeParagraphTemplate: require('!text!rendererMessageTypeParagraphTemplate'),
            rendererMessageTypeHeading1Template: require('!text!rendererMessageTypeHeading1Template'),
            rendererMessageTypeHeading2Template: require('!text!rendererMessageTypeHeading2Template'),
            rendererMessageTypeHeading3Template: require('!text!rendererMessageTypeHeading3Template'),
            rendererMessageTypeHeading4Template: require('!text!rendererMessageTypeHeading4Template'),
            rendererMessageTypeHeading5Template: require('!text!rendererMessageTypeHeading5Template'),
            rendererMessageTypeHeading6Template: require('!text!rendererMessageTypeHeading6Template'),
            rendererNumberControl: require('!text!rendererNumberControl'),
            rendererRadioButtonControl: require('!text!rendererRadioButtonControl'),
            rendererSelectControl: require('!text!rendererSelectControl'),
            rendererSingleSelectTemplate: require('!text!rendererSingleSelectTemplate'),
            rendererMultiSelectTemplate: require('!text!rendererMultiSelectTemplate'),
            rendererTextAreaControl: require('!text!rendererTextAreaControl'),
            rendererTextControl: require('!text!rendererTextControl'),
            rendererTimeControl: require('!text!rendererTimeControl'),
            rendererUrlControl: require('!text!rendererUrlControl'),
            rendererPhoneControl: require('!text!rendererPhoneControl'),
            rendererImageControl: require('!text!rendererImageControl'),
            rendererFormReferenceControl: require('!text!rendererFormReferenceControl'),
            rendererVideoControl: require('!text!rendererVideoControl'),
            rendererIdentityControl: require('!text!rendererIdentityControl'),
            rendererTemplate: require('!text!rendererTemplate'),
            rendererPanelControl: require('!text!rendererPanelControl'),
            rendererSectionControl: require('!text!rendererSectionControl'),
            rendererTableControl: require('!text!rendererTableControl'),
            rendererRepeatableSectionControl: require('!text!rendererRepeatableSectionControl'),
            rendererTabControl: require('!text!rendererTabControl'),
            rendererTableRow: require('!text!rendererTableRow'),
            rendererRepeatableRow: require('!text!rendererRepeatableRow'),
            columnControl: require('!text!columnControl'),
            rendererSectionRow: require('!text!rendererSectionRow'),
            rendererPanelItem: require('!text!rendererPanelItem'),
            rendererRepeatableItem: require('!text!rendererRepeatableItem'),
            rendererTabContainerControl: require('!text!rendererTabContainerControl')
        };

    require('ojs/ojknockout');
    require('ojs/ojcheckboxset');
    require('ojs/ojradioset');
    require('ojs/ojselectcombobox');
    require('ojs/ojinputnumber');
    require('ojs/ojdatetimepicker');
    require('ojs/ojknockout-validation');
    require('ojidentity');

    //endregion

    oj.koStringTemplateEngine.install();

    for (var name in templates) {
        /*istanbul ignore else*/
        if (templates.hasOwnProperty(name)) {
            ko.templates[name] = templates[name];
        }
    }

});

define('Class',['require','underscore'],function(require) {
	'use strict';
	var _ = require('underscore');

	var initializing = false,
		//Inspired by John Ressig, detects if test treats a function like a String
		fnTest = /xyz/.test(function() {
			xyz;
		}) ? /\b_super\b/ : /.*/,
		/**
		 * Augments an object prototype with the properties of another object. If a new property overwrites an existing
		 * property of the target object it search for the existence of a _super method. If found, then bounds an
		 * anonymous function with the super method.
		 */
		_include = function(proto, _super, obj) {
			for (var k in obj) {
				proto[k] = typeof obj[k] === 'function' && typeof _super[k] === 'function' && fnTest.test(obj[k]) ? function(name, fn) {
					return function() {
						var tmp = this._super;
						this._super = _super[name];
						var ret = fn.apply(this, arguments);
						this._super = tmp;
						return ret;
					};
				}(k, obj[k]) : obj[k];
			}
		},
		_extend = function(parent, obj) {
			for (var k in obj) {
				parent[k] = obj[k];
			}
		};
	//Base Class
	var $Class = function() {};
	/**
	 * Takes a class and creates a derived class with the augmented static and instance members. If init function
	 * is passed as a property in members it becomes the implicit constructor of the class instance. if <code>_super</code>
	 * is found in any member function that overwrites a parent function(<code>init</code> included) is found then
	 * is bound to the same function of the parent
	 *
	 * @param statics static class members
	 * @param members instance members. If a property init is passed as a function then it initializes the instance
	 * @return {Function}
	 */

	var PROTECTED = '_protected';

	$Class.subClass = function subClass(statics, members) {
		var _super = this.prototype;
		initializing = true;
		var prototype = new this();
		initializing = false;

		/**
		 * If the class has a _protected member object (with the protected variables inside)
		 * then the subclasses _protected variables will be merged with the fathers protected variables.
		 * NOTE: The protected objects will not be merged, the leave will be predominant.
		 * @see ClassesSpec.js
		 */
		function mergeProtected(obj) {
			// Gets the first parent Class
			var proto = Object.getPrototypeOf(Object.getPrototypeOf(obj));
			while (proto) {
				if (_.has(proto, PROTECTED)) {
					// we copy the father protected because the _extend overwrites it
					var copy = _(proto[PROTECTED]).clone();
					obj[PROTECTED] = _.extend(proto[PROTECTED], obj[PROTECTED]);
					proto[PROTECTED] = copy;
				}
				// to continue with the prototypal chain of Classes
				proto = Object.getPrototypeOf(proto);
			}
		}

		/**
		 * If the class has an array member
		 * then the subclasses array variables will be union with the fathers arrays.
		 * @see ClassesSpec.js
		 */
		function mergeArray(obj, arrayKey) {
			// Gets the first parent Class
			var proto = Object.getPrototypeOf(Object.getPrototypeOf(obj));
			while (proto) {
				if (_.has(proto, arrayKey)) {
					// we copy the father protected because the _extend overwrites it
					var copy = _(proto[arrayKey]).clone();
					obj[arrayKey] = _.union(proto[arrayKey], obj[arrayKey]);
					proto[arrayKey] = copy;
				}
				// to continue with the prototypal chain of Classes
				proto = Object.getPrototypeOf(proto);
			}
		}

		function Class() {
			if (!initializing && this.init) {

				for (var key in this) {
					//this iteration is correctly iterating over non members of this
					if (!_.isFunction(this[key])) {
						this[key] = _(this[key]).clone();
						if (key === PROTECTED) {
							mergeProtected(this);
						} else if (_.isArray(this[key])) {
							mergeArray(this, key);
						}
					}
				}
				this._class = Class;
				this.init.apply(this, arguments);
			}
		}
		if (this._super) {
			_extend(Class, this);
		}
		if (statics) {
			_extend(Class, statics);
		}
		if (members) {
			_include(prototype, this.prototype, members);
		}
		Class.prototype = prototype;
		Class.prototype.constructor = Class;
		Class._super = _super;
		Class.subClass = subClass;
		Class.extend = $Class.extend;
		Class.include = $Class.include;
		Class.prototype.parent = function(clazz, functionName) {
			// take all the arguments after functionName
			var args = Array.prototype.slice.call(arguments, 2);
			// call the function on super's prototype
			clazz.prototype[functionName].apply(this, args);
		};
		Class.prototype.proxy = function(fn) {
			var ctx = this;
			return function() {
				return fn.apply(ctx, arguments);
			};
		};
		Class.prototype.extend = function(obj) {
			_extend(this, obj);
		};
		Class.proxy = function(fn) {
			var ctx = this;
			return function() {
				return fn.apply(ctx, arguments);
			};
		};
		return Class;
	};
	/**
	 * Extends the class with static members from obj
	 * @param obj Mixed Object
	 */
	$Class.extend = function(obj) {
		_extend(this, obj);
	};
	/**
	 * Extends the class prototype with members from obj. Uses the same mechanics that subClass for _super binding
	 * @param obj Mixed Object
	 */
	$Class.include = function(obj) {
		_include.call(this, this.prototype, this._super, obj);
	};

	function createInit(init1, init2) {
		return function() {
			init1.apply(this, arguments);
			//init2.apply(this, arguments);
		};
	}

	$Class.extendClass = function(parent, obj) {
		for (var k in obj) {
			if (k === 'init') {
				parent[k] = createInit(parent[k], obj[k]);
			} else {
				parent[k] = parent[k] ? parent[k] : obj[k];
			}
		}
	};

	//Expose the class to the glabal module
	return $Class;
});

/*
 RequireJS i18n 2.0.2 Copyright (c) 2010-2012, The Dojo Foundation All Rights Reserved.
 Available via the MIT or new BSD license.
 see: http://github.com/requirejs/i18n for details
*/
(function(){function q(a,b,d,h,l,g){b[a]||(a=a.replace(/^zh-(Hans|Hant)-([^-]+)$/,"zh-$2"));return b[a]?(d.push(a),!0!==b[a]&&1!==b[a]||h.push(l+a+"/"+g),!0):!1}function B(a){var b=a.toLowerCase().split(/-|_/);a=[b[0]];var d=1,h;for(h=1;h<b.length;h++){var l=b[h],g=l.length;if(1==g)break;switch(d){case 1:if(d=2,4==g){a.push(l.charAt(0).toUpperCase()+l.slice(1));break}case 2:d=3;a.push(l.toUpperCase());break;default:a.push(l)}}if(!("zh"!=a[0]||1<a.length&&4==a[1].length)){b="Hans";d=1<a.length?a[1]:
null;if("TW"===d||"MO"===d||"HK"===d)b="Hant";a.splice(1,0,b)}return a}function x(a,b){for(var d in b)b.hasOwnProperty(d)&&(null==a[d]?a[d]=b[d]:"object"===typeof b[d]&&"object"===typeof a[d]&&x(a[d],b[d]))}var y=/(^.*(^|\/)nls(\/|$))([^\/]*)\/?([^\/]*)/;define('ojL10n',["module"],function(a){var b=a.config?a.config():{};return{version:"2.0.1+",load:function(a,h,l,g){g=g||{};g.locale&&(b.locale=g.locale);var c=y.exec(a),n=c[1],e,p=c[5],u,m=[],v={},f,w="",z,A,k,s,t,r;c[5]?(n=c[1],a=n+p,e=c[4]):(p=c[4],e=b.locale,
"undefined"!==typeof document?(e||(e=g.isBuild?"root":document.documentElement.lang)||(e=void 0===navigator?"root":navigator.language||navigator.userLanguage||"root"),b.locale=e):e="root");u=B(e);z=b.noOverlay;A=b.defaultNoOverlayLocale;if(c=b.merge)if(k=c[n+p])c=y.exec(k),s=c[1],t=c[4];r=[];for(f=0;f<u.length;f++)c=u[f],w+=(w?"-":"")+c,r.push(w);g.isBuild?(m.push(a),k&&m.push(k),h(m,function(){l()})):("query"==b.includeLocale&&(a=h.toUrl(a+".js"),a+=(-1===a.indexOf("?")?"?":"&")+"loc="+e),g=[a],
k&&g.push(k),h(g,function(a,b){var d=[],g,c=!1,e=z||!0===a.__noOverlay,k=A||a.__defaultNoOverlayLocale;for(f=r.length-1;0<=f&&(!c||!e);f--)c=q(r[f],a,d,m,n,p);e&&!c&&k&&q(k,a,d,m,n,p);q("root",a,d,m,n,p);g=d.length;if(b){c=!1;e=!0===b.__noOverlay;k=b.__defaultNoOverlayLocale;for(f=r.length-1;0<=f&&(!c||!e);f--)c=q(r[f],b,d,m,s,t);e&&!c&&k&&q(k,b,d,m,s,t);q("root",b,d,m,s,t)}h(m,function(){var c,e,f;for(c=g;c<d.length&&d[c];c++){f=d[c];e=b[f];if(!0===e||1===e)e=h(s+f+"/"+t);x(v,e)}for(c=0;c<g&&d[c];c++){f=
d[c];e=a[f];if(!0===e||1===e)e=h(n+f+"/"+p);x(v,e)}v._ojLocale_=u.join("-");l(v)})}))}}})})();

define('rendererMsg/nls/renderer',{
    "root": true,
    "ar": false,
    "pt": true,
    "fr-CA": false,
    "cs": false,
    "da": false,
    "nl": false,
    "fi": false,
    "fr": true,
    "de": true,
    "el": false,
    "he": false,
    "hu": false,
    "it": true,
    "ja": true,
    "ko": true,
    "no": false,
    "pl": false,
    "pt-PT": false,
    "ro": false,
    "ru": false,
    "zh-Hans": true,
    "sk": false,
    "es": true,
    "sv": false,
    "th": false,
    "zh-Hant": true,
    "tr": false
});


define('ColumnSpanTypeId',['require','ojL10n!rendererMsg/nls/renderer'],function(require) {

    'use strict';

    //region dependencies

    var msg = require('ojL10n!rendererMsg/nls/renderer');
    //endregion

    return {
        SMALL: {
            value: 'SMALL',
            cssStyle: 'media__icon media__small-icon',
            label: msg.MEDIA_SMALL
        },
        MEDIUM: {
            value: 'MEDIUM',
            cssStyle: 'media__icon media__medium-icon',
            label: msg.MEDIA_MEDIUM
        },
        LARGE: {
            value: 'LARGE',
            cssStyle: 'media__icon media__large-icon',
            label: msg.MEDIA_LARGE
        },
        EXTRA_LARGE: {
            value: 'EXTRA_LARGE',
            cssStyle: 'media__icon media__extra-large-icon',
            label: msg.MEDIA_EXTRA_LARGE
        },
        ALL: {
            value: 'ALL',
            cssStyle: 'media__icon media__all-icon',
            label: msg.MEDIA_ALL
        }
    };
});

define('StringUtils',['require','Class'],function(require) {

	'use strict';

	//region Dependencies
	var Class = require('Class');
	//endregion

	var nativeTrim = String.prototype.trim;

	var escapeRegExp = function(str) {
		return str.replace(/([-.*+?^${}()|[\]\/\\])/g, '\\$1');
	};

	var defaultToWhiteSpace = function(characters) {
		if (characters != null) {
			return '[' + escapeRegExp('' + characters) + ']';
		}
		return '\\s';
	};

	var StringUtils = Class.subClass({

		/**
		 * Converts a camelized or dasherized String into an underscored one
		 * @param str {String}
		 * @returns {String}
		 */
		underscored: function(str) {
			return this.trim(str).replace(/([a-z\d])([A-Z]+)/g, '$1_$2').replace(/[-\s]+/g, '_').toLowerCase();
		},

		/**
		 * Trims defined characters from beginning and ending of the String. Defaults to whitespace characters.
		 * @param str {String}
		 * @param characters [Array]
		 * @returns {String}
		 */
		trim: function(str, characters) {
			str = this._makeString(str);
			if (!characters && nativeTrim) {
				return nativeTrim.call(str);
			}
			characters = defaultToWhiteSpace(characters);
			return str.replace(new RegExp('\^' + characters + '+|' + characters + '+$', 'g'), '');
		},

		/**
		 * Capitalizes the first word, turns underscores into spaces, and strips a trailing ‘_id’ if present.
		 * @param str {String}
		 * @returns {String}
		 */
		humanize: function(str) {
			return this.capitalize(this.underscored(str).replace(/_id$/, '').replace(/_/g, ' '));
		},

		/**
		 * Capitalizes the first word.
		 * @param str {String}
		 * @returns {String}
		 */
		capitalize: function(str) {
			str = this._makeString(str);
			return str.charAt(0).toUpperCase() + str.substring(1);
		},

		/**
		 * Splits String by delimiter (String or RegExp), taking /\s+/ by default.
		 * @param str {String}
		 * @param delimiter [String] (or RegExp)
		 * @returns {Array}
		 */
		words: function(str, delimiter) {
			return this.trim(str, delimiter).split(delimiter || /\s+/);
		},

		/**
		 * Capitalizes all the words in the String and make a title version of it.
		 * @param str {String}
		 * @returns {String}
		 */
		titleize: function(str) {
			return ('' + str).replace(/\b./g, function(ch) {
				return ch.toUpperCase();
			});
		},

		/**
		 * Converts the String to a camelize Class name.
		 * @param str {String}
		 * @returns {string}
		 */
		classify: function(str) {
			str = this._makeString(str);
			return this.titleize(str.replace(/_/g, ' ')).replace(/\s/g, '');
		},

		/**
		 * Converts underscored or dasherized string to a camelized one.
		 * Begins with a lower case letter unless it starts with an underscore, dash or an upper case letter.
		 * @param str {String}
		 * @param [decapitalize] {boolean}
		 * @returns {string}
		 */
		camelize: function(str, decapitalize) {
			str = this.trim(str).replace(/[-_\s]+(.)?/g, function(match, c) {
				return c ? c.toUpperCase() : '';
			});

			if (decapitalize === true) {
				return this.decap(str);
			} else {
				return str;
			}
		},

		/**
		 * Converts first letter of the string to lowercase.
		 * @param str
		 * @returns {string}
		 */
		decap: function(str) {
			str = this._makeString(str);
			return str.charAt(0).toLowerCase() + str.slice(1);
		},

		/**
		 * Returns a boolean value defining if the String starts with the given prefix
		 * @param str {String}
		 * @param prefix {String}
		 * @returns {boolean}
		 */
		startsWith: function(str, prefix) {
			str = this._makeString(str);
			return str.indexOf(prefix) === 0;
		},

		/**
		 * Returns a boolean value defining if the String ends with the given suffix
		 * @param str {String}
		 * @param suffix {String}
		 * @returns {boolean}
		 */
		endsWith: function(str, suffix) {
			str = this._makeString(str);
			return str.indexOf(suffix, str.length - suffix.length) !== -1;
		},

		/**
		 * Ensure some object is a coerced to a string
		 **/
		_makeString: function(object) {
			if (object == null) {
				return '';
			}
			return '' + object;
		},

		/**
		 * Wraps a string given number of characters
		 * Taken from http://james.padolsey.com/snippets/wordwrap-for-javascript/
		 * @param str {String} the input string
		 * @param width {Number} The number of characters at which the string will be wrapped
		 * @param cut {Boolean} If TRUE a word will be broken up if longer than width
		 * @returns {*}
		 */
		wordwrap: function(str, width, cut) {
			str = this._makeString(str);

			if (str.length === 0) {
				return [];
			}
			width = width || 75;

			var regex = '.{1,' + width + '}(\\s|$)' + (cut ? '|.{' + width + '}|.+$' : '|\\S+?(\\s|$)');

			return str.match(RegExp(regex, 'g'));
		},
		/**
		 * Formats a str, replacing {N} by argument #N
		 * i.e. StringUtils.format('Hello {0}!' , 'World') => 'Hello World!'
		 * @param str
		 * @param [arguments]: strings
		 * If an argument is not valid, it will be replaced by an empty string
		 */
		format: function(str) {
			var args = arguments;
			return str.replace(/{(\d+)}/g, function (match, number) {
				return StringUtils._makeString(args[Number(number) + 1]);
			});
		},

		/**
		 * generates a string ending with '...' to make it shorter
		 * @param str: string to shorten
		 * @param maxIndex: maximum index of the wanted string
		 */
		generateLabelWithDots: function(str, maxIndex) {
			var result = '';
			if(str.length >= maxIndex) {
				result = str.substring(0,maxIndex -1) + '...';
			}else{
				result = str;
			}
			return result;
		}

	}, {});

	return StringUtils;

});

define('DotExpressionResolver',['require','StringUtils','underscore'],function(require) {
    'use strict';

    //region dependencies
    var StringUtils = require('StringUtils'),
        _ = require('underscore');
    //endregion


    function getProperty(object, propertyName) {
        return object[propertyName];
    }

    //ToDo Remove when Catalog supports UpperCase and dashes (-)
    function camelize(string) {
        string = StringUtils.trim(string).replace(/[-\s]+(.)?/g, function(match, c) {
            return c ? c.toUpperCase() : '';
        });
        return StringUtils.decap(string);
    }

    var DotExpressionResolver = {
        _getValue: function(object, properties, valueResolver) {
            var value;
            var propertyName = properties.shift();
            if (propertyName) {
                value = valueResolver(object, propertyName);
                if (value) {
                    value = DotExpressionResolver._getValue(value, properties, valueResolver);
                }
            } else {
                //required value found.
                value = object;
            }
            return value;
        },
        getValue: function(object, dottedExpression) {
            if (StringUtils.trim(dottedExpression).length > 0) {
                var properties = dottedExpression.split('.');
                return DotExpressionResolver._getValue(object, properties, getProperty);
            }
        },
        //ToDo Remove when Catalog supports UpperCase and dashes (-)
        /**
         * @deprecated
         * @param object
         * @param dottedExpression
         * @returns {*}
         */
        getPCSCompatibleValue: function(object, dottedExpression) {
            if (StringUtils.trim(dottedExpression).length > 0) {
                var properties = dottedExpression.split('.');
                return DotExpressionResolver._getValue(object, properties, function(object, propertyName) {
                    var sanitizedObject = {};
                    _.each(object, function(value, key) {
                        var sanitizedKey = camelize(key);
                        sanitizedObject[sanitizedKey] = value;
                    });
                    return getProperty(sanitizedObject, camelize(propertyName));
                });
            }
        }
    };

    return DotExpressionResolver;
});

define('ValueScope',['require','Class','underscore','DotExpressionResolver'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class'),
        _ = require('underscore'),
        DotExpressionResolver = require('DotExpressionResolver');

    //endregion

    return Class.subClass({}, {
        eventControl: null,
        init: function(globalScope) {
            this.scopes = globalScope ? [globalScope] : [];
            this.values = {};
        },

        clearValues: function() {
            this.values = {};
        },
        setValue: function(name, value) {
            this.values[name] = value;
        },

        getAttributes: function() {
            return [];
        },

        getValue: function(name) {
            var value = DotExpressionResolver.getPCSCompatibleValue(this.values, name);
            _.each(this.scopes, function(scope) {
                if (!value) {
                    value = scope.getValue(name);
                }
            });
            return value;
        },

        getRootType: function() {
            return this.rootType;
        }
    });
});

define('TreeUtil',['require','Class','knockout','DotExpressionResolver','underscore'],function(require) {

    'use strict';


    //region dependencies

    var Class = require('Class'),
        ko = require('knockout'),
        DotExpressionResolver = require('DotExpressionResolver'),
        _ = require('underscore');

    //endregion

    var TreeUtil = Class.subClass({
        /**
         * given the children of a given tree it will return a list of every node and leaf.
         * @param rootChildren tree children
         * @param recursiveProperty the name of the property that defines the node
         * @returns {Array} list of elements in the tree.
         */
        treeToList: function(rootChildren, recursiveProperty) {
            var plainList = [];

            for (var i = 0; i < rootChildren.length; i++) {
                var child = rootChildren[i];
                var collection = _.isFunction(child[recursiveProperty]) ? child[recursiveProperty]() : child[recursiveProperty];
                if (collection) {
                    var items = ko.unwrap(collection);
                    plainList = plainList.concat(items);
                    plainList = plainList.concat(TreeUtil.treeToList(items, recursiveProperty));
                }
            }
            return plainList;
        },
        find: function(tree, recursiveProperty, property, value) {
            var items = _.isFunction(tree[recursiveProperty]) ? tree[recursiveProperty]() : tree[recursiveProperty];
            if (items && items.constructor === Array) {
                return TreeUtil._find(items, recursiveProperty, property, value, tree);
            }
            return null;
        },
        /*jshint maxcomplexity:8 */
        _find: function(rootChildren, recursiveProperty, property, value, parent) {
            var found = null;
            for (var i = 0; i < rootChildren.length; i++) {
                var child = rootChildren[i];
                var propertyAccessor = DotExpressionResolver.getValue(child, property);
                var nodeValue = _.isFunction(propertyAccessor) ? propertyAccessor() : propertyAccessor;
                if (nodeValue === value) {
                    found = {
                        node: child,
                        parent: parent
                    };
                    break;
                }

                var items = _.isFunction(child[recursiveProperty]) ? child[recursiveProperty]() : child[recursiveProperty];
                if (items && items.constructor === Array) {
                    found = TreeUtil._find(items, recursiveProperty, property, value, child);
                    if (found) {
                        break;
                    }
                }
            }
            return found;
        }
    }, {});
    return TreeUtil;
});

define('ValidationHelper',['require','Class','ojs/ojcore','jquery','underscore','knockout','TreeUtil','ojL10n!rendererMsg/nls/renderer'],function(require) {

    'use strict';

    //region dependencies
    var Class = require('Class'),
        oj = require('ojs/ojcore'),
        $ = require('jquery'),
        _ = require('underscore'),
        ko = require('knockout'),
        TreeUtil = require('TreeUtil'),
        msg = require('ojL10n!rendererMsg/nls/renderer');
    //endregion

    var URL_PATTERN = '^(http(s)?:\\/\\/.)?(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&//=]*)$';

    return Class.subClass({
        positiveValueValidator: function(message) {
            return [{
                validate: function(value) {
                    if (value <= 0) {
                        throw new oj.ValidatorError(msg.INCORRECT_FORMAT_MESSAGE, message);
                    }
                    return true;
                }
            }];
        },
        dimensionValidator: function(message) {
            return [{
                type: 'regExp',
                options: {
                    pattern: '^(auto|0)$|^[0-9]+(\\.[0-9]+)?(px|em|ex|%|in|cm|mm|pt|pc)$',
                    messageSummary: msg.INCORRECT_FORMAT_MESSAGE,
                    messageDetail: message
                }
            }];
        },
        borderDimensionValidator: function(message) {
            return [{
                type: 'regExp',
                options: {
                    pattern: '^(auto|0)$|^[0-9]+(\\.[0-9]+)?(px|em|ex|in|cm|mm|pt|pc)$',
                    messageSummary: msg.INCORRECT_FORMAT_MESSAGE,
                    messageDetail: message
                }
            }];
        },
        hexValueValidator: function(message) {
            return [{
                type: 'regExp',
                options: {
                    pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
                    messageSummary: msg.INCORRECT_FORMAT_MESSAGE,
                    messageDetail: message
                }
            }];
        },
        cssClassNameValidator: function(message) {
            return [{
                type: 'regExp',
                options: {
                    pattern: '^((([a-zA-Z_]|-[a-zA-Z_-])[a-zA-Z0-9_-]*)\\s*)*$',
                    messageSummary: msg.INCORRECT_FORMAT_MESSAGE,
                    messageDetail: message
                }
            }];
        },
        urlPattern: URL_PATTERN,
        urlValidator: function() {
            return [{
                type: 'regExp',
                options: {
                    pattern: URL_PATTERN,
                    messageDetail: msg.URL_FORMAT_ERROR_MESSAGE
                }
            }];
        },
        videoUrlValidator: function() {
            return [{
                type: 'regExp',
                options: {
                    pattern: '^(https?:\\/\\/)?(player.|www.)?(vimeo\\.com|youtu(be\\.com|\\.be|be\\.googleapis\\.com))\\/(watch\\?v=|video\\/|embed\\/)?([A-Za-z0-9._%-]*)(\\&\\S+)?$',
                    messageDetail: msg.URL_FORMAT_ERROR_MESSAGE
                }
            }];
        },
        optionsLengthValidator: function(model, message) {
            return [{
                validate: function(value) {
                    var compareTo = model.optionsNames.peek().split('\n').length,
                        formattedValue = value.split('\n').length;
                    if (formattedValue !== compareTo) {
                        throw new oj.ValidatorError(message);
                    }
                    return true;
                }
            }];
        },
        optionsBlankValueValidator: function(message) {
            return [{
                validate: function(value) {
                    var formattedValue = value.split('\n');
                    for (var i = 0; i < formattedValue.length; i++) {
                        if ($.trim(formattedValue[i]) === '') {
                            throw new oj.ValidatorError(message);
                        }
                    }
                    return true;
                }
            }];
        },
        optionsUniqueValueValidator: function(message) {
            return [{
                validate: function(value) {
                    var formattedValue = value.split('\n');
                    if (_.uniq(formattedValue).length !== formattedValue.length) {
                        throw new oj.ValidatorError(message);
                    }
                    return true;
                }
            }];
        },
        uniqueControlNameValidator: function(message, data) {
            return [{
                validate: function(value) {
                    var plainList = TreeUtil.treeToList(data.viewModel.form().presentation().controls(), 'controls');
                    // If the entered value is different than that in the view model and already assigned to another control in the tree,
                    // throw an error.
                    if (ko.unwrap(data.name).toLowerCase() !== value.toLowerCase() && _.find(plainList, function(control) {
                            return ko.unwrap(control.name).toLowerCase() === value.toLowerCase();
                        })) {
                        throw new oj.ValidatorError(message);
                    }
                    return true;
                }
            }];
        }
    }, {});
});

define('StyleTypeId',['require','ojL10n!rendererMsg/nls/renderer','ValidationHelper'],function(require) {

    'use strict';

    //region dependencies

    var msg = require('ojL10n!rendererMsg/nls/renderer'),
        ValidationHelper = require('ValidationHelper');

    //endregion
    return {
        'BACKGROUND_COLOR': {
            styleType: 'inline',
            controlType: 'color',
            name: 'backgroundColor',
            label: msg.LABEL_BACKGROUND_COLOR,
            help: null,
            attrName: 'background-color',
            group: 'color',
            default: '#fcfdfe',
            validators: ValidationHelper.hexValueValidator(msg.HEX_COLOR_FORMAT_ERROR_MESSAGE)
        },
        'COLOR': {
            styleType: 'inline',
            controlType: 'color',
            name: 'color',
            label: msg.LABEL_COLOR,
            help: null,
            attrName: 'color',
            group: 'color',
            default: '#333333',
            validators: ValidationHelper.hexValueValidator(msg.HEX_COLOR_FORMAT_ERROR_MESSAGE)
        },
        'SIZE': {
            styleType: 'inline',
            controlType: 'select',
            name: 'fontSize',
            label: msg.LABEL_FONT_SIZE,
            help: null,
            attrName: 'font-size',
            options: [{
                label: msg.LABEL_FONT_SIZE_XSMALL,
                value: 'x-small'
            }, {
                label: msg.LABEL_FONT_SIZE_SMALL,
                value: 'small'
            }, {
                label: msg.LABEL_FONT_SIZE_NORMAL,
                value: '14px'
            }, {
                label: msg.LABEL_FONT_SIZE_LARGE,
                value: 'large'
            }, {
                label: msg.LABEL_FONT_SIZE_XLARGE,
                value: 'x-large'
            }],
            default: '14px'
        },
        'TEXT_ALIGN': {
            styleType: 'inline',
            controlType: 'select',
            name: 'textAlign',
            label: msg.LABEL_TEXT_ALIGN,
            help: null,
            attrName: 'text-align',
            options: [{
                label: msg.LABEL_TEXT_ALIGN_LEFT,
                value: 'left'
            }, {
                label: msg.LABEL_TEXT_ALIGN_RIGHT,
                value: 'right'
            }, {
                label: msg.LABEL_TEXT_ALIGN_CENTER,
                value: 'center'
            }],
            default: '',
            group: 'align'
        },
        'WIDTH': {
            styleType: 'inline',
            controlType: 'text',
            name: 'width',
            label: msg.LABEL_WIDTH,
            help: msg.WIDTH_INLINE_HELP,
            attrName: 'width',
            group: 'size',
            validators: ValidationHelper.dimensionValidator(msg.INVALID_WIDTH)
        },
        'HEIGHT': {
            styleType: 'inline',
            controlType: 'text',
            name: 'height',
            label: msg.LABEL_HEIGHT,
            help: msg.HEIGHT_INLINE_HELP,
            attrName: 'height',
            group: 'size',
            validators: ValidationHelper.dimensionValidator(msg.INVALID_HEIGHT)
        },
        'BORDER_COLOR': {
            styleType: 'inline',
            controlType: 'color',
            name: 'borderColor',
            label: msg.LABEL_BORDER_COLOR,
            help: null,
            attrName: 'border-color',
            group: 'border',
            default: '#dfe4e7',
            validators: ValidationHelper.hexValueValidator(msg.HEX_COLOR_FORMAT_ERROR_MESSAGE)
        },
        'BORDER_STYLE': {
            styleType: 'inline',
            controlType: 'select',
            name: 'borderStyle',
            label: msg.LABEL_BORDER_STYLE,
            help: null,
            attrName: 'border-style',
            placeholder: '',
            options: [{
                label: msg.LABEL_SOLID,
                value: 'solid'
            }, {
                label: msg.LABEL_DOTTED,
                value: 'dotted'
            }, {
                label: msg.LABEL_DASHED,
                value: 'dashed'
            }],
            group: 'border'
        },
        'BORDER_WIDTH': {
            styleType: 'inline',
            controlType: 'text',
            name: 'borderWidth',
            label: msg.LABEL_BORDER_WIDTH,
            help: null,
            attrName: 'border-width',
            group: 'border',
            validators: ValidationHelper.borderDimensionValidator(msg.INVALID_BORDER_WIDTH)
        },
        'BORDER_RADIUS': {
            styleType: 'inline',
            controlType: 'text',
            name: 'borderRadius',
            label: msg.LABEL_BORDER_RADIUS,
            help: null,
            attrName: 'border-radius',
            group: 'border',
            validators: ValidationHelper.dimensionValidator(msg.INVALID_BORDER_RADIUS)
        },
        'CONTROL_ALIGN': {
            styleType: '',
            controlType: 'select',
            name: 'controlAlign',
            label: msg.LABEL_CONTROL_ALIGNMENT,
            help: null,
            options: [{
                label: msg.LABEL_TEXT_ALIGN_LEFT,
                value: 'left'
            }, {
                label: msg.LABEL_TEXT_ALIGN_RIGHT,
                value: 'right'
            }, {
                label: msg.LABEL_TEXT_ALIGN_CENTER,
                value: 'center'
            }],
            default: '',
            group: 'align'
        },
        'LABEL_COLOR': {
            styleType: '',
            controlType: 'color',
            name: 'labelColor',
            label: msg.LABEL_LABEL_COLOR,
            help: null,
            group: 'label',
            default: '#4f4f4f',
            validators: ValidationHelper.hexValueValidator(msg.HEX_COLOR_FORMAT_ERROR_MESSAGE)
        },
        'LABEL_SIZE': {
            styleType: '',
            controlType: 'select',
            name: 'labelSize',
            label: msg.LABEL_LABEL_SIZE,
            help: null,
            options: [{
                label: msg.LABEL_FONT_SIZE_XSMALL,
                value: 'x-small'
            }, {
                label: msg.LABEL_FONT_SIZE_SMALL,
                value: 'small'
            }, {
                label: msg.LABEL_FONT_SIZE_NORMAL,
                value: '15px'
            }, {
                label: msg.LABEL_FONT_SIZE_LARGE,
                value: 'large'
            }, {
                label: msg.LABEL_FONT_SIZE_XLARGE,
                value: 'x-large'
            }],
            default: '',
            group: 'label'
        },
        'CLASS_NAME': {
            styleType: '',
            controlType: 'text',
            name: 'controlClassName',
            default: '',
            help: msg.CONTROL_CLASS_NAME_INLINE_HELP,
            label: msg.LABEL_CONTROL_CLASS_NAME,
            validators: ValidationHelper.cssClassNameValidator(msg.INVALID_CLASS_NAME)
        },
        'TABLE_WIDTH': {
            styleType: '',
            controlType: 'tableWidth',
            name: msg.LABEL_TABLE_COLUMNS_WIDTH,
            default: '',
            help: msg.TABLE_WIDTH_INLINE_HELP,
            label: msg.LABEL_TABLE_WIDTH,
            validators: ValidationHelper.cssClassNameValidator(msg.INVALID_CLASS_NAME)
        },
        'TABLE_COLUMN_WIDTH': {
            styleType: 'inline',
            controlType: 'tableColumnWidth',
            name: 'tableColumnWidth',
            label: msg.LABEL_WIDTH,
            help: msg.WIDTH_INLINE_HELP,
            attrName: 'width',
            group: 'size',
            validators: ValidationHelper.dimensionValidator(msg.INVALID_WIDTH)
        }
    };
});

define('StyleControlMapper',['require','StyleTypeId','jquery'],function(require) {

    'use strict';

    //region dependencies

    var StyleTypeId = require('StyleTypeId'),
        $ = require('jquery');

    //endregion
    var CONTROL_STYLES = [StyleTypeId.CONTROL_ALIGN],
        LABEL_STYLES = [StyleTypeId.LABEL_SIZE, StyleTypeId.LABEL_COLOR],
        INPUT_STYLES = LABEL_STYLES.concat([StyleTypeId.BACKGROUND_COLOR, StyleTypeId.COLOR, StyleTypeId.WIDTH, StyleTypeId.HEIGHT,
            StyleTypeId.SIZE, StyleTypeId.TEXT_ALIGN, StyleTypeId.BORDER_COLOR, StyleTypeId.BORDER_WIDTH, StyleTypeId.BORDER_STYLE, StyleTypeId.BORDER_RADIUS
        ]);

    // Call to this function returns Style object with 'Important' property, so that the style will be applied with ' !important'
    var addImportant = function(style) {
        var styleClone = $.extend(true, {}, style);
        styleClone.important = true;
        return styleClone;
    };


    return {
        'INPUT_TEXT': CONTROL_STYLES.concat(INPUT_STYLES, StyleTypeId.CLASS_NAME),
        'TEXT_AREA': CONTROL_STYLES.concat(INPUT_STYLES, StyleTypeId.CLASS_NAME),
        'BUTTON': CONTROL_STYLES.concat([StyleTypeId.BACKGROUND_COLOR, StyleTypeId.COLOR, StyleTypeId.WIDTH, StyleTypeId.HEIGHT,
            StyleTypeId.SIZE, StyleTypeId.TEXT_ALIGN, StyleTypeId.BORDER_WIDTH, StyleTypeId.BORDER_STYLE, StyleTypeId.BORDER_COLOR, StyleTypeId.BORDER_RADIUS
        ], StyleTypeId.CLASS_NAME),
        'SELECT': CONTROL_STYLES.concat(INPUT_STYLES, StyleTypeId.CLASS_NAME),
        'IDENTITY_BROWSER': CONTROL_STYLES.concat(INPUT_STYLES, StyleTypeId.CLASS_NAME),
        'CHECKLIST': CONTROL_STYLES.concat(LABEL_STYLES, [StyleTypeId.BACKGROUND_COLOR, StyleTypeId.COLOR, StyleTypeId.SIZE], StyleTypeId.CLASS_NAME),
        'CHECKBOX': CONTROL_STYLES.concat(LABEL_STYLES, [StyleTypeId.BACKGROUND_COLOR, StyleTypeId.COLOR, StyleTypeId.SIZE], StyleTypeId.CLASS_NAME),
        'RADIO_BUTTON': CONTROL_STYLES.concat(LABEL_STYLES, [StyleTypeId.BACKGROUND_COLOR, StyleTypeId.COLOR, StyleTypeId.SIZE], StyleTypeId.CLASS_NAME),
        'NUMBER': CONTROL_STYLES.concat(LABEL_STYLES, [StyleTypeId.BACKGROUND_COLOR, StyleTypeId.COLOR, StyleTypeId.WIDTH, StyleTypeId.HEIGHT,
            StyleTypeId.SIZE, StyleTypeId.TEXT_ALIGN, StyleTypeId.BORDER_COLOR, StyleTypeId.BORDER_WIDTH, StyleTypeId.BORDER_STYLE
        ], StyleTypeId.CLASS_NAME),
        'DATE': CONTROL_STYLES.concat(INPUT_STYLES, StyleTypeId.CLASS_NAME),
        'TIME': CONTROL_STYLES.concat(INPUT_STYLES, StyleTypeId.CLASS_NAME),
        'DATE_TIME': CONTROL_STYLES.concat(INPUT_STYLES, StyleTypeId.CLASS_NAME),
        'EMAIL': CONTROL_STYLES.concat(INPUT_STYLES, StyleTypeId.CLASS_NAME),
        'URL': CONTROL_STYLES.concat(INPUT_STYLES, StyleTypeId.CLASS_NAME),
        'MESSAGE': CONTROL_STYLES.concat([StyleTypeId.BACKGROUND_COLOR, StyleTypeId.COLOR, StyleTypeId.SIZE], StyleTypeId.CLASS_NAME),
        'LINK': CONTROL_STYLES.concat([StyleTypeId.BACKGROUND_COLOR, addImportant(StyleTypeId.COLOR),
            StyleTypeId.SIZE, StyleTypeId.TEXT_ALIGN
        ], StyleTypeId.CLASS_NAME),
        'MONEY': CONTROL_STYLES.concat(LABEL_STYLES, [StyleTypeId.BACKGROUND_COLOR, StyleTypeId.COLOR, StyleTypeId.WIDTH, StyleTypeId.HEIGHT,
            StyleTypeId.SIZE, StyleTypeId.TEXT_ALIGN, StyleTypeId.BORDER_COLOR, StyleTypeId.BORDER_WIDTH, StyleTypeId.BORDER_STYLE
        ], StyleTypeId.CLASS_NAME),
        'PHONE': CONTROL_STYLES.concat(INPUT_STYLES, StyleTypeId.CLASS_NAME),
        'IMAGE': CONTROL_STYLES.concat(LABEL_STYLES, [StyleTypeId.BACKGROUND_COLOR], StyleTypeId.CLASS_NAME),
        'VIDEO': CONTROL_STYLES.concat(LABEL_STYLES, [StyleTypeId.BACKGROUND_COLOR], StyleTypeId.CLASS_NAME),
        'PANEL': LABEL_STYLES.concat([StyleTypeId.BACKGROUND_COLOR, StyleTypeId.BORDER_COLOR, StyleTypeId.BORDER_WIDTH, StyleTypeId.BORDER_STYLE, StyleTypeId.BORDER_RADIUS], StyleTypeId.CLASS_NAME),
        'SECTION': [StyleTypeId.BACKGROUND_COLOR, StyleTypeId.COLOR, StyleTypeId.BORDER_COLOR, StyleTypeId.BORDER_WIDTH, StyleTypeId.BORDER_STYLE, StyleTypeId.BORDER_RADIUS, StyleTypeId.CLASS_NAME],
        'REPEATABLE_SECTION': LABEL_STYLES,
        'TABLE': LABEL_STYLES.concat([StyleTypeId.TABLE_WIDTH]),
        'TABLE_COLUMN': [StyleTypeId.TABLE_COLUMN_WIDTH],
        'FORM_REFERENCE': LABEL_STYLES,

        //ToDo Nico We need a small refactor of the Presentation to be compatible with this Events
        'FORM_PRESENTATION': [] //StyleTypeId.BORDER_WIDTH, StyleTypeId.BORDER_STYLE, StyleTypeId.BORDER_COLOR,StyleTypeId.BACKGROUND_COLOR]
    };
});

define('Style',['require','Class','knockout'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class'),
        ko = require('knockout');

    //endregion

    return Class.subClass({}, {
        init: function(id, type, value) {
            this.type = type;
            this.domId = id + type.name;

            // Value that is assigned from the property inspector.
            this.rawValue = ko.observable(value || '');

            // Value that is used to display on the property inspector (need to display default value, if present).
            this.value = ko.computed({
                read: function() {
                    // return the default value (if present), if actualValue is not present.
                    return this.rawValue() || type.default;
                },
                write: function(value) {
                    if (value !== null && value !== undefined) {
                        this.rawValue(value);
                    }
                },
                owner: this
            });
        }
    });
});

define('StyleHandler',['require','knockout','underscore','Class','StyleControlMapper','Style'],function(require) {

    'use strict';

    //region dependencies

    var ko = require('knockout'),
        _ = require('underscore'),
        Class = require('Class'),
        StyleControlMapper = require('StyleControlMapper'),
        Style = require('Style'),
        StyleImportant = ' !important';


    //endregion



    return Class.subClass({}, {

        init: function() {},
        getAllStyles: function(container, properties) {
            var styles = [];
            // Check if the control type is present in the mapper.
            /* istanbul ignore else*/
            if (StyleControlMapper[container.type]) {
                var groupStyles = _.groupBy(StyleControlMapper[container.type], 'group');

                _.each(groupStyles, function(groupStyle, group) {
                    _.each(groupStyle, function(styleType) {
                        var colCount = group === 'undefined' ? 12 : Math.ceil(12 / (groupStyle.length)),
                            preloadedValue;
                        if (properties.formattedStyle) {
                            preloadedValue = properties.formattedStyle[styleType.name];
                        }
                        styleType.computedClass = 'oj-col oj-sm-' + colCount;
                        styles.push(new Style(container.id, styleType, preloadedValue));
                    }, this);
                }, this);
            }
            return ko.observableArray(styles);
        },
        getParsedStyle: function(control) {
            return ko.computed(function() {
                var styles = ko.utils.unwrapObservable(control.styles),
                    parsedStyle = '';

                styles.forEach(function(style) {
                    var value = ko.utils.unwrapObservable(style.rawValue);
                    value = value instanceof Array ? value[0] : value;
                    if (style.type.styleType === 'inline' && !_.isUndefined(value) && !_.isNull(value) && value !== '' && value !== style.type.default) {
                        if (!_.isUndefined(style.type.important) && style.type.important) {
                            parsedStyle += style.type.attrName + ':' + value + StyleImportant + ';';
                        } else {
                            parsedStyle += style.type.attrName + ':' + value + ';';
                        }
                    }

                });
                return parsedStyle;
            }, control);
        },
        getFormattedStyle: function(control) {
            return ko.computed(function() {
                var styles = ko.utils.unwrapObservable(control.styles),
                    formattedStyle = {};

                styles.forEach(function(style) {
                    var value = ko.utils.unwrapObservable(style.rawValue);
                    value = value instanceof Array ? value[0] : value;
                    if (!_.isUndefined(value) && !_.isNull(value) && value !== '' && value !== style.type.default) {
                        formattedStyle[style.type.name] = value;
                    }
                });
                return formattedStyle;
            }, control);
        }
    });
});

define('ControlTypeId',[],function() {

    'use strict';

    return {
        'FORM_PRESENTATION': 'FORM_PRESENTATION',
        'INPUT_TEXT': 'INPUT_TEXT',
        'TEXT_AREA': 'TEXT_AREA',
        'BUTTON': 'BUTTON',
        'SELECT': 'SELECT',
        'CHECKLIST': 'CHECKLIST',
        'CHECKBOX': 'CHECKBOX',
        'RADIO_BUTTON': 'RADIO_BUTTON',
        'NUMBER': 'NUMBER',
        'DATE': 'DATE',
        'TIME': 'TIME',
        'DATE_TIME': 'DATE_TIME',
        'EMAIL': 'EMAIL',
        'URL': 'URL',
        'MESSAGE': 'MESSAGE',
        'LINK': 'LINK',
        'MONEY': 'MONEY',
        'PHONE': 'PHONE',
        'IMAGE': 'IMAGE',
        'VIDEO': 'VIDEO',
        'IDENTITY_BROWSER': 'IDENTITY_BROWSER',
        'ROW': 'ROW',
        'PANEL': 'PANEL',
        'FORM_REFERENCE': 'FORM_REFERENCE',
        'SECTION': 'SECTION',
        'TAB': 'TAB',
        'TAB_CONTAINER': 'TAB_CONTAINER',
        'REPEATABLE_SECTION': 'REPEATABLE_SECTION',
        'REPEATABLE_SECTION_ROW': 'REPEATABLE_SECTION_ROW',
        'TABLE': 'TABLE',
        'TABLE_COLUMN': 'TABLE_COLUMN',
        'TABLE_ROW': 'TABLE_ROW',
        'BUSINESS_TYPE': 'BUSINESS_TYPE'
    };
});

define('FormContext',['require','Class','knockout','underscore','ColumnSpanTypeId','ValueScope','StringUtils','StyleHandler','ControlTypeId'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class'),
        ko = require('knockout'),
        _ = require('underscore'),
        ColumnSpanTypeId = require('ColumnSpanTypeId'),
        ValueScope = require('ValueScope'),
        StringUtils = require('StringUtils'),
        StyleHandler = require('StyleHandler'),
        ControlTypeId = require('ControlTypeId');

    //endregion

    /* istanbul ignore next */
    return Class.subClass({}, {
        init: function(config, dependencies, viewModel) {
            this.viewModel = viewModel;
            this.config = ko.observable(config);
            this.payload = ko.observable();
            this.config().resolveDependencies(dependencies || []);
            this.styleHandler = new StyleHandler();

            var selectedMedia;
            if (config && config.selectedMedia && ColumnSpanTypeId[config.selectedMedia]) {
                selectedMedia = ColumnSpanTypeId[config.selectedMedia];
            } else {
                selectedMedia = this._getDefaultSelectedMedia();
            }
            this.selectedMedia = ko.observable(selectedMedia);

            this.scopeFactory = {
                Scope: ValueScope,
                ErrorScope: ValueScope
            };

        },
        getControlDefinition: function(control) {
            if (control.type === ControlTypeId.FORM_REFERENCE) {
                var formReference = control.properties.reference;
                var reference = ko.isObservable(formReference) ? formReference().get() : formReference;
                return this.getFormReferenceControlDefinition(reference, this.config().formHandler);
            } else {
                return this.getControlDefinitionByType(control.type);
            }
        },
        getControlDefinitionByType: function(controlTypeId) {
            throw new Error('Unsupported operation');
        },
        getFormReferenceControlDefinition: function(reference, handler) {
            throw new Error('Unsupported operation');
        },
        properties: function() {
            return {
                eventsQueue: this.eventsQueue,
                domIdPrefix: this.config().domIdPrefix,
                styleHandler: this.styleHandler,
                viewModel: this.viewModel,
                selectedMedia: function() {
                    return this.selectedMedia;
                }.bind(this),
                StringUtils: function() {
                    //Have to create a function, otherwise StringUtils is tried to be initialized
                    return StringUtils;
                }
            };
        },
        addControlDecorators: function(control) {
            throw new Error('Unsupported operation');
        },
        _getDefaultSelectedMedia: function() {
            return ColumnSpanTypeId.ALL;
        },
        findCallDefinition: function(id) {
            return _.find(this.calls(), function(callDef) {
                return callDef.id === id;
            });
        }
    });
});

define('ControlDefinition',['require','Class'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class');

    //endregion

    return Class.subClass({}, {

        init: function(id, controlTemplate) {
            this.id = id;
            this.controlTemplate = controlTemplate;
        },
        properties: function() {
            return {
                controlTemplate: this.controlTemplate
            };
        },
        isBindable: function() {
            return false;
        }
    });
});

define('InputControlDefinition',['require','ControlDefinition','underscore'],function(require) {

    'use strict';

    //region dependencies

    var ControlDefinition = require('ControlDefinition'),
        _ = require('underscore');

    //endregion
    return ControlDefinition.subClass({}, {

        init: function(id, dataType, controlTemplate) {
            this._super(id, controlTemplate);
            this.dataType = dataType;
        },
        properties: function() {
            return _.extend(this._super(), {
                dataType: this.dataType
            });
        },
        isBindable: function() {
            return true;
        }
    });
});

define('Enum',['require','underscore','Class'],function(require) {
	'use strict';

	var _ = require('underscore'),
		Class = require('Class');

	/**
	 * @enum java like enum
	 */
	return Class.subClass({

		valueOf: function(property) {
			var key = _.find(_.keys(this), function(key) {
				return key === property;
			});
			return this[key];
		}

	}, {});

});

define('TypeDescription',['require','Enum','ControlTypeId'],function(require) {
    'use strict';

    var Enum = require('Enum'),
        ControlTypeId = require('ControlTypeId');

    return Enum.subClass({

        ARRAY: {
            name: 'ARRAY',
            defaultControl: null
        },
        BOOLEAN: {
            name: 'BOOLEAN',
            defaultControl: ControlTypeId.CHECKBOX
        },
        DATE_TIME: {
            name: 'DATE_TIME',
            defaultControl: ControlTypeId.DATE_TIME
        },
        DATE: {
            name: 'DATE',
            defaultControl: ControlTypeId.DATE
        },
        ENUM: {
            name: 'ENUM',
            defaultControl: null
        },
        NUMBER: {
            name: 'NUMBER',
            defaultControl: ControlTypeId.NUMBER
        },
        OBJECT: {
            name: 'OBJECT',
            defaultControl: ControlTypeId.SECTION
        },
        OBJECT_REF: {
            name: 'OBJECT_REF',
            defaultControl: null
        },
        STRING: {
            name: 'STRING',
            defaultControl: ControlTypeId.INPUT_TEXT
        },
        TIME: {
            name: 'TIME',
            defaultControl: ControlTypeId.TIME
        },
        UNKNOWN: {
            name: 'UNKNOWN',
            defaultControl: null
        },
        getControlForArray: function(itemTypeDescription) {
            switch (itemTypeDescription.name) {
                case this.STRING.name:
                    return ControlTypeId.CHECKLIST;
                case this.OBJECT.name:
                    return ControlTypeId.REPEATABLE_SECTION;
                default:
                    return this.ARRAY.defaultControl;
            }
        },
        equals: function(type1, type2) {
            return type1.name === type2.name;
        }

    }, {});

});

define('DataType',['require','Class','knockout','TypeDescription'],function(require) {

    'use strict';

    //region dependencies
    var Class = require('Class'),
        ko = require('knockout'),
        TypeDescription = require('TypeDescription');
    //endregion

    return Class.subClass({}, {
        init: function(id, name, label, icon, schema) {
            var self = this;
            self.id = ko.observable(id);
            self.name = ko.observable(name);
            self.label = ko.observable(label);
            self.icon = ko.observable(icon);
            self._schema = schema;
        },
        isObject: function() {
            return this.hasOwnProperty('attributes') && !(TypeDescription.equals(this.getTypeDescription(), TypeDescription.UNKNOWN));
        },
        isContainer: function() {
            return TypeDescription.equals(this.getTypeDescription(), TypeDescription.OBJECT);
        },
        isArray: function() {
            return false;
        },
        getTypeDescription: function() {
            throw new Error('This function must be overridden');
        },
        getTypeName: function() {
            return this.getTypeDescription().name;
        },
        getDefaultControl: function() {
            return this.getTypeDescription().defaultControl;
        },
        toJS: function() {
            return this.schema();
        },
        isCompatible: function(type) {
            return this.id() === type.id();
        },
        schema: function() {
            return this._schema;
        }
    });

});

define('SimpleType',['require','DataType'],function(require) {

    'use strict';

    //region dependencies
    var DataType = require('DataType');
    //endregion

    return DataType.subClass({}, {
        /* jshint maxparams: 6 */
        init: function(name, label, icon, type, format) {
            this._super(this.getTypeName(), name, label, icon, {
                type: type,
                format: format
            });
        }
    });

});

define('StringType',['require','SimpleType','TypeDescription'],function(require) {

    'use strict';

    //region dependencies
    var SimpleType = require('SimpleType'),
        TypeDescription = require('TypeDescription');
    //endregion

    return SimpleType.subClass({}, {
        init: function(name) {
            this._super(name, 'String', '', 'string', 'string');
        },
        getTypeDescription: function() {
            return TypeDescription.STRING;
        }
    });

});

define('NumberType',['require','SimpleType','TypeDescription'],function(require) {

    'use strict';

    //region dependencies
    var SimpleType = require('SimpleType'),
        TypeDescription = require('TypeDescription');
    //endregion

    return SimpleType.subClass({}, {
        init: function(name) {
            this._super(name, 'Number', '', 'number', '');
        },
        getTypeDescription: function() {
            return TypeDescription.NUMBER;
        }
    });

});

define('BooleanType',['require','SimpleType','TypeDescription'],function(require) {

    'use strict';

    //region dependencies
    var SimpleType = require('SimpleType'),
        TypeDescription = require('TypeDescription');
    //endregion

    return SimpleType.subClass({}, {
        init: function(name) {
            this._super(name, 'Boolean', '', 'boolean', '');
        },
        getTypeDescription: function() {
            return TypeDescription.BOOLEAN;
        }
    });

});

define('DateType',['require','SimpleType','TypeDescription'],function(require) {

    'use strict';

    //region dependencies
    var SimpleType = require('SimpleType'),
        TypeDescription = require('TypeDescription');
    //endregion

    return SimpleType.subClass({}, {
        init: function(name) {
            this._super(name, 'Date', '', 'string', 'date');
        },
        getTypeDescription: function() {
            return TypeDescription.DATE;
        }
    });

});

define('TimeType',['require','SimpleType','TypeDescription'],function(require) {

    'use strict';

    //region dependencies
    var SimpleType = require('SimpleType'),
        TypeDescription = require('TypeDescription');
    //endregion

    return SimpleType.subClass({}, {
        init: function(name) {
            this._super(name, 'Time', '', 'string', 'time');
        },
        getTypeDescription: function() {
            return TypeDescription.TIME;
        }
    });

});

define('DateTimeType',['require','SimpleType','TypeDescription'],function(require) {

    'use strict';

    //region dependencies
    var SimpleType = require('SimpleType'),
        TypeDescription = require('TypeDescription');
    //endregion

    return SimpleType.subClass({}, {
        init: function(name) {
            this._super(name, 'Date Time', '', 'string', 'date-time');
        },
        getTypeDescription: function() {
            return TypeDescription.DATE_TIME;
        }
    });

});

define('ArrayType',['require','DataType','knockout','underscore','TypeDescription'],function(require) {

    'use strict';

    //region dependencies
    var DataType = require('DataType'),
        ko = require('knockout'),
        _ = require('underscore'),
        TypeDescription = require('TypeDescription');
    //endregion

    return DataType.subClass({}, {
        init: function(name, itemType, items) {
            this._super(this.getTypeName() + '#' + itemType.id(), name, itemType.label() + ' [ ]', '', {
                type: 'array',
                items: items || itemType.schema()
            });

            this.itemType = ko.observable(itemType);

            if (this.itemType().isObject()) {
                this.attributes = ko.pureComputed(function() {
                    return this.itemType().attributes();
                }.bind(this));
            }
        },
        isCompatible: function(data) {
            return data.isArray() && this.itemType().isCompatible(data.itemType());
        },
        isArray: function() {
            return true;
        },
        isObject: function() {
            return this.itemType().isObject();
        },
        isContainer: function() {
            return this.itemType().isContainer();
        },
        getTypeDescription: function() {
            return TypeDescription.ARRAY;
        },
        getDefaultControl: function() {
            return TypeDescription.getControlForArray(this.itemType().getTypeDescription());
        },
        schema: function() {
            var schema = this._super();

            if (this.itemType().isObject()) {
                var properties = {};
                _.each(this.attributes(), function(attribute) {
                    properties[attribute.name()] = attribute.toJS();
                }, this);
                schema.items.properties = properties;
            }
            return schema;
        }
    });

});

define('EnumType',['require','DataType','knockout','TypeDescription'],function(require) {

    'use strict';

    //region dependencies
    var DataType = require('DataType'),
        ko = require('knockout'),
        TypeDescription = require('TypeDescription');
    //endregion

    return DataType.subClass({}, {
        init: function(name, items) {
            this._super(this.getTypeName(), name, name, '', {
                enum: items
            });
            this.attributes = ko.observableArray(items);
        },
        getTypeDescription: function() {
            return TypeDescription.ENUM;
        }
    });

});

define('NameGenerator',['require','Class','StringUtils','TreeUtil','knockout','jquery'],function(require) {

    'use strict';


    //region dependencies

    var Class = require('Class'),
        StringUtils = require('StringUtils'),
        TreeUtil = require('TreeUtil'),
        ko = require('knockout'),
        $ = require('jquery');

    //endregion

    //this camelize will leave _.
    var camelize = function(str) {
        str = StringUtils.trim(str).replace(/[\s]+(.)?/g, function(match, c) {
            return c.toUpperCase();
        });

        return str;
    };

    var NameGenerator = Class.subClass({
        generateName: function(baseName, collection, property, index) {
            baseName = camelize(baseName);
            var name = index ? baseName + index : baseName;
            index = index ? index : 0;
            var nameProperty = property || 'name';

            $.each(ko.unwrap(collection), function(i, element) {
                if (ko.unwrap(element[nameProperty]) === name) {
                    index++;
                    name = NameGenerator.generateName(baseName, collection, nameProperty, index);
                    return false;
                }
            });
            return name;
        },
        generateNameFromTree: function(baseName, tree, recursiveProperty, property, index) {
            var plainList = TreeUtil.treeToList(tree, recursiveProperty);
            return NameGenerator.generateName(baseName, plainList, property, index);
        }
    }, {});
    return NameGenerator;
});

define('ObjectAttribute',['require','Class','knockout'],function(require) {

    'use strict';

    //region dependencies
    var Class = require('Class'),
        ko = require('knockout');
    //endregion

    return Class.subClass({}, {
        init: function(name, dataType) {
            this.name = ko.observable(name);
            this.dataType = ko.observable(dataType);
        },
        toJS: function() {
            return this.dataType().toJS();
        }
    });

});

define('ObjectType',['require','DataType','knockout','underscore','TypeDescription','NameGenerator','ObjectAttribute','StringUtils'],function(require) {

    'use strict';

    //region dependencies
    var DataType = require('DataType'),
        ko = require('knockout'),
        _ = require('underscore'),
        TypeDescription = require('TypeDescription'),
        NameGenerator = require('NameGenerator'),
        ObjectAttribute = require('ObjectAttribute'),
        StringUtils = require('StringUtils');
    //endregion

    return DataType.subClass({}, {
        init: function(qname, name, attributes) {
            this._super(qname, name, name, '', {
                $schema: 'http://json-schema.org/draft-04/schema#',
                $id: qname,
                $name: name,
                type: 'object',
                properties: {}
            });
            this.attributes = ko.observableArray(attributes);
        },
        isCompatible: function(data) {
            return data.isObject();
        },
        getTypeDescription: function() {
            return TypeDescription.OBJECT;
        },
        addAttribute: function(name, dataType) {
            name = NameGenerator.generateName(StringUtils.decap(name), _.keys(this.schema().properties));
            this.attributes.push(new ObjectAttribute(name, dataType));
            this.schema().properties[name] = dataType.toJS();
            return name;
        },
        getAttribute: function(attributeName) {
            return _.find(this.attributes(), function(a) {
                return a.name() === attributeName;
            });
        },
        removeAttribute: function(attributeName) {
            this.attributes.remove(this.getAttribute(attributeName));
            delete this.schema().properties[attributeName];
        },

        /** @override */
        toJS: function() {
            return {
                $ref: this.schema().$id
            };
        },
        schema: function() {
            var properties = {};
            _.each(this.attributes(), function(attribute) {
                properties[attribute.name()] = attribute.toJS();
            }, this);
            var schema = this._super();
            schema.properties = properties;
            return schema;
        }
    });

});

define('ObjectTypeRef',['require','DataType','TypeDescription'],function(require) {

    'use strict';

    //region dependencies
    var DataType = require('DataType'),
        TypeDescription = require('TypeDescription');
    //endregion

    return DataType.subClass({}, {
        init: function(ref, name) {
            this._super(ref, name, name, '', {
                $ref: ref
            });
        },
        getTypeDescription: function() {
            return TypeDescription.OBJECT_REF;
        }
    });

});

define('UnknownType',['require','DataType','knockout','TypeDescription'],function(require) {

    'use strict';

    //region dependencies
    var DataType = require('DataType'),
        ko = require('knockout'),
        TypeDescription = require('TypeDescription');
    //endregion

    return DataType.subClass({}, {
        init: function(schema) {
            this._super(this.getTypeName(), 'Unknown', 'Unknown', '', schema);
            this.attributes = ko.observable([]);
        },
        getTypeDescription: function() {
            return TypeDescription.UNKNOWN;
        }
    });

});

define('TypeFactory',['require','Class','StringType','NumberType','BooleanType','DateType','TimeType','DateTimeType','ArrayType','EnumType','ObjectType','ObjectTypeRef','UnknownType'],function(require) {

    'use strict';

    //region dependencies
    var Class = require('Class'),
        StringType = require('StringType'),
        NumberType = require('NumberType'),
        BooleanType = require('BooleanType'),
        DateType = require('DateType'),
        TimeType = require('TimeType'),
        DateTimeType = require('DateTimeType'),
        ArrayType = require('ArrayType'),
        EnumType = require('EnumType'),
        ObjectType = require('ObjectType'),
        ObjectTypeRef = require('ObjectTypeRef'),
        UnknownType = require('UnknownType');
    //endregion

    return Class.subClass({

        createStringType: function(name) {
            return new StringType(name);
        },

        createNumberType: function(name) {
            return new NumberType(name);
        },

        createBooleanType: function(name) {
            return new BooleanType(name);
        },

        createDateType: function(name) {
            return new DateType(name);
        },

        createTimeType: function(name) {
            return new TimeType(name);
        },

        createDateTimeType: function(name) {
            return new DateTimeType(name);
        },

        createArrayType: function(name, itemType, items) {
            return new ArrayType(name, itemType, items);
        },

        createEnumType: function(name, items) {
            return new EnumType(name, items);
        },

        createObjectType: function(qname, name, attributes) {
            return new ObjectType(qname, name, attributes);
        },

        createObjectTypeRef: function(ref, name) {
            return new ObjectTypeRef(ref, name);
        },

        createUnknownType: function(schema) {
            return new UnknownType(schema);
        }

    }, {});

});

define('ParseStrategy',['require','Class'],function(require) {

    'use strict';

    //region dependencies
    var Class = require('Class');
    //endregion

    return Class.subClass({}, {
        init: function() {

        },
        /** @abstract */
        resolveReference: function($ref, parser) {
            throw new Error('This function must be overridden');
        },
        /** @abstract */
        getObjectType: function(schema, parser) {
            throw new Error('This function must be overridden');
        },
        /** @abstract */
        createObjectType: function(schema, objectName, parser) {
            throw new Error('This function must be overridden');
        }
    });

});

define('DoNotResolveRefStrategy',['require','ParseStrategy'],function(require) {

    'use strict';

    //region dependencies
    var ParseStrategy = require('ParseStrategy');
    //endregion

    return ParseStrategy.subClass({}, {
        init: function() {

        },
        /** @override */
        resolveReference: function($ref, parser) {
            return parser.getObjectTypesRefs()[$ref];
        },
        /** @override */
        getObjectType: function(schema, parser) {
            return parser.getObjectTypes()[schema.$id];
        },
        /** @override */
        createObjectType: function(schema, objectName, parser) {
            return parser._createObjectType(schema, objectName, this);
        }
    });

});

define('ResolveRefStrategy',['require','ParseStrategy','DoNotResolveRefStrategy'],function(require) {

    'use strict';

    //region dependencies
    var ParseStrategy = require('ParseStrategy'),
        DoNotResolveRefStrategy = require('DoNotResolveRefStrategy');
    //endregion

    var DEFAULT_DEPTH = 2;

    return ParseStrategy.subClass({}, {
        init: function(depth) {
            this.depth = depth || DEFAULT_DEPTH;
            this.objectsCache = {};
        },
        /** @override */
        resolveReference: function($ref, parser) {
            return parser._doResolveReference(parser.getObjectTypesRefs()[$ref], this);
        },
        /** @override */
        getObjectType: function(schema, parser) {
            return this.createObjectType(schema, parser.getObjectTypes()[schema.$id].name(), parser);
        },
        /** @override */
        createObjectType: function(schema, objectName, parser) {
            this.cacheObject(schema.$id);
            if (this.depth >= this.objectsCache[schema.$id]) {
                return parser._createObjectType(schema, objectName, this);
            } else {
                return parser._createObjectType(schema, objectName, new DoNotResolveRefStrategy());
            }
        },
        cacheObject: function($id) {
            if (this.objectsCache[$id]) {
                this.objectsCache[$id]++;
            } else {
                this.objectsCache[$id] = 1;
            }
        }
    });

});

define('IdentityType',['require','StringType','NumberType','ObjectType'],function(require) {

    'use strict';

    var StringType = require('StringType'),
        NumberType = require('NumberType'),
        ObjectType = require('ObjectType');

    var identityObject = new ObjectType('IdentityBrowser', 'IdentityBrowser', []);
    var identityProperties = {
        id: new StringType(),
        title: new StringType(),
        firstName: new StringType(),
        lastName: new StringType(),
        type: new StringType(),
        email: new StringType(),
        mobile: new NumberType()
    };

    for (var key in identityProperties) {
        /* istanbul ignore else */
        if (identityProperties.hasOwnProperty(key)) {
            identityObject.addAttribute(key, identityProperties[key]);
        }
    }

    return identityObject;
});

define('TypeCatalog',['require','Class','knockout','TypeFactory','NameGenerator','underscore','jquery','ObjectTypeRef','DoNotResolveRefStrategy','ResolveRefStrategy','IdentityType','ObjectAttribute'],function(require) {

    'use strict';

    //region dependencies
    var Class = require('Class'),
        ko = require('knockout'),
        TypeFactory = require('TypeFactory'),
        NameGenerator = require('NameGenerator'),
        _ = require('underscore'),
        $ = require('jquery'),
        ObjectTypeRef = require('ObjectTypeRef'),
        DoNotResolveRefStrategy = require('DoNotResolveRefStrategy'),
        ResolveRefStrategy = require('ResolveRefStrategy'),
        IdentityType = require('IdentityType'),
        ObjectAttribute = require('ObjectAttribute');
    //endregion

    var addObjectType = function(objectType) {
        TypeCatalog.getObjectTypes()[objectType.id()] = objectType;
    };

    var TypeCatalog = Class.subClass({

        initTypes: function() {
            this.objectTypes = undefined;
            this.objectTypesRefs = undefined;
        },

        getSimpleTypesDefinitions: function() {
            if (this.simpleTypes === undefined) {
                this.simpleTypes = ko.observable({});
                this.simpleTypes().STRING = TypeFactory.createStringType();
                this.simpleTypes().NUMBER = TypeFactory.createNumberType();
                this.simpleTypes().BOOLEAN = TypeFactory.createBooleanType();
                this.simpleTypes().DATE = TypeFactory.createDateType();
                this.simpleTypes().TIME = TypeFactory.createTimeType();
                this.simpleTypes().DATE_TIME = TypeFactory.createDateTimeType();
            }
            return this.simpleTypes();
        },

        getObjectTypesRefs: function() {
            if (this.objectTypesRefs === undefined) {
                this.objectTypesRefs = ko.observable({});
            }
            return this.objectTypesRefs();
        },

        getObjectTypes: function() {
            if (this.objectTypes === undefined) {
                this.objectTypes = ko.observable({});
            }
            return this.objectTypes();
        },

        getArrayTypeDefinition: function(itemType) {
            return this.getArrayType(itemType);
        },

        getArrayType: function(itemType, name, items) {
            return TypeFactory.createArrayType(name, itemType, items);
        },

        //get specific identityType object
        getIdentityType: function() {
            addObjectType(IdentityType);
            return IdentityType;
        },

        parseRootType: function(schemaKey, schema) {
            return this._doParseType(schemaKey, schema, new DoNotResolveRefStrategy());
        },

        parseTypePartially: function(schemaKey, schema, depth) {
            return this._doParseType(schemaKey, schema, new ResolveRefStrategy(depth));
        },

        /* jshint maxcomplexity: 17 */
        //TODO improve this method!!!
        _doParseType: function(schemaKey, schema, strategy) {
            if (schema === undefined) {
                return TypeFactory.createUnknownType({});
            }
            if (schema.$ref) {
                if (this.getObjectTypesRefs()[schema.$ref] === undefined) {
                    this.getObjectTypesRefs()[schema.$ref] = TypeFactory.createObjectTypeRef(schema.$ref, schemaKey);
                }
                return strategy.resolveReference(schema.$ref, this);
            } else if (schema.enum) {
                return TypeFactory.createEnumType(schemaKey, schema.enum);
            } else {
                switch (schema.type) {
                    case 'string':
                        var simpleType;
                        switch (schema.format) {
                            case 'string':
                                simpleType = TypeFactory.createStringType(schemaKey);
                                break;
                            case 'date':
                                simpleType = TypeFactory.createDateType(schemaKey);
                                break;
                            case 'time':
                                simpleType = TypeFactory.createTimeType(schemaKey);
                                break;
                            case 'date-time':
                                simpleType = TypeFactory.createDateTimeType(schemaKey);
                                break;
                            default:
                                simpleType = TypeFactory.createStringType(schemaKey);
                                break;
                        }
                        return simpleType;
                    case 'boolean':
                        return TypeFactory.createBooleanType(schemaKey);
                    case 'number':
                        var type;
                        if (schema.format === 'base64Binary') {
                            type = TypeFactory.createStringType(schemaKey);
                        } else {
                            type = TypeFactory.createNumberType(schemaKey);
                        }
                        return type;
                    case 'array':
                        var itemType = this._doParseType('itemType', schema.items, strategy);
                        return this.getArrayType(itemType, schemaKey, schema.items);
                    case 'object':
                        var objectType;
                        if (this.getObjectTypes()[schema.$id]) {
                            objectType = this.getObjectTypes()[schema.$id] = strategy.getObjectType(schema, this);
                        } else {
                            var objectName = NameGenerator.generateName(schema.$name, this.objectTypes());
                            objectType = strategy.createObjectType(schema, objectName, this);
                            addObjectType(objectType);
                        }
                        return objectType;
                    default:
                        return TypeFactory.createUnknownType(schema);
                }
            }
        },

        _createObjectType: function(schema, objectName, strategy) {
            var attributes = [];

            _.each(_.keys(schema.properties), function(attributeKey) {
                var dataType = this._doParseType(attributeKey, schema.properties[attributeKey], strategy);
                attributes.push(new ObjectAttribute(attributeKey, dataType));
            }, this);

            return TypeFactory.createObjectType(schema.$id, objectName, attributes);
        },

        resolveReference: function(objectTypeRef) {
            return this._getOrResolveReference(objectTypeRef, new ResolveRefStrategy(1));
        },

        _getOrResolveReference: function(objectTypeRef, strategy) {
            var objectType = _.find(this.getObjectTypes(), function(type) {
                return type.schema().$id === objectTypeRef.schema().$ref;
            }, this);

            if (objectType) {
                return objectType;
            } else {
                return this._doResolveReference(objectTypeRef, strategy);
            }
        },

        _doResolveReference: function(objectTypeRef, strategy) {
            var schema = this.typeHandler.getResolvedControl(objectTypeRef.schema().$ref);

            if (!$.isEmptyObject(schema)) {
                return this._doParseType(objectTypeRef.name(), schema, strategy);
            } else {
                return TypeFactory.createUnknownType(objectTypeRef.schema());
            }
        },

        getConcreteType: function(schemaKey, schema) {
            var type = this._doParseType(schemaKey, schema, new DoNotResolveRefStrategy());

            if (type instanceof ObjectTypeRef) {
                type = this.resolveReference(type);
            }

            return type;
        }

    }, {});

    return TypeCatalog;

});

define('FormControlDefinition',['require','InputControlDefinition','knockout','TypeCatalog'],function(require) {

    'use strict';

    //region dependencies
    var InputControlDefinition = require('InputControlDefinition'),
        ko = require('knockout'),
        TypeCatalog = require('TypeCatalog');
    //endregion

    return InputControlDefinition.subClass({}, {

        init: function(id, reference, formHandler, controlTemplate) {
            this._super(id, null, controlTemplate);
            this.reference = reference;
            this.formHandler = formHandler;
            this.form = this.formHandler.getResolvedControl(this.reference.get().formId);
            this.dataType = TypeCatalog.parseTypePartially('definition', this.form.definition);
        },
        properties: function() {
            return ko.utils.extend(this._super(), {
                reference: this.reference,
                form: this.form,
                dataType: this.dataType
            });
        }
    });
});

define('RendererControlType',['require','InputControlDefinition','ControlDefinition','ControlTypeId','TypeCatalog','FormControlDefinition'],function(require) {

    'use strict';

    //region dependencies
    var InputControlDefinition = require('InputControlDefinition'),
        ControlDefinition = require('ControlDefinition'),
        ControlTypeId = require('ControlTypeId'),
        TypeCatalog = require('TypeCatalog'),
        FormControlDefinition = require('FormControlDefinition');
    //end region

    return {
        'INPUT_TEXT': new InputControlDefinition(ControlTypeId.INPUT_TEXT, TypeCatalog.getSimpleTypesDefinitions().STRING, 'rendererTextControl'),
        'TEXT_AREA': new InputControlDefinition(ControlTypeId.TEXT_AREA, TypeCatalog.getSimpleTypesDefinitions().STRING, 'rendererTextAreaControl'),
        'BUTTON': new ControlDefinition(ControlTypeId.BUTTON, 'rendererButtonControl'),
        'SELECT': new InputControlDefinition(ControlTypeId.SELECT, TypeCatalog.getSimpleTypesDefinitions().STRING, 'rendererSelectControl'),
        'CHECKLIST': new InputControlDefinition(ControlTypeId.CHECKLIST, TypeCatalog.getArrayType(TypeCatalog.getSimpleTypesDefinitions().STRING), 'rendererChecklistControl'),
        'CHECKBOX': new InputControlDefinition(ControlTypeId.CHECKBOX, TypeCatalog.getSimpleTypesDefinitions().BOOLEAN, 'rendererCheckboxControl'),
        'RADIO_BUTTON': new InputControlDefinition(ControlTypeId.RADIO_BUTTON, TypeCatalog.getSimpleTypesDefinitions().STRING, 'rendererRadioButtonControl'),
        'NUMBER': new InputControlDefinition(ControlTypeId.NUMBER, TypeCatalog.getSimpleTypesDefinitions().NUMBER, 'rendererNumberControl'),
        'DATE': new InputControlDefinition(ControlTypeId.DATE, TypeCatalog.getSimpleTypesDefinitions().DATE, 'rendererDateControl'),
        'TIME': new InputControlDefinition(ControlTypeId.TIME, TypeCatalog.getSimpleTypesDefinitions().TIME, 'rendererTimeControl'),
        'DATE_TIME': new InputControlDefinition(ControlTypeId.DATE_TIME, TypeCatalog.getSimpleTypesDefinitions().DATE_TIME, 'rendererDateTimeControl'),
        'EMAIL': new InputControlDefinition(ControlTypeId.EMAIL, TypeCatalog.getSimpleTypesDefinitions().STRING, 'rendererEmailControl'),
        'URL': new InputControlDefinition(ControlTypeId.URL, TypeCatalog.getSimpleTypesDefinitions().STRING, 'rendererUrlControl'),
        'MESSAGE': new InputControlDefinition(ControlTypeId.MESSAGE, TypeCatalog.getSimpleTypesDefinitions().STRING, 'rendererMessageControl'),
        'LINK': new InputControlDefinition(ControlTypeId.LINK, TypeCatalog.getSimpleTypesDefinitions().STRING, 'rendererLinkControl'),
        'MONEY': new InputControlDefinition(ControlTypeId.MONEY, TypeCatalog.getSimpleTypesDefinitions().NUMBER, 'rendererMoneyControl'),
        'PHONE': new InputControlDefinition(ControlTypeId.PHONE, TypeCatalog.getSimpleTypesDefinitions().STRING, 'rendererPhoneControl'),
        'IMAGE': new InputControlDefinition(ControlTypeId.IMAGE, TypeCatalog.getSimpleTypesDefinitions().STRING, 'rendererImageControl'),
        'VIDEO': new InputControlDefinition(ControlTypeId.VIDEO, TypeCatalog.getSimpleTypesDefinitions().STRING, 'rendererVideoControl'),
        'IDENTITY_BROWSER': new InputControlDefinition(ControlTypeId.IDENTITY_BROWSER, TypeCatalog.getArrayType(TypeCatalog.getSimpleTypesDefinitions().STRING), 'rendererIdentityControl'),
        'PANEL': new ControlDefinition(ControlTypeId.PANEL, 'rendererPanelControl'),
        'SECTION': new ControlDefinition(ControlTypeId.SECTION, 'rendererSectionControl'),
        'TAB': new ControlDefinition(ControlTypeId.TAB, 'rendererTabControl'),
        'TAB_CONTAINER': new ControlDefinition(ControlTypeId.TAB_CONTAINER, 'rendererTabContainerControl'),
        'REPEATABLE_SECTION': new InputControlDefinition(ControlTypeId.REPEATABLE_SECTION, TypeCatalog.getArrayTypeDefinition(TypeCatalog.getSimpleTypesDefinitions().STRING), 'rendererRepeatableSectionControl'),
        'TABLE': new InputControlDefinition(ControlTypeId.TABLE, TypeCatalog.getArrayTypeDefinition(TypeCatalog.getSimpleTypesDefinitions().STRING), 'rendererTableControl'),
        'TABLE_COLUMN': new ControlDefinition(ControlTypeId.TABLE_COLUMN, ''),
        /**
         * @param reference {Object} instance of Reference.js
         * @param handler {Object} instance of Handler.js
         * @returns {FormControlDefinition}
         */
        'FORM_REFERENCE': function(reference, handler) {
            return new FormControlDefinition(ControlTypeId.FORM_REFERENCE, reference, handler, 'rendererFormReferenceControl');
        }
    };
});

define('RendererId',[],function() {

    'use strict';

    /**
     *
     *
     *
     *
     *
     *
     *
     *
     * DO NOT REMOVE THIS COMMENT
     * FOR PCS INTEGRATION (ADF DOESN'T INCLUDE SMALL FILES)
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     */

    return {
        FORM_RENDERER: 'form-renderer'
    };
});

define('Icon',['require','Class'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class');

    //endregion

    var DATA_PREFIX = 'data:image/svg+xml;base64,';

    return Class.subClass({}, {
        init: function(icon, hoverIcon, activeIcon) {
            this.value = icon;
            this.hover = hoverIcon;
            this.active = activeIcon;
        },
        getDataValue: function() {
            return DATA_PREFIX + window.btoa(this.value);
        },
        getDataHover: function() {
            return DATA_PREFIX + window.btoa(this.hover);
        },
        getDataActive: function() {
            return DATA_PREFIX + window.btoa(this.active);
        }
    });


});

define('EventsId',['require','ojL10n!rendererMsg/nls/renderer'],function(require) {

    'use strict';
    var msg = require('ojL10n!rendererMsg/nls/renderer');

    return {
        ON_LOAD: {
            value: 'ON_LOAD',
            label: msg.ON_LOAD,
            event: 'load'
        },
        ON_CHANGE: {
            value: 'ON_CHANGE',
            label: msg.ON_CHANGE,
            event: 'change'
        },
        ON_FOCUS: {
            value: 'ON_FOCUS',
            label: msg.ON_FOCUS,
            event: 'focus'
        },
        ON_BLUR: {
            value: 'ON_BLUR',
            label: msg.ON_BLUR,
            event: 'blur'
        },
        ON_EXPAND_TOGGLE: {
            value: 'ON_EXPAND_TOGGLE',
            label: msg.ON_EXPAND_TOGGLE,
            event: 'expand'
        },
        ON_EXPAND: {
            value: 'ON_EXPAND',
            label: msg.ON_EXPAND,
            event: 'expand'
        },
        ON_COLLAPSE: {
            value: 'ON_COLLAPSE',
            label: msg.ON_COLLAPSE,
            event: 'expand'
        },
        ON_SELECTION_CHANGE: {
            value: 'ON_SELECTION_CHANGE',
            label: msg.ON_SELECTION_CHANGE,
            event: 'selectionChange'
        },
        ON_SELECTED: {
            value: 'ON_SELECTED',
            label: msg.ON_SELECTED,
            event: 'ojselect'
        },
        ON_UNSELECTED: {
            value: 'ON_UNSELECTED',
            label: msg.ON_UNSELECTED,
            event: 'ojdeselect'
        },
        ON_CLICK: {
            value: 'ON_CLICK',
            label: msg.ON_CLICK,
            event: 'click'
        },
        ON_SUBMIT: {
            value: 'ON_SUBMIT',
            label: msg.ON_SUBMIT,
            event: 'submit'
        },
        ON_ADD_ROW: {
            value: 'ON_ADD_ROW',
            label: msg.ON_ADD_ROW,
            event: 'addRow'
        },
        ON_REMOVE_ROW: {
            value: 'ON_REMOVE_ROW',
            label: msg.ON_REMOVE_ROW,
            event: 'removeRow'
        },
        ON_CHILDREN_CHANGE: {
            value: 'ON_CHILDREN_CHANGE',
            label: 'ON_CHILDREN_CHANGE',
            event: 'childrenChange'
        }
    };
});

define('Handler',['require','Class'],function(require) {

    'use strict';

    //region dependencies
    var Class = require('Class');
    //endregion

    /** @interface
     * Subclass Handler.js and implement every abstract operation in your particular Handler
     * */
    return Class.subClass({}, {
        init: function(id) {
            this._id = id;
        },

        /** @abstract
         * @param {int} start: The start index
         * @param {int} end: The end index
         * @return Promise (the list of controls from start to end).
         * This list should contain a preview of the controls with only this basic information: id, name, icon;
         * */
        listControls: function(start, end) {
            throw new Error('This function must be overridden');
        },

        /** @abstract
         * @param {string} id: The id of the control
         * @return Promise (The full model of the control with the provided id).
         *         Promise.then doesn't return undefined. If the form is not there, it returns an empty Object {}
         * */
        getControl: function(id) {
            throw new Error('This function must be overridden');
        },

        /** @abstract
         * @param {string} id: The id of the control
         * @return The full model of the control with the provided id. It doesn't return a Promise object. 
         *         It doesn't return undefined. If the form is not there, it returns an empty Object {}
         * */
        getResolvedControl: function(id) {
            throw new Error('This function must be overridden');
        },

        /** @abstract
         * @param {string} control: The full model of the control. It goes to the server if necessary.
         * */
        addOrUpdateControl: function(control) {
            throw new Error('This function must be overridden');
        },

        /** @abstract
         * @param {string} control: The full model of the control. It does it immediately without going to the server
         * */
        addResolvedControl: function(control) {
            throw new Error('This function must be overridden');
        },

        /** @abstract
         * @param {string} id: The id of the control to remove
         * */
        removeControl: function(id) {
            throw new Error('This function must be overridden');
        },

        /** @abstract
         * @param {string} text: The text to search across all controls
         * @return Promise (the list of controls which name attribute contains the provided text)
         * */
        search: function(text) {
            throw new Error('This function must be overridden');
        },

        toJS: function() {
            return this._id;
        }

    });
});

define('ContextualHandler',['require','Handler'],function(require) {

    'use strict';

    //region dependencies
    var Handler = require('Handler');
    //endregion

    return Handler.subClass({}, {
        init: function(id) {
            this._super(id);
        },
        setContext: function(context) {
            this.context = context;
        },
        resolveDependencies: function(dependencies) {
            this.context.resolveDependencies(dependencies);
        }
    });
});

define('DefaultFormHandler',['require','ContextualHandler','underscore','jquery'],function(require) {

    'use strict';

    /* globals Promise */

    //region dependencies
    var ContextualHandler = require('ContextualHandler'),
        _ = require('underscore'),
        $ = require('jquery');
    //endregion

    var DefaultFormHandler = ContextualHandler.subClass({}, {
        init: function(id) {
            this._super(id);
            this._references = [];
            this._forms = [];
        },

        /** @override */
        listControls: function(start, end) {
            end = end ? end + 1 : this._references.length;
            return Promise.resolve(this._references.slice(start, end));
        },

        /** @override */
        getControl: function(id) {
            return Promise.resolve($.extend(true, {}, _.find(this._forms, function(form) {
                return form.id === id;
            }, this)));
        },

        /** @override */
        getResolvedControl: function(id) {
            return $.extend(true, {}, _.find(this._forms, function(form) {
                return form.id === id;
            }, this));
        },

        /** @override */
        addOrUpdateControl: function(control) {
            var originalForm = _.find(this._forms, function(form) {
                return form.id === control.id;
            }, this);

            if (originalForm) {
                var index = this._forms.indexOf(originalForm);
                this._forms.splice(index, 1, control);
            } else {
                this._forms.push(control);
            }
        },

        /** @override */
        addResolvedControl: function(control) {
            this.addOrUpdateControl(control);
        },

        /** @override */
        removeControl: function(id) {
            throw new Error('Unsupported operation');
        },

        /** @override */
        search: function(text) {
            return Promise.resolve(_.filter(this._references, function(reference) {
                return reference.formName.toLowerCase().indexOf(text.toLowerCase()) > -1;
            }, this));
        }
    });

    return {
        create: function() {
            return new DefaultFormHandler('DefaultFormHandler');
        }
    };
});

define('DefaultCssHandler',['require','ContextualHandler','underscore','jquery'],function(require) {

    'use strict';

    /* globals Promise */

    //region dependencies
    var ContextualHandler = require('ContextualHandler'),
        _ = require('underscore'),
        $ = require('jquery');
    //endregion

    var DefaultCssHandler = ContextualHandler.subClass({}, {
        init: function(id) {
            this._super(id);
            this._references = [];
            this._stylesheets = [];
        },

        /** @override */
        listControls: function(start, end) {
            end = end ? end + 1 : this._references.length;
            return Promise.resolve(this._references.slice(start, end));
        },

        /** @override */
        getControl: function(id) {
            return Promise.resolve($.extend(true, {}, _.find(this._stylesheets, function(stylesheet) {
                return stylesheet.id === id;
            }, this)));
        },

        /** @override */
        getResolvedControl: function(id) {
            var stylesheet = _.find(this._stylesheets, function(stylesheet) {
                return stylesheet.id === id;
            }, this);
            // if stylesheet exists in cache, return it as promise else fetch it from server.
            if (stylesheet) {
                return Promise.resolve($.extend(true, {}, stylesheet, this));
            }
            return this.getControl(id);
        },

        /** @override */
        addOrUpdateControl: function(stylesheet) {
            var originalStylesheet = _.find(this._stylesheets, function(ss) {
                    return ss.id === stylesheet.id;
                }, this),
                index;

            if (originalStylesheet) {
                index = this._stylesheets.indexOf(originalStylesheet);
                this._stylesheets.splice(index, 1, stylesheet);
            } else {
                this._stylesheets.push(stylesheet);
            }

            var originalStylesheetRef = _.find(this._references, function(ss) {
                return ss.id === stylesheet.id;
            }, this);

            if (originalStylesheetRef) {
                index = this._references.indexOf(originalStylesheetRef);
                this._references.splice(index, 1, {
                    id: stylesheet.id
                });
            } else {
                this._references.push({
                    id: stylesheet.id
                });
            }
        },

        /** @override */
        addResolvedControl: function(stylesheet) {
            this.addOrUpdateControl(stylesheet);
        },

        /** @override */
        removeControl: function(id) {
            for (var i = this._stylesheets.length - 1; i >= 0; i--) {
                if (this._stylesheets[i].id === id) {
                    this._stylesheets.splice(i, 1);
                    this._references.splice(i, 1);
                }
            }
        }
    });

    return {
        create: function() {
            return new DefaultCssHandler('DefaultCssHandler');
        }
    };
});

define('DefaultTypeHandler',['require','ContextualHandler','underscore','jquery'],function(require) {

    'use strict';

    /* globals Promise */

    //region dependencies
    var ContextualHandler = require('ContextualHandler'),
        _ = require('underscore'),
        $ = require('jquery');
    //endregion

    var DefaultTypeHandler = ContextualHandler.subClass({}, {
        init: function(id) {
            this._super(id);
            this._references = [];
            this._types = [];
        },

        /** @override */
        listControls: function(start, end) {
            end = end ? end + 1 : this._references.length;
            return Promise.resolve(this._references.slice(start, end));
        },

        /** @override */
        getControl: function(id) {
            return Promise.resolve($.extend(true, {}, _.find(this._types, function(type) {
                return type.$id === id;
            }, this)));
        },

        /** @override */
        getResolvedControl: function(id) {
            return $.extend(true, {}, _.find(this._types, function(type) {
                return type.$id === id;
            }, this));
        },

        /** @override */
        addOrUpdateControl: function(control) {
            var originalType = _.find(this._types, function(type) {
                return type.$id === control.$id;
            }, this);

            if (originalType) {
                var index = this._types.indexOf(originalType);
                this._types.splice(index, 1, control);
            } else {
                this._types.push(control);
            }
        },

        /** @override */
        addResolvedControl: function(control) {
            this.addOrUpdateControl(control);
        },

        /** @override */
        removeControl: function(id) {
            throw new Error('Unsupported operation');
        },

        /** @override */
        search: function(text) {
            return Promise.resolve(_.filter(this._references, function(reference) {
                return reference.name.toLowerCase().indexOf(text.toLowerCase()) > -1;
            }, this));
        }
    });

    return {
        create: function() {
            return new DefaultTypeHandler('DefaultTypeHandler');
        }
    };
});

define('DefaultRestHandler',['require','ContextualHandler','ojL10n!rendererMsg/nls/renderer','underscore','jquery'],function(require) {

    'use strict';

    /* globals Promise, window */

    //region dependencies
    var ContextualHandler = require('ContextualHandler'),
        msg = require('ojL10n!rendererMsg/nls/renderer'),
        _ = require('underscore'),
        $ = require('jquery');
    //endregion

    var url = (function() {
        /* istanbul ignore if */
        if (!window.location.origin) {
            window.location.origin = window.location.protocol + '//' + window.location.hostname + (window.location.port ? ':' + window.location.port : '');
        }
        return window.location.origin;
    })();

    var getJWTCookie = function() {
        var matchStr = '(?:^|; )' + encodeURIComponent('jwt') + '=([^;]*)';
        var jwtCookie = new RegExp(matchStr).exec(document.cookie);

        return jwtCookie ? jwtCookie[1] : null;
    };

    var DefaultRestHandler = ContextualHandler.subClass({}, {
        init: function(id) {
            this._super(id);
            this.restBaseUrl = url + '/bpm/api/3.0/';
        },
        getAuthInfo: function() {
            var jwtCookie = getJWTCookie();

            if (jwtCookie) {
                return 'Bearer ' + jwtCookie;
            } else {
                return null;
            }
        },
        execute: function(rest, params) {
            var url = this.restBaseUrl + rest.name;
            var authInfo = this.getAuthInfo();

            _.defaults(rest, {
                type: 'GET'
            });

            /* istanbul ignore next */
            return new Promise(function(resolve, reject) {
                $.ajax({
                    url: url,
                    type: rest.type,
                    dataType: 'json',
                    data: params,
                    beforeSend: function(xhr) {
                        xhr.setRequestHeader('content-type', 'application/json; charset=utf-8');

                        /* istanbul ignore else */
                        if (authInfo) {
                            xhr.setRequestHeader('Authorization', authInfo);
                        }
                    },
                    xhrFields: {
                        withCredentials: true
                    },
                    success: function(response) {
                        resolve(response[rest.optionsListBinding]);
                    },
                    error: function(response) {
                        reject(msg.FAILED_TO_FETCH_REST);
                    }
                });
            });

        }
    });

    return {
        create: function() {
            return new DefaultRestHandler('DefaultRestHandler');
        }
    };
});

define('DependencyType',['require','Enum','underscore'],function(require) {

    'use strict';

    //region dependencies
    var Enum = require('Enum'),
        _ = require('underscore');
    //endregion

    return Enum.subClass({
        FORM: {
            type: 'FORM',
            handler: 'formHandler'
        },
        STYLESHEET: {
            type: 'STYLESHEET',
            handler: 'cssHandler'
        },
        BUSINESS_TYPE: {
            type: 'BUSINESS_TYPE',
            handler: 'typeHandler'
        },

        fromType: function(type) {
            var key = _.find(_.keys(this), function(key) {
                return key === type;
            });
            return this[key];
        }
    }, {});

});

define('DefaultConnectorHandler',['require','ContextualHandler','jquery'],function(require) {

    'use strict';

    /* globals Promise */

    //region dependencies
    var ContextualHandler = require('ContextualHandler'),
        $ = require('jquery');
    //endregion

    var DefaultConnectorHandler = ContextualHandler.subClass({}, {
        init: function(id) {
            this._super(id);
            this._connectors = [];
            this._resources = [];
            this._operations = [];
            this._operationDefinitions = [];
        },
        listConnectors: function() {
            return Promise.resolve(this._connectors);
        },
        listResources: function(connectorId) {
            var resources = [];
            $.each(this._resources, function(i, resource) {
                if (resource.connectorId === connectorId) {
                    resources.push(resource);
                }
            });
            return Promise.resolve(resources);
        },
        listOperations: function(connectorId, resourceId) {
            var ops = [];
            $.each(this._operations, function(i, operation) {
                if (operation.connectorId === connectorId && operation.resourceId === resourceId) {
                    ops.push(operation);
                }
            });
            return Promise.resolve(ops);
        },
        getOperationDefinition: function(connectorId, resourcedId, operationId) {
            var definition = null;
            $.each(this._operationDefinitions, function(i, def) {
                if (def.connectorId === connectorId && def.id === operationId) {
                    definition = def;
                    return false;
                }
            });
            return Promise.resolve(definition);
        },
        execute: function(callPayload) {
            return Promise.resolve({});
        }
    });

    return {
        create: function() {
            return new DefaultConnectorHandler('DefaultConnectorHandler');
        }
    };
});

define('DefaultTranslationsHandler',['require','ContextualHandler','underscore'],function(require) {

    'use strict';

    /* globals Promise */

    //region dependencies
    var ContextualHandler = require('ContextualHandler'),
        _ = require('underscore');
    //endregion

    var DefaultTranslationsHandler = ContextualHandler.subClass({}, {
        init: function(id) {
            this._super(id);
            this._bundles = {};
            this._allBundles = [];
        },

        fetchBundle: function(languageId) {
            var self = this;
            _.each(this._allBundles, function(fetchedBundle) {
                if (fetchedBundle.id === languageId) {
                    self._bundles.initLocaleBundle = fetchedBundle.bundle;
                }
            });
            return Promise.resolve(this._bundles);
        },

        clearAllBundles: function() {
            this._allBundles = [];
        }


    });

    return {
        create: function() {
            return new DefaultTranslationsHandler('DefaultTranslationsHandler');
        }
    };
});

define('Configuration',['require','Class','knockout','DefaultFormHandler','DefaultCssHandler','DefaultTypeHandler','DefaultRestHandler','DependencyType','TypeCatalog','DefaultConnectorHandler','DefaultTranslationsHandler','underscore'],function(require) {

    'use strict';

    //region dependencies
    var Class = require('Class'),
        ko = require('knockout'),
        DefaultFormHandler = require('DefaultFormHandler'),
        DefaultCssHandler = require('DefaultCssHandler'),
        DefaultTypeHandler = require('DefaultTypeHandler'),
        DefaultRestHandler = require('DefaultRestHandler'),
        DependencyType = require('DependencyType'),
        TypeCatalog = require('TypeCatalog'),
        DefaultConnectorHandler = require('DefaultConnectorHandler'),
        DefaultTranslationsHandler = require('DefaultTranslationsHandler'),
        _ = require('underscore');
    //endregion

    return Class.subClass({}, {
        init: function(config) {
            config = config || {};
            var unwrappedReadOnly = ko.utils.unwrapObservable(config.readOnly); // If config.readOnly is itself a function then it should be unwrap, otherwise it keeps on wrapping in observable.
            this._initHandlers(config);
            this.selectedMedia = config.selectedMedia;
            this.convertJSON = config.convertJSON;
            this.readOnly = ko.observable(unwrappedReadOnly);
            this.domIdPrefix = config.domIdPrefix || '';
        },

        _initHandlers: function(config) {
            this.formHandler = this.isUndefined(config.formHandler);
            this.cssHandler = this.isUndefined(config.cssHandler);
            this.typeHandler = this.isUndefined(config.typeHandler);
            this.connectorHandler = this.isUndefined(config.connectorHandler);
            this.restHandler = this.isUndefined(config.restHandler);
            this.translationsHandler = this.isUndefined(config.translationsHandler);

            _.defaults(this.formHandler, DefaultFormHandler.create());
            _.defaults(this.cssHandler, DefaultCssHandler.create());
            _.defaults(this.typeHandler, DefaultTypeHandler.create());
            _.defaults(this.connectorHandler, DefaultConnectorHandler.create());
            _.defaults(this.restHandler, DefaultRestHandler.create());
            _.defaults(this.translationsHandler, DefaultTranslationsHandler.create());

            this.formHandler.setContext(this);
            this.cssHandler.setContext(this);
            this.typeHandler.setContext(this);
            TypeCatalog.initTypes();
            TypeCatalog.typeHandler = this.typeHandler;

            this.connectorHandler.setContext(this);
            this.restHandler.setContext(this);
            this.translationsHandler.setContext(this);
        },

        isUndefined: function(handler) {
            if (!handler) {
                return {};
            }
            return handler;
        },
        resolveDependencies: function(dependencies) {
            _.each(dependencies, function(dependency) {
                var type = DependencyType.fromType(dependency.type);
                this[type.handler].addResolvedControl(dependency.object);
            }, this);
        },
        toJS: function() {
            return {
                formHandler: this.formHandler.toJS(),
                cssHandler: this.cssHandler.toJS(),
                typeHandler: this.typeHandler.toJS(),
                translationsHandler: this.translationsHandler.toJS(),
                selectedMedia: this.selectedMedia
            };
        }
    });
});

define('koToJSUtil',['require','Class','underscore','knockout'],function(require) {

    'use strict';


    //region dependencies

    var Class = require('Class'),
        _ = require('underscore'),
        ko = require('knockout');

    //endregion

    function unwarpValue(value) {
        value = ko.unwrap(value);
        if (value && value.toJS) {
            return value.toJS();
        } else {
            return value;
        }
    }

    return Class.subClass({
        toJS: function(object) {
            var js = _.isArray(object) ? [] : {};
            _.each(object, function(value, key) {
                js[key] = unwarpValue(value);
                if (_.isObject(js[key])) {
                    js[key] = this.toJS(js[key]);
                }
            }, this);
            return js;
        }
    }, {});
});

define('OptionsProperties',['require','Class','koToJSUtil'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class'),
        koToJSUtil = require('koToJSUtil');

    //endregion

    return Class.subClass({}, {

        init: function(properties) {

        },
        observables: function() {
            throw new Error('Not implemented operation exception');
        },
        toJS: function() {
            return koToJSUtil.toJS(this.observables());
        }
    });
});

define('StaticProperties',['require','OptionsProperties','knockout','underscore'],function(require) {

    'use strict';

    //region dependencies

    var OptionsProperties = require('OptionsProperties'),
        ko = require('knockout'),
        _ = require('underscore');

    //endregion

    return OptionsProperties.subClass({}, {
        init: function(properties) {

            properties = properties || {};
            _.defaults(properties, {
                optionsNames: 'option 1\noption 2',
                optionsValues: 'option1\noption2',
                defaultValue: [],
                autoFocus: false
            });

            this.optionsNames = ko.observable(properties.optionsNames);
            this.optionsValues = ko.observable(properties.optionsValues);
            this.defaultValue = ko.observableArray(properties.defaultValue);
            this.autoFocus = ko.observable(properties.autoFocus);
        },
        observables: function() {
            return {
                optionsNames: this.optionsNames,
                optionsValues: this.optionsValues,
                defaultValue: this.defaultValue,
                autoFocus: this.autoFocus
            };
        }
    });
});

define('RestProperties',['require','OptionsProperties','knockout','underscore'],function(require) {

    'use strict';

    //region dependencies

    var OptionsProperties = require('OptionsProperties'),
        ko = require('knockout'),
        _ = require('underscore');

    //endregion

    return OptionsProperties.subClass({}, {
        init: function(properties) {

            properties = properties || {};
            _.defaults(properties, {
                defaultValue: [],
                autoFocus: false
            });

            this.defaultValue = ko.observableArray(properties.defaultValue);
            this.autoFocus = ko.observable(properties.autoFocus);
        },
        observables: function() {
            return {
                defaultValue: this.defaultValue,
                autoFocus: this.autoFocus
            };
        }
    });
});

define('ResponseMapping',['require','Class','underscore','koToJSUtil','knockout'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class'),
        _ = require('underscore'),
        koToJSUtil = require('koToJSUtil'),
        ko = require('knockout');

    //rendregion

    return Class.subClass({}, {

        init: function(jsonModel) {
            jsonModel = jsonModel || {};
            _.defaults(jsonModel, {
                optionsListBinding: '',
                valueBinding: '',
                labelBinding: ''
            });

            this.optionsListBinding = ko.observable(jsonModel.optionsListBinding);
            this.valueBinding = ko.observable(jsonModel.valueBinding);
            this.labelBinding = ko.observable(jsonModel.labelBinding);
        },
        observables: function() {
            return {
                optionsListBinding: this.optionsListBinding,
                valueBinding: this.valueBinding,
                labelBinding: this.labelBinding
            };
        },
        toJS: function() {
            return koToJSUtil.toJS(this.observables());
        }
    });
});

define('DynamicProperties',['require','OptionsProperties','ResponseMapping','knockout','underscore'],function(require) {

    'use strict';

    //region dependencies

    var OptionsProperties = require('OptionsProperties'),
        ResponseMapping = require('ResponseMapping'),
        ko = require('knockout'),
        _ = require('underscore');

    //endregion

    return OptionsProperties.subClass({}, {
        init: function(properties) {
            properties = properties || {};
            _.defaults(properties, {
                defaultValue: [],
                simple: true,
                autoFocus: false
            });

            this.response = ko.observable(new ResponseMapping(properties.response || {}));
            this.defaultValue = ko.observableArray(properties.defaultValue);
            this.simple = ko.observable(properties.simple);
            this.autoFocus = ko.observable(properties.autoFocus);
        },
        observables: function() {
            return {
                defaultValue: this.defaultValue,
                simple: this.simple(),
                response: this.response,
                autoFocus: this.autoFocus
            };
        }
    });
});

define('UUID',[],function() {
	'use strict';

	return {
		createUuid: function() {
			function s4() {
				return Math.floor((1 + Math.random()) * 0x10000)
					.toString(16)
					.substring(1);
			}
			return [s4() + s4(), s4(), s4(), s4(), s4() + s4() + s4()].join('-');
		},
		createSafeUuid: function() {
			var id = 'ACT' + this.createUuid();
			return id.replace(/-/g, '');
		}
	};
});

define('ConnectorProperties',['require','DynamicProperties','underscore','UUID','knockout'],function(require) {

    'use strict';

    //region dependencies

    var DynamicProperties = require('DynamicProperties'),
        _ = require('underscore'),
        UUID = require('UUID'),
        ko = require('knockout');

    //endregion

    return DynamicProperties.subClass({}, {
        init: function(properties) {
            this._super(properties);

            properties = properties || {};
            _.defaults(properties, {
                id: UUID.createUuid(),
                connectorId: '',
                resource: '',
                operationId: '',
                headerParams: [],
                templateParams: [],
                queryParams: [],
                skipDuringLoad: false
            });

            this.id = properties.id;
            this.connectorId = ko.observable(properties.connectorId);
            this.resource = ko.observable(properties.resource);
            this.operationId = ko.observable(properties.operationId);
            this.skipDuringLoad = ko.observable(properties.skipDuringLoad);
            this.queryParams = ko.observableArray(properties.queryParams);
            this.headerParams = ko.observableArray(properties.headerParams);
            this.templateParams = ko.observableArray(properties.templateParams);
        },
        clone: function() {
            return {
                id: this.id,
                queryParams: this.queryParams(),
                headerParams: this.headerParams(),
                templateParams: this.templateParams(),
                skipDuringLoad: this.skipDuringLoad(),
                connector: {
                    name: this.connectorId(),
                    resource: this.resource(),
                    method: this.operationId()
                },
                response: this.response().toJS()
            };
        },
        observables: function() {
            var observables = this._super();
            return _.extend(observables, {
                skipDuringLoad: this.skipDuringLoad
            });
        },
        toJS: function() {
            return {
                id: this.id,
                skipDuringLoad: ko.unwrap(this.skipDuringLoad),
                defaultValue: ko.unwrap(this.defaultValue),
                autoFocus: ko.unwrap(this.autoFocus)
            };
        }
    });
});

define('OptionsPropertiesFactory',['require','Class','StaticProperties','RestProperties','ConnectorProperties','DynamicProperties'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class'),
        StaticProperties = require('StaticProperties'),
        RestProperties = require('RestProperties'),
        ConnectorProperties = require('ConnectorProperties'),
        DynamicProperties = require('DynamicProperties');

    //endregion

    return Class.subClass({
        createProperties: function(typeId, properties) {
            var createFunction = this[typeId];
            return createFunction(properties);
        },
        STATIC: function(properties) {
            return new StaticProperties(properties);
        },
        REST: function(properties) {
            return new RestProperties(properties);
        },
        DYNAMIC: function(properties) {
            return new DynamicProperties(properties);
        },
        CONNECTOR: function(properties) {
            return new ConnectorProperties(properties);
        },
        LIST_CONNECTOR: function(properties) {
            return new ConnectorProperties(properties);
        },
        EVENT_CONNECTOR: function(properties) {
            return new ConnectorProperties(properties);
        }
    }, {});
});

define('OptionsResolver',['require','Class','OptionsPropertiesFactory','knockout','ojs/ojprogressbar'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class'),
        OptionsPropertiesFactory = require('OptionsPropertiesFactory'),
        ko = require('knockout');
    require('ojs/ojprogressbar');

    //endregion

    return Class.subClass({}, {
        init: function(typeId, context, properties) {
            this.properties = ko.observable(OptionsPropertiesFactory.createProperties(typeId, properties));

            this.customValidationMessages = ko.observableArray();

            this.loading = ko.observable(false);
        },
        getOptions: function() {
            throw new Error('operation not supported exception');
        },
        getDefaultValue: function() {
            throw new Error('operation not supported exception');
        },
        getDefaultValueOptions: function() {
            throw new Error('operation not supported exception');
        }
    });
});

define('OjSelectItem',['require','Class'],function(require) {

    'use strict';

    //region dependencies
    var Class = require('Class');
    //endregion

    /**
     * Constructs an Item to use in a OjSelect component
     */
    return Class.subClass({
        create: function(value, label) {
            return {
                value: value,
                label: label
            };
        }
    }, {});
});

define('DynamicOptionType',['require','OjSelectItem','ojL10n!rendererMsg/nls/renderer','underscore'],function(require) {

    'use strict';

    //region dependencies

    var OjSelectItem = require('OjSelectItem'),
        msg = require('ojL10n!rendererMsg/nls/renderer'),
        _ = require('underscore');

    //endregion

    return {
        FIRST: _.extend(OjSelectItem.create('FIRST', msg.FIRST_LABEL), {
            getValue: function(options) {
                var first = options[0];
                return first ? [first.value] : [];
            }
        }),
        LAST: _.extend(OjSelectItem.create('LAST', msg.LAST_LABEL), {
            getValue: function(options) {
                var last = options[options.length - 1];
                return last ? [last.value] : [];
            }
        })
    };
});

define('DynamicAutoFocus',['require','knockout','DynamicOptionType'],function(require) {

    'use strict';

    //region dependencies

    var ko = require('knockout'),
        DynamicOptionType = require('DynamicOptionType');

    //end region

    var AutoFocus = function(resolver) {
        this.read = function() {
            var autoFocus = [];
            var typeId = resolver.properties().autoFocus()[0];
            if (typeId) {
                var autoFocusType = DynamicOptionType[typeId];
                autoFocus = autoFocusType.getValue(resolver.getOptions());
            }
            return autoFocus;
        };
    };

    return {
        create: function(resolver) {
            return ko.pureComputed(new AutoFocus(resolver));
        }
    };
});

define('DynamicDefaultValue',['require','knockout','jquery','DynamicOptionType'],function(require) {

    'use strict';

    //region dependencies

    var ko = require('knockout'),
        $ = require('jquery'),
        DynamicOptionType = require('DynamicOptionType');

    //end region

    var DefaultValue = function(resolver) {
        this.read = function() {
            //get default Value based on dynamic default type
            var defaultValueList = resolver.properties().defaultValue();
            var realValues = [];
            $.each(defaultValueList, function() {
                var typeId = this;
                var dynamicOptionType = DynamicOptionType[typeId];
                var defaultValue = dynamicOptionType.getValue(resolver.getOptions());
                realValues = realValues.concat(defaultValue);
            });
            return realValues.length > 0 ? realValues : [];
        };
    };

    return {
        create: function(resolver) {
            return ko.pureComputed(new DefaultValue(resolver));
        }
    };
});

define('DynamicOptionsResolver',['require','OptionsResolver','OjSelectItem','DynamicAutoFocus','DotExpressionResolver','DynamicDefaultValue','jquery'],function(require) {

    'use strict';

    //region dependencies

    var OptionsResolver = require('OptionsResolver'),
        OjSelectItem = require('OjSelectItem'),
        DynamicAutoFocus = require('DynamicAutoFocus'),
        DotExpressionResolver = require('DotExpressionResolver'),
        DynamicDefaultValue = require('DynamicDefaultValue'),
        $ = require('jquery');

    //endregion

    return OptionsResolver.subClass({}, {
        init: function(typeId, context, properties) {
            this._super(typeId, context, properties);
            this.context = context;

            this.autoFocus = DynamicAutoFocus.create(this);
            this.getDefaultValue = DynamicDefaultValue.create(this);
        },
        getOptions: function() {
            var options = [];
            var list = this._getPayloadList(this.properties().response().optionsListBinding());
            var simple = this.properties().simple();
            var valueBinding = this.properties().response().valueBinding();
            var labelBinding = this.properties().response().labelBinding();
            $.each(list, function() {
                if (simple) {
                    options.push(OjSelectItem.create(this, this));
                } else {
                    var value = DotExpressionResolver.getValue(this, valueBinding);
                    var label = DotExpressionResolver.getValue(this, labelBinding);
                    options.push(OjSelectItem.create(value, label));
                }
            });
            return options;
        },
        _getPayloadList: function(binding) {
            return this.context.payload() ?
                this.context.payload().getBindingValue(binding) || [] : [];
        }
    });
});

define('FormsLogger',['require','Class'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class');

    /*globals console */
    //end region

    var FormsLogger = Class.subClass({
        logger: null,
        getLogger: function() {
            if (!FormsLogger.logger) {
                FormsLogger.logger = new FormsLogger();
            }
            return FormsLogger.logger;
        }
    }, {
        init: function() {
            this.debug = window.formLoggerEnabled;
        },
        log: function(value) {
            if (this.debug) {
                console.log(value);
            }
        },
        count: function(value) {
            if (this.debug) {
                console.count(value);
            }
        },
        time: function(value) {
            if (this.debug) {
                console.time(value);
            }
        },
        timeEnd: function(value) {
            if (this.debug) {
                console.timeEnd(value);
            }
        }
    });

    return FormsLogger;
});

define('ConnectorResolver',['require','OptionsResolver','DynamicDefaultValue','DotExpressionResolver','knockout','ojs/ojcore','FormsLogger','ojL10n!rendererMsg/nls/renderer','jquery','DynamicAutoFocus'],function(require) {

    'use strict';

    //region dependencies

    var OptionsResolver = require('OptionsResolver'),
        DynamicDefaultValue = require('DynamicDefaultValue'),
        DotExpressionResolver = require('DotExpressionResolver'),
        ko = require('knockout'),
        oj = require('ojs/ojcore'),
        FormsLogger = require('FormsLogger'),
        msg = require('ojL10n!rendererMsg/nls/renderer'),
        $ = require('jquery'),
        DynamicAutoFocus = require('DynamicAutoFocus');

    //endregion

    return OptionsResolver.subClass({}, {
        init: function(typeId, context, properties, controlId) {
            this.controlId = controlId;
            this.requiredFormValues = [];
            this.formId = context.viewModel.formId;
            this.presentationId = context.viewModel.presentationId;
            properties = this._fetchProperties(context, properties);
            this._super(typeId, context, properties);

            this.autoFocus = DynamicAutoFocus.create(this);
            this.getDefaultValue = DynamicDefaultValue.create(this);

            this._options = ko.observableArray(null);

            this.getOptions = ko.pureComputed(function() {
                return this._options();
            }.bind(this));

            this._callConnector = function(callPayload) {
                FormsLogger.getLogger().count('[COUNT] [CONNECTOR]');
                return context.config().connectorHandler.execute(callPayload);
            };
        },

        loadAndSetConnector: function(form) {
            this.loading(true);
            this.loadConnector(form).then(function(response) {
                this._options(this._buildOptions(response));
                this.loading(false);
                this.customValidationMessages([]);
            }.bind(this)).catch(function(error) {
                //ToDo 16.4.5 This should come parsed from the handler
                error = JSON.parse(error);
                this.customValidationMessages([new oj.Message(msg.FAILED_TO_FETCH_CONNECTOR, error.defaultMessage)]);
                this.loading(false);
            }.bind(this));
        },

        loadConnector: function(form) {
            this._findControl = form.findControlInsideRepeatable.bind(form);
            return this._fetchOptions();
        },

        _fetchOptions: function() {
            var formValues = this._buildArguments();
            var callPayload = {
                id: this.properties().id,
                listBinding: this.properties().response().optionsListBinding().replace('response.', ''),
                formValues: formValues,
                formId: this.formId,
                presentationId: this.presentationId
            };
            return this._callConnector(callPayload);
        },
        _buildArguments: function() {
            var formValues = {};
            var self = this;
            $.each(this.requiredFormValues, function() {
                //debugger;
                var foundNode = self._findControl(self.controlId);
                if (foundNode) {
                    var realControl = foundNode.findClosest(this);
                    formValues[this] = realControl ? realControl.getControlValue() : null;
                }

            });
            return formValues;
        },
        _buildOptions: function(response) {

            var optionsListBinding = this.properties().response().optionsListBinding();
            response = response || {};

            return DotExpressionResolver.getPCSCompatibleValue(response, optionsListBinding) || [];

        },
        _fetchProperties: function(context, properties) {
            var callDefinition = context.findCallDefinition(properties.id);
            if (callDefinition) {
                this.requiredFormValues = callDefinition.formValues || [];
                properties.response = callDefinition.response().toJS();
            }
            return properties;
        }
    });
});

define('ListConnectorResolver',['require','ConnectorResolver','knockout'],function(require) {

    'use strict';

    //region dependencies

    var ConnectorResolver = require('ConnectorResolver'),
        ko = require('knockout');

    //endregion

    return ConnectorResolver.subClass({}, {
        init: function(typeId, context, properties, controlId) {
            this._super(typeId, context, properties, controlId);

            var self = this;
            var loadedSubs;

            function executeConnectorForm(form) {
                self.loading(true);
                if (form.loaded()) {
                    self.loadAndSetConnector(form);
                } else if (!loadedSubs) {
                    loadedSubs = form.loaded.subscribe(function() {
                        loadedSubs.dispose();
                        self.loadAndSetConnector(form);
                    });
                }
            }
            if (!ko.unwrap(ko.unwrap(this.properties).skipDuringLoad)) {
                context.viewModel.form.subscribe(executeConnectorForm);
                if (context.viewModel.form()) {
                    setTimeout(function() {
                        executeConnectorForm(context.viewModel.form());
                    });
                }
            }
        }
    });
});

define('ConnectorOptionsResolver',['require','ListConnectorResolver','DotExpressionResolver','OjSelectItem','jquery'],function(require) {

    'use strict';

    //region dependencies

    var ListConnectorResolver = require('ListConnectorResolver'),
        DotExpressionResolver = require('DotExpressionResolver'),
        OjSelectItem = require('OjSelectItem'),
        $ = require('jquery');

    //endregion

    return ListConnectorResolver.subClass({}, {
        init: function(typeId, context, properties, controlId) {
            this._super(typeId, context, properties, controlId);
        },
        _buildOptions: function(response) {
            var options = [];
            var optionsListBinding = this.properties().response().optionsListBinding();
            var valueBinding = this.properties().response().valueBinding();
            var labelBinding = this.properties().response().labelBinding();
            /* istanbul ignore next */
            response = response || {};

            var list = DotExpressionResolver.getPCSCompatibleValue(response, optionsListBinding) || [];

            $.each(list, function(i, item) {
                var value = DotExpressionResolver.getPCSCompatibleValue(item, valueBinding);
                var label = DotExpressionResolver.getPCSCompatibleValue(item, labelBinding);
                /* istanbul ignore else */
                if (value !== undefined && label !== undefined) {
                    options.push(OjSelectItem.create(value, label));
                }
            });

            return options;
        }
    });
});

define('RestResolver',['require','OptionsResolver','DynamicDefaultValue','knockout','ojs/ojcore'],function(require) {

    'use strict';

    //region dependencies

    var OptionsResolver = require('OptionsResolver'),
        DynamicDefaultValue = require('DynamicDefaultValue'),
        ko = require('knockout'),
        oj = require('ojs/ojcore');

    //endregion

    return OptionsResolver.subClass({}, {
        init: function(typeId, context, properties, controlId) {
            this._super(typeId, context, properties);
            this.controlId = controlId;

            this.autoFocus = ko.pureComputed({
                read: function() {
                    return this.properties().autoFocus();
                },
                owner: this
            });

            this.getDefaultValue = DynamicDefaultValue.create(this);

            this._options = ko.observableArray(null);

            this.getOptions = ko.pureComputed(function() {
                return this._options();
            }.bind(this));

            this._callRest = function(rest, params) {
                return context.config().restHandler.execute(rest, params);
            };
        },

        loadAndSetRest: function(rest, params) {
            this.callRest(rest, params).then(function(response) {
                this._options(response[rest.optionsListBinding]);
                this.customValidationMessages([]);
            }.bind(this)).catch(function(error) {
                this.customValidationMessages([new oj.Message(error)]);
            }.bind(this));
        },

        callRest: function(rest, params) {
            return this._callRest(rest, params);
        }
    });
});

define('RestOptionsResolver',['require','RestResolver'],function(require) {

    'use strict';

    //region dependencies

    var RestResolver = require('RestResolver');

    //endregion

    return RestResolver.subClass({}, {
        init: function(typeId, context, properties, controlId) {
            this._super(typeId, context, properties, controlId);
        }
    });
});

define('StaticOptionsResolver',['require','OptionsResolver','OjSelectItem','koToJSUtil','knockout'],function(require) {

    'use strict';

    //region dependencies

    var OptionsResolver = require('OptionsResolver'),
        OjSelectItem = require('OjSelectItem'),
        koToJSUtil = require('koToJSUtil'),
        ko = require('knockout');

    //endregion

    return OptionsResolver.subClass({}, {
        init: function(typeId, context, properties) {
            this._super(typeId, context, properties);

            this.autoFocus = ko.pureComputed({
                read: function() {
                    return this.properties().autoFocus();
                },
                write: function(value) {
                    this.properties().autoFocus(value);
                },
                owner: this
            });
        },
        getOptions: function() {
            var properties = koToJSUtil.toJS(this.properties());
            // Split this into an array of names/value pairs wrt to enter key to fill the dropdown.
            var names = properties.optionsNames.split('\n'),
                values = properties.optionsValues.split('\n'),
                options = [];
            for (var i = 0; i < names.length; i++) {
                options.push(OjSelectItem.create(values[i], names[i]));
            }
            return options;
        },
        getDefaultValue: function() {
            return this.properties().defaultValue();
        },
        getDefaultValueOptions: function() {
            return this.getOptions();
        }
    });
});

define('OptionsResolverFactory',['require','Class','DynamicOptionsResolver','ConnectorOptionsResolver','ConnectorResolver','ListConnectorResolver','RestOptionsResolver','StaticOptionsResolver'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class'),
        DynamicOptionsResolver = require('DynamicOptionsResolver'),
        ConnectorOptionsResolver = require('ConnectorOptionsResolver'),
        ConnectorResolver = require('ConnectorResolver'),
        ListConnectorResolver = require('ListConnectorResolver'),
        RestOptionsResolver = require('RestOptionsResolver'),
        StaticOptionsResolver = require('StaticOptionsResolver');

    //endregion

    return Class.subClass({}, {

        createResolver: function(typeId, context, properties, controlId) {
            var createFunction = this[typeId];
            return createFunction(typeId, context, properties, controlId);
        },
        STATIC: function(typeId, context, properties) {
            return new StaticOptionsResolver(typeId, context, properties);
        },
        REST: function(typeId, context, properties, controlId) {
            return new RestOptionsResolver(typeId, context, properties, controlId);
        },
        DYNAMIC: function(typeId, context, properties) {
            return new DynamicOptionsResolver(typeId, context, properties);
        },
        CONNECTOR: function(typeId, context, properties, controlId) {
            return new ConnectorOptionsResolver(typeId, context, properties, controlId);
        },
        LIST_CONNECTOR: function(typeId, context, properties, controlId) {
            return new ListConnectorResolver(typeId, context, properties, controlId);
        },
        EVENT_CONNECTOR: function(typeId, context, properties, controlId) {
            return new ConnectorResolver(typeId, context, properties, controlId);
        }
    });
});

define('LoVMappingAutoComplete',['require','Class'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class');
    //endregion

    return Class.subClass({
        createAutoCompletes: function(control, context) {
            //Do nothing in renderer!
        },
        initialize: function(control, context) {
            //Do nothing in renderer!
        }
    }, {});
});

define('EventsQueue',['require','Class','FormsLogger','knockout'],function(require) {

    'use strict';

    //region dependencies
    var Class = require('Class'),
        FormsLogger = require('FormsLogger'),
        ko = require('knockout');
    //endregion
    /* global Promise */


    var MAX_RECURSIVE_EVENTS = 1000;

    /* istanbul ignore next */
    return Class.subClass({}, {
        eventDepthCount: 0,
        currentPromise: false,

        init: function() {
            this.eventDepthCount = 0;
            this.resolvedPromises = 0;
            this.isExecuting = ko.observable(false);
            var self = this;


            self.execute = function(control, event) {
                if (!control.viewModel.form() || !control.viewModel.form().loadEventsExecuted()) {
                    return;
                }

                if (self.eventDepthCount > MAX_RECURSIVE_EVENTS) {
                    console.error('User Events Error: Too many recursive events. Aborting.');
                    return;
                }

                self.eventDepthCount++;
                self.isExecuting(true);

                //Make sure we run the events after jet events (i.e. for selected rows)
                setTimeout(function() {
                    FormsLogger.getLogger().count('[COUNT] [EVENT]');
                    var promise = control.executeEvent(event.value);

                    if (self.eventDepthCount === 1) {
                        //This is the first event, it cant be resolved until all events created by this are resolved
                        self.resolvedPromises = 0;
                    }

                    promise.then(function() {
                        self.resolvedPromises++;
                        if (self.resolvedPromises === self.eventDepthCount) {
                            //All events are resolved, we are not waiting for any other, so no recursive loop can happen

                            self.eventDepthCount = 0;
                            self.resolvedPromises = 0;
                            self.isExecuting(false);

                        }
                    });
                });

                return true;
            };
        },

        resolveWhenEmpty: function() {
            var self = this;
            //Return a promise that resolves when the events queue is empty
            return new Promise(function(resolve, reject) {
                if (self.isExecuting()) {
                    var sub = self.isExecuting.subscribe(function() {
                        sub.dispose();
                        resolve();
                    });
                } else {
                    resolve();
                }
            });
        }
    });
});

define('ObservablePayloadContext',['require','Class','knockout','ControlTypeId','underscore'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class'),
        ko = require('knockout'),
        ControlTypeId = require('ControlTypeId'),
        _ = require('underscore');


    //endregion

    return Class.subClass({}, {
        controlBindings: {},
        init: function(controlBindings, bindingContext) {

            this.controlBindings = controlBindings || {};
            this.bindingContext = ko.unwrap(bindingContext) || '';
        },

        _getParentWithBinding: function(control) {
            var parent = control.getParent();
            while (parent.type !== ControlTypeId.FORM_PRESENTATION && !parent.isRepeatable() && !parent._bindingValue) {
                parent = parent.getParent();
            }
            return parent;
        },
        getBindingControlFor: function(control) {
            //Find a parent that has a bindingValue (repeatable row)
            var parent = this._getParentWithBinding(control);

            //But if there's a row, we use that context
            if (!!parent._bindingValue) {
                return parent._bindingValue;
            } else {
                //By default (not inside a repeatable, we add the observable to the global bindings
                return ko.unwrap(this.controlBindings);
            }
        },
        getFullBindingContextFor: function(control) {
            var bindingValue = this.getBindingControlFor(control);
            var parent = this._getParentWithBinding(control);
            var bindingContext = this.bindingContext;

            if (parent.isRepeatable() || _.isArray(ko.unwrap(bindingValue[bindingContext]))) {
                //If the parent were a row of the repeatable, it would have exited before
                //This only happens for the elements that describe rows, but have no data
                return '';
            }

            if (parent.type === ControlTypeId.FORM_PRESENTATION) {
                if (bindingContext.length > 0) {
                    bindingContext = bindingContext + '.';
                }
                return bindingContext + control.getFullBinding();
            } else {
                return control.properties.binding();
            }
        },

        _getObservable: function(control, creator, defaultValue) {
            var bindingValue = this.getBindingControlFor(control);
            var binding = this.getFullBindingContextFor(control);
            if (_.isEmpty(binding)) {
                //Creator can be either observable or observableArray
                //This is dynamic to avoid the code repetition
                return ko[creator](defaultValue);
            } else {

                //If there's no binding, we create one (dynamically observable or observableArray)
                if (_.isUndefined(bindingValue[binding])) {
                    bindingValue[binding] = ko[creator](defaultValue);
                } else if (!ko.isObservable(bindingValue[binding])) {
                    //If there's a value, but not an observable (ie. it came from the payload),
                    //we create an observable with that value
                    bindingValue[binding] = ko[creator](ko.unwrap(bindingValue[binding]));
                }
                //return the observable
                return bindingValue[binding];
            }
        },
        getObservableForBinding: function(control) {
            return this._getObservable(control, 'observable');
        },
        getObservableArrayForBinding: function(control) {
            return this._getObservable(control, 'observableArray', []);
        },
        getObservableValue: function(binding, shouldCreate) {
            if (!this.isObservableDefined(binding) && shouldCreate) {
                this.controlBindings[binding] = ko.observable(this.controlBindings[binding]);
            }
            return this.controlBindings[binding];
        },
        isObservableDefined: function(key) {
            return ko.isObservable(this.controlBindings[key]);
        },
        setValue: function(key, value) {
            if (this.isObservableDefined(key)) {
                this.controlBindings[key](value);
            } else {
                this.controlBindings[key] = value;
            }
        }
    });
});

define('Reference',['require','Class'],function(require) {

    'use strict';

    //region dependencies
    var Class = require('Class');
    //endregion

    /** @abstract */
    return Class.subClass({}, {
        init: function(reference) {
            this._reference = reference;
        },
        get: function() {
            throw new Error('This function must be overridden');
        }
    });
});

define('StaticFormReference',['require','Reference','knockout'],function(require) {

    'use strict';

    //region dependencies
    var Reference = require('Reference'),
        ko = require('knockout');
    //endregion

    return Reference.subClass({}, {
        init: function(reference) {
            this._super(reference);
            this.formId = ko.observable(reference.formId);
            this.formName = ko.observable(reference.formName);
            this.presentationId = ko.observable(reference.presentationId);
            this.icon = ko.observable(reference.icon);
        },
        /** @override */
        get: function() {
            return {
                formId: this.formId(),
                formName: this.formName(),
                presentationId: this.presentationId(),
                icon: this.icon()
            };
        }
    });
});

define('FormReferenceFactory',['require','Class','StaticFormReference'],function(require) {

    'use strict';

    //region dependencies
    var Class = require('Class'),
        StaticFormReference = require('StaticFormReference');
    //endregion

    var CREATE = 'CREATE_';

    var FormReferenceFactory = Class.subClass({

        create: function(reference) {
            var type = reference.type || 'STATIC';
            var createFunction = FormReferenceFactory[CREATE + type];
            if (createFunction) {
                return createFunction(reference);
            } else {
                throw new Error('Unsupported reference type exception');
            }
        },
        CREATE_STATIC: function(reference) {
            return new StaticFormReference(reference);
        }

    }, {});
    return FormReferenceFactory;
});

define('DecoratorsCatalog',['require','Class','underscore'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class'),
        _ = require('underscore');

    //end region
    return Class.subClass({}, {

        init: function() {
            this._decorators = {};
        },
        addToControl: function(control, context) {
            var decorators = this.getDecorators(control);

            _.each(decorators, function(decorator) {
                decorator.decorate(control, context);
            });
        },
        registerDecorator: function(decorator, controlType) {
            if (!controlType) {
                //registering a decorator for all the controls.
                controlType = 'all';
            }
            var defaultList = {};
            defaultList[controlType] = [];
            _.defaults(this._decorators, defaultList);

            var decorators = this._decorators[controlType];

            decorators.push(decorator);
        },
        getDecorators: function(control) {
            return _.union([], this._decorators.all, this._decorators[control.type]);
        }
    });
});

define('ControlDecorator',['require','Class','underscore'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class'),
        _ = require('underscore');

    //endregion

    return Class.subClass({}, {
        init: function(id, dependencies) {
            this.id = id;
            this._dependencies = dependencies || [];
        },
        decorate: function(control, context) {
            //check if the dependencies were applied, failed if not.
            _.each(this.dependencies(), function(dependency) {
                if (!dependency.isApplied(control)) {
                    throw new Error('Need ' + dependency.id + 'to use decorator:' + this.id);
                }
            }, this);
            this._decorate(control, context);
        },
        _decorate: function(control, context) {
            throw new Error('Unsupported Operation Exception');
        },
        dependencies: function() {
            return this._dependencies;
        },
        isApplied: function(control) {
            throw new Error('Unsupported Operation Exception');
        }
    });
});

define('MinLengthValidator',['require','ojs/ojcore','ojL10n!rendererMsg/nls/renderer'],function(require) {

    'use strict';
    //region dependencies

    var oj = require('ojs/ojcore'),
        msg = require('ojL10n!rendererMsg/nls/renderer');

    //endregion

    var MinLengthValidator = function(properties) {
        this.validate = function(value) {
            var min = properties.minLength();
            //If the value is empty, we don't check for minimum, it depends if it's required or not
            if (value.length < min && value.length > 0) {
                throw new oj.ValidatorError(msg.MIN_LENGTH_VALIDATION_MESSAGE_SUMMARY, msg.MIN_LENGTH_VALIDATION_MESSAGE_DETAIL + min);
            }
            return true;
        };
    };

    //Need to be a subclass of oj.Validator.
    oj.Object.createSubclass(MinLengthValidator, oj.Validator, 'MinLengthValidator');

    return MinLengthValidator;
});

define('MaxLengthValidator',['require','ojs/ojcore','ojL10n!rendererMsg/nls/renderer'],function(require) {

    'use strict';
    //region dependencies

    var oj = require('ojs/ojcore'),
        msg = require('ojL10n!rendererMsg/nls/renderer');

    //endregion

    var MaxLengthValidator = function(properties) {
        this.validate = function(value) {
            var max = properties.maxLength();
            if (value.length > max) {
                throw new oj.ValidatorError(msg.MAX_LENGTH_VALIDATION_MESSAGE_SUMMARY, msg.MAX_LENGTH_VALIDATION_MESSAGE_DETAIL + max);
            }
            return true;
        };
    };

    //Need to be a subclass of oj.Validator.
    oj.Object.createSubclass(MaxLengthValidator, oj.Validator, 'MaxLengthValidator');

    return MaxLengthValidator;
});

define('RequiredValidator',['require','ojs/ojcore'],function(require) {

    'use strict';
    //region dependencies

    var oj = require('ojs/ojcore');

    //endregion

    var RequiredValidator = function(properties) {
        this.validate = function(value) {
            if (properties.required()) {
                var requiredValidator = oj.Validation.validatorFactory(oj.ValidatorFactory.VALIDATOR_TYPE_REQUIRED).createValidator();
                requiredValidator.validate(value);
            }
        };
    };

    //Need to be a subclass of oj.Validator.
    oj.Object.createSubclass(RequiredValidator, oj.Validator, 'RequiredValidator');

    return RequiredValidator;
});

define('OptionsFeedValidator',['require','ojs/ojcore'],function(require) {

    'use strict';
    //region dependencies

    var oj = require('ojs/ojcore');

    //endregion

    var OptionsFeedValidator = function(properties) {
        this.validate = function() {
            var customMessages = properties.optionsFeed().optionsResolver().customValidationMessages();
            if (customMessages.length > 0) {
                var validationMessage = customMessages[0];
                throw new oj.ValidatorError(validationMessage.summary, validationMessage.detail);
            }
            return true;
        };
    };

    //Need to be a subclass of oj.Validator.
    oj.Object.createSubclass(OptionsFeedValidator, oj.Validator, 'OptionsFeedValidator');

    return OptionsFeedValidator;
});

define('PatternValidator',['require','ojs/ojcore','jquery','ojL10n!rendererMsg/nls/renderer'],function(require) {

    'use strict';
    //region dependencies

    var oj = require('ojs/ojcore'),
        $ = require('jquery'),
        msg = require('ojL10n!rendererMsg/nls/renderer');

    //endregion

    var PatternValidator = function(properties) {
        this.validate = function(value) {
            var pattern = properties.pattern(),
                regEx = new RegExp(pattern);
            if ($.trim(value) && !regEx.test(value)) {
                var patternMessage = properties.patternMessage() || msg.PATTERN_VALIDATION_MESSAGE_DETAIL + pattern;
                throw new oj.ValidatorError(msg.PATTERN_VALIDATION_MESSAGE_SUMMARY, patternMessage);
            }
            return true;
        };
    };

    //Need to be a subclass of oj.Validator.
    oj.Object.createSubclass(PatternValidator, oj.Validator, 'PatternValidator');

    return PatternValidator;
});

define('ValidatorFactory',['require','Class','MinLengthValidator','MaxLengthValidator','RequiredValidator','OptionsFeedValidator','PatternValidator'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class'),
        MinLengthValidator = require('MinLengthValidator'),
        MaxLengthValidator = require('MaxLengthValidator'),
        RequiredValidator = require('RequiredValidator'),
        OptionsFeedValidator = require('OptionsFeedValidator'),
        PatternValidator = require('PatternValidator');

    //endregion

    var CREATE = 'CREATE_';

    var ValidatorFactory = Class.subClass({

        createValidator: function(typeId, properties) {
            var createFunction = ValidatorFactory[CREATE + typeId];
            if (createFunction) {
                return createFunction(properties);
            } else {
                throw new Error('Unsupported operation exception');
            }
        },
        CREATE_MIN_LENGTH: function(properties) {
            return new MinLengthValidator(properties);
        },
        CREATE_MAX_LENGTH: function(properties) {
            return new MaxLengthValidator(properties);
        },
        CREATE_PATTERN: function(properties) {
            return new PatternValidator(properties);
        },
        CREATE_OPTIONS_FEED: function(properties) {
            return new OptionsFeedValidator(properties);
        },
        CREATE_REQUIRED: function(properties) {
            return new RequiredValidator(properties);
        }
    }, {});
    return ValidatorFactory;
});

define('NumberValidator',['require','ojs/ojcore'],function(require) {

    'use strict';
    //region dependencies

    var oj = require('ojs/ojcore');

    //endregion

    var NumberValidator = function() {
        this.validate = function(value) {
            var converter = oj.Validation.converterFactory(oj.ConverterFactory.CONVERTER_TYPE_NUMBER).createConverter();
            converter.parse(value);
        };
    };

    //Need to be a subclass of oj.Validator.
    oj.Object.createSubclass(NumberValidator, oj.Validator, 'NumberValidator');

    return NumberValidator;
});

define('DateValidator',['require','ojs/ojcore'],function(require) {

    'use strict';
    //region dependencies

    var oj = require('ojs/ojcore');

    //endregion

    var DateValidator = function(properties) {
        this.validate = function(value) {
            var converter = properties.dateConverter();
            converter.parse(value);
        };
    };

    //Need to be a subclass of oj.Validator.
    oj.Object.createSubclass(DateValidator, oj.Validator, 'DateValidator');

    return DateValidator;
});

define('MoneyValidator',['require','ojs/ojcore'],function(require) {

    'use strict';
    //region dependencies

    var oj = require('ojs/ojcore');

    //endregion

    var DateValidator = function(properties) {
        this.validate = function(value) {
            var converter = oj.Validation.converterFactory(oj.ConverterFactory.CONVERTER_TYPE_NUMBER).createConverter(properties.converterOptions());
            converter.parse(value);
        };
    };

    //Need to be a subclass of oj.Validator.
    oj.Object.createSubclass(DateValidator, oj.Validator, 'DateValidator');

    return DateValidator;
});

define('DateRangeValidator',['require','ojs/ojcore'],function(require) {

    'use strict';
    //region dependencies

    var oj = require('ojs/ojcore');

    //endregion

    var DateValidator = function(properties) {
        this.validate = function(value) {
            var dateConverter = properties.dateConverter();
            var dateTimeRangeValidator = oj.Validation.validatorFactory(oj.ValidatorFactory.VALIDATOR_TYPE_DATETIMERANGE).createValidator({
                min: properties.minValue(),
                max: properties.maxValue(),
                converter: dateConverter
            });
            dateTimeRangeValidator.validate(value);
        };
    };

    //Need to be a subclass of oj.Validator.
    oj.Object.createSubclass(DateValidator, oj.Validator, 'DateValidator');

    return DateValidator;
});

define('NumberRangeValidator',['require','ojs/ojcore'],function(require) {

    'use strict';
    //region dependencies

    var oj = require('ojs/ojcore');

    //endregion

    var DateValidator = function(properties) {
        this.validate = function(value) {
            var min = properties.minValue();
            var max = properties.maxValue();
            var options = {};
            if (min) {
                options.min = min;
            }
            if (max) {
                options.max = max;
            }
            var rangeValidator = oj.Validation.validatorFactory(oj.ValidatorFactory.VALIDATOR_TYPE_NUMBERRANGE).createValidator(options);
            rangeValidator.validate(value);
        };
    };

    //Need to be a subclass of oj.Validator.
    oj.Object.createSubclass(DateValidator, oj.Validator, 'DateValidator');

    return DateValidator;
});

define('TypeValidatorFactory',['require','Class','NumberValidator','DateValidator','MoneyValidator','DateRangeValidator','NumberRangeValidator'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class'),
        NumberValidator = require('NumberValidator'),
        DateValidator = require('DateValidator'),
        MoneyValidator = require('MoneyValidator'),
        DateRangeValidator = require('DateRangeValidator'),
        NumberRangeValidator = require('NumberRangeValidator');

    //endregion

    var CREATE = 'CREATE_';

    var ValidatorFactory = Class.subClass({

        createValidators: function(typeId, properties) {
            var validators = [];
            var createFunction = ValidatorFactory[CREATE + typeId];
            if (createFunction) {
                validators = createFunction(properties);
            }
            return validators;
        },
        CREATE_DATE: function(properties) {
            return [new DateValidator(properties), new DateRangeValidator(properties)];
        },
        CREATE_DATE_TIME: function(properties) {
            return ValidatorFactory.CREATE_DATE(properties);
        },
        CREATE_TIME: function(properties) {
            return ValidatorFactory.CREATE_DATE(properties);
        },
        CREATE_NUMBER: function(properties) {
            return [new NumberValidator(properties), new NumberRangeValidator(properties)];
        },
        CREATE_MONEY: function(properties) {
            return [new MoneyValidator(properties), new NumberRangeValidator(properties)];
        }
    }, {});
    return ValidatorFactory;
});

define('ValidatorTypeId',[],function() {

    'use strict';

    return {
        'MIN_LENGTH': 'MIN_LENGTH',
        'MAX_LENGTH': 'MAX_LENGTH',
        'PATTERN': 'PATTERN',
        'OPTIONS_FEED': 'OPTIONS_FEED',
        'REQUIRED': 'REQUIRED'
    };
});

define('ValidatorBuilder',['require','Class','koToJSUtil','underscore','StringUtils','ValidatorFactory','TypeValidatorFactory','ValidatorTypeId'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class'),
        koToJSUtil = require('koToJSUtil'),
        _ = require('underscore'),
        StringUtils = require('StringUtils'),
        ValidatorFactory = require('ValidatorFactory'),
        TypeValidatorFactory = require('TypeValidatorFactory'),
        ValidatorTypeId = require('ValidatorTypeId');

    //endregion

    return Class.subClass({

        getValidators: function(properties, toIgnore) {
            var controlValidators = [],
                propertiesJson = koToJSUtil.toJS(properties);
            //add generalised set of validators depending upon properties.
            _.each(propertiesJson, function(value, key) {
                // Capitalize and convert to underscore case from camel.
                key = (StringUtils.underscored(key)).toUpperCase();
                var isValueForValidatorDefined = (!_.isEmpty(value) || value > 0); //we should not add validators if properties are not set.
                if (ValidatorTypeId.hasOwnProperty(key) && isValueForValidatorDefined && toIgnore.indexOf(key) < 0) {
                    controlValidators.push(ValidatorFactory.createValidator(ValidatorTypeId[key], properties));
                }
            }, this);

            return controlValidators;
        },
        getValidatorsForType: function(type, properties) {
            return TypeValidatorFactory.createValidators(type, properties);
        }
    }, {});
});

define('ValidationDecorator',['require','ControlDecorator','ValidatorBuilder','ValidatorTypeId','ValidatorFactory','underscore'],function(require) {

    'use strict';

    //region dependencies
    var ControlDecorator = require('ControlDecorator'),
        ValidatorBuilder = require('ValidatorBuilder'),
        ValidatorTypeId = require('ValidatorTypeId'),
        ValidatorFactory = require('ValidatorFactory'),
        _ = require('underscore');

    //endregion

    return ControlDecorator.subClass({}, {
        init: function(dependencies) {
            this._super('VALIDATION', dependencies);
        },
        _decorate: function(control) {

            control.silentlyValidated = false;

            //ignoring required as JET will automatically validate it.
            control.validators = ValidatorBuilder.getValidators(control.properties, [ValidatorTypeId.REQUIRED]);

            control.registerRenderListener(function(control) {
                if (control.silentlyValidated) {
                    control.validate();
                }
            });
            control.validate = function() {
                var valid;
                if (control.rendered()) {
                    //DO the component validation
                    valid = this._validateComponent(control);
                } else {
                    control.silentlyValidated = true;
                    //DO silent validation.
                    valid = this._validateSilently(control);
                }
                control.isValid(valid);
                return valid;
            }.bind(this);
        },
        _validateComponent: function(control) {
            throw 'Must be overwritten';
        },
        _validateSilently: function(control) {
            var valid = true;
            //Adding required when silently validating.
            var silentValidators = [ValidatorFactory.CREATE_REQUIRED(control.properties)];
            var typeValidators = ValidatorBuilder.getValidatorsForType(control.type, control.properties);
            silentValidators = silentValidators.concat(typeValidators);
            var validators = _.union(control.validators, silentValidators);

            _.each(validators, function(validator) {
                try {
                    //having to validate both value and raw value because some cases
                    // value will not be updated with rawValue until is rendered
                    validator.validate(control.value());
                    if (control._rawValue) {
                        validator.validate(control._getRawValue());
                    }
                } catch (ex) {
                    valid = false;
                }
                return valid;
            });

            return valid && this._getDeferredCustomMessages(control).length === 0;
        },
        _getDeferredCustomMessages: function(control) {
            var customMessages = [];
            var deferredCalls = control.getOjComponent()();
            _.each(deferredCalls, function(call) {
                if (call[0] === 'option' && call[1] === 'messagesCustom' && call[2] !== undefined) {
                    customMessages.push(call[2]);
                }
            });
            return customMessages;
        },
        isApplied: function(control) {
            return control.hasOwnProperty('silentlyValidated');
        }
    });
});

define('JetValidationDecorator',['require','ValidationDecorator'],function(require) {

    'use strict';

    //region dependencies
    var ValidationDecorator = require('ValidationDecorator');

    //endregion

    return ValidationDecorator.subClass({}, {
        init: function(dependencies) {
            this._super(dependencies);
        },
        _decorate: function(control) {
            this._super(control);
            control.afterOjComponentInit = this._addValidationOptionChange.bind(this, control);
        },
        _componentValidation: function(ojComponentWidgetRef) {
            return ojComponentWidgetRef('validate');
        },
        _validateComponent: function(control) {
            var ojComponentWidgetRef = control.getOjComponent();

            //If the control is not loaded it has been rendered but oj is still unavailable (it may be during REST calls, ie)
            //We should validate silently
            if (ojComponentWidgetRef.isNotLoaded) {
                return this._validateSilently(control);
            }

            //Save the custom errors before validation, otherwise the custom errors would be cleared
            //The custom errors are only cleared when the control's value changes
            var customMsgs = ojComponentWidgetRef('option', 'messagesCustom');
            //Make sure control is not disabled and read only
            var wasDisabled = false,
                wasReadOnly = false;
            if (ojComponentWidgetRef('option', 'disabled')) {
                ojComponentWidgetRef('option', 'disabled', false);
                wasDisabled = true;
            }
            if (ojComponentWidgetRef('option', 'readOnly')) {
                ojComponentWidgetRef('option', 'readOnly', false);
                wasReadOnly = true;
            }
            //Do the real validation
            var isValid = this._componentValidation(ojComponentWidgetRef);
            //Set readonly and disabled again
            if (wasReadOnly) {
                ojComponentWidgetRef('option', 'readOnly', true);
            }
            if (wasDisabled) {
                ojComponentWidgetRef('option', 'disabled', true);
            }
            //Set the custom errors again
            ojComponentWidgetRef('option', 'messagesCustom', customMsgs);
            //return if isvalid and there are not custom errors
            return isValid && customMsgs.length === 0;
        },
        _addValidationOptionChange: function(control) {
            //If the component doesnt have messagesShown, then it wont have validation,
            // so we can avoid the unnecesary/possible (definitely) broken call
            // We ignore the else, as this shouldn't happen, but it's better to have the prevention
            /* istanbul ignore else */
            if (!!control.getOjComponent()('option', 'messagesShown')) {
                control.getOjComponent()({
                    optionChange: function(event, properties) {
                        //When there's a change in the messages Shown, recheck the validation and update the observable
                        //Skip the validation if there's a validation already happening, as the validation calls messagesShown
                        //and we want to avoid an infinite loop
                        if (!control._isValidating && properties.option === 'messagesShown') {
                            control._isValidating = true;
                            //Defer the validation until so the control is updated (sometimes valuechange is called after messagesShown)
                            setTimeout(function() {
                                control.isValid(control.validate());
                                //Defer the clear of _isValidating because 'messagesShown' are async, so we need to wait for those to be sent
                                setTimeout(function() {
                                    delete control._isValidating;
                                });
                            });
                        }
                    }
                });
            }
        }
    });
});

define('FormValidator',['require','Class','underscore','knockout'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class'),
        _ = require('underscore'),
        ko = require('knockout');

    //endregion

    return Class.subClass({}, {

        init: function() {

        },
        validate: function(controls, rendererContext) {
            var validData = true;

            // Validate all the controls that have properties
            var controlsList = this._filterControls(controls);

            var self = this;
            // Go through all the controls and run the custom validations.
            _.each(controlsList, function(control) {
                validData = self._validateControl(validData, rendererContext, control);
            });

            return this._checkTracker(rendererContext, validData);
        },
        validateControl: function(control, rendererContext) {
            return this.validate([control], rendererContext);
        },
        _filterControls: function(controls) {
            return _.filter(controls, function(control) {
                return control.properties && control.validate;
            });
        },
        _validateControl: function(validData, rendererContext, control) {
            //order is important because we want to always validate all the controls.
            return control.validate() && validData;
        },
        _checkTracker: function(rendererContext, validData) {
            var invalidTracker = ko.utils.unwrapObservable(rendererContext.tracker);
            if (invalidTracker) {
                // Explicitly show the validation messages.
                invalidTracker.showMessages();
            }
            // Focus on the first invalid control, if any.
            return validData;
        }
    });
});

define('RepeatableValidationDecorator',['require','ValidationDecorator','underscore','FormValidator','TreeUtil'],function(require) {

    'use strict';

    //region dependencies
    var ValidationDecorator = require('ValidationDecorator'),
        _ = require('underscore'),
        FormValidator = require('FormValidator'),
        TreeUtil = require('TreeUtil');

    //endregion

    return ValidationDecorator.subClass({}, {
        init: function(dependencies) {
            this._super(dependencies);
        },
        _validateComponent: function(control) {
            var dataSource = TreeUtil.treeToList(control.dataSource(), 'getControls');
            var valid = true;
            var formValidator = new FormValidator();

            _.each(dataSource, function(childControl) {
                valid = formValidator.validateControl(childControl, childControl.context) && valid;
            });
            return valid;
        },
        _validateSilently: function(control) {
            var valid = true;
            var dataSource = TreeUtil.treeToList(control.dataSource(), 'getControls');
            dataSource = _.filter(dataSource, function(control) {
                return control.validate;
            });
            var validate = this._super.bind(this);
            _.each(dataSource, function(childControl) {
                valid = validate(childControl) && valid;
            });
            return valid;
        }
    });
});

define('SilentLoader',['require','RendererViewModel'],function(require) {

    'use strict';

    //region dependencies

    //end region

    return {
        load: function(formModel) {
            var RendererViewModel = require('RendererViewModel');
            var wholeModel = {
                value: formModel
            };
            var rendererViewModel = new RendererViewModel(wholeModel);
            rendererViewModel.form().initPayloadAndRunEvents();

            return rendererViewModel;
        }
    };
});

define('FormReferenceValidationDecorator',['require','ValidationDecorator','SilentLoader','underscore','jquery'],function(require) {

    'use strict';

    //region dependencies
    var ValidationDecorator = require('ValidationDecorator'),
        SilentLoader = require('SilentLoader'),
        _ = require('underscore'),
        $ = require('jquery');

    //endregion

    return ValidationDecorator.subClass({}, {
        init: function(dependencies) {
            this._super(dependencies);
        },
        _decorate: function(control) {
            this._super(control);
            control._silentForm = _.extend({}, _.clone(control.selectedPresentation()));
        },
        _validateComponent: function(control) {
            var $control = $('#' + control.domIdPrefix + control.id);
            return $control.triggerHandler('validateData');
        },
        _validateSilently: function(control) {
            control._silentForm.payload = control.getControlValue();
            control._silentModel = SilentLoader.load({
                form: control._silentForm,
                config: _.clone(control.getConfig())
            });
            return !control._silentModel || control._silentModel.validateData();
        }
    });
});

define('LazyRenderingDecorator',['require','ControlDecorator','knockout','underscore'],function(require) {

    'use strict';

    //region dependencies
    var ControlDecorator = require('ControlDecorator'),
        ko = require('knockout'),
        _ = require('underscore');

    //endregion

    return ControlDecorator.subClass({}, {
        init: function() {
            this._super('LAZY_RENDERING');
        },
        _decorate: function(control, context) {
            control.renderListeners = [];
            control.rendered = ko.observable(false);
            control.registerRenderListener = function(listener) {
                control.renderListeners.push(listener);
            };
            control.detachRenderListener = function(listener) {
                control.renderListeners.splice(this.renderListeners.indexOf(listener), 1);
            };

            control.afterRender = function() {
                control.rendered(true);

                var toDetach = [];
                _.each(control.renderListeners, function(listener) {
                    if (listener(control, context)) {
                        toDetach.push(listener);
                    }
                });
                _.each(toDetach, function(listener) {
                    control.detachRenderListener(listener);
                });
            };
        },
        isApplied: function(control) {
            return control.hasOwnProperty('rendered');
        }
    });
});

define('TabRenderingDecorator',['require','ControlDecorator','knockout'],function(require) {

    'use strict';

    //region dependencies
    var ControlDecorator = require('ControlDecorator'),
        ko = require('knockout');

    //endregion

    return ControlDecorator.subClass({}, {
        init: function(dependencies) {
            this._super('LAZY_RENDERING', dependencies);
        },
        _decorate: function(tab) {
            //is lazyLoading option is selected the the tab should not be rendered until it is selected.
            tab.rendered = ko.observable(!tab.properties.lazyLoading());
        },
        isApplied: function(control) {
            return control.hasOwnProperty('rendered');
        }
    });
});

define('TabContainerRenderingDecorator',['require','ControlDecorator'],function(require) {

    'use strict';

    //region dependencies
    var ControlDecorator = require('ControlDecorator');

    //endregion

    return ControlDecorator.subClass({}, {
        init: function(dependencies) {
            this._super('LAZY_RENDERING', dependencies);
        },
        _decorate: function(tabContainer) {
            var renderedTabsCount = 0;

            tabContainer._renderSelectedTab = function(selectedTabPosition) {
                var tab = tabContainer.controls()[selectedTabPosition];
                if (tab && tab.rendered && !tab.rendered()) {
                    tab.rendered(true);
                    renderedTabsCount += 1;
                }
            };

            var selectedTabSubscription = tabContainer.properties.selectedPosition.subscribe(function(newValue) {
                tabContainer._renderSelectedTab(newValue);
                if (renderedTabsCount === tabContainer.controls().length) {
                    //all the tabs have been rendered, no need to keep listening.
                    selectedTabSubscription.dispose();
                }
            });
            var notifySelectedTabToRender = function() {
                tabContainer._renderSelectedTab(tabContainer.properties.selectedPosition());
                return true;
            };
            tabContainer.registerRenderListener(notifySelectedTabToRender);
        },
        isApplied: function(control) {
            return control.hasOwnProperty('_renderSelectedTab');
        }
    });
});

define('SectionRenderingDecorator',['require','ControlDecorator','knockout'],function(require) {

    'use strict';

    //region dependencies
    var ControlDecorator = require('ControlDecorator'),
        ko = require('knockout');

    //endregion

    return ControlDecorator.subClass({}, {
        init: function() {
            this._super('LAZY_RENDERING');
        },
        _decorate: function(section) {
            var lazyLoading = section.properties.lazyLoading();
            section.renderContent = ko.observable(!lazyLoading);
            if (lazyLoading) {
                section.properties.expanded(false);
                var expandSubscription = section.properties.expanded.subscribe(function() {
                    section.renderContent(true);
                    expandSubscription.dispose();
                });
            }
        },
        isApplied: function(control) {
            return control.hasOwnProperty('renderContent');
        }
    });
});

define('SectionAsyncRenderCallbackDecorator',['require','ControlDecorator'],function(require) {

    'use strict';

    //region dependencies
    var ControlDecorator = require('ControlDecorator');

    //endregion

    return ControlDecorator.subClass({}, {
        init: function() {
            this._super('ASYNC_RENDER_CALLBACK');
        },
        _decorate: function(section) {
            section.registerAsyncTemplate = function(context, controls) {
                var callback = context.registerAsyncTemplate(context, controls);

                return function() {
                    section._refresh();
                    callback();
                };
            };
        },
        isApplied: function(control) {
            return control.hasOwnProperty('registerAsyncTemplate');
        }
    });
});

define('TimeValidationDecorator',['require','JetValidationDecorator'],function(require) {

    'use strict';

    //region dependencies
    var JetValidationDecorator = require('JetValidationDecorator');

    //endregion

    //ToDo Jet 2.3.0 Remove this Decorator
    return JetValidationDecorator.subClass({}, {
        init: function(dependencies) {
            this._super(dependencies);
        },
        _decorate: function(control) {
            this._super(control);
        },
        _componentValidation: function(ojComponentWidgetRef) {
            //Execute the validation
            //Time and Datetime don't return values in validate, so we check for isValid after triggering it
            ojComponentWidgetRef('validate');
            return ojComponentWidgetRef('isValid');
        }
    });
});

define('RawDataDecorator',['require','ControlDecorator'],function(require) {

    'use strict';

    //region dependencies
    var ControlDecorator = require('ControlDecorator');

    //endregion

    return ControlDecorator.subClass({}, {
        init: function(dependencies) {
            this._super('INPUT_DECORATOR', dependencies);
        },
        _decorate: function(control) {

            var afterRender = function(control) {
                if (control._rawValue) {
                    control.setValue(control._rawValue);
                    delete control._rawValue;
                }
                return true;
            };

            control.registerRenderListener(afterRender);
        },
        isApplied: function(control) {
            return control.hasOwnProperty('rendered');
        }
    });
});

define('VideoValueDecorator',['require','ControlDecorator','knockout'],function(require) {

    'use strict';

    //region dependencies
    var ControlDecorator = require('ControlDecorator'),
        ko = require('knockout');

    //endregion

    var getVimeoCode = /vimeo\.com\/(video\/)?(.*)/,
        getYouTubeCode = /(youtu\.be\/|youtube\.com\/watch\?v=|youtube.com\/embed\/)(.*)/;


    function parseVideoLink(link, loop, showControls, autoPlay) {
        var parsedLink = '',
            vidCode,
            matches;

        matches = getVimeoCode.exec(link);
        if (matches) {
            vidCode = matches[2];
            parsedLink = 'https://player.vimeo.com/video/' + vidCode;
        }
        matches = getYouTubeCode.exec(link);
        if (matches) {
            vidCode = matches[2];
            parsedLink = 'https://www.youtube.com/embed/' + vidCode;
        }

        if (parsedLink) {
            parsedLink = parsedLink + '?loop=' + Number(loop) + '&controls=' + Number(showControls);
            if (loop) {
                // The loop parameter only works in the AS3 player when used in conjunction with the playlist parameter.
                // playlist parameter for a single video should have the video code as its value.
                parsedLink += '&playlist=' + vidCode;
            }
            // Append autoplay attribute only in case of renderer.
            parsedLink += '&autoplay=' + Number(autoPlay);
        }
        return parsedLink;
    }


    return ControlDecorator.subClass({}, {
        init: function(dependencies) {
            this._super('VIDEO_VALUE', dependencies);
        },
        _parseVideoLink: parseVideoLink,
        _decorate: function(control) {
            var self = this;

            control.properties.parsedVideoSrcLink = ko.pureComputed(function() {
                return self._parseVideoLink(this.getControlValue(), this.properties.loop(), this.properties.showControls(), this.properties.autoPlay());
            }, control);


        },
        isApplied: function(control) {
            return control.properties.hasOwnProperty('parsedVideoSrcLink');
        }
    });
});

define('ValueHelper',['require','jquery','knockout','underscore','ojs/ojcore'],function(require) {

    'use strict';

    //region dependencies

    var $ = require('jquery'),
        ko = require('knockout'),
        _ = require('underscore'),
        oj = require('ojs/ojcore');
    //endregion

    //Checks if the control has been rendered in the DOM
    function isRendered(control) {
        return ko.unwrap(control.rendered);
    }

    function setRawValue(control, ojComponentType, valueString) {
        //If element is rendered, update it and trigger OJet validation
        //Otherwise set the _rawValue, which will be updated when it is
        if (isRendered(control)) {
            var $control = $(control.domId);
            $control.val(valueString);
            //Make sure the oj component is instanced before triggering validation
            if (!(ojComponentType === 'ojInputTime' && valueString === '') && $control[ojComponentType]('instance')) {
                $control[ojComponentType]('validate');
            }
            oj.ComponentBinding.deliverChanges();
        } else {
            control._rawValue = valueString;
        }
    }

    return {
        /**
         * get rawValue directly from the DOM input.
         * @param control
         * @returns {*|jQuery} rawValue.
         */
        getRawValue: function(control) {
            return isRendered(control) ? $(control.domId).val() : control._rawValue;
        },
        /**
         * checking if value is a number before setting the value.
         * If it is not a number, then setting the value in the UI and triggering validation.
         * Note: updating the UI, will not update oj rawValue or value.
         * @param control
         * @param valueString value to be set.
         */
        setNumber: function(control, valueString) {
            if (isNaN(valueString)) {
                setRawValue(control, 'ojInputNumber', valueString);
            } else {
                control.value(valueString);
                //If the control is not rendered, save the value in _rawValue
                if (!isRendered(control)) {
                    control._rawValue = control.value();
                }
            }
        },
        /**
         * checking if the date provided is a valid date.
         * If not valid, setting the value in the UI and triggering validation.
         * Note: updating the UI, will not update oj rawValue or value.
         * @param control
         * @param ojComponentType
         * @param converter
         * @param valueString value to be set
         */
        setDate: function(control, ojComponentType, converter, valueString) {
            try {
                //checking if it is a valid date.
                control.value(converter.parse(valueString));
                //If the control is not rendered, save the value in _rawValue
                if (!isRendered(control)) {
                    control._rawValue = control.value();
                }

            } catch (ex) {
                //failed to parse string.
                setRawValue(control, ojComponentType, valueString);
            }
        },
        setRawValue: function(control, ojComponentType, valueString) {
            setRawValue(control, ojComponentType, valueString);
        },
        isNullEmptyOrUndefined: function(val) {
            return _.isNull(val) || _.isUndefined(val) || (_.isArray(val) && val.length === 0) || (!_.isArray(val) && val === '');
        }
    };
});

define('ValueDecorator',['require','ControlDecorator','knockout','ValueHelper'],function(require) {

    'use strict';

    //region dependencies
    var ControlDecorator = require('ControlDecorator'),
        ko = require('knockout'),
        ValueHelper = require('ValueHelper');

    //endregion



    return ControlDecorator.subClass({}, {
        init: function(dependencies) {
            this._super('VALUE', dependencies);
        },
        _decorate: function(control) {
            this._doDecorate(control);
            control.initValue(control.value());
        },
        _doDecorate: function(control) {
            control.rawValue = ko.observable();
            if (control.type !== 'FORM_REFERENCE') {
                control.value = control.context.payloadContext.getObservableForBinding(control);
            } else {
                control.value = ko.observable({});
            }

            control._isNullEmptyOrUndefined = function(val) {
                return ValueHelper.isNullEmptyOrUndefined(val);
            };

            control.getControlValue = function() {
                var rawValue = control._getRawValue();

                var finalValue = ko.utils.unwrapObservable(control.value);

                //check if valid is present first and then check if the control is valid.
                var valid = !control.validate || control.validate();

                // if the value is not valid, we should return the rawValue
                if (!valid) {
                    finalValue = rawValue;
                }

                return finalValue;
            };
            control.initValue = function(value) {
                var val = control._isNullEmptyOrUndefined(value) ? ko.unwrap(control.properties.defaultValue) : value;
                control.setValue(val);
            };
            control.setValue = function(value) {

                //Set the rawValue as well, to have them sync
                if (!control.rendered || !control.rendered()) {
                    control.rawValue(value);
                } else {
                    //If the element is already rendered, we need to set the value to jet directly
                    control.getOjComponent()('option', 'value', value);
                }
                control.value(value);

            };
            control._getRawValue = function() {
                return ko.utils.unwrapObservable(control.rawValue);
            };
        },
        isApplied: function(control) {
            return control.hasOwnProperty('value');
        }
    });
});

define('IdentityValueDecorator',['require','ValueDecorator'],function(require) {

    'use strict';

    //region dependencies
    var ValueDecorator = require('ValueDecorator');

    //endregion

    return ValueDecorator.subClass({}, {
        init: function(dependencies) {
            this._super(dependencies);
        },
        _doDecorate: function(control) {
            this._super(control);

            //@override setValue, but keep reference
            control.__superSetValue = control.setValue;
            control.setValue = function(value) {
                if (typeof value === 'string') {
                    value = []; //set empty array as string cannot be supported
                }
                control.__superSetValue(value);
            };

            control.ojIdentityObj.value = control.value;
        }
    });
});

define('CheckboxValueDecorator',['require','ValueDecorator','underscore'],function(require) {

    'use strict';

    //region dependencies
    var ValueDecorator = require('ValueDecorator'),
        _ = require('underscore');

    //endregion

    return ValueDecorator.subClass({}, {
        init: function(dependencies) {
            this._super(dependencies);
        },
        _doDecorate: function(control) {
            this._super(control);

            control.setValue = function(value) {
                if (_.isArray(value)) {
                    value = value[0] === 'true';
                }
                control.value(value);
                var ojComponent = control.getOjComponent();
                ojComponent('option', 'value', [!!value + '']);
            };
            control.value.subscribe(function(newValue) {
                control.setValue(newValue);
            });

        }
    });
});

define('JSONConverter',['require','Class','underscore'],function(require) {

    'use strict';

    //region dependencies
    var Class = require('Class'),
        _ = require('underscore');

    //endregion

    function escapeKey(key) {
        return key.replace(/\./g, '\\.');
    }

    function unescapeKey(key) {
        return key.replace(/\\\./g, '.');
    }

    /**
     * this regex will match any key except the dots used for separating json levels
     * Here is a more detailed explanation:
     * https://regex101.com/r/urk7iV/1
     */
    var splitRegex = /((?:\\\.|[^\.])+)/g;

    function splitKeys(keys) {
        var splittedKeys = keys.match(splitRegex);

        return {
            first: unescapeKey(splittedKeys[0]),
            rest: splittedKeys.slice(1).join('.')
        };
    }

    return Class.subClass({}, {
        init: function() {},
        toKeyValue: function(json) {
            var keyValue;

            if (_.isArray(json)) {
                keyValue = [];
                _.each(json, function(row) {
                    keyValue.push(this.toKeyValue(row));
                }, this);

            } else if (_.isObject(json)) {
                keyValue = {};
                _.each(json, function(value, key) {
                    this._setKeyValue(keyValue, escapeKey(key), value);
                }, this);
            } else {
                keyValue = json;
            }

            return keyValue;
        },
        toJSON: function(keyValue) {
            var json;
            if (_.isArray(keyValue)) {
                json = [];
                _.each(keyValue, function(row) {
                    json.push(this.toJSON(row));
                }, this);
            } else if (_.isObject(keyValue)) {
                json = {};
                _.each(keyValue, function(value, key) {
                    var keys = splitKeys(key);
                    this._setJSON(json, keys.first, keys.rest, value);
                }, this);
            } else {
                json = keyValue;
            }

            return json;
        },


        _setKeyValue: function(keyValue, key, value) {
            if (_.isArray(value)) {
                keyValue[key] = this.toKeyValue(value);
            } else if (_.isObject(value)) {
                if (_.size(value) > 0) {
                    _.each(value, function(innerValue, innerKey) {
                        var newKey = key + '.' + escapeKey(innerKey);
                        this._setKeyValue(keyValue, newKey, innerValue);
                    }, this);
                } else {
                    keyValue[key] = {};
                }
            } else {
                keyValue[key] = value;
            }
        },

        _setJSON: function(json, firstKey, otherKeys, value) {

            if (_.isEmpty(otherKeys)) {
                if (_.isArray(value)) {
                    json[firstKey] = [];
                    _.each(value, function(row) {
                        json[firstKey].push(this.toJSON(row));
                    }, this);
                } else {
                    json[firstKey] = value;
                }
            } else {
                json[firstKey] = json[firstKey] || {};
                var keys = splitKeys(otherKeys);
                this._setJSON(json[firstKey], keys.first, keys.rest, value);
            }

        }
    });
});

define('Payload',['require','underscore','jquery','knockout','JSONConverter','TreeUtil','ControlTypeId','Class'],function(require) {

    'use strict';

    //region dependencies
    var _ = require('underscore'),
        $ = require('jquery'),
        ko = require('knockout'),
        JSONConverter = require('JSONConverter'),
        TreeUtil = require('TreeUtil'),
        ControlTypeId = require('ControlTypeId'),
        Class = require('Class');
    //endregion

    var jsonConverter = new JSONConverter();


    return Class.subClass({}, {
        convertJSON: false,
        payloadContext: {},

        init: function(json, context) {
            this._schema = json.payload || {};
            if (context) {
                this.convertJSON = context.config().convertJSON;
                if (this.convertJSON) {
                    this._schema = jsonConverter.toKeyValue(this._schema);
                }
                this.payloadContext = context.payloadContext;
            }
        },

        /**
         * Fetches all the controls recursively and updates the payload schema using the provided list of controls
         * @param controlsAccessor ObservableArray with all the Controls
         */
        updateBindings: function(controlsAccessor) {
            //getting all the controls, except rows
            var controls = _.filter(TreeUtil.treeToList(controlsAccessor(), 'getControls'), function(control) {
                return control.properties && control.properties.isBindable();
            });

            this.doUpdateBindings(controls);
        },

        /**
         * Updates the payload schema using the provided list of controls
         * @param controls {Array} with all the controls
         */
        doUpdateBindings: function(controls) {
            // Go through all the bindings and assign them with the associated control's values.
            _.each(controls, function(control) {
                var binding = ko.utils.unwrapObservable(control.properties.binding);
                if (binding && binding.trim() !== '') {
                    if (control.type === ControlTypeId.FORM_REFERENCE && control.isValidReference()) {
                        var formBindings = control.getBindings();
                        _.each(_.keys(formBindings), function(key) {
                            this.setBindingValue([binding + '.' + key], formBindings[key]);
                        }, this);
                    } else {
                        // Assign the value by first checking for 'value' then 'default value' then check for the value in the existing payload.
                        var value = control.getControlValue();
                        this.setBindingValue(binding, value);
                    }
                }
            }, this);
        },

        getBindings: function() {
            return $.extend(true, {}, this._schema);
        },

        getBindingValue: function(binding) {
            return this._schema && this._schema[binding];
        },

        setBindingValue: function(binding, value) {
            this._schema[binding] = value;
        },

        toJS: function() {
            var schema = this._schema;
            if (this.convertJSON) {
                schema = jsonConverter.toJSON(schema);
            }
            return schema;
        }
    });
});

define('PayloadUtil',['require','Class','underscore','knockout','ControlTypeId','StringUtils'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class'),
        _ = require('underscore'),
        ko = require('knockout'),
        ControlTypeId = require('ControlTypeId'),
        StringUtils = require('StringUtils');

    //endregion

    var PayloadUtil = Class.subClass({

        /**
         * Initializes the value of the control from the value in the payload
         * @param control. The control
         * @param payload. {Object} The payload containing all the values
         */
        initValueFromPayload: function(control, payload) {
            var initValue = PayloadUtil.getControlValueFromPayload(control, payload);

            /* istanbul ignore else */
            if (control.hasOwnProperty('value')) {
                control.initValue(ko.unwrap(initValue));
            }
        },

        /**
         * Gets the value of the control from the provided payload
         * @param control. The control
         * @param payload. {Object} The payload containing all the values
         * @returns value || null
         */
        getControlValueFromPayload: function(control, payload) {
            var value;
            if (control.properties.isBindable() && !_.isEmpty(control.properties.binding())) {
                if (control.type === ControlTypeId.FORM_REFERENCE) {
                    value = {};
                    var context = control.properties.binding() + '.';
                    _.each(_.keys(payload), function(binding) {
                        if (StringUtils.startsWith(binding, context)) {
                            var innerBinding = binding.substring(context.length);
                            value[innerBinding] = payload[binding];
                        }
                    }, this);
                } else if (control.type === ControlTypeId.LINK) {
                    value = {};
                    value['value'] = payload[control.properties.binding()];
                    /* istanbul ignore else*/
                    if (control.properties.isLabelBindable() === 'true') {
                        value['label'] = payload[control.properties.labelBinding()];
                    }
                } else {
                    value = payload[control.properties.binding()];
                }
            }

            return _.isUndefined(value) ? null : value;
        }

    }, {});
    return PayloadUtil;
});

define('RepeatableRowValueDecorator',['require','ControlDecorator','Payload','knockout','PayloadUtil','underscore'],function(require) {

    'use strict';

    //region dependencies
    var ControlDecorator = require('ControlDecorator'),
        Payload = require('Payload'),
        ko = require('knockout'),
        PayloadUtil = require('PayloadUtil'),
        _ = require('underscore');

    //endregion



    return ControlDecorator.subClass({}, {
        init: function(dependencies) {
            this._super('VALUE', dependencies);
        },
        _decorate: function(control) {


            control.setValue = function(value) {
                //We want to skip controls inside repeatables, as they are initialized by its parent directly
                _.each(control.getAllControls(true), function(innerControl) {
                    PayloadUtil.initValueFromPayload(innerControl, value);
                });
            };
            control.initRow = function(value, repeatableControl) {
                if (repeatableControl.properties.fromConnector()) {
                    control.setValue(value);
                } else {
                    //init when receiving from payload.
                    //This keeps the payload as _payload to get it in getControlValue
                    control.initValue(value);
                }
            };
            control.initValue = function(value) {
                control._payload = new Payload({
                    payload: value
                });
                control.setValue(value);
            };
            control.getControlValue = function() {
                var rowPayload = control._payload || new Payload({});
                rowPayload.doUpdateBindings(control.getAllControls(true));
                return rowPayload.getBindings();
            };

            control.isRowSelected = ko.pureComputed({
                read: function() {
                    return _.contains(control._parent.selectedRows(), control);
                },
                write: function(value) {
                    var isSelected = control.isRowSelected();
                    if (value && !isSelected) {
                        if (control._parent.properties.multipleSelection()) {
                            control._parent.selectedRows.push(control);
                        } else {
                            //If this is selected, but we don't have multiple selection, set the value to override the previous value
                            control._parent.selectedRows([control]);
                        }
                    } else if (!value && isSelected) {
                        control._parent.selectedRows.remove(control);
                    }
                }
            });
        },
        isApplied: function(control) {
            return control.hasOwnProperty('getControlValue');
        }
    });
});

define('FormReferenceValueDecorator',['require','ValueDecorator'],function(require) {

    'use strict';

    //region dependencies
    var ValueDecorator = require('ValueDecorator');

    //endregion

    return ValueDecorator.subClass({}, {
        init: function(dependencies) {
            this._super(dependencies);
        },
        _decorate: function(control) {
            this._super(control);

            control.getControlValue = function() {
                return control.value();
            };


        }
    });
});

define('SelectValueDecorator',['require','ValueDecorator','knockout','underscore'],function(require) {

    'use strict';

    //region dependencies
    var ValueDecorator = require('ValueDecorator'),
        ko = require('knockout'),
        _ = require('underscore');

    //endregion

    return ValueDecorator.subClass({}, {
        init: function(dependencies) {
            this._super(dependencies);
        },
        _doDecorate: function(control) {
            this._super(control);

            control.getControlValue = function() {
                var value = control.value();
                if (value !== null && !ko.unwrap(control.properties.multiple) && _.isArray(value)) {
                    value = value[0] || null;
                }
                return value;
            };

            //@override setValue, but keep reference
            control.__superSetValue = control.setValue;
            control.setValue = function(value) {
                if (!_.isArray(value)) {
                    control.__superSetValue([value]);
                } else {
                    control.__superSetValue(value);
                }
            };

        }
    });
});

define('LinkValueDecorator',['require','ValueDecorator','knockout'],function(require) {

    'use strict';

    //region dependencies
    var ValueDecorator = require('ValueDecorator'),
        ko = require('knockout');

    //endregion

    return ValueDecorator.subClass({}, {
        init: function(dependencies) {
            this._super(dependencies);
        },
        _doDecorate: function(control) {
            this._super(control);

            control.getControlValue = function() {
                var link = {
                    'value': ko.utils.unwrapObservable(control.value)
                };
                /* istanbul ignore else */
                if (control.properties.isLabelBindable() === 'true' && !control._isNullEmptyOrUndefined(control.properties.labelBinding())) {
                    link['label'] = ko.utils.unwrapObservable(control.properties.labelVal);
                }
                return link;
            };
            control.initValue = function(value) {
                var defaultLinkValue = this.properties.anchor() ? this.resolvePreviewId(ko.utils.unwrapObservable(this.properties.defaultOption)[0]) : ko.utils.unwrapObservable(this.properties.defaultValue);
                var valBinding = (!this._isNullEmptyOrUndefined(value) && !this._isNullEmptyOrUndefined(value.value)) ? value.value : defaultLinkValue;
                this.setValue(valBinding);
                var labelBindVal = (!this._isNullEmptyOrUndefined(value) && !this._isNullEmptyOrUndefined(value.label)) ? value.label : ko.utils.unwrapObservable(this.properties.defaultLabel);
                this.setLabelVal(labelBindVal);
            };

        }
    });
});

define('DateValueDecorator',['require','ValueDecorator','ValueHelper'],function(require) {

    'use strict';

    //region dependencies
    var ValueDecorator = require('ValueDecorator'),
        ValueHelper = require('ValueHelper');

    //endregion

    return ValueDecorator.subClass({}, {
        init: function(dependencies) {
            this._super(dependencies);
        },
        _doDecorate: function(control) {
            this._super(control);

            control.setValue = function(value) {
                ValueHelper.setDate(control, 'ojInputDate', control.properties.dateConverter(), value);
            };
            control._getRawValue = function() {
                return ValueHelper.getRawValue(control);
            };

        }
    });
});

define('TimeValueDecorator',['require','ValueDecorator','ValueHelper'],function(require) {

    'use strict';

    //region dependencies
    var ValueDecorator = require('ValueDecorator'),
        ValueHelper = require('ValueHelper');

    //endregion

    return ValueDecorator.subClass({}, {
        init: function(dependencies) {
            this._super(dependencies);
        },
        _doDecorate: function(control) {
            this._super(control);

            control.setValue = function(value) {
                ValueHelper.setRawValue(control, 'ojInputTime', value);
            };

            control._getRawValue = function() {
                return ValueHelper.getRawValue(control);
            };
        }
    });
});

define('NumberValueDecorator',['require','ValueDecorator','ValueHelper'],function(require) {

    'use strict';

    //region dependencies
    var ValueDecorator = require('ValueDecorator'),
        ValueHelper = require('ValueHelper');

    //endregion

    return ValueDecorator.subClass({}, {
        init: function(dependencies) {
            this._super(dependencies);
        },
        _doDecorate: function(control) {
            this._super(control);

            control.setValue = function(value) {
                ValueHelper.setNumber(control, value);
            };
            control._getRawValue = function() {
                return ValueHelper.getRawValue(control);
            };

        }
    });
});

define('RepeatableValueDecorator',['require','ControlDecorator','knockout','koToJSUtil','DotExpressionResolver','EventsId','underscore'],function(require) {

    'use strict';

    //region dependencies
    var ControlDecorator = require('ControlDecorator'),
        ko = require('knockout'),
        koToJSUtil = require('koToJSUtil'),
        DotExpressionResolver = require('DotExpressionResolver'),
        EventsId = require('EventsId'),
        _ = require('underscore');

    //endregion

    function doAddRow(control, row) {
        var newRow = control.createRow(row);
        control.eventsQueue.execute(newRow, EventsId.ON_ADD_ROW);
        control.dataSource.push(newRow);
    }

    function doRemoveRow(control, index) {
        var removedRow = control.dataSource()[index];
        removedRow.indexBeforeRemove = index;
        control.eventsQueue.execute(removedRow, EventsId.ON_REMOVE_ROW);
        control.dataSource.remove(removedRow);
        control.selectedRows([]);
    }


    function _initValueFromRest(repeatableControl) {
        var array = [];
        _.each(repeatableControl.properties.optionsFeed().optionsResolver()._options(), function(value) {
            var mapped = {};
            _.each(repeatableControl._getAllBindableControls(), function(control) {
                mapped[control.properties.binding()] =
                    DotExpressionResolver.getPCSCompatibleValue(value, control.properties.connectorMapping());
            });
            array.push(mapped);
        });
        repeatableControl.setValue(array);
        repeatableControl.executeEvent(EventsId.ON_CHANGE.value);
    }


    return ControlDecorator.subClass({}, {
        init: function(dependencies) {
            this._super('VALUE', dependencies);
        },
        _decorate: function(control) {

            control.dataSource = ko.observableArray([]);
            control.dataSourcePage = ko.pureComputed(function() {
                return control.dataSource();
            });
            control.getRows = function() {
                return control.dataSource();
            };

            control.value = control.context.payloadContext.getObservableArrayForBinding(control);
            //Create a new row
            control.addRow = function() {
                control.value.push({});
            };
            control.removeRow = function(row) {
                var index = control.dataSource().indexOf(row);
                control.value.remove(control.value()[index]);
            };
            control.removeSelectedRow = function() {
                var value = control.value();
                _.each(control.selectedRows(), function(row) {
                    var index = control.dataSource().indexOf(row);
                    value = _.without(value, control.value()[index]);
                });
                control.value(value);
            };


            control.getControlValue = function() {
                return koToJSUtil.toJS(control.value());
            };

            control.getSelectedRows = function() {
                var selection = control.selectedRows();
                if (control.properties.multipleSelection()) {
                    //If multiple selection, returned it ordered
                    return _.sortBy(selection, function(row) {
                        return control.dataSource.indexOf(row);
                    });
                } else if (selection.length > 0) {
                    //If single selection and something is selected, return it as an element, not an array
                    return selection[0];
                }
                //Default value should be empty, to avoid breaking events
                return [];
            };

            control.setValue = function(array) {
                var valueArray = [];
                _.each(_.first(array, control.properties.maxRows()), function(value) {
                    valueArray.push(value || {});
                }, this);
                control.value(valueArray);
            };

            control.initValue = function(array) {
                if (!control.properties.fromConnector()) {
                    control.setValue(array);
                }
            };

            //Subsribing to array change allows us to avoid extra processing when the values are set
            // to the same old value
            control.value.subscribe(function(changes) {
                //Remove rows in reverse order
                _.each(_.sortBy(changes, function(change) {
                    return -change.index;
                }), function(change) {
                    if (change.status === 'deleted') {
                        doRemoveRow(control, change.index);
                    }
                });

                //Add rows in regular order
                _.each(changes, function(change) {
                    if (change.status === 'added') {
                        doAddRow(control, change.value);
                    }
                });
            }, control, 'arrayChange');

            //Initialize the value to create the controls
            _.each(control.value(), function(row) {
                doAddRow(control, row);
            });

            control.getContextForChildren = function(child) {
                var index = this.getRows().indexOf(child);
                if (index > -1) {
                    return this.getBindingContext() + this.properties.binding() + '[' + index + '].';
                }
                return this.getBindingContext() + this.properties.binding() + '.';
            };

            if (control.properties.fromConnector() && !control._restSubscription) {
                control._restSubscription =
                    control.properties.optionsFeed().optionsResolver()._options.subscribe(_initValueFromRest.bind(this, control));
            }

        },
        isApplied: function(control) {
            return control.hasOwnProperty('value');
        }
    });
});

define('BuildFormReferenceDecorator',['require','ControlDecorator','underscore'],function(require) {

    'use strict';

    //region dependencies
    var ControlDecorator = require('ControlDecorator'),
        _ = require('underscore');

    //endregion

    return ControlDecorator.subClass({}, {
        init: function(dependencies) {
            this._super(dependencies);
        },
        _decorate: function(control) {

            control._buildForm = function(form, presentation) {
                return _.extend(presentation, {
                    eventActions: form.eventActions,
                    calls: form.calls,
                    payload: control.getControlValue()
                });
            };


        }
    });
});

define('ReferenceLazyRenderingDecorator',['require','ControlDecorator','SilentLoader','knockout','underscore'],function(require) {

    'use strict';

    //region dependencies
    var ControlDecorator = require('ControlDecorator'),
        SilentLoader = require('SilentLoader'),
        ko = require('knockout'),
        _ = require('underscore');

    //endregion

    return ControlDecorator.subClass({}, {
        init: function(dependencies) {
            this._super('REFERENCE_LAZY_DECORATOR', dependencies);
        },
        _decorate: function(control) {

            var _getBindings = control.getBindings;
            control.getBindings = function() {
                if (control.rendered()) {
                    return _getBindings.call(control);
                } else {
                    control._silentModel = SilentLoader.load({
                        form: _.clone(control.selectedPresentation()),
                        config: _.clone(control.getConfig())
                    });
                    return control._silentModel.getBindings();
                }
            };

            var _rendered = control.rendered;

            control.rendered = ko.pureComputed({
                read: function() {
                    return _rendered() && control.controlsLoaded();
                },
                write: function(value) {
                    _rendered(value);
                }
            });

        },
        isApplied: function(control) {
            return control.hasOwnProperty('getBindings');
        }
    });
});

define('DecoratorsMap',['require','ControlTypeId'],function(require) {

    'use strict';

    //region dependencies
    var ControlTypeId = require('ControlTypeId');

    //endregion
    var properties = {};
    properties[ControlTypeId.INPUT_TEXT] = ['label', 'defaultValue', 'placeHolder', 'hint', 'help'];
    properties[ControlTypeId.TEXT_AREA] = ['label', 'defaultValue', 'placeHolder', 'hint', 'help'];
    properties[ControlTypeId.BUTTON] = ['label'];
    properties[ControlTypeId.SELECT] = ['label', 'placeHolder', 'hint', 'help'];
    properties[ControlTypeId.CHECKLIST] = ['label', 'help'];
    properties[ControlTypeId.CHECKBOX] = ['label', 'help'];
    properties[ControlTypeId.RADIO_BUTTON] = ['label', 'help'];
    properties[ControlTypeId.NUMBER] = ['label', 'hint', 'help'];
    properties[ControlTypeId.DATE] = ['label', 'placeHolder', 'help'];
    properties[ControlTypeId.TIME] = ['label', 'placeHolder', 'help'];
    properties[ControlTypeId.DATE_TIME] = ['label', 'placeHolder', 'help'];
    properties[ControlTypeId.EMAIL] = ['label', 'defaultValue', 'placeHolder', 'hint', 'help'];
    properties[ControlTypeId.URL] = ['label', 'defaultValue', 'placeHolder', 'hint', 'help'];
    properties[ControlTypeId.MESSAGE] = ['defaultValue'];
    properties[ControlTypeId.LINK] = ['defaultLabel'];
    properties[ControlTypeId.MONEY] = ['label', 'hint', 'help'];
    properties[ControlTypeId.PHONE] = ['label', 'defaultValue', 'placeHolder', 'hint', 'help'];
    properties[ControlTypeId.IMAGE] = ['label', 'alt'];
    properties[ControlTypeId.VIDEO] = ['label'];
    properties[ControlTypeId.IDENTITY_BROWSER] = ['label', 'placeholder', 'hint', 'help'];
    properties[ControlTypeId.PANEL] = ['label'];
    properties[ControlTypeId.SECTION] = ['label'];
    properties[ControlTypeId.TABLE] = ['label'];
    return properties;


});

define('TranslationsDecorator',['require','ControlDecorator','underscore','knockout','DecoratorsMap'],function(require) {

    'use strict';

    //region dependencies
    var ControlDecorator = require('ControlDecorator'),
        _ = require('underscore'),
        ko = require('knockout'),
        DecoratorsMap = require('DecoratorsMap');


    //endregion

    return ControlDecorator.subClass({}, {
        init: function(dependencies) {
            this._super('TRANSLATIONS_DECORATOR', dependencies);
        },
        _decorate: function(control, context) {

            var translateProperties = function(control) {
                var handler = context.config().translationsHandler;
                var defaultBundle = handler._bundles.defaultBundle;
                var initLocaleBundle = handler._bundles.initLocaleBundle;
                var controlProperties = DecoratorsMap[control.type];

                _.each(controlProperties, function(property) {
                    var key = control.id;
                    var value;
                    if (initLocaleBundle && initLocaleBundle[key]) {
                        value = initLocaleBundle[key][property];
                    } else if (defaultBundle && defaultBundle[key]) {
                        value = defaultBundle[key][property];
                    }

                    if (value && value !== '') {
                        control.properties[property](value);
                    }
                });
                return true;
            };

            control.translated = ko.observable(translateProperties(control));
        },
        isApplied: function(control) {
            return control.hasOwnProperty('translated');
        },

    });
});

define('ComputedValueDecorator',['require','ControlDecorator'],function(require) {

    'use strict';

    //region dependencies
    var ControlDecorator = require('ControlDecorator');


    //endregion

    return ControlDecorator.subClass({}, {
        init: function(dependencies) {
            this._super('COMPUTED_VALUE_DECORATOR', dependencies);
            this.computedSuffix = '_computed';
        },
        _decorate: function(control, context) {
            var self = this;
            var afterInitValue = function(control) {

                if (control.properties.computed && control.properties.computed() && control.properties.computedValue) {
                    var key = control.id + self.computedSuffix;
                    control.properties.computedValue.decorate(context.viewModel, key);
                }
                return true;
            };

            afterInitValue(control);
        },
        isApplied: function(control) {
            return control.hasOwnProperty('value');
        }

    });
});

define('GetOJComponentDecorator',['require','ControlDecorator','ojs/ojcore','jquery','underscore','knockout'],function(require) {

    'use strict';

    //region dependencies
    var ControlDecorator = require('ControlDecorator'),
        oj = require('ojs/ojcore'),
        $ = require('jquery'),
        _ = require('underscore'),
        ko = require('knockout');

    //endregion

    return ControlDecorator.subClass({}, {
        init: function() {
            this._super('GET_OJ_COMPONENT');
        },
        _decorate: function(control) {
            control._deferredOjComponentCalls = [];
            var defaultOjComponent = function() {
                control._deferredOjComponentCalls.push(arguments);
                return control._deferredOjComponentCalls;
            };
            //TODO add domIdPrefix as a decorator and as a dependency on this one.
            control.getOjComponent = function() {
                var ojComponentWidgetRef = oj.Components.getWidgetConstructor($('#' + this.domIdPrefix + ko.utils.unwrapObservable(this.id))[0]);
                if (ojComponentWidgetRef && ojComponentWidgetRef()) {
                    return ojComponentWidgetRef;
                }
                return defaultOjComponent;
            };

            var afterRender = function(control) {
                defaultOjComponent = function() {};
                //If the default oj component is returned after the control is renderered, it means that the control is loading or somehow invalid.
                //The validation checks for this and validates silently if not loaded
                defaultOjComponent.isNotLoaded = true;

                var ojComponent = control.getOjComponent();
                _.each(control._deferredOjComponentCalls, function(callArguments) {
                    ojComponent.apply(ojComponent, callArguments);
                });
                control._deferredOjComponentCalls = [];
                if (control.afterOjComponentInit) {
                    control.afterOjComponentInit();
                }
                return true; //returning true so the listener is detached.
            };

            control.registerRenderListener(afterRender);
        },
        isApplied: function(control) {
            return control.hasOwnProperty('getOjComponent');
        }
    });
});

define('RendererDecoratorsCatalog',['require','DecoratorsCatalog','JetValidationDecorator','RepeatableValidationDecorator','FormReferenceValidationDecorator','LazyRenderingDecorator','TabRenderingDecorator','TabContainerRenderingDecorator','SectionRenderingDecorator','SectionAsyncRenderCallbackDecorator','ControlTypeId','TimeValidationDecorator','RawDataDecorator','VideoValueDecorator','IdentityValueDecorator','CheckboxValueDecorator','RepeatableRowValueDecorator','FormReferenceValueDecorator','ValueDecorator','SelectValueDecorator','LinkValueDecorator','DateValueDecorator','TimeValueDecorator','NumberValueDecorator','RepeatableValueDecorator','BuildFormReferenceDecorator','ReferenceLazyRenderingDecorator','TranslationsDecorator','ComputedValueDecorator','GetOJComponentDecorator'],function(require) {

    'use strict';
    // jshint maxstatements:155

    //region dependencies
    var DecoratorsCatalog = require('DecoratorsCatalog'),
        JetValidationDecorator = require('JetValidationDecorator'),
        RepeatableValidationDecorator = require('RepeatableValidationDecorator'),
        FormReferenceValidationDecorator = require('FormReferenceValidationDecorator'),
        LazyRenderingDecorator = require('LazyRenderingDecorator'),
        TabRenderingDecorator = require('TabRenderingDecorator'),
        TabContainerRenderingDecorator = require('TabContainerRenderingDecorator'),
        SectionRenderingDecorator = require('SectionRenderingDecorator'),
        SectionAsyncRenderCallbackDecorator = require('SectionAsyncRenderCallbackDecorator'),
        ControlTypeId = require('ControlTypeId'),
        TimeValidationDecorator = require('TimeValidationDecorator'),
        RawDataDecorator = require('RawDataDecorator'),
        VideoValueDecorator = require('VideoValueDecorator'),
        IdentityValueDecorator = require('IdentityValueDecorator'),
        CheckboxValueDecorator = require('CheckboxValueDecorator'),
        RepeatableRowValueDecorator = require('RepeatableRowValueDecorator'),
        FormReferenceValueDecorator = require('FormReferenceValueDecorator'),
        ValueDecorator = require('ValueDecorator'),
        SelectValueDecorator = require('SelectValueDecorator'),
        LinkValueDecorator = require('LinkValueDecorator'),
        DateValueDecorator = require('DateValueDecorator'),
        TimeValueDecorator = require('TimeValueDecorator'),
        NumberValueDecorator = require('NumberValueDecorator'),
        RepeatableValueDecorator = require('RepeatableValueDecorator'),
        BuildFormReferenceDecorator = require('BuildFormReferenceDecorator'),
        ReferenceLazyRenderingDecorator = require('ReferenceLazyRenderingDecorator'),
        TranslationsDecorator = require('TranslationsDecorator'),
        ComputedValueDecorator = require('ComputedValueDecorator'),
        GetOJComponentDecorator = require('GetOJComponentDecorator');
    //end region

    return DecoratorsCatalog.subClass({}, {

        init: function() {
            // jshint maxstatements:158
            this._super();
            this.valueDecorator = new ValueDecorator();
            this.numberValueDecorator = new NumberValueDecorator();
            this.dateValueDecorator = new DateValueDecorator();
            this.repeatableValueDecorator = new RepeatableValueDecorator();
            this.lazyRenderingDecorator = new LazyRenderingDecorator();
            this.getOJComponentDecorator = new GetOJComponentDecorator();
            this.jetValidationDecorator = new JetValidationDecorator([this.valueDecorator, this.lazyRenderingDecorator, this.getOJComponentDecorator]);
            this.repeatableValidationDecorator = new RepeatableValidationDecorator([this.lazyRenderingDecorator, this.getOJComponentDecorator]);
            this.formReferenceValidationDecorator = new FormReferenceValidationDecorator([this.lazyRenderingDecorator, this.getOJComponentDecorator]);
            this.tabRenderingDecorator = new TabRenderingDecorator([this.lazyRenderingDecorator]);
            this.sectionRenderingDecorator = new SectionRenderingDecorator();
            this.sectionAsyncRenderCallbackDecorator = new SectionAsyncRenderCallbackDecorator();
            this.tabContainerRenderingDecorator = new TabContainerRenderingDecorator([this.lazyRenderingDecorator]);
            this.rawDataDecorator = new RawDataDecorator([this.lazyRenderingDecorator]);
            this.referenceLazyRenderingDecorator = new ReferenceLazyRenderingDecorator([this.lazyRenderingDecorator]);

            this.registerDecorator(this.lazyRenderingDecorator);
            this.registerDecorator(this.getOJComponentDecorator);

            this.registerDecorator(this.referenceLazyRenderingDecorator, ControlTypeId.FORM_REFERENCE);

            this.registerDecorator(this.valueDecorator, ControlTypeId.INPUT_TEXT);
            this.registerDecorator(this.valueDecorator, ControlTypeId.TEXT_AREA);
            this.registerDecorator(this.valueDecorator, ControlTypeId.CHECKLIST);
            this.registerDecorator(this.valueDecorator, ControlTypeId.RADIO_BUTTON);
            this.registerDecorator(this.valueDecorator, ControlTypeId.EMAIL);
            this.registerDecorator(this.valueDecorator, ControlTypeId.URL);
            this.registerDecorator(this.valueDecorator, ControlTypeId.MESSAGE);
            this.registerDecorator(this.valueDecorator, ControlTypeId.PHONE);
            this.registerDecorator(this.valueDecorator, ControlTypeId.IMAGE);
            this.registerDecorator(this.valueDecorator, ControlTypeId.VIDEO);
            this.registerDecorator(this.numberValueDecorator, ControlTypeId.NUMBER);
            this.registerDecorator(this.numberValueDecorator, ControlTypeId.MONEY);
            this.registerDecorator(this.dateValueDecorator, ControlTypeId.DATE);
            this.registerDecorator(this.dateValueDecorator, ControlTypeId.DATE_TIME);
            this.registerDecorator(new TimeValueDecorator([]), ControlTypeId.TIME);
            this.registerDecorator(new FormReferenceValueDecorator([]), ControlTypeId.FORM_REFERENCE);
            this.registerDecorator(new CheckboxValueDecorator([]), ControlTypeId.CHECKBOX);
            this.registerDecorator(new IdentityValueDecorator([]), ControlTypeId.IDENTITY_BROWSER);
            this.registerDecorator(new SelectValueDecorator([]), ControlTypeId.SELECT);
            this.registerDecorator(new LinkValueDecorator([]), ControlTypeId.LINK);

            this.registerDecorator(new RepeatableRowValueDecorator([]), ControlTypeId.TABLE_ROW);
            this.registerDecorator(new RepeatableRowValueDecorator([]), ControlTypeId.REPEATABLE_SECTION_ROW);

            this.registerDecorator(this.repeatableValueDecorator, ControlTypeId.REPEATABLE_SECTION);
            this.registerDecorator(this.repeatableValueDecorator, ControlTypeId.TABLE);

            this.registerDecorator(new VideoValueDecorator([this.valueDecorator]), ControlTypeId.VIDEO);
            this.registerDecorator(new BuildFormReferenceDecorator([this.valueDecorator]), ControlTypeId.FORM_REFERENCE);

            this.registerDecorator(this.rawDataDecorator, ControlTypeId.INPUT_TEXT);
            this.registerDecorator(this.rawDataDecorator, ControlTypeId.TEXT_AREA);
            this.registerDecorator(this.rawDataDecorator, ControlTypeId.SELECT);
            this.registerDecorator(this.rawDataDecorator, ControlTypeId.CHECKLIST);
            this.registerDecorator(this.rawDataDecorator, ControlTypeId.CHECKBOX);
            this.registerDecorator(this.rawDataDecorator, ControlTypeId.RADIO_BUTTON);
            this.registerDecorator(this.rawDataDecorator, ControlTypeId.NUMBER);
            this.registerDecorator(this.rawDataDecorator, ControlTypeId.DATE);
            this.registerDecorator(this.rawDataDecorator, ControlTypeId.TIME);
            this.registerDecorator(this.rawDataDecorator, ControlTypeId.DATE_TIME);
            this.registerDecorator(this.rawDataDecorator, ControlTypeId.EMAIL);
            this.registerDecorator(this.rawDataDecorator, ControlTypeId.URL);
            this.registerDecorator(this.rawDataDecorator, ControlTypeId.MESSAGE);
            this.registerDecorator(this.rawDataDecorator, ControlTypeId.LINK);
            this.registerDecorator(this.rawDataDecorator, ControlTypeId.MONEY);
            this.registerDecorator(this.rawDataDecorator, ControlTypeId.PHONE);
            this.registerDecorator(this.rawDataDecorator, ControlTypeId.IMAGE);
            this.registerDecorator(this.rawDataDecorator, ControlTypeId.VIDEO);
            this.registerDecorator(this.rawDataDecorator, ControlTypeId.REPEATABLE_SECTION);
            this.registerDecorator(this.rawDataDecorator, ControlTypeId.TABLE);

            this.translationsDecorator = new TranslationsDecorator([this.lazyRenderingDecorator]);
            this.registerDecorator(this.translationsDecorator, ControlTypeId.INPUT_TEXT);
            this.registerDecorator(this.translationsDecorator, ControlTypeId.TEXT_AREA);
            this.registerDecorator(this.translationsDecorator, ControlTypeId.BUTTON);
            this.registerDecorator(this.translationsDecorator, ControlTypeId.SELECT);
            this.registerDecorator(this.translationsDecorator, ControlTypeId.CHECKLIST);
            this.registerDecorator(this.translationsDecorator, ControlTypeId.CHECKBOX);
            this.registerDecorator(this.translationsDecorator, ControlTypeId.RADIO_BUTTON);
            this.registerDecorator(this.translationsDecorator, ControlTypeId.NUMBER);
            this.registerDecorator(this.translationsDecorator, ControlTypeId.DATE);
            this.registerDecorator(this.translationsDecorator, ControlTypeId.TIME);
            this.registerDecorator(this.translationsDecorator, ControlTypeId.DATE_TIME);
            this.registerDecorator(this.translationsDecorator, ControlTypeId.EMAIL);
            this.registerDecorator(this.translationsDecorator, ControlTypeId.URL);
            this.registerDecorator(this.translationsDecorator, ControlTypeId.MESSAGE);
            this.registerDecorator(this.translationsDecorator, ControlTypeId.LINK);
            this.registerDecorator(this.translationsDecorator, ControlTypeId.MONEY);
            this.registerDecorator(this.translationsDecorator, ControlTypeId.PHONE);
            this.registerDecorator(this.translationsDecorator, ControlTypeId.IMAGE);
            this.registerDecorator(this.translationsDecorator, ControlTypeId.VIDEO);
            this.registerDecorator(this.translationsDecorator, ControlTypeId.IDENTITY_BROWSER);
            this.registerDecorator(this.translationsDecorator, ControlTypeId.PANEL);
            this.registerDecorator(this.translationsDecorator, ControlTypeId.SECTION);
            this.registerDecorator(this.translationsDecorator, ControlTypeId.TABLE);


            this.computedValueDecorator = new ComputedValueDecorator([this.lazyRenderingDecorator]);
            this.registerDecorator(this.computedValueDecorator, ControlTypeId.INPUT_TEXT);
            this.registerDecorator(this.computedValueDecorator, ControlTypeId.TEXT_AREA);
            //            this.registerDecorator(this.computedValueDecorator, ControlTypeId.BUTTON);   do not have computed Value
            this.registerDecorator(this.computedValueDecorator, ControlTypeId.SELECT);
            this.registerDecorator(this.computedValueDecorator, ControlTypeId.CHECKLIST);
            this.registerDecorator(this.computedValueDecorator, ControlTypeId.CHECKBOX);
            this.registerDecorator(this.computedValueDecorator, ControlTypeId.RADIO_BUTTON);
            this.registerDecorator(this.computedValueDecorator, ControlTypeId.NUMBER);
            this.registerDecorator(this.computedValueDecorator, ControlTypeId.DATE);
            this.registerDecorator(this.computedValueDecorator, ControlTypeId.TIME);
            this.registerDecorator(this.computedValueDecorator, ControlTypeId.DATE_TIME);
            this.registerDecorator(this.computedValueDecorator, ControlTypeId.EMAIL);
            this.registerDecorator(this.computedValueDecorator, ControlTypeId.URL);
            this.registerDecorator(this.computedValueDecorator, ControlTypeId.MESSAGE);
            this.registerDecorator(this.computedValueDecorator, ControlTypeId.LINK);
            this.registerDecorator(this.computedValueDecorator, ControlTypeId.MONEY);
            this.registerDecorator(this.computedValueDecorator, ControlTypeId.PHONE);
            this.registerDecorator(this.computedValueDecorator, ControlTypeId.IMAGE);
            this.registerDecorator(this.computedValueDecorator, ControlTypeId.VIDEO);

            this.registerDecorator(this.jetValidationDecorator, ControlTypeId.IDENTITY_BROWSER);
            this.registerDecorator(this.jetValidationDecorator, ControlTypeId.INPUT_TEXT);
            this.registerDecorator(this.jetValidationDecorator, ControlTypeId.TEXT_AREA);
            this.registerDecorator(this.jetValidationDecorator, ControlTypeId.SELECT);
            this.registerDecorator(this.jetValidationDecorator, ControlTypeId.CHECKLIST);
            this.registerDecorator(this.jetValidationDecorator, ControlTypeId.CHECKBOX);
            this.registerDecorator(this.jetValidationDecorator, ControlTypeId.RADIO_BUTTON);
            this.registerDecorator(this.jetValidationDecorator, ControlTypeId.NUMBER);
            this.registerDecorator(this.jetValidationDecorator, ControlTypeId.DATE);
            //ToDo Jet 2.3.0 Remove this validator and use the common
            var timeValidationDecorator = new TimeValidationDecorator([this.lazyRenderingDecorator, this.getOJComponentDecorator]);
            this.registerDecorator(timeValidationDecorator, ControlTypeId.TIME);
            this.registerDecorator(timeValidationDecorator, ControlTypeId.DATE_TIME);
            this.registerDecorator(this.jetValidationDecorator, ControlTypeId.EMAIL);
            this.registerDecorator(this.jetValidationDecorator, ControlTypeId.URL);
            this.registerDecorator(this.jetValidationDecorator, ControlTypeId.MONEY);
            this.registerDecorator(this.jetValidationDecorator, ControlTypeId.PHONE);

            this.registerDecorator(this.repeatableValidationDecorator, ControlTypeId.REPEATABLE_SECTION);
            this.registerDecorator(this.repeatableValidationDecorator, ControlTypeId.TABLE);

            this.registerDecorator(this.formReferenceValidationDecorator, ControlTypeId.FORM_REFERENCE);

            this.registerDecorator(this.tabContainerRenderingDecorator, ControlTypeId.TAB_CONTAINER);
            this.registerDecorator(this.tabRenderingDecorator, ControlTypeId.TAB);
            this.registerDecorator(this.sectionRenderingDecorator, ControlTypeId.SECTION);
            this.registerDecorator(this.sectionAsyncRenderCallbackDecorator, ControlTypeId.SECTION);
        }
    });
});


define('text!rendererImg/trash-blue.svg',[],function () { return '<?xml version="1.0" encoding="utf-8"?>\r\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\r\n<svg version="1.1" id="Layer_1" xmlns:ev="http://www.w3.org/2001/xml-events"\r\n\t xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="32px" height="32px"\r\n\t viewBox="-6.5 -3.5 32 32" enable-background="new -6.5 -3.5 32 32" xml:space="preserve">\r\n<path fill="#0572CE" d="M0.983,7.974V5.987c0-1.104,0.864-2,1.969-2H4.99V2.046c0-1.105,0.719-2,1.606-2h6.788\r\n\tc0.888,0,1.606,0.895,1.606,2v1.941h2.011c1.104,0,1.97,0.896,1.97,2v2.005L0.983,7.974z M11.062,1.925H8.982\r\n\tC8.173,1.909,8.038,2.206,7.99,2.875C7.952,3.399,7.992,4.058,7.992,4.058h3.992c0,0,0.029-0.658,0.029-1.183\r\n\tS12.016,1.876,11.062,1.925z M17.018,23.018c0,0.553-0.479,1-1.031,1H4.056c-0.551,0-1.03-0.447-1.03-1V9.041h13.992V23.018z"/>\r\n</svg>\r\n';});


define('text!rendererImg/plus-blue.svg',[],function () { return '<?xml version="1.0" encoding="utf-8"?>\r\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\r\n<svg version="1.1" id="Layer_1" xmlns:ev="http://www.w3.org/2001/xml-events"\r\n\t xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="32px" height="32px"\r\n\t viewBox="-3.5 -3.5 32 32" enable-background="new -3.5 -3.5 32 32" xml:space="preserve">\r\n<path fill="#0572CE" d="M23.896,14.902h-8.994v8.988c0,0.553-0.447,1-1,1h-1.96c-0.552,0-1-0.447-1-1v-8.988H1.953\r\n\tc-0.553,0-1-0.447-1-1v-1.96c0-0.552,0.447-1,1-1h8.989V1.948c0-0.552,0.448-1,1-1h1.96c0.553,0,1,0.448,1,1v8.994h8.994\r\n\tc0.552,0,1,0.448,1,1v1.96C24.896,14.455,24.448,14.902,23.896,14.902z"/>\r\n</svg>\r\n';});

define('RendererContext',['require','FormContext','RendererControlType','RendererId','ojL10n!rendererMsg/nls/renderer','knockout','jquery','underscore','Icon','EventsId','Configuration','OptionsResolverFactory','LoVMappingAutoComplete','EventsQueue','ObservablePayloadContext','FormReferenceFactory','RendererDecoratorsCatalog','!text!rendererImg/trash-blue.svg','!text!rendererImg/plus-blue.svg'],function(require) {

    'use strict';

    //region dependencies

    var FormContext = require('FormContext'),
        RendererControlType = require('RendererControlType'),
        RendererId = require('RendererId'),
        msg = require('ojL10n!rendererMsg/nls/renderer'),
        ko = require('knockout'),
        $ = require('jquery'),
        _ = require('underscore'),
        Icon = require('Icon'),
        EventsId = require('EventsId'),
        Configuration = require('Configuration'),
        OptionsResolverFactory = require('OptionsResolverFactory'),
        LoVMappingAutoComplete = require('LoVMappingAutoComplete'),
        EventsQueue = require('EventsQueue'),
        ObservablePayloadContext = require('ObservablePayloadContext'),
        FormReferenceFactory = require('FormReferenceFactory'),
        RendererDecoratorsCatalog = require('RendererDecoratorsCatalog');

    var REMOVE_COLUMN_BLUE = require('!text!rendererImg/trash-blue.svg'),
        ADD_COLUMN_BLUE = require('!text!rendererImg/plus-blue.svg');

    //endregion

    return FormContext.subClass({}, {
        controlBindings: {},
        init: function(rendererModel, viewModel, controlBindings, bindingContext) {
            this._super(new Configuration(rendererModel.config), rendererModel.dependencies, viewModel);
            this.tracker = ko.observable();

            this.optionsResolverFactory = new OptionsResolverFactory();
            this.LoVMappingAutoComplete = LoVMappingAutoComplete;
            this.eventsQueue = new EventsQueue();
            this.decoratorsCatalog = new RendererDecoratorsCatalog();
            this.payloadContext = new ObservablePayloadContext(controlBindings, bindingContext);

            //list of running async Templates (this list will be empty when everything is rendered)
            this.runningAsyncTemplates = ko.observable(-1);
        },
        getScope: function() {
            return RendererId.FORM_RENDERER;
        },
        getControlDefinitionByType: function(controlTypeId) {
            return RendererControlType[controlTypeId];
        },
        getFormReferenceControlDefinition: function(reference, handler) {
            return RendererControlType.FORM_REFERENCE(FormReferenceFactory.create(reference), handler);
        },
        addControlDecorators: function(control) {
            this.decoratorsCatalog.addToControl(control, this);
        },
        focusControl: function($control) {
            if ($control.length > 0) {
                $control.first().focus();
                ko.contextFor($control[0]).control.executeEvent(EventsId.ON_FOCUS.value);
            }
        },
        registerAsyncTemplate: function(context, foreachList) {
            var list = ko.unwrap(foreachList);
            var callback;
            if (list.length > 0) { //if no controls to render we don't register it.
                if (this.runningAsyncTemplates() === -1) {
                    this.runningAsyncTemplates(1); //registering first asyncTemplate;
                } else {
                    //registering asyncTemplate
                    this.runningAsyncTemplates(this.runningAsyncTemplates() + 1);
                }
                //callback when asyncTemplate finishes.
                callback = function() {
                    this.runningAsyncTemplates(this.runningAsyncTemplates() - 1);
                }.bind(this);
            }
            return callback;
        },
        properties: function() {
            var readOnly = this.config().readOnly; // Similar to BuilderContext, readOnly parameter should come in config
            return _.extend({}, this._super(), {
                config: this.config(),
                msg: msg,
                removeColumnIcon: function() {
                    return new Icon(REMOVE_COLUMN_BLUE, REMOVE_COLUMN_BLUE, REMOVE_COLUMN_BLUE);
                },
                addColumnIcon: function() {
                    return new Icon(ADD_COLUMN_BLUE, ADD_COLUMN_BLUE, ADD_COLUMN_BLUE);
                },
                tracker: $.proxy(function() {
                    return this.tracker;
                }, this),
                readOnly: function() {
                    return readOnly;
                }
            });
        }
    });
});

define('AbstractCallDefinition',['require','Class','knockout','ResponseMapping'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class'),
        ko = require('knockout'),
        ResponseMapping = require('ResponseMapping');

    //endregion

    return Class.subClass({}, {

        init: function(jsonModel) {
            this.id = jsonModel.id;
            this.response = ko.observable(new ResponseMapping(jsonModel.response));
        },
        toJS: function() {
            return {
                id: this.id,
                response: this.response().toJS()
            };
        }
    });
});

define('RendererCallDefinition',['require','AbstractCallDefinition','underscore'],function(require) {

    'use strict';

    //region dependencies

    var AbstractCallDefinition = require('AbstractCallDefinition'),
        _ = require('underscore');

    //endregion

    return AbstractCallDefinition.subClass({}, {

        init: function(jsonModel) {
            this._super(jsonModel);
            this.formValues = jsonModel.formValues;
        },
        toJS: function() {
            return _.extend(this._super(), {
                formValues: this.formValues
            });
        }
    });
});

define('Form',['require','knockout','jquery','underscore','FormsLogger','RendererCallDefinition','Class'],function(require) {

    'use strict';

    //region dependencies
    /* globals Promise */

    var ko = require('knockout'),
        $ = require('jquery'),
        _ = require('underscore'),
        FormsLogger = require('FormsLogger'),
        RendererCallDefinition = require('RendererCallDefinition'),
        Class = require('Class');

    //endregion

    return Class.subClass({
        resolveOnLoaded: function(form) {
            //Return a promise that resolves when the form finish loading
            return new Promise(function(resolve, reject) {
                /**
                 * this else code IS tested, but in builder, so it doesn't show as covered
                 */
                /* istanbul ignore else */
                if (!form.loaded()) {
                    var sub = form.loaded.subscribe(function() {
                        FormsLogger.getLogger().timeEnd('[LOAD]');
                        sub.dispose();
                        resolve();
                    });
                } else {
                    FormsLogger.getLogger().timeEnd('[LOAD]');
                    resolve();
                }
            });
        }
    }, {
        init: function(json) {
            this.id = json.id;

            this.properties = {
                name: ko.observable(json.name),
                description: ko.observable(json.description)
            };

            this.calls = ko.observableArray(this._buildCalls(json.calls || []));
        },
        /** abstract */
        getAllControls: function() {
            throw new Error('This function must be overridden');
        },
        /** abstract */
        findControl: function(controlId) {
            throw new Error('This function must be overridden');
        },
        _createCallDefinition: function(call) {
            return new RendererCallDefinition(call);
        },
        _buildCalls: function(calls) {
            var callList = [];
            var self = this;
            $.each(calls, function(i, call) {
                callList.push(self._createCallDefinition(call));
            });
            return callList;
        },
        _callsToJS: function() {
            var calls = [];
            _.each(this.calls(), function(call) {
                calls.push(call.toJS());
            });
            return calls;
        }
    });
});

define('RendererLoadPreProcessor',['require','Class','UUID','underscore','knockout','DefaultFormHandler','DefaultCssHandler','DefaultTranslationsHandler','DefaultTypeHandler'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class'),
        UUID = require('UUID'),
        _ = require('underscore'),
        ko = require('knockout'),
        DefaultFormHandler = require('DefaultFormHandler'),
        DefaultCssHandler = require('DefaultCssHandler'),
        DefaultTranslationsHandler = require('DefaultTranslationsHandler'),
        DefaultTypeHandler = require('DefaultTypeHandler');

    //endregion

    return Class.subClass({
        preProcess: function(json) {
            json = ko.utils.unwrapObservable(json) || {};
            json.form = json.form || {};
            json.config = json.config || {};

            var id = UUID.createUuid();
            _.defaults(json.form, {
                id: id,
                name: id,
                description: '',
                controls: [],
                calls: []
            });
            _.defaults(json.config, {
                formHandler: DefaultFormHandler.create(),
                cssHandler: DefaultCssHandler.create(),
                typeHandler: DefaultTypeHandler.create(),
                translationsHandler: DefaultTranslationsHandler.create(),
                readOnly: false,
                domIdPrefix: ''
            });
            _.defaults(json, {
                dependencies: []
            });
            return json;
        }
    }, {});
});

define('EventReference',['require','Class'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class');

    //endregion

    return Class.subClass({}, {
        init: function(id, viewModel) {
            this.id = id;
            this.viewModel = viewModel;
            this._event = null;
        },

        event: function() {
            //Cache to not repeat the same search over and over
            if (!this._event) {
                this._event = this.viewModel.form().extensions.findEvent(this.id);
            }
            return this._event;
        },

        execute: function(control) {
            return this.event().execute(control);
        },

        toJS: function() {
            return {
                id: this.id
            };
        }
    });
});

define('MediaQueryType',['require','jquery'],function(require) {

    'use strict';

    //region dependencies

    var $ = require('jquery');

    //endregion

    var ONLY_APPEND = '-only';

    var sm = 'oj-sm'; //max-width: 767px
    var md = 'oj-md'; //min-width: 768px
    var lg = 'oj-lg'; //min-width: 1024px
    var xl = 'oj-xl'; //min-width: 1280px
    var print = 'print';

    var accept = function(mediaQuery) {
        var accepted = false;
        if (mediaQuery.indexOf(ONLY_APPEND) > 0) {
            accepted = mediaQuery === this.mediaValue + ONLY_APPEND;
        } else {
            accepted = $.inArray(mediaQuery, this.supportedMedias) >= 0;
        }
        return accepted;
    };

    return {
        PRINT: {
            mediaValue: print,
            supportedMedias: [print],
            query: 'print',
            accept: function(mediaQuery) {
                return accept.call(this, mediaQuery);
            }
        },
        SMALL: {
            mediaValue: sm,
            supportedMedias: [sm],
            query: '(max-width: 767px)',
            accept: function(mediaQuery) {
                return accept.call(this, mediaQuery);
            }
        },
        MEDIUM: {
            mediaValue: md,
            query: '(min-width: 768px)',
            supportedMedias: [sm, md],
            accept: function(mediaQuery) {
                return accept.call(this, mediaQuery);
            }
        },
        LARGE: {
            mediaValue: lg,
            supportedMedias: [sm, md, lg],
            query: '(min-width: 1024px)',
            accept: function(mediaQuery) {
                return accept.call(this, mediaQuery);
            }
        },
        EXTRA_LARGE: {
            mediaValue: xl,
            query: '(min-width: 1280px)',
            supportedMedias: [sm, md, lg, xl],
            accept: function(mediaQuery) {
                return accept.call(this, mediaQuery);
            }
        }
    };
});

define('ColumnSpanType',['require','MediaQueryType','jquery'],function(require) {

    'use strict';

    //region dependencies

    var MediaQueryType = require('MediaQueryType'),
        $ = require('jquery');

    //endregion
    var getStyleClass = function(mediaQueryType, colSpan, full) {
        var supportedMedias = full ? mediaQueryType.supportedMedias : [mediaQueryType.mediaValue];
        var styleClass = '';
        $.each(supportedMedias, function() {
            styleClass += this + '-' + colSpan + ' ';
        });
        return styleClass;
    };

    return {
        SMALL: {
            propertyName: 'smColSpan',
            getStyleClass: function(colSpan, full) {
                return getStyleClass(MediaQueryType.SMALL, colSpan, full);
            }
        },
        MEDIUM: {
            propertyName: 'mdColSpan',
            getStyleClass: function(colSpan, full) {
                return getStyleClass(MediaQueryType.MEDIUM, colSpan, full);
            }
        },
        LARGE: {
            propertyName: 'lgColSpan',
            getStyleClass: function(colSpan, full) {
                return getStyleClass(MediaQueryType.LARGE, colSpan, full);
            }
        },
        EXTRA_LARGE: {
            propertyName: 'xlColSpan',
            getStyleClass: function(colSpan, full) {
                return getStyleClass(MediaQueryType.EXTRA_LARGE, colSpan, full);
            }
        }
    };
});

define('ControlEventsMap',['require','EventsId','ControlTypeId'],function(require) {

    'use strict';
    // jshint maxstatements: 35

    //region dependencies

    var EventsId = require('EventsId'),
        ControlTypeId = require('ControlTypeId');
    //endregion

    var textEvents = [
        EventsId.ON_LOAD, EventsId.ON_CHANGE, EventsId.ON_FOCUS, EventsId.ON_BLUR, EventsId.ON_SUBMIT
    ];


    var properties = {};
    properties[ControlTypeId.INPUT_TEXT] = textEvents;
    properties[ControlTypeId.TEXT_AREA] = textEvents;
    properties[ControlTypeId.BUTTON] = [
        EventsId.ON_LOAD, EventsId.ON_CLICK, EventsId.ON_SUBMIT
    ];
    properties[ControlTypeId.SELECT] = [
        EventsId.ON_LOAD, EventsId.ON_CHANGE, EventsId.ON_SUBMIT
    ];
    properties[ControlTypeId.CHECKLIST] = [
        EventsId.ON_LOAD, EventsId.ON_CHANGE, EventsId.ON_SUBMIT
    ];
    properties[ControlTypeId.CHECKBOX] = [
        EventsId.ON_LOAD, EventsId.ON_CHANGE, EventsId.ON_SUBMIT
    ];
    properties[ControlTypeId.RADIO_BUTTON] = [
        EventsId.ON_LOAD, EventsId.ON_CHANGE, EventsId.ON_SUBMIT
    ];
    properties[ControlTypeId.NUMBER] = textEvents;
    properties[ControlTypeId.DATE] = textEvents;
    properties[ControlTypeId.TIME] = textEvents;
    properties[ControlTypeId.DATE_TIME] = textEvents;
    properties[ControlTypeId.EMAIL] = textEvents;
    properties[ControlTypeId.URL] = textEvents;
    properties[ControlTypeId.MESSAGE] = [
        EventsId.ON_LOAD
    ];
    properties[ControlTypeId.LINK] = [
        EventsId.ON_LOAD, EventsId.ON_CLICK
    ];
    properties[ControlTypeId.MONEY] = textEvents;
    properties[ControlTypeId.PHONE] = textEvents;
    properties[ControlTypeId.IMAGE] = [
        EventsId.ON_LOAD
    ];
    properties[ControlTypeId.VIDEO] = [
        EventsId.ON_LOAD
    ];
    properties[ControlTypeId.PANEL] = [
        EventsId.ON_LOAD
    ];
    properties[ControlTypeId.BUSINESS_TYPE] = [
        EventsId.ON_LOAD
    ];
    properties[ControlTypeId.SECTION] = [
        EventsId.ON_LOAD, EventsId.ON_EXPAND, EventsId.ON_COLLAPSE, EventsId.ON_EXPAND_TOGGLE
    ];
    properties[ControlTypeId.FORM_REFERENCE] = [
        EventsId.ON_LOAD, EventsId.ON_SUBMIT
    ];
    properties[ControlTypeId.TAB_CONTAINER] = [
        EventsId.ON_LOAD
    ];
    properties[ControlTypeId.TAB] = [
        EventsId.ON_LOAD, EventsId.ON_SELECTED, EventsId.ON_UNSELECTED
    ];
    properties.PRESENTATION = [
        EventsId.ON_LOAD, EventsId.ON_SUBMIT
    ];
    properties.TABLE = [
        EventsId.ON_LOAD,
        EventsId.ON_SELECTION_CHANGE,
        EventsId.ON_ADD_ROW,
        EventsId.ON_REMOVE_ROW
    ];
    properties.REPEATABLE_SECTION = [
        EventsId.ON_LOAD,
        EventsId.ON_SELECTION_CHANGE,
        EventsId.ON_ADD_ROW,
        EventsId.ON_REMOVE_ROW
    ];
    properties[ControlTypeId.IDENTITY_BROWSER] = [
        EventsId.ON_LOAD, EventsId.ON_CHANGE, EventsId.ON_SUBMIT
    ];

    return properties;


});

define('ControlProperty',['require','Class'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class');

    //endregion

    return Class.subClass({}, {
        value: '',
        label: '',
        accessor: '',
        params: 0,
        init: function(value, label, accessor) {
            this.value = value;
            this.label = label;
            this.accessor = accessor;
        },

        template: function() {
            return false;
        },

        getValue: function(control) {
            return control.properties[this.accessor]();
        }
    });
});

define('ControlValueProperty',['require','ControlProperty','ojL10n!rendererMsg/nls/renderer'],function(require) {

    'use strict';

    //region dependencies

    var ControlProperty = require('ControlProperty'),
        msg = require('ojL10n!rendererMsg/nls/renderer');

    //endregion

    return ControlProperty.subClass({}, {
        value: 'VALUE',
        label: msg.LABEL_VALUE,
        init: function() {},
        getValue: function(control) {
            return control.getControlValue();
        }
    });
});

define('ControlIdentityValueProperty',['require','ControlProperty','ojL10n!rendererMsg/nls/renderer'],function(require) {

    'use strict';

    //region dependencies

    var ControlProperty = require('ControlProperty'),
        msg = require('ojL10n!rendererMsg/nls/renderer');

    //endregion

    return ControlProperty.subClass({}, {
        value: 'IDENTITY_VALUE',
        label: msg.IDENTITY_VALUE,
        init: function() {},
        getValue: function(control) {
            return control.getIdentityValue();
        }
    });
});

define('HasClassProperty',['require','ControlProperty','ojL10n!rendererMsg/nls/renderer','StyleTypeId','underscore'],function(require) {

    'use strict';

    //region dependencies

    var ControlProperty = require('ControlProperty');
    var msg = require('ojL10n!rendererMsg/nls/renderer');
    var StyleTypeId = require('StyleTypeId');
    var _ = require('underscore');

    //endregion

    return ControlProperty.subClass({}, {
        value: 'HAS_CLASS',
        label: msg.HAS_CLASS,
        init: function() {},
        template: function() {
            return 'classValueAccessorTemplate';
        },
        params: 1,
        getValue: function(control, className) {
            var style = _.find(control.styles(), function(s) {
                return s.type.name === StyleTypeId.CLASS_NAME.name;
            }, this);
            var classes = style.value().split(' ');
            return _.contains(classes, className);
        }
    });
});

define('IsValidProperty',['require','ControlProperty','ojL10n!rendererMsg/nls/renderer'],function(require) {

    'use strict';

    //region dependencies

    var ControlProperty = require('ControlProperty');
    var msg = require('ojL10n!rendererMsg/nls/renderer');

    //endregion

    return ControlProperty.subClass({}, {
        value: 'IS_VALID',
        label: msg.IS_VALID,
        init: function() {},
        getValue: function(control) {
            return control.viewModel.formValidator.validateControl(control, control.viewModel.rendererContext);
        }
    });
});

define('SelectedTabProperty',['require','ControlProperty','ojL10n!rendererMsg/nls/renderer'],function(require) {

    'use strict';

    //region dependencies

    var ControlProperty = require('ControlProperty');
    var msg = require('ojL10n!rendererMsg/nls/renderer');

    //endregion

    return ControlProperty.subClass({}, {
        value: 'SELECTED',
        label: msg.SELECTED,
        init: function() {},
        getValue: function(control) {
            var parent = control.viewModel.form().findControlAndParent(control.id).parent;
            var index = parent.controls().indexOf(control);
            return parent.properties.selectedPosition() === index;
        }
    });
});

define('ControlVideoSrcProperty',['require','ControlValueProperty','ojL10n!rendererMsg/nls/renderer'],function(require) {

    'use strict';

    //region dependencies

    var ControlValueProperty = require('ControlValueProperty');
    var msg = require('ojL10n!rendererMsg/nls/renderer');

    //endregion

    return ControlValueProperty.subClass({}, {
        value: 'VIDEO_SRC',
        label: msg.LABEL_SOURCE_URL,
        init: function() {}
    });
});

define('ControlImageUrlProperty',['require','ControlValueProperty','ojL10n!rendererMsg/nls/renderer'],function(require) {

    'use strict';

    //region dependencies

    var ControlValueProperty = require('ControlValueProperty');
    var msg = require('ojL10n!rendererMsg/nls/renderer');

    //endregion

    return ControlValueProperty.subClass({}, {
        value: 'IMAGE_URL',
        label: msg.IMAGE_URL,
        init: function() {}
    });
});

define('OptionsProperty',['require','ControlProperty','ojL10n!rendererMsg/nls/renderer'],function(require) {

    'use strict';

    //region dependencies

    var ControlProperty = require('ControlProperty'),
        msg = require('ojL10n!rendererMsg/nls/renderer');

    //endregion

    return ControlProperty.subClass({}, {
        value: 'OPTIONS',
        label: msg.OPTIONS,
        init: function() {},
        getValue: function(control) {
            return control.properties.computedOptions();
        }
    });
});

define('IndexProperty',['require','ControlProperty','underscore','ojL10n!rendererMsg/nls/renderer'],function(require) {

    'use strict';

    //region dependencies

    var ControlProperty = require('ControlProperty'),
        _ = require('underscore'),
        msg = require('ojL10n!rendererMsg/nls/renderer');

    //endregion

    return ControlProperty.subClass({}, {
        value: 'INDEX',
        label: msg.INDEX,
        init: function() {},
        getValue: function(control) {
            return _.isUndefined(control.indexBeforeRemove) ?
                control.getParent().dataSource().indexOf(control) :
                control.indexBeforeRemove;
        }
    });
});

define('SelectedLabelProperty',['require','ControlProperty','underscore','ojL10n!rendererMsg/nls/renderer'],function(require) {

    'use strict';

    //region dependencies

    var ControlProperty = require('ControlProperty'),
        _ = require('underscore'),
        msg = require('ojL10n!rendererMsg/nls/renderer');

    //endregion

    return ControlProperty.subClass({}, {
        value: 'SELECTED_LABEL',
        label: msg.SELECTED_LABEL,
        init: function() {},
        _findLabel: function(control, value) {
            var selectedOption = _.find(control.properties.computedOptions(), function(option) {
                return option.value === value;
            });
            return selectedOption ? selectedOption.label : '';
        },
        getValue: function(control) {
            var value = control.getControlValue();
            if (_.isArray(value)) {
                return _.map(value, function(val) {
                    return this._findLabel(control, val);
                }, this);
            } else {
                return this._findLabel(control, value);
            }
        }
    });
});

define('ControlMessageProperty',['require','ControlValueProperty','ojL10n!rendererMsg/nls/renderer'],function(require) {

    'use strict';

    //region dependencies

    var ControlValueProperty = require('ControlValueProperty');
    var msg = require('ojL10n!rendererMsg/nls/renderer');

    //endregion

    return ControlValueProperty.subClass({}, {
        value: 'MESSAGE',
        label: msg.MESSAGE,
        init: function() {}
    });
});

define('PropertiesMap',['require','ojL10n!rendererMsg/nls/renderer','ControlProperty','ControlValueProperty','ControlIdentityValueProperty','HasClassProperty','IsValidProperty','SelectedTabProperty','ControlVideoSrcProperty','ControlImageUrlProperty','OptionsProperty','IndexProperty','SelectedLabelProperty','ControlMessageProperty'],function(require) {

    'use strict';

    //region dependencies

    var msg = require('ojL10n!rendererMsg/nls/renderer'),
        ControlProperty = require('ControlProperty'),
        ControlValueProperty = require('ControlValueProperty'),
        ControlIdentityValueProperty = require('ControlIdentityValueProperty'),
        HasClassProperty = require('HasClassProperty'),
        IsValidProperty = require('IsValidProperty'),
        SelectedTabProperty = require('SelectedTabProperty'),
        ControlVideoSrcProperty = require('ControlVideoSrcProperty'),
        ControlImageUrlProperty = require('ControlImageUrlProperty'),
        OptionsProperty = require('OptionsProperty'),
        IndexProperty = require('IndexProperty'),
        SelectedLabelProperty = require('SelectedLabelProperty'),
        ControlMessageProperty = require('ControlMessageProperty');
    //endregion

    return {
        'VALUE': new ControlValueProperty(),
        'HAS_CLASS': new HasClassProperty(),
        'LABEL': new ControlProperty('LABEL', msg.LABEL_LABEL, 'label'),
        'MESSAGE': new ControlMessageProperty(),
        'VIDEO_SRC': new ControlVideoSrcProperty(),
        'IMAGE_URL': new ControlImageUrlProperty(),
        'PLACEHOLDER': new ControlProperty('PLACEHOLDER', msg.LABEL_PLACEHOLDER, 'placeHolder'),
        'HIDDEN': new ControlProperty('HIDDEN', msg.HIDDEN, 'hide'),
        'EXPANDED': new ControlProperty('EXPANDED', msg.LABEL_EXPANDED, 'expanded'),
        'DISABLED': new ControlProperty('DISABLED', msg.LABEL_DISABLED, 'disabled'),
        'REQUIRED': new ControlProperty('REQUIRED', msg.LABEL_REQUIRED, 'required'),
        'MIN_VALUE': new ControlProperty('MIN_VALUE', msg.LABEL_MIN_VALUE, 'minValue'),
        'MAX_VALUE': new ControlProperty('MAX_VALUE', msg.LABEL_MAX_VALUE, 'maxValue'),
        'IS_VALID': new IsValidProperty(),
        'OPTIONS': new OptionsProperty(),
        'SELECTED': new SelectedTabProperty(),
        'IDENTITY_VALUE': new ControlIdentityValueProperty(),
        'CAN_ADD_REMOVE_ROWS': new ControlProperty('CAN_ADD_REMOVE_ROWS', msg.ENABLED_ADD_REMOVE_ROWS, 'canAddDelete'),
        'INDEX': new IndexProperty(),
        'SELECTED_LABEL': new SelectedLabelProperty()
    };


});

define('FunctionsMap',['require','ojL10n!rendererMsg/nls/renderer','UUID','StringUtils','underscore'],function(require) {

    'use strict';

    //region dependencies

    var msg = require('ojL10n!rendererMsg/nls/renderer'),
        UUID = require('UUID'),
        StringUtils = require('StringUtils'),
        _ = require('underscore');
    //endregion


    var tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
    function getISOString() {
        //Correct the time by the timezone offset, as the ISO String, that oj uses, is in UTC+0
        return (new Date(Date.now() - tzoffset)).toISOString();
    }

    function applyToArray(array, applyFunction) {
        _.each(array, function(number) {
            if (_.isArray(number)) {
                applyToArray(number, applyFunction);
            } else {
                applyFunction(number);
            }
        });
    }

    function fixedNumber(number) {
        return parseFloat(number.toFixed(10));
    }

    var FunctionsMap = {
        'CREATE_UUID': {
            value: 'CREATE_UUID',
            label: msg.CREATE_UUID,
            resolve: function() {
                return UUID.createUuid();
            },
            params: [],
            category: 'FUNCTIONS_OTHER'
        },
        'CURRENT_DATE': {
            value: 'CURRENT_DATE',
            label: msg.CURRENT_DATE,
            resolve: function() {
                return getISOString().slice(0, 10);
            },
            params: [],
            category: 'FUNCTIONS_DATE'
        },
        'CURRENT_TIME': {
            value: 'CURRENT_TIME',
            label: msg.CURRENT_TIME,
            resolve: function() {
                return getISOString().slice(10, 19);
            },
            params: [],
            category: 'FUNCTIONS_DATE'
        },
        'CURRENT_DATE_TIME': {
            value: 'CURRENT_DATE_TIME',
            label: msg.CURRENT_DATE_TIME,
            resolve: function() {
                return getISOString().slice(0, 19);
            },
            params: [],
            category: 'FUNCTIONS_DATE'
        },
        'SIMPLE_SUM': {
            value: 'SIMPLE_SUM',
            label: msg.SUM,
            resolve: function(a, b) {
                var valueA = parseFloat(a),
                    valueB = parseFloat(b);
                return fixedNumber(valueA + valueB);
            },
            params: [{
                type: 'NUMBER'
            }, {
                type: 'NUMBER'
            }],
            category: 'FUNCTIONS_MATH'
        },
        'SUM': {
            value: 'SUM',
            label: msg.SUMMATION,
            resolve: function() {
                var sum = 0;
                applyToArray(arguments, function(number) {
                    sum = fixedNumber(sum + parseFloat(number));
                });
                return sum;
            },
            multipleParams: true,
            params: [{
                type: 'NUMBER'
            }],
            category: 'FUNCTIONS_MATH'
        },
        'SUB': {
            value: 'SUB',
            label: msg.SUB,
            resolve: function(a, b) {
                var valueA = parseFloat(a),
                    valueB = parseFloat(b);
                return fixedNumber(valueA - valueB);
            },
            params: [{
                type: 'NUMBER'
            }, {
                type: 'NUMBER'
            }],
            category: 'FUNCTIONS_MATH'
        },
        'MULTIPLY': {
            value: 'MULTIPLY',
            label: msg.MULTIPLY,
            resolve: function() {
                var val = 1;
                applyToArray(arguments, function(number) {
                    var value = parseFloat(number);
                    val = fixedNumber(val * value);
                });
                return val;
            },
            multipleParams: true,
            params: [{
                type: 'NUMBER'
            }],
            category: 'FUNCTIONS_MATH'
        },
        'DIVISION': {
            value: 'DIVISION',
            label: msg.DIVISION,
            resolve: function(a, b) {
                var valueA = parseFloat(a),
                    valueB = parseFloat(b);
                return fixedNumber(valueA / valueB);
            },
            params: [{
                type: 'NUMBER'
            }, {
                type: 'NUMBER'
            }],
            category: 'FUNCTIONS_MATH'
        },
        'INTEGER_DIVISION': {
            value: 'INTEGER_DIVISION',
            label: msg.INTEGER_DIVISION,
            resolve: function(a, b) {
                var val = FunctionsMap.DIVISION.resolve(a, b);
                if (val < 0) {
                    return Math.ceil(val);
                }
                return Math.floor(val);
            },
            params: [{
                type: 'NUMBER'
            }, {
                type: 'NUMBER'
            }],
            category: 'FUNCTIONS_MATH'
        },
        'MOD': {
            value: 'MOD',
            label: msg.MODULO,
            resolve: function(a, b) {
                var valueA = parseFloat(a),
                    valueB = parseFloat(b);
                return fixedNumber(valueA % valueB);
            },
            params: [{
                type: 'NUMBER'
            }, {
                type: 'NUMBER'
            }],
            category: 'FUNCTIONS_MATH'
        },
        'MIN': {
            value: 'MIN',
            label: msg.MIN,
            resolve: function() {
                var min = Number.MAX_VALUE;
                applyToArray(arguments, function(number) {
                    min = Math.min(min, number);
                });
                return min;
            },
            multipleParams: true,
            params: [{
                type: 'NUMBER'
            }],
            category: 'FUNCTIONS_ARRAY'
        },
        'MAX': {
            value: 'MAX',
            label: msg.MAX,
            resolve: function() {
                var max = Number.MIN_VALUE;
                applyToArray(arguments, function(number) {
                    max = Math.max(max, number);
                });
                return max;
            },
            multipleParams: true,
            params: [{
                type: 'NUMBER'
            }],
            category: 'FUNCTIONS_ARRAY'
        },
        'COUNT': {
            value: 'COUNT',
            label: msg.COUNT,
            resolve: function() {
                var count = 0;
                applyToArray(arguments, function() {
                    count++;
                });
                return count;
            },
            multipleParams: true,
            allowComplex: true,
            params: [{
                type: 'ANY'
            }],
            category: 'FUNCTIONS_ARRAY'
        },
        'AVERAGE': {
            value: 'AVERAGE',
            label: msg.AVERAGE,
            resolve: function() {
                var sum = 0,
                    count = 0;
                applyToArray(arguments, function(number) {
                    var value = parseFloat(number);
                    sum = fixedNumber(sum + value);
                    count++;
                });
                if (count > 0) {
                    return fixedNumber(sum / count);
                }
                return 0;
            },
            multipleParams: true,
            params: [{
                type: 'NUMBER'
            }],
            category: 'FUNCTIONS_ARRAY'
        },
        'CONCAT': {
            value: 'CONCAT',
            label: msg.CONCAT,
            resolve: function() {
                var text = '';
                applyToArray(arguments, function(moreText) {
                    text += moreText;
                });
                return text;
            },
            multipleParams: true,
            params: [{
                type: 'STRING'
            }],
            category: 'FUNCTIONS_TEXT'
        },
        'SPLIT': {
            value: 'SPLIT',
            label: msg.SPLIT,
            resolve: function(text, splitter) {
                return StringUtils._makeString(text).split(StringUtils._makeString(splitter));
            },
            params: [{
                type: 'STRING'
            }, {
                type: 'STRING'
            }],
            category: 'FUNCTIONS_TEXT'
        },
        'JOIN': {
            value: 'JOIN',
            label: msg.JOIN,
            resolve: function(array, joint) {
                if (!_.isArray(array)) {
                    array = [array];
                }
                return array.join(StringUtils._makeString(joint));
            },
            params: [{
                type: 'STRING'
            }, {
                type: 'STRING'
            }],
            category: 'FUNCTIONS_TEXT'
        },
        'TO_LOWERCASE': {
            value: 'TO_LOWERCASE',
            label: msg.TO_LOWERCASE,
            resolve: function(a) {
                return StringUtils._makeString(a).toLowerCase();
            },
            params: [{
                type: 'STRING'
            }],
            category: 'FUNCTIONS_TEXT'
        },
        'TO_UPPERCASE': {
            value: 'TO_UPPERCASE',
            label: msg.TO_UPPERCASE,
            resolve: function(a) {
                return StringUtils._makeString(a).toUpperCase();
            },
            params: [{
                type: 'STRING'
            }],
            category: 'FUNCTIONS_TEXT'
        },
        'LENGTH': {
            value: 'LENGTH',
            label: msg.LENGTH,
            resolve: function(a) {
                return _.size(StringUtils._makeString(a));
            },
            params: [{
                type: 'STRING'
            }],
            category: 'FUNCTIONS_TEXT'
        },
        'TRIM': {
            value: 'TRIM',
            label: msg.TRIM,
            resolve: function(a) {
                return StringUtils.trim(a);
            },
            params: [{
                type: 'STRING'
            }],
            category: 'FUNCTIONS_TEXT'
        },
        'REPLACE': {
            value: 'REPLACE',
            label: msg.REPLACE,
            resolve: function(str, search, replacement) {
                str = (str || '').toString();
                search = new RegExp((search || '').toString(), 'g');
                replacement = (replacement || '').toString();
                return str.replace(search, replacement);
            },
            params: [{
                type: 'STRING'
            }, {
                type: 'STRING'
            }, {
                type: 'STRING'
            }],
            category: 'FUNCTIONS_TEXT'
        }
    };

    return FunctionsMap;

});

define('ValueTypes',['require','ojL10n!rendererMsg/nls/renderer'],function(require) {

    'use strict';

    var msg = require('ojL10n!rendererMsg/nls/renderer');

    return {
        'CONSTANT': {
            value: 'CONSTANT',
            label: msg.CONSTANT,
            resolveFunction: '_resolveConstant',
            decorateFunction: '_decorateConstant',
            template: null
        },
        'DATA': {
            value: 'DATA',
            label: msg.DATA_DEFINITION,
            resolveFunction: '_resolveData',
            template: 'dataValueTypeTemplate'
        },
        'CONTROL': {
            value: 'CONTROL',
            label: msg.CONTROL,
            resolveFunction: '_resolveControl',
            template: 'controlValueTypeTemplate'
        },
        'FUNCTION': {
            value: 'FUNCTION',
            label: msg.FUNCTION,
            resolveFunction: '_resolveFunction',
            decorateFunction: '_decorateFunction',
            template: 'functionValueTypeTemplate'
        },
        'SCOPE': {
            value: 'SCOPE',
            label: msg.CONNECTOR_DATA,
            resolveFunction: '_resolveScope',
            template: 'dataValueTypeTemplate'
        }
    };
});

define('ControlReferenceMap',['require','ojL10n!rendererMsg/nls/renderer'],function(require) {

    'use strict';

    //region dependencies
    var msg = require('ojL10n!rendererMsg/nls/renderer');
    //endregion

    function isRepeatable(control) {
        return !!control && control.isRepeatable();
    }

    function findRepeatableRow(repeatable, eventControl) {
        if (!eventControl.getParent) {
            //We went all the way to the form! Is not inside repeatable
            return;
        }
        if (eventControl.getParent() === repeatable) {
            //We found our index!
            return eventControl;
        }
        return findRepeatableRow(repeatable, eventControl.getParent());
    }

    var ControlReferenceMap = {
        'SELF': {
            value: 'SELF',
            label: msg.SELF,
            resolve: function(control) {
                return control;
            }
        },
        'FIRST': {
            value: 'FIRST',
            label: msg.FIRST,
            resolve: function(control, eventControl) {
                if (!isRepeatable(control)) {
                    return;
                }
                return control.getRows()[0];
            }
        },
        'LAST': {
            value: 'LAST',
            label: msg.LAST,
            resolve: function(control, eventControl) {
                if (!isRepeatable(control)) {
                    return;
                }
                return control.getRows()[control.getRows().length - 1];
            }
        },
        'SELECTED': {
            value: 'SELECTED',
            //We need to change the label of this according to context
            labelFunction: function(controlAccessor) {
                if (controlAccessor.controlResolver.getControl(controlAccessor.context).properties.multipleSelection()) {
                    if (controlAccessor.isActionControl) {
                        return msg.FOR_EACH_SELECTED;
                    } else {
                        return msg.ALL_SELECTED;
                    }
                }
                return msg.SELECTED_ROW;
            },
            resolve: function(control) {
                if (!isRepeatable(control)) {
                    return;
                }
                return control.getSelectedRows();
            }
        },
        'INDEX': {
            value: 'INDEX',
            label: msg.INDEX,
            template: 'controlIndexTemplate',
            resolve: function(control, eventControl, resolver) {
                if (!isRepeatable(control)) {
                    return;
                }
                if (!eventControl) {
                    //We need a default row for builder
                    return ControlReferenceMap.FIRST.resolve(control);
                }
                var index = resolver.value().resolve(resolver.viewModel);
                return control.getRows()[index];
            }
        },
        'CURRENT': {
            value: 'CURRENT',
            label: msg.CURRENT,
            resolve: function(control, eventControl) {
                if (!isRepeatable(control)) {
                    return;
                }
                if (!eventControl) {
                    //We need a default row for builder
                    return ControlReferenceMap.FIRST.resolve(control);
                }
                return findRepeatableRow(control, eventControl);
            }
        },
        'CURRENT_ITERATION': {
            value: 'CURRENT_ITERATION',
            label: msg.CURRENT_ITERATION_ROW,
            resolve: function(control, eventControl, resolver) {
                if (!isRepeatable(control)) {
                    return;
                }
                if (!eventControl) {
                    //We need a default row for builder
                    return ControlReferenceMap.FIRST.resolve(control);
                }
                return findRepeatableRow(control, resolver.scope.currentRowControl);
            }
        }
    };

    return ControlReferenceMap;
});

define('ControlResolver',['require','Class','knockout','ControlReferenceMap','underscore','Value'],function(require) {

    'use strict';


    //region dependencies

    var Class = require('Class'),
        ko = require('knockout'),
        ControlReferenceMap = require('ControlReferenceMap'),
        _ = require('underscore');

    //endregion
    var ControlResolver = Class.subClass({}, {

        id: null,
        reference: null,
        childControl: null,

        init: function(model, viewModel, scope) {
            var defaults = _.extend({
                id: '',
                reference: ControlReferenceMap.SELF.value,
                childControl: {}
            }, model);
            this.id = ko.observable(defaults.id);
            this.reference = ko.observable(defaults.reference);
            var childControl = model.childControl ? new ControlResolver(defaults.childControl, viewModel, scope) : null;
            this.childControl = ko.observable(childControl);
            this.scope = scope;
            this.viewModel = viewModel;
            this.value = ko.observable(null);

            if (!!model.value) {
                this.createValueObject(model.value);
            }
            var self = this;
            this.reference.subscribe(function(newReference) {
                if (newReference === ControlReferenceMap.INDEX.value) {
                    self.createValueObject();
                } else {
                    self.value(null);
                }
            });
        },

        createValueObject: function(model) {
            var Value = require('Value');
            this.value(new Value(model || {}, this.viewModel, this.scope));
        },

        toJS: function() {
            var data = {
                id: this.id(),
                reference: this.reference(),
                childControl: this.childControl() ? this.childControl().toJS() : null
            };
            if (this.value()) {
                data.value = this.value().toJS();
            }
            return data;
        },

        /**
         * Returns the current control that this resolver points, to without resolving any further
         * @param context
         * @returns {*}
         */
        getControl: function(context) {
            var ctxt = ko.unwrap(context);
            if (ctxt.findControl) {
                return ctxt.findControl(this.id());
            }
        },

        /**
         * Resolves the child context, not recursivly
         */
        resolveChildContext: function(context, eventControl) {
            var control;
            if (this.id() === '__SELF__') {
                control = context;
            } else if (_.isArray(context)) {
                //If this is an array, return an array with the final controls
                return _.map(context, function(ctxt) {
                    control = this.getControl(ctxt);
                    return ControlReferenceMap[this.reference()].resolve(control, this.childControl(), eventControl, this);
                }, this);
            } else {
                control = this.getControl(context);
            }
            return ControlReferenceMap[this.reference()].resolve(control, eventControl, this);
        },

        /**
         * resolves the whole controlResolver, recursivly until SELF is found
         */
        resolve: function(context, eventControl) {
            var control = this.resolveChildContext(context, eventControl);
            if (this.childControl()) {
                if (!!control) {
                    return this.childControl().resolve(control, eventControl);
                } else {
                    return null;
                }
            } else {
                return control;
            }
        },

        /**
         * returns an array of the ids which have a particular reference, as we need those in order to
         * do some extra stuff, ie:
         *      For SELECTED and FOR_EACH, we need to know that we can display the CURRENT_ITERATION
         */
        getControlsWithRef: function(ref) {
            var array = [];
            if (this.reference() === ref) {
                array = [this.id()];
            }
            if (this.childControl()) {
                array = _.union(array, this.childControl().getControlsWithRef(ref));
            }
            return array;
        }



    });

    return ControlResolver;
});

define('Value',['require','Class','knockout','underscore','PropertiesMap','FunctionsMap','ValueTypes','ControlResolver'],function(require) {

    'use strict';


    //region dependencies

    var Class = require('Class'),
        ko = require('knockout'),
        _ = require('underscore'),
        PropertiesMap = require('PropertiesMap'),
        FunctionsMap = require('FunctionsMap'),
        ValueTypes = require('ValueTypes');

    //endregion
    var Value = Class.subClass({}, {
        type: null,
        expression: null,
        controlResolver: null,
        propertyParam: [],
        controlId: null,
        mapped: null,

        init: function(model, viewModel, scope) {
            var defaults = _.extend({
                expression: '',
                propertyParam: [],
                type: ValueTypes.CONSTANT.value,
                controlResolver: {},
                mapped: '',
                controlId: null
            }, model);
            if (viewModel.context && viewModel.context.config && viewModel.context.config()) {
                this.translationsHandler = viewModel.context.config().translationsHandler;
            }

            this.viewModel = viewModel;
            this._translationIndex = 0; //translations for Value are stored in form of array. So index to iterate over it
            this.expression = ko.observable(defaults.expression);
            this.mapped = ko.observable(defaults.mapped);

            var params = [];
            _.each(defaults.propertyParam, function(param) {
                params.push(new Value(param, viewModel, scope));
            });
            this.propertyParam = ko.observableArray(params);

            var ControlResolver = require('ControlResolver');

            this.type = ko.observable(ValueTypes[defaults.type]);
            this.controlResolver = new ControlResolver(defaults.controlResolver, viewModel, scope);
            this.scope = scope;

            this.control = ko.observable();
            this.controlId = defaults.controlId;
            if (this.controlId !== null) {
                if (viewModel.form()) {
                    this.control(viewModel.form().findControl(this.controlId));
                }
                var subs = viewModel.form.subscribe((function(form) {
                    this.control(form.findControl(this.controlId));
                    subs.dispose();
                }).bind(this));
            }
        },

        getTemplate: function() {
            var template = this.type().template;
            if (!template) {
                if (this.control()) {
                    return this.control().getDataTemplate();
                } else {
                    return 'constantValueTypeTemplate';
                }
            }
            return template;
        },

        toJS: function() {
            var params = [];
            _.each(this.propertyParam(), function(param) {
                params.push(param.toJS());
            });
            return {
                expression: this.expression(),
                propertyParam: params,
                controlResolver: this.controlResolver.toJS(),
                type: this.type().value,
                mapped: this.mapped(),
                controlId: this.controlId
            };
        },

        _resolveMap: function(viewModel, value) {
            if (_.isArray(value) && this.mapped().length > 0) {
                return _.map(value, this.mapped());
            }
            return value;
        },

        resolve: function(viewModel) {
            return this._resolveMap(viewModel,
                this[this.type().resolveFunction](viewModel)
            );
        },

        _checkBundle: function(blockId, valueObj) {
            /* istanbul ignore else */
            if (this.translationsHandler) {
                var defaultBundle = this.translationsHandler._bundles.defaultBundle;
                var initLocaleBundle = this.translationsHandler._bundles.initLocaleBundle;
                var valueArr; //Translation for value are stored in array
                if (initLocaleBundle && initLocaleBundle[blockId]) {
                    valueArr = initLocaleBundle[blockId];
                } else if (defaultBundle && defaultBundle[blockId]) {
                    valueArr = defaultBundle[blockId];
                }

                // For complex value such as when value.type= function, we need to iterate its propertyParam, so iterating over bundle
                //array. _translationindex keeps the check of index to be iterate and value object is common object used while iterating a single value.
                if (valueArr && valueArr.length > valueObj._translationIndex) {
                    var expression = valueArr[valueObj._translationIndex];
                    valueObj._translationIndex = valueObj._translationIndex + 1;
                    return expression;
                }
            }
        },

        _resolveConstant: function(viewModel) {
            return this.expression();
        },

        _resolveData: function(viewModel) {
            return ko.unwrap(viewModel.context.payloadContext.getObservableValue(this.expression()));
        },

        _resolveControl: function(viewModel) {
            var form = viewModel.form();
            var control = this.controlResolver.resolve(form.presentation(), this.scope.eventControl);
            var property = PropertiesMap[this.expression()] || PropertiesMap.VALUE;
            if (!!control) {

                var params = [];
                _.each(this.propertyParam(), function(param) {
                    params.push(param.resolve(viewModel));
                });
                //If there are multiple controls, map the values and return an array
                if (_.isArray(control)) {
                    return _.map(control, function(ctrl) {
                        return property.getValue.apply(property, [ctrl].concat(params));
                    });
                } else {
                    return property.getValue.apply(property, [control].concat(params));
                }

            } else {
                console.error('User Events Error: Value couldn\'t be resolved.');
            }
        },

        _resolveFunction: function(viewModel) {
            var func = FunctionsMap[this.expression()];

            var params = [];
            _.each(this.propertyParam(), function(param) {
                params.push(param.resolve(viewModel));
            });
            return func.resolve.apply(func, params);
        },

        _resolveScope: function(viewModel) {
            return this.scope.getValue(this.expression());
        },

        _getBundle: function() {
            var bundleArr = [];
            if (this.type().value === ValueTypes.CONSTANT.value) {
                bundleArr.push(this.expression());
            } else if (this.type().value === ValueTypes.FUNCTION.value) {
                _.each(this.propertyParam(), function(param) {
                    bundleArr = _.union(bundleArr, param._getBundle());
                });
            }
            return bundleArr;
        },

        decorate: function(viewModel, blockId, valueObj) {
            valueObj = valueObj || this;

            // Check decorateFunction for this value type i.e. decorate a constant or decorate a function
            var decorateFunction = this.type().decorateFunction;
            if (decorateFunction) {
                this[decorateFunction](viewModel, blockId, valueObj);
            }
        },

        _decorateConstant: function(viewModel, blockId, valueObj) {
            this.expression(this._checkBundle(blockId, valueObj) || this.expression());
        },

        _decorateFunction: function(viewModel, blockId, valueObj) {

            _.each(this.propertyParam(), function(param) {
                param.decorate(viewModel, blockId, valueObj);
            });
        },

        getParameterCount: function() {
            if (this.type() === ValueTypes.CONTROL) {
                return PropertiesMap[this.expression()].params;
            }
            if (this.type() === ValueTypes.FUNCTION) {
                return FunctionsMap[this.expression()].params.length;
            }
            return 0;
        }
    });

    return Value;
});

define('Control',['require','Class','UUID','underscore','EventReference','ColumnSpanType','ControlEventsMap','Value','ValidationHelper','koToJSUtil','knockout','ojs/ojmenu'],function(require) {

    'use strict';

    /* globals Promise */
    //region dependencies

    var Class = require('Class'),
        UUID = require('UUID'),
        _ = require('underscore'),
        EventReference = require('EventReference'),
        ColumnSpanType = require('ColumnSpanType'),
        ControlEventsMap = require('ControlEventsMap'),
        Value = require('Value'),
        ValidationHelper = require('ValidationHelper'),
        koToJSUtil = require('koToJSUtil'),
        ko = require('knockout');

    require('ojs/ojmenu');

    //endregion

    return Class.subClass({}, {
        _parent: null,
        isValid: null,
        _registerProperties: function(container, element, properties) {
            for (var propertyName in element) {
                /* istanbul ignore else */
                if (element.hasOwnProperty(propertyName)) {
                    var property = element[propertyName];
                    container[propertyName] = property instanceof Function ? property(container, properties) : property;
                }
            }
        },
        /* jshint maxparams: 6 */
        init: function(id, name, type, properties, context, parent) {

            //common properties
            this.id = id || UUID.createUuid();
            this.name = ko.observable(name); //ko.observable(type.id + '_' + this.id);
            this.type = type.id;
            this.validationHelper = ValidationHelper;
            this.context = context;
            this._parent = parent;
            this.isValid = ko.observable(true);

            //properties derived from specific type
            this._registerProperties(this, type.properties(), properties);
            //properties based on context (renderer or builder context
            this._registerProperties(this, context.properties(), properties);
            // Styles associated with the control.
            this.styles = this.styleHandler.getAllStyles(this, properties);
            //properties for the particular type
            var defaults = {
                position: 0,
                isRoot: false,
                label: name,
                autoFocus: false,
                disabled: false,
                required: false,
                hide: false,
                parsedStyle: '',
                formattedStyle: {},
                isBindable: type.isBindable(),
                binding: '',
                autoColSpan: true,
                connectorMapping: '',
                events: [],
                computed: false,
                originalId: null,
                computedValue: null
            };
            defaults[ColumnSpanType.SMALL.propertyName] = 1;
            defaults[ColumnSpanType.MEDIUM.propertyName] = 1;
            defaults[ColumnSpanType.LARGE.propertyName] = 1;
            defaults[ColumnSpanType.EXTRA_LARGE.propertyName] = 1;

            _.defaults(properties, defaults);

            //TODO are position and isRoot necessary? (to be answered when doing layout stories)
            this.properties = {
                position: ko.observable(properties.position),
                isRoot: ko.observable(properties.isRoot),
                label: ko.observable(properties.label),
                autoFocus: ko.observable(properties.autoFocus),
                disabled: ko.observable(properties.disabled),
                required: ko.observable(properties.required),
                hide: ko.observable(properties.hide),
                parsedStyle: ko.observable(properties.parsedStyle),
                formattedStyle: ko.observable(properties.formattedStyle),
                isBindable: ko.observable(properties.isBindable),
                binding: ko.observable(properties.binding),
                autoColSpan: ko.observable(properties.autoColSpan),
                connectorMapping: ko.observable(properties.connectorMapping),
                computed: ko.observable(properties.computed),
                originalId: properties.originalId
            };

            this.properties[ColumnSpanType.SMALL.propertyName] = ko.observable(properties[ColumnSpanType.SMALL.propertyName]);
            this.properties[ColumnSpanType.MEDIUM.propertyName] = ko.observable(properties[ColumnSpanType.MEDIUM.propertyName]);
            this.properties[ColumnSpanType.LARGE.propertyName] = ko.observable(properties[ColumnSpanType.LARGE.propertyName]);
            this.properties[ColumnSpanType.EXTRA_LARGE.propertyName] = ko.observable(properties[ColumnSpanType.EXTRA_LARGE.propertyName]);

            this.properties.formattedStyle = this.styleHandler.getFormattedStyle(this);
            this.properties.parsedStyle = this.styleHandler.getParsedStyle(this);

            var events = [];
            _.each(ko.unwrap(properties.events), function(event) {
                events.push(new EventReference(event.id, context.viewModel));
            }, this);
            this.events = ko.observableArray(events);

            var scope = new context.scopeFactory.Scope(context.viewModel.getCurrentGlobalScope());
            scope.controlId = this.id;
            this.properties.computedValue = new Value(properties.computedValue, context.viewModel, scope);
        },
        executeEvent: function(trigger) {
            var events = [];
            _.each(this.events(), function(eventRef) {
                var eventTrigger = eventRef.event().trigger;
                if (trigger === eventTrigger()) {
                    events.push(eventRef.execute(this));
                }
            }, this);
            this.context.viewModel.computedExtension.reEvaluateOnControl(trigger, this);
            return Promise.all(events);
        },
        findClosest: function(id) {
            return this.getParent().findClosest(id);
        },
        hasValueProperty: function() {
            return true;
        },
        executeEventOnAll: function(trigger) {
            return this.executeEvent(trigger);
        },
        getValidEvents: function() {
            return ControlEventsMap[this.type];
        },
        makeCopy: function() {
            var copy = this.toJS();
            copy.properties.originalId = this.properties.originalId ? this.properties.originalId : copy.id;
            copy.id = UUID.createUuid();
            if (this.controls) {
                var controls = [];
                _.each(this.controls(), function(control) {
                    controls.push(control.makeCopy());
                });
                copy.controls = controls;
            }
            return copy;
        },
        isRepeatable: function() {
            return false;
        },
        getParent: function() {
            return this._parent;
        },
        getFullBinding: function() {
            return this.getBindingContext() + this.properties.binding();
        },
        getBindingContext: function() {
            return this.getParent() ? this.getParent().getContextForChildren(this) : '';
        },
        getDataTemplate: function() {
            return 'constantValueTypeTemplate';
        },
        getContextForChildren: function(child) {
            return this.getBindingContext();
        },
        hasStyle: function() {
            return this.styles().length > 0;
        },
        /**
         * Adds a custom error to the control and forces a validation
         * @param summary
         * @param detail
         */
        setError: function(summary, detail) {
            var ojComponentWidgetRef = this.getOjComponent();
            ojComponentWidgetRef('option', 'messagesCustom', [{
                summary: summary,
                detail: detail
            }]);
            this.validate();
        },
        _propertiesToJS: function() {
            return koToJSUtil.toJS(this.properties);
        },
        toJS: function() {
            var events = [];
            _.each(this.events(), function(event) {
                events.push(event.toJS());
            });
            return {
                id: this.id,
                name: this.name(),
                type: this.type,
                properties: _.extend({}, this._propertiesToJS(), {
                    events: events,
                    computedValue: this.properties.computedValue.toJS()
                })
            };
        }
    });
});

define('ButtonControl',['require','Control','ControlTypeId'],function(require) {

    'use strict';

    //region dependencies

    var Control = require('Control'),
        ControlTypeId = require('ControlTypeId');

    //endregion

    return Control.subClass({}, {
        init: function(id, name, properties, context, parent) {
            this._super(id, name, context.getControlDefinitionByType(ControlTypeId.BUTTON), properties, context, parent);
        },
        hasValueProperty: function() {
            return false;
        }
    });
});

define('InputTextControl',['require','Control','underscore','knockout','ControlTypeId'],function(require) {

    'use strict';

    //region dependencies

    var Control = require('Control'),
        _ = require('underscore'),
        ko = require('knockout'),
        ControlTypeId = require('ControlTypeId');

    //endregion

    return Control.subClass({}, {
        /* jshint maxparams: 6 */
        init: function(id, name, properties, context, parent, controltype) {
            this._super(id, name, controltype || context.getControlDefinitionByType(ControlTypeId.INPUT_TEXT), properties, context, parent);

            _.defaults(properties, {
                autoComplete: false,
                help: '',
                hint: '',
                pattern: '',
                patternMessage: '',
                placeHolder: '',
                readonly: false,
                defaultValue: '',
                maxLength: null,
                minLength: null
            });

            this.properties.autoComplete = ko.observable(properties.autoComplete);
            this.properties.help = ko.observable(properties.help);
            this.properties.hint = ko.observable(properties.hint);
            this.properties.maxLength = ko.observable(properties.maxLength);
            this.properties.minLength = ko.observable(properties.minLength);
            this.properties.pattern = ko.observable(properties.pattern);
            this.properties.patternMessage = ko.observable(properties.patternMessage);
            this.properties.placeHolder = ko.observable(properties.placeHolder);
            this.properties.readonly = ko.observable(properties.readonly);
            this.properties.defaultValue = ko.observable(properties.defaultValue);

        }
    });
});

define('TextAreaControl',['require','InputTextControl','underscore','ControlTypeId','knockout'],function(require) {

    'use strict';

    //region dependencies

    var InputTextControl = require('InputTextControl'),
        _ = require('underscore'),
        ControlTypeId = require('ControlTypeId'),
        ko = require('knockout');

    //endregion

    return InputTextControl.subClass({

    }, {
        init: function(id, name, properties, context, parent) {
            this._super(id, name, properties, context, parent, context.getControlDefinitionByType(ControlTypeId.TEXT_AREA));

            _.defaults(properties, {
                rows: null
            });

            this.properties.rows = ko.observable(properties.rows);
        }
    });
});

define('OptionsType',['require','OjSelectItem','ojL10n!rendererMsg/nls/renderer'],function(require) {

    'use strict';

    //region dependencies

    var OjSelectItem = require('OjSelectItem'),
        msg = require('ojL10n!rendererMsg/nls/renderer');

    //endregion

    return {
        STATIC: OjSelectItem.create('STATIC', msg.STATIC_LABEL),
        REST: OjSelectItem.create('REST', msg.REST_LABEL),
        DYNAMIC: OjSelectItem.create('DYNAMIC', msg.DYNAMIC_LABEL),
        CONNECTOR: OjSelectItem.create('CONNECTOR', msg.CONNECTOR_LABEL),
        EVENT_CONNECTOR: OjSelectItem.create('EVENT_CONNECTOR', ''),
        LIST_CONNECTOR: OjSelectItem.create('LIST_CONNECTOR', '')
    };
});

define('OptionsFeed',['require','Class','knockout','OptionsType'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class'),
        ko = require('knockout'),
        OptionsType = require('OptionsType');
    //endregion

    return Class.subClass({}, {
        init: function(typeId, context, properties, controlId) {
            typeId = typeId ? typeId : OptionsType.STATIC.value;
            this.type = ko.observable(OptionsType[typeId]);
            this.optionsResolver = ko.observable(context.optionsResolverFactory.createResolver(typeId, context, properties, controlId));

            this.availableTypes = [OptionsType.STATIC, OptionsType.DYNAMIC, OptionsType.CONNECTOR];

            this.template = ko.pureComputed(function() {
                return this.type().value.toLowerCase() + 'OptionsTemplate';
            }, this);

            this.properties = this.optionsResolver().properties;
        },
        observables: function() {
            return {
                type: this.type,
                properties: this.properties
            };
        },
        toJS: function() {
            return {
                type: this.type().value,
                properties: this.optionsResolver().properties().toJS()
            };
        }
    });
});

define('LOVControl',['require','Control','underscore','OptionsFeed','OptionsType','EventsId','knockout'],function(require) {

    'use strict';

    //region dependencies

    var Control = require('Control'),
        _ = require('underscore'),
        OptionsFeed = require('OptionsFeed'),
        OptionsType = require('OptionsType'),
        EventsId = require('EventsId'),
        ko = require('knockout');

    //endregion

    return Control.subClass({}, {
        /* jshint maxparams: 6 */
        init: function(id, name, controlType, properties, context, parent) {
            this._super(id, name, controlType, properties, context, parent);

            _.defaults(properties, {
                multiple: false,
                optionsFeed: {}
            });

            this.properties.multiple = ko.observable(properties.multiple);

            this.properties.optionsFeed = ko.observable(new OptionsFeed(properties.optionsFeed.type, context, properties.optionsFeed.properties, this.id));

            this.properties.defaultValue = ko.pureComputed(function() {
                var optionsFeed = this.properties.optionsFeed();
                return optionsFeed.optionsResolver().getDefaultValue();
            }, this);

            this.properties.computedOptions = ko.pureComputed(function() {
                var optionsFeed = this.properties.optionsFeed();
                return optionsFeed.optionsResolver().getOptions();
            }, this);

            this.properties.autoFocus = ko.pureComputed({
                read: function() {
                    return this.properties.optionsFeed().optionsResolver().autoFocus();
                },
                write: function(value) {
                    this.properties.optionsFeed().optionsResolver().autoFocus(value);
                },
                owner: this
            });

            var self = this;
            this.properties.defaultValue.subscribe(function() {
                /* istanbul ignore else*/
                if (!!self.value) {
                    var val = self.getControlValue();
                    if (self._isNullEmptyOrUndefined(val)) {
                        val = self.properties.defaultValue();
                    }
                    self.setValue(val);
                    self.executeEvent(EventsId.ON_CHANGE.value);
                }
            });
        },
        refreshConnector: function() {
            if (this.properties.optionsFeed().type() === OptionsType.CONNECTOR) {
                this.properties.optionsFeed().optionsResolver().loadAndSetConnector(this.viewModel.form());
            }
        },
        getDataTemplate: function() {
            return 'selectValueTypeTemplate';
        },
        toJS: function() {
            var toJs = this._super();
            delete toJs.properties.defaultValue;
            delete toJs.properties.multiple;
            delete toJs.properties.computedOptions;
            delete toJs.properties.autoFocus;
            toJs.properties.optionsFeed = this.properties.optionsFeed().toJS();
            return toJs;
        }
    });
});

define('SelectControl',['require','LOVControl','jquery','underscore','TypeCatalog','ControlTypeId','knockout'],function(require) {

    'use strict';

    //region dependencies

    var LOVControl = require('LOVControl'),
        $ = require('jquery'),
        _ = require('underscore'),
        TypeCatalog = require('TypeCatalog'),
        ControlTypeId = require('ControlTypeId'),
        ko = require('knockout');

    //endregion

    return LOVControl.subClass({}, {
        init: function(id, name, properties, context, parent) {
            this._super(id, name, context.getControlDefinitionByType(ControlTypeId.SELECT), properties, context, parent);

            _.defaults(properties, {
                placeHolder: '',
                help: '',
                hint: ''
            });

            this.properties.help = ko.observable(properties.help);
            this.properties.hint = ko.observable(properties.hint);
            this.properties.placeHolder = ko.observable(properties.placeHolder);

            // Setting styling options after component creation has no effect. At that time, the root element already exists,
            // and can be accessed directly via the widget method. Hence, adding the styling by using manual subscription to the style and hide properties.
            this.properties.parsedStyle.subscribe(function(newVal) {
                this._setStyle(id, context, newVal);
            }, this);

            this.properties.autoFocus.subscribe(function(newVal) {
                this._setAutoFocus(id, context, newVal);
            }, this);

            this.properties.multiple.subscribe(this._checkType.bind(this, context));

            var self = this;

            this.afterRenderSelect = function() {
                // Apply style
                setTimeout(function() {
                    self._setStyle(id, context);
                    self._setAutoFocus(id, context);
                }, 0);

            };

            this._checkType(context, this.properties.multiple());
        },
        _checkType: function(context, newVal) {
            if (newVal) {
                this.dataType = TypeCatalog.getArrayTypeDefinition(TypeCatalog.getSimpleTypesDefinitions().STRING);
            } else {
                this.dataType = TypeCatalog.getSimpleTypesDefinitions().STRING;
            }
            // Need to reapply the style. The style should be set only after it has finished rendering the multiple select box, hence setTimeout.
            var that = this;
            setTimeout(function() {
                that._setStyle(that.id, context);
            }, 0);
        },
        _setStyle: function(id, context, value) {
            var widget = $(context.getScope() + ' #' + context.config().domIdPrefix + id).ojSelect('widget'),
                formattedStyle = this.properties.formattedStyle();
            widget.attr('style', value || this.properties.parsedStyle());
            widget.find('.oj-select-choice, .oj-select-choices').css('background-color', formattedStyle.backgroundColor || '');
            widget.find('.oj-select-choice, .oj-select-selected-choice-label').css('color', formattedStyle.color || '');
            var self = this;

            $('#' + id).ojSelect({
                'beforeExpand': function(event) {
                    var formattedStyle = self.properties.formattedStyle();
                    $(context.getScope() + ' #oj-listbox-results-' + id + ', .oj-listbox-drop').css('background-color', formattedStyle.backgroundColor || '');
                    $(context.getScope() + ' #oj-listbox-results-' + id + ', .oj-listbox-drop').css('color', formattedStyle.color || '');
                }
            });
        },
        _setAutoFocus: function(id, context, value) {
            var autofocus = value || this.properties.optionsFeed().properties().autoFocus(),
                widget = $(context.getScope() + ' #' + context.config().domIdPrefix + id).ojSelect('widget');
            if (autofocus) {
                widget.attr('autofocus', 'autofocus');
            } else {
                widget.removeAttr('autofocus');
            }
            // If it is the first element with autofocus set, we need to focus on the oj-select div manually.
            if ($(context.getScope() + ' [autofocus]').first().is('.oj-select')) {
                context.focusControl(widget.find('.oj-select-choice'));
            }
        },
        toJS: function() {
            var toJs = this._super();
            toJs.properties.multiple = this.properties.multiple();
            return toJs;
        }
    });
});

define('ChecklistControl',['require','LOVControl','underscore','ControlTypeId','knockout'],function(require) {

    'use strict';

    //region dependencies

    var LOVControl = require('LOVControl'),
        _ = require('underscore'),
        ControlTypeId = require('ControlTypeId'),
        ko = require('knockout');

    //endregion

    return LOVControl.subClass({}, {
        init: function(id, name, properties, context, parent) {
            _.defaults(properties, {
                help: '',
                inline: false,
                multiple: true
            });

            this._super(id, name, context.getControlDefinitionByType(ControlTypeId.CHECKLIST), properties, context, parent);

            this.properties.help = ko.observable(properties.help);
            this.properties.inline = ko.observable(properties.inline);
        }
    });
});

define('CheckboxControl',['require','Control','underscore','ControlTypeId','koToJSUtil','knockout'],function(require) {

    'use strict';

    //region dependencies

    var Control = require('Control'),
        _ = require('underscore'),
        ControlTypeId = require('ControlTypeId'),
        koToJSUtil = require('koToJSUtil'),
        ko = require('knockout');

    //endregion

    return Control.subClass({}, {
        init: function(id, name, properties, context, parent) {
            _.defaults(properties, {
                help: '',
                hint: '',
                defaultValue: false
            });
            var self = this;
            self._super(id, name, context.getControlDefinitionByType(ControlTypeId.CHECKBOX), properties, context, parent);

            self.properties.help = ko.observable(properties.help);
            self.properties.hint = ko.observable(properties.hint);
            self.properties.defaultValue = ko.observableArray(self.getInitialValue(properties.defaultValue));
            self.properties.defaultValue.subscribe(function(value) {
                self.defaultValue(value[0] === 'true');
            });

            self.defaultValue = ko.observable(properties.defaultValue);
            self.checkboxValue = ko.observableArray(self.getInitialValue(properties.defaultValue));
            self.checkboxValue.subscribe(function(value) {
                self.setValue(value);
            });
        },
        getInitialValue: function(defaultValue) {
            return defaultValue ? ['true'] : ['false'];
        },
        getDataTemplate: function() {
            return 'booleanValueTypeTemplate';
        },
        _propertiesToJS: function() {
            var properties = koToJSUtil.toJS(this.properties);
            properties.defaultValue = this.defaultValue();
            return properties;
        }
    });
});

define('RadioButtonControl',['require','LOVControl','ControlTypeId','underscore','knockout'],function(require) {

    'use strict';

    //region dependencies

    var LOVControl = require('LOVControl'),
        ControlTypeId = require('ControlTypeId'),
        _ = require('underscore'),
        ko = require('knockout');

    //endregion

    return LOVControl.subClass({}, {
        init: function(id, name, properties, context, parent) {
            this._super(id, name, context.getControlDefinitionByType(ControlTypeId.RADIO_BUTTON), properties, context, parent);

            _.defaults(properties, {
                help: '',
                inline: false
            });

            this.properties.help = ko.observable(properties.help);
            this.properties.inline = ko.observable(properties.inline);

            var defaultValue = this.properties.defaultValue;

            this.properties.defaultValue = ko.pureComputed({
                read: function() {
                    return defaultValue()[0];
                },
                owner: this
            });
        }
    });
});

define('NumberControl',['require','InputTextControl','ControlTypeId','jquery','underscore','knockout'],function(require) {

    'use strict';

    //region dependencies

    var InputTextControl = require('InputTextControl'),
        ControlTypeId = require('ControlTypeId'),
        $ = require('jquery'),
        _ = require('underscore'),
        ko = require('knockout');

    //endregion

    return InputTextControl.subClass({}, {
        init: function(id, name, properties, context, parent) {
            var self = this;
            self._super(id, name, properties, context, parent, context.getControlDefinitionByType(ControlTypeId.NUMBER));

            _.defaults(properties, {
                step: 1,
                maxValue: null,
                minValue: null
            });

            self.properties.step = ko.observable(properties.step);
            self.properties.maxValue = ko.observable(properties.maxValue);
            self.properties.minValue = ko.observable(properties.minValue);

            // Setting styling options after component creation has no effect. At that time, the root element already exists,
            // and can be accessed directly via the widget method. Hence, adding the styling by using manual subscription to the style and hide properties.
            self.properties.parsedStyle.subscribe(function(newVal) {
                self._applyStyle(newVal);
            }, self);

            self.afterRenderNumber = function() {
                self._applyStyle();
            };

            self.domId = context.getScope() + ' #' + context.config().domIdPrefix + id;
        },
        _applyStyle: function(value) {
            var widget = $(this.domId).ojInputNumber('widget'),
                parsedStyle = value || this.properties.parsedStyle();

            widget.attr('style', parsedStyle);
        }
    });
});

define('DateControl',['require','Control','underscore','ControlTypeId','jquery','knockout','ojs/ojcore'],function(require) {

    'use strict';

    //region dependencies

    var Control = require('Control'),
        _ = require('underscore'),
        ControlTypeId = require('ControlTypeId'),
        $ = require('jquery'),
        ko = require('knockout'),
        oj = require('ojs/ojcore');

    //endregion

    return Control.subClass({}, {
        init: function(id, name, properties, context, parent) {
            var self = this;
            self._super(id, name, context.getControlDefinitionByType(ControlTypeId.DATE), properties, context, parent);

            _.defaults(properties, {
                help: '',
                hint: '',
                readonly: false,
                placeHolder: '',
                defaultValue: '',
                minValue: null,
                maxValue: null,
                format: ['yy-MM-dd']
            });

            self.properties.help = ko.observable(properties.help);
            self.properties.hint = ko.observable(properties.hint);
            self.properties.placeHolder = ko.observable(properties.placeHolder);
            self.properties.minValue = ko.observable(properties.minValue);
            self.properties.maxValue = ko.observable(properties.maxValue);
            self.properties.readonly = ko.observable(properties.readonly);
            self.properties.defaultValue = ko.observable(properties.defaultValue);
            self.properties.format = ko.observableArray(properties.format);

            //TODO should self be part of the properties? Is Something that the user changes?
            self.properties.dateConverter = ko.observable(oj.Validation.converterFactory(oj.ConverterFactory.CONVERTER_TYPE_DATETIME).createConverter({
                pattern: self.properties.format()[0]
            }));

            //Note that ojCombobox's value is always encapsulated in an array
            self.properties.format.subscribe(function(newValue) {
                self.properties.dateConverter(oj.Validation.converterFactory(oj.ConverterFactory.CONVERTER_TYPE_DATETIME).createConverter({
                    pattern: newValue[0]
                }));
            }, self);

            // Setting styling options after component creation has no effect. At that time, the root element already exists,
            // and can be accessed directly via the widget method. Hence, adding the styling by using manual subscription to the style and hide properties.
            self.properties.parsedStyle.subscribe(function(newVal) {
                self._applyStyle(id, newVal);
            }, self);

            self.afterRenderDate = function() {
                self._applyStyle(id);
            };
            self.domId = context.getScope() + ' #' + context.config().domIdPrefix + id;
        },
        _applyStyle: function(id, value) {
            var widget = $('#' + id).ojInputDate('widget'),
                formattedStyle = this.properties.formattedStyle(),
                parsedStyle = value || this.properties.parsedStyle(),
                triggerInputElement = widget.find('.oj-inputdatetime-input-trigger');

            widget.attr('style', parsedStyle);

            if (formattedStyle.borderWidth) {
                triggerInputElement.css('border-width', formattedStyle.borderWidth);
            }
            if (formattedStyle.borderStyle) {
                triggerInputElement.css('border-style', formattedStyle.borderStyle);
            }
            if (formattedStyle.borderColor) {
                triggerInputElement.css('border-color', formattedStyle.borderColor);
            }
            if (formattedStyle.borderRadius) {
                triggerInputElement.css('border-top-right-radius', formattedStyle.borderRadius);
                triggerInputElement.css('border-bottom-right-radius', formattedStyle.borderRadius);
            }
        },
        _propertiesToJS: function() {
            var properties = this._super();
            delete properties.dateConverter;
            return properties;
        }
    });
});

define('TimeControl',['require','Control','jquery','underscore','ControlTypeId','knockout','ojs/ojcore'],function(require) {

    'use strict';

    //region dependencies

    var Control = require('Control'),
        $ = require('jquery'),
        _ = require('underscore'),
        ControlTypeId = require('ControlTypeId'),
        ko = require('knockout'),
        oj = require('ojs/ojcore');

    //endregion

    return Control.subClass({}, {
        init: function(id, name, properties, context, parent) {
            var self = this;
            self._super(id, name, context.getControlDefinitionByType(ControlTypeId.TIME), properties, context, parent);

            _.defaults(properties, {
                help: '',
                hint: '',
                readonly: false,
                placeHolder: '',
                defaultValue: '',
                minValue: null,
                maxValue: null,
                step: ['00:30:00:00']
            });

            self.properties.help = ko.observable(properties.help);
            self.properties.hint = ko.observable(properties.hint);
            self.properties.placeHolder = ko.observable(properties.placeHolder);
            self.properties.minValue = ko.observable(properties.minValue);
            self.properties.maxValue = ko.observable(properties.maxValue);
            self.properties.readonly = ko.observable(properties.readonly);
            self.properties.defaultValue = ko.observable(properties.defaultValue);
            self.properties.step = ko.observable(properties.step);

            self.properties.dateConverter = ko.observable(oj.Validation.converterFactory(oj.ConverterFactory.CONVERTER_TYPE_DATETIME).createConverter());

            // Setting styling options after component creation has no effect. At that time, the root element already exists,
            // and can be accessed directly via the widget method. Hence, adding the styling by using manual subscription to the style and hide properties.
            self.properties.parsedStyle.subscribe(function(newVal) {
                self._applyStyle(id, newVal);
            }, self);

            self.afterRenderTime = function() {
                self._applyStyle(id);
            };

            this.domId = context.getScope() + ' #' + context.config().domIdPrefix + id;
        },
        _applyStyle: function(id, value) {
            var widget = $(this.domId).ojInputTime('widget'),
                formattedStyle = this.properties.formattedStyle(),
                parsedStyle = value || this.properties.parsedStyle(),
                triggerInputElement = widget.find('.oj-inputdatetime-input-trigger');

            widget.attr('style', parsedStyle);

            if (formattedStyle.borderWidth) {
                triggerInputElement.css('border-width', formattedStyle.borderWidth);
            }
            if (formattedStyle.borderStyle) {
                triggerInputElement.css('border-style', formattedStyle.borderStyle);
            }
            if (formattedStyle.borderColor) {
                triggerInputElement.css('border-color', formattedStyle.borderColor);
            }
            if (formattedStyle.borderRadius) {
                triggerInputElement.css('border-top-right-radius', formattedStyle.borderRadius);
                triggerInputElement.css('border-bottom-right-radius', formattedStyle.borderRadius);
            }
        },
        _propertiesToJS: function() {
            var properties = this._super();
            delete properties.dateConverter;
            return properties;
        }
    });
});

define('TargetType',['require','ojL10n!rendererMsg/nls/renderer'],function(require) {

    'use strict';

    //region dependencies

    var msg = require('ojL10n!rendererMsg/nls/renderer');

    //endregion

    var TargetType = {
        PARENT: {
            value: '_parent',
            label: msg.TARGET_TYPE_PARENT
        },
        NEWTAB: {
            value: '_blank',
            label: msg.TARGET_TYPE_NEWTAB
        },
        values: function() {
            return [TargetType.NEWTAB, TargetType.PARENT];
        }
    };
    return TargetType;
});

define('LinkControl',['require','Control','underscore','knockout','EventsId','ControlTypeId','TargetType'],function(require) {

    'use strict';

    /* globals Promise */
    //region dependencies

    var Control = require('Control'),
        _ = require('underscore'),
        ko = require('knockout'),
        EventsId = require('EventsId'),
        ControlTypeId = require('ControlTypeId'),
        TargetType = require('TargetType');

    //endregion

    return Control.subClass({}, {
        init: function(id, name, properties, context, parent) {
            this._super(id, name, context.getControlDefinitionByType(ControlTypeId.LINK), properties, context, parent);

            _.defaults(properties, {
                target: [TargetType.NEWTAB.value],
                isLabelBindable: 'false',
                defaultLabel: name,
                labelVal: '',
                labelBinding: '',
                defaultValue: '',

                anchor: false,
                //                options: [],
                defaultOption: []
            });

            this.properties.target = ko.observable(properties.target);
            this.properties.defaultValue = ko.observable(properties.defaultValue);
            this.properties.labelVal = ko.observable(properties.labelVal);
            this.properties.defaultLabel = ko.observable(properties.defaultLabel);

            this.properties.isLabelBindable = ko.observable(properties.isLabelBindable);
            this.properties.labelBinding = ko.observable(properties.labelBinding);

            this.properties.anchor = ko.observable(properties.anchor);
            //            this.properties.options = ko.observable(properties.options);
            this.properties.defaultOption = ko.observableArray(properties.defaultOption);

            this.computedOptions = ko.pureComputed(function() {
                var self = this;
                var anchor = this.properties.anchor();
                var optionControls = [];
                /* istanbul ignore else */
                if (anchor) {
                    var form = this.context.viewModel.form();
                    /* istanbul ignore else */
                    if (form) {
                        var controls = form.getAllControls(true);
                        _.each(controls, function(control) {
                            var unSupportedControlType = [ControlTypeId.TABLE, ControlTypeId.REPEATABLE_SECTION, ControlTypeId.SECTION, ControlTypeId.TAB_CONTAINER, ControlTypeId.TAB, ControlTypeId.PANEL];
                            var unSupportedControlParentType = [ControlTypeId.TABLE, ControlTypeId.REPEATABLE_SECTION, ControlTypeId.TAB_CONTAINER];
                            /* istanbul ignore else*/
                            if (!_.contains(unSupportedControlType, control.type) && !_.contains(unSupportedControlParentType, control._parent.type) && (control.id !== self.id)) {
                                optionControls.push({
                                    label: control.name(),
                                    value: control.id
                                });
                            }

                        });
                    }

                }
                return optionControls;

            }.bind(this));

        },
        setLabelVal: function(value) {
            this.properties.labelVal(value);
        },
        resolvePreviewId: function(controlId) {
            var control = this.context.viewModel.form().findControlAndParent(controlId);
            var previewId = ''; // if user did not select anything i.e. control == null
            if (control) {
                switch (control.node.type) {
                    case ControlTypeId.SELECT:
                        previewId = '#oj-select-choice-' + control.node.domIdPrefix + control.node.id;
                        break;
                        //It can point to first element in checklist n  radio button using this code
                        //To do : discuss should we need to do this or pointing to their div is fine. If yes, Please uncomment the already written test cases
                        //                    case ControlTypeId.CHECKBOX:
                        //                        previewId = '#' + control.node.id + '_checked';
                        //                        break;
                        //                    case ControlTypeId.CHECKLIST:
                        //                        previewId = '#' + control.node.id + '_choice0';
                        //                        break;
                        //                    case ControlTypeId.RADIO_BUTTON:
                        //                        previewId = '#' + control.node.id + '0';
                        //                        break;
                    default:
                        previewId = '#' + control.node.domIdPrefix + control.node.id;
                }
            }
            return previewId;
        },
        executeEvent: function(trigger) {
            if ((trigger === EventsId.ON_CLICK.value) && this.readOnly()) {
                return Promise.all([]);
            }

            return this._super(trigger);
        },
        targetTypes: TargetType.values()
    });
});

define('DateTimeControl',['require','Control','underscore','ControlTypeId','jquery','knockout','ojs/ojcore'],function(require) {

    'use strict';

    //region dependencies

    var Control = require('Control'),
        _ = require('underscore'),
        ControlTypeId = require('ControlTypeId'),
        $ = require('jquery'),
        ko = require('knockout'),
        oj = require('ojs/ojcore');

    //endregion

    return Control.subClass({}, {
        init: function(id, name, properties, context, parent) {
            var self = this;
            self._super(id, name, context.getControlDefinitionByType(ControlTypeId.DATE_TIME), properties, context, parent);

            _.defaults(properties, {
                help: '',
                hint: '',
                readonly: false,
                placeHolder: '',
                defaultValue: '',
                minValue: null,
                maxValue: null,
                format: ['yy-MM-dd hh:mm:ss a'],
                step: ['00:30:00:00']
            });

            self.properties.help = ko.observable(properties.help);
            self.properties.hint = ko.observable(properties.hint);
            self.properties.placeHolder = ko.observable(properties.placeHolder);
            self.properties.minValue = ko.observable(properties.minValue);
            self.properties.maxValue = ko.observable(properties.maxValue);
            self.properties.readonly = ko.observable(properties.readonly);
            self.properties.defaultValue = ko.observable(properties.defaultValue);
            self.properties.format = ko.observableArray(properties.format);
            self.properties.step = ko.observable(properties.step);

            self.properties.dateConverter = ko.observable(oj.Validation.converterFactory(oj.ConverterFactory.CONVERTER_TYPE_DATETIME).createConverter({
                pattern: self.properties.format()[0]
            }));

            //Note that ojCombobox's value is always encapsulated in an array
            self.properties.format.subscribe(function(newValue) {
                self.properties.dateConverter(oj.Validation.converterFactory(oj.ConverterFactory.CONVERTER_TYPE_DATETIME).createConverter({
                    pattern: newValue[0]
                }));
            }, self);

            // Setting styling options after component creation has no effect. At that time, the root element already exists,
            // and can be accessed directly via the widget method. Hence, adding the styling by using manual subscription to the style and hide properties.
            self.properties.parsedStyle.subscribe(function(newVal) {
                self._applyStyle(id, newVal);
            }, self);

            self.afterRenderTime = function() {
                self._applyStyle(id);
            };

            this.domId = context.getScope() + ' #' + context.config().domIdPrefix + id;
        },
        _applyStyle: function(id, value) {
            var widget = $(this.domId).ojInputDateTime('widget'),
                formattedStyle = this.properties.formattedStyle(),
                parsedStyle = value || this.properties.parsedStyle(),
                triggerInputElement = widget.find('.oj-inputdatetime-input-trigger');

            widget.attr('style', parsedStyle);

            if (formattedStyle.borderWidth) {
                triggerInputElement.css('border-width', formattedStyle.borderWidth);
            }
            if (formattedStyle.borderStyle) {
                triggerInputElement.css('border-style', formattedStyle.borderStyle);
            }
            if (formattedStyle.borderColor) {
                triggerInputElement.css('border-color', formattedStyle.borderColor);
            }
            if (formattedStyle.borderRadius) {
                triggerInputElement.css('border-top-right-radius', formattedStyle.borderRadius);
                triggerInputElement.css('border-bottom-right-radius', formattedStyle.borderRadius);
            }
        },
        _propertiesToJS: function() {
            var properties = this._super();
            delete properties.dateConverter;
            return properties;
        }
    });
});

define('EmailControl',['require','InputTextControl','ojL10n!rendererMsg/nls/renderer','ControlTypeId'],function(require) {

    'use strict';

    //region dependencies

    var InputTextControl = require('InputTextControl'),
        msg = require('ojL10n!rendererMsg/nls/renderer'),
        ControlTypeId = require('ControlTypeId');

    //endregion

    return InputTextControl.subClass({

    }, {
        init: function(id, name, properties, context, parent) {
            this._super(id, name, properties, context, parent, context.getControlDefinitionByType(ControlTypeId.EMAIL));

            var emailPattern = '^[_A-Za-z0-9-\\+]+(\\.[_A-Za-z0-9-]+)*@' +
                '[A-Za-z0-9-]+(\\.[A-Za-z0-9]+)*(\\.[A-Za-z]{2,})$';

            this.properties.pattern(emailPattern);
            this.properties.patternMessage(msg.MESSAGE_INVALID_EMAIL);
        }
    });
});

define('UrlControl',['require','InputTextControl','ojL10n!rendererMsg/nls/renderer','ValidationHelper','ControlTypeId'],function(require) {

    'use strict';

    //region dependencies

    var InputTextControl = require('InputTextControl'),
        msg = require('ojL10n!rendererMsg/nls/renderer'),
        ValidationHelper = require('ValidationHelper'),
        ControlTypeId = require('ControlTypeId');

    //endregion

    return InputTextControl.subClass({

    }, {
        init: function(id, name, properties, context, parent) {
            this._super(id, name, properties, context, parent, context.getControlDefinitionByType(ControlTypeId.URL));

            this.properties.pattern(ValidationHelper.urlPattern);
            this.properties.patternMessage(msg.MESSAGE_INVALID_URL);
        }
    });
});

define('HeadingType',['require','ojL10n!rendererMsg/nls/renderer'],function(require) {

    'use strict';

    //region dependencies

    var msg = require('ojL10n!rendererMsg/nls/renderer');

    //endregion

    var HeadingType = {
        PARAGRAPH: {
            value: 'MessageTypeParagraph',
            label: msg.MESSAGE_TYPE_PARAGRAPH
        },
        H1: {
            value: 'MessageTypeHeading1',
            label: msg.MESSAGE_TYPE_HEADING1
        },
        H2: {
            value: 'MessageTypeHeading2',
            label: msg.MESSAGE_TYPE_HEADING2
        },
        H3: {
            value: 'MessageTypeHeading3',
            label: msg.MESSAGE_TYPE_HEADING3
        },
        H4: {
            value: 'MessageTypeHeading4',
            label: msg.MESSAGE_TYPE_HEADING4
        },
        H5: {
            value: 'MessageTypeHeading5',
            label: msg.MESSAGE_TYPE_HEADING5
        },
        H6: {
            value: 'MessageTypeHeading6',
            label: msg.MESSAGE_TYPE_HEADING6
        },
        values: function() {
            return [HeadingType.PARAGRAPH, HeadingType.H1, HeadingType.H2, HeadingType.H3, HeadingType.H4, HeadingType.H5, HeadingType.H6];
        }
    };
    return HeadingType;
});

define('MessageControl',['require','Control','ControlTypeId','HeadingType','knockout','underscore'],function(require) {

    'use strict';

    //region dependencies

    var Control = require('Control'),
        ControlTypeId = require('ControlTypeId'),
        HeadingType = require('HeadingType'),
        ko = require('knockout'),
        _ = require('underscore');

    //endregion

    return Control.subClass({

    }, {
        init: function(id, name, properties, context, parent) {
            this._super(id, name, context.getControlDefinitionByType(ControlTypeId.MESSAGE), properties, context, parent);

            _.defaults(properties, {
                type: [HeadingType.PARAGRAPH.value],
                defaultValue: name
            });

            this.properties.type = ko.observable(properties.type);
            this.properties.defaultValue = ko.observable(properties.defaultValue);
        },
        headingTypes: HeadingType.values()
    });
});


define('MoneyControl',['require','InputTextControl','underscore','jquery','knockout','ojL10n!rendererMsg/nls/renderer','ControlTypeId','ojL10n!ojtranslations/nls/localeElements'],function(require) {

    'use strict';
    /* globals oj */

    //region dependencies

    var InputTextControl = require('InputTextControl'),
        _ = require('underscore'),
        $ = require('jquery'),
        ko = require('knockout'),
        msg = require('ojL10n!rendererMsg/nls/renderer'),
        ControlTypeId = require('ControlTypeId'),
        ojLocaleElements = require('ojL10n!ojtranslations/nls/localeElements');

    //endregion
    var currencies = ojLocaleElements.main[oj.Config.getLocale()].numbers.currencies;
    _.each(currencies, function(currency, key) {
        currency.key = key;
    });
    currencies = _.toArray(currencies);

    return InputTextControl.subClass({}, {
        currencyOptions: currencies,
        init: function(id, name, properties, context, parent) {
            var self = this;
            self._super(id, name, properties, context, parent, context.getControlDefinitionByType(ControlTypeId.MONEY));

            _.defaults(properties, {
                currency: [msg.DEFAULT_CURRENCY],
                step: 1,
                defaultValue: null,
                maxValue: null,
                minValue: null
            });

            self.properties.currency = ko.observable(properties.currency);
            self.properties.step = ko.observable(properties.step);
            self.properties.defaultValue = ko.observable(properties.defaultValue);
            self.properties.maxValue = ko.observable(properties.maxValue);
            self.properties.minValue = ko.observable(properties.minValue);

            // Setting styling options after component creation has no effect. At that time, the root element already exists,
            // and can be accessed directly via the widget method. Hence, adding the styling by using manual subscription to the style and hide properties.
            self.properties.parsedStyle.subscribe(function(newVal) {
                self._applyStyle(id, newVal);
            }, self);

            self.afterRenderMoney = function() {
                self._applyStyle(id);
            };

            self.domId = context.getScope() + ' #' + context.config().domIdPrefix + id;

            self.properties.converterOptions = ko.pureComputed(function() {
                return {
                    type: 'number',
                    options: {
                        style: 'currency',
                        currency: self.properties.currency()[0],
                        currencyDisplay: 'symbol',
                        pattern: msg.CURRENCY_PATTERN
                    }
                };
            });
        },
        _applyStyle: function(id, value) {
            var widget = $('#' + id).ojInputNumber('widget'),
                parsedStyle = value || this.properties.parsedStyle();

            widget.attr('style', parsedStyle);
        },
        _propertiesToJS: function() {
            var properties = this._super();
            delete properties.converterOptions;
            return properties;
        }
    });
});

define('PhoneControl',['require','InputTextControl','underscore','knockout','ojL10n!rendererMsg/nls/renderer','ControlTypeId'],function(require) {

    'use strict';

    //region dependencies

    var InputTextControl = require('InputTextControl'),
        _ = require('underscore'),
        ko = require('knockout'),
        msg = require('ojL10n!rendererMsg/nls/renderer'),
        ControlTypeId = require('ControlTypeId');

    //endregion

    return InputTextControl.subClass({

    }, {
        init: function(id, name, properties, context, parent) {
            this._super(id, name, properties, context, parent, context.getControlDefinitionByType(ControlTypeId.PHONE));

            _.defaults(properties, {
                format: [msg.DEFAULT_PHONE_FORMAT],
                defaultValue: ''
            });

            this.properties.format = ko.observable(properties.format);
            this.properties.defaultValue = ko.observable(properties.defaultValue);

            this._updateProperties(this.properties.format);

            this.properties.format.subscribe(function(newValue) {
                this._updateProperties(newValue);
            }, this);

        },
        _updateProperties: function(format) {
            var US_REGEX_PATTERN = '^((((([0-9]{3})-)|((([0-9]{3}))\s))([0-9]{3})-([0-9]{4}))|(([0-9]{3})-([0-9]{4})))$',
                INTERNATIONAL_REGEX_PATTERN = '^((\\+)?[1-9]{1,2})?([-\\s\.])?((\\(\\d{1,4}\\))|\\d{1,4})(([-\\s\.])?[0-9]{1,12}){1,2}$';

            switch (ko.utils.unwrapObservable(format)[0]) {
                case msg.PHONE_FORMAT_INTERNATIONAL:
                    this.properties.pattern(INTERNATIONAL_REGEX_PATTERN);
                    this.properties.patternMessage(msg.FORMAT_ERROR_MESSAGE_INTERNATIONAL);
                    this.properties.placeHolder('');
                    break;
                case msg.PHONE_FORMAT_US:
                    this.properties.pattern(US_REGEX_PATTERN);
                    this.properties.patternMessage(msg.FORMAT_ERROR_MESSAGE_US);
                    this.properties.placeHolder('xxx-xxx-xxxx');
                    break;
                default:
                    this.properties.pattern(US_REGEX_PATTERN);
                    this.properties.patternMessage(msg.FORMAT_ERROR_MESSAGE_US);
                    this.properties.placeHolder('xxx-xxx-xxxx');
                    break;
            }
        }
    });
});

define('ImageControl',['require','Control','underscore','knockout','ojL10n!rendererMsg/nls/renderer','ControlTypeId'],function(require) {

    'use strict';

    //region dependencies

    var Control = require('Control'),
        _ = require('underscore'),
        ko = require('knockout'),
        msg = require('ojL10n!rendererMsg/nls/renderer'),
        ControlTypeId = require('ControlTypeId');

    //endregion

    return Control.subClass({

    }, {
        init: function(id, name, properties, context, parent) {
            this._super(id, name, context.getControlDefinitionByType(ControlTypeId.IMAGE), properties, context, parent);

            _.defaults(properties, {
                defaultValue: '',
                alt: msg.TEXT_NO_IMAGE
            });

            this.properties.defaultValue = ko.observable(properties.defaultValue);
            this.properties.alt = ko.observable(properties.alt);
        }
    });
});

define('VideoControl',['require','Control','underscore','knockout','ControlTypeId'],function(require) {

    'use strict';

    //region dependencies

    var Control = require('Control'),
        _ = require('underscore'),
        ko = require('knockout'),
        ControlTypeId = require('ControlTypeId');

    //endregion


    return Control.subClass({

    }, {
        init: function(id, name, properties, context, parent) {
            this._super(id, name, context.getControlDefinitionByType(ControlTypeId.VIDEO), properties, context, parent);

            _.defaults(properties, {
                showControls: true,
                loop: false,
                autoPlay: false,
                defaultValue: '',
                allowFullScreen: true
            });

            this.properties.showControls = ko.observable(properties.showControls);
            this.properties.loop = ko.observable(properties.loop);
            this.properties.autoPlay = ko.observable(properties.autoPlay);
            this.properties.defaultValue = ko.observable(properties.defaultValue);
            this.properties.allowFullScreen = ko.observable(properties.allowFullScreen);
        }
    });
});

define('ScopeType',['require','ojL10n!rendererMsg/nls/renderer'],function(require) {
    'use strict';

    //region dependencies

    var msg = require('ojL10n!rendererMsg/nls/renderer');

    //endregion

    var ScopeType = {
        ALL: {
            label: msg.SCOPE_ALL,
            value: 'all'
        },
        USER: {
            label: msg.SCOPE_USER,
            value: 'user',
        },
        GROUP: {
            label: msg.SCOPE_GROUP,
            value: 'group'
        },
        ROLE: {
            label: msg.SCOPE_ROLE,
            value: 'role'
        },
        values: function() {
            return [ScopeType.ALL, ScopeType.USER, ScopeType.GROUP, ScopeType.ROLE];
        }
    };

    return ScopeType;
});

define('IdentityControl',['require','LOVControl','jquery','underscore','ControlTypeId','TypeDescription','ScopeType','OptionsType','knockout'],function(require) {

    'use strict';

    //region dependencies

    var LOVControl = require('LOVControl'),
        $ = require('jquery'),
        _ = require('underscore'),
        ControlTypeId = require('ControlTypeId'),
        TypeDescription = require('TypeDescription'),
        ScopeType = require('ScopeType'),
        OptionsType = require('OptionsType'),
        ko = require('knockout');

    //endregion

    return LOVControl.subClass({}, {
        init: function(id, name, properties, context, parent) {

            //setting default values. Will add new if not exists
            _.defaults(properties, {
                optionsFeed: {
                    type: OptionsType.REST.value
                }, //needed to set default type REST for first time
                help: '',
                hint: '',
                allowSelectAll: true, //allow user to select multiple option. applicable only when multiple is true
                defaultScope: [ScopeType.USER.value], //default scope to search into
                showScopeFilter: false //hide the scope filter
            });

            this._super(id, name, context.getControlDefinitionByType(ControlTypeId.IDENTITY_BROWSER), properties, context, parent);

            var self = this;
            var optionsResolver = this.properties.optionsFeed().optionsResolver();

            //add required observable properties
            $.extend(true, this.properties, {
                help: ko.observable(properties.help),
                hint: ko.observable(properties.hint),
                placeholder: ko.observable(properties.placeholder),
                multiple: ko.observable(properties.multiple),
                allowSelectAll: ko.observable(properties.allowSelectAll),
                defaultScope: ko.observableArray(properties.defaultScope),
                options: optionsResolver.callRest.bind(optionsResolver, { //check DefaultRestHandler.js
                    name: 'identities',
                    optionsListBinding: 'items'
                }),
                showScopeFilter: ko.observable(properties.showScopeFilter)
            });

            // Setting styling options after component creation has no effect. At that time, the root element already exists,
            // and can be accessed directly via the widget method. Hence, adding the styling by using manual subscription to the style and hide properties.
            this.properties.parsedStyle.subscribe(function(newVal) {
                this._setStyle(id, context, newVal);
            }, this);

            //subscribe change for autoFocus
            this.properties.autoFocus.subscribe(function(newVal) {
                this._setAutoFocus(id, context, newVal);
            }, this);

            //subscribe change for multiple
            this.properties.multiple.subscribe(this._componentType.bind(this, context));

            //subscribe change for showScopeFilter
            this.properties.showScopeFilter.subscribe(function(newVal) {
                //set showScopeFilter and refresh the component
                self.setOptions({
                    showScopeFilter: newVal
                });
            });

            //subscribe change for default scope
            //defaultScope is used by component to set the defaultScope while searching the identities
            this.properties.defaultScope.subscribe(function(newVal) {
                //set defaultScope and refresh the component
                self.setOptions({
                    defaultScope: newVal
                });
            });

            //call this when knockout finishes the rendering and check for autoFocus and style
            this.afterRenderIdentity = function() {
                // Apply style
                setTimeout(function() {
                    self._setStyle(id, context);
                    self._setAutoFocus(id, context);
                }, 0);

            };

            //store the component reference id
            this._identityId = context.getScope() + ' #' + context.config().domIdPrefix + id;

            //init the component selection type single or multiple
            this._componentType(context, this.properties.multiple());

            //supported data element
            var IdentityType = ['id', 'title', 'firstName', 'lastName', 'type', 'email', 'mobile'];

            //overriding to check compatible dataType for identity component
            this.dataType.isCompatible = function(data) {
                var compatible = data.isArray() && data.hasOwnProperty('attributes');

                /* istanbul ignore else */
                if (compatible) {
                    var attrLen = data.attributes().length;
                    //check for id attribute
                    for (var i = 0; i < attrLen; i++) {
                        /* istanbul ignore else */
                        if (data.attributes()[i] && data.attributes()[i].hasOwnProperty('name') && IdentityType.indexOf(data.attributes()[i].name()) === -1) {
                            compatible = false;
                            break;
                        }
                    }
                }

                return compatible && !TypeDescription.equals(data.getTypeDescription(), TypeDescription.UNKNOWN);
            };

            //used in ojComponent. see identityControl.tmpl.html & rendererIdentityControl.tmpl.html
            this.ojIdentityObj = {
                component: 'ojIdentity',
                disabled: (this.readOnly() ? this.readOnly : this.properties.disabled),
                title: this.properties.hint,
                help: {
                    definition: this.properties.help()
                },
                placeholder: this.properties.placeholder,
                required: this.properties.required,
                //value is set in the IdentityValueDecorator
                value: null,
                options: this.properties.options,
                multiple: this.properties.multiple,
                selectAll: this.properties.allowSelectAll,
                defaultScope: this.properties.defaultScope()[0],
                showScopeFilter: this.properties.showScopeFilter,
                scopesOptions: ScopeType.values(),
                selectLabel: this.msg.IDENTITY_SELECT_ALL,
                noMatchesFound: this.msg.IDENTITY_NO_MATCHES_FOUND,
                invalidComponentTracker: this.tracker,
                validators: this.validators
            };
        },
        //return the template for value accessor in event dialog for action's constant value
        getDataTemplate: function() {
            return 'identityValueTypeTemplate';
        },
        //populate scope. see usage identityPropertyInspector.tmpl.html
        scopeValues: ScopeType.values(),
        //set the options for ojIdentity component
        setOptions: function(option) {
            //set the provided option
            $(this._identityId)['ojIdentity']('option', option);

            //refresh the component
            this._refresh();
        },
        //refresh the component
        _refresh: function() {
            setTimeout(function() {
                $(this._identityId)['ojIdentity']('refresh');
            }.bind(this), 0);
        },
        //set component type selection- single or multiple
        _componentType: function(context, newVal) {
            //set multiple option
            this.setOptions({
                multiple: newVal
            });

            // Need to reapply the style. The style should be set only after it has finished rendering the multiple select box, hence setTimeout.
            var that = this;
            setTimeout(function() {
                that._setStyle(that.id, context);
            }, 0);
        },
        //get identities using events. see ControlPropertiesMap.js -> PropertiesMap.js -> ControlIdentityValueProperty.js
        getIdentityValue: function() {
            var value = this.getControlValue();
            var strValue = [];

            for (var i = 0; i < value.length; i++) {
                strValue.push(value[i].id);
            }

            return strValue.join();
        },
        //set style
        _setStyle: function(id, context, value) {
            var widget = $(this._identityId)['ojIdentity']('widget'),
                formattedStyle = this.properties.formattedStyle();
            widget.attr('style', value || this.properties.parsedStyle());
            widget.find('.oj-select-choice, .oj-select-choices').css('background-color', formattedStyle.backgroundColor || '');
            widget.find('.oj-select-choice, .oj-select-selected-choice-label').css('color', formattedStyle.color || '');
        },
        //set autoFocus
        _setAutoFocus: function(id, context, value) {
            var autofocus = value || this.properties.optionsFeed().properties().autoFocus(),
                widget = $(this._identityId)['ojIdentity']('widget');
            if (autofocus) {
                widget.attr('autofocus', 'autofocus');
            } else {
                widget.removeAttr('autofocus');
            }
            // If it is the first element with autofocus set, we need to focus on the oj-select div manually.
            if ($(context.getScope() + ' [autofocus]').first().is('.oj-identity')) {
                widget.find('.oj-select-choice').focus();
            }
        },
        toJS: function() {
            var toJs = this._super();
            toJs.properties.multiple = this.properties.multiple();
            return toJs;
        }
    });
});

define('ColumnSpan',['require','Class','jquery','RendererId','ColumnSpanType'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class'),
        $ = require('jquery'),
        RendererId = require('RendererId'),
        ColumnSpanType = require('ColumnSpanType');

    //endregion

    return Class.subClass({}, {

        init: function(controlsObservable, context) {
            this.controls = controlsObservable;
            this.context = context;
        },
        getStyle: function(control, columnSpanTypeId) {
            var style = '';
            if (control.properties.hide() && (this.context.getScope() === RendererId.FORM_RENDERER)) {
                return style;
            }
            if (columnSpanTypeId === 'ALL') {
                style = this._getAllStyles(control, false);
            } else {
                style = this._getStyle(control, columnSpanTypeId, true);
            }
            return style.trim();
        },
        _getAllStyles: function(control, full) {
            var allStyles = '';
            for (var type in ColumnSpanType) {
                /* istanbul ignore else*/
                if (ColumnSpanType.hasOwnProperty(type)) {
                    allStyles += this._getStyle(control, type, full);
                }
            }
            return allStyles;
        },
        _getStyle: function(control, columnSpanTypeId, full) {
            var colSpan = 0;
            var columnSpanType = ColumnSpanType[columnSpanTypeId];
            if (control.properties.autoColSpan()) {
                colSpan = this._calculateColSpan(this.controls(), columnSpanType);
            } else {
                colSpan = control.properties[columnSpanType.propertyName]();
            }
            return columnSpanType.getStyleClass(colSpan, full);

        },
        _calculateColSpan: function(controls, columnSpanType) {
            var colSpan = 0;
            if (columnSpanType !== ColumnSpanType.SMALL) {
                var visibleControls = controls;
                /* istanbul ignore else */
                if (this.context.getScope() === RendererId.FORM_RENDERER) {
                    visibleControls = this._getVisibleControls(controls);
                }

                var totalManualColSpan = 0;
                var controlsLength = 0;
                $.each(visibleControls, function() {
                    if (!this.properties.autoColSpan()) {
                        totalManualColSpan += this.properties[columnSpanType.propertyName]();
                    } else {
                        controlsLength++;
                    }
                });
                colSpan = Math.floor((12 - totalManualColSpan) / controlsLength);
                if (colSpan <= 0) {
                    colSpan = 1;
                }
            } else {
                colSpan = 12;
            }
            return colSpan;
        },
        _getVisibleControls: function(controls) {
            var visibleControls = [];
            $.each(controls, function() {
                if (!this.properties.hide()) {
                    visibleControls.push(this);
                }
            });
            return visibleControls;
        }
    });
});

define('ControlContainer',['require','Class','knockout','underscore','ColumnSpan','TreeUtil','jquery'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class'),
        ko = require('knockout'),
        _ = require('underscore'),
        ColumnSpan = require('ColumnSpan'),
        TreeUtil = require('TreeUtil'),
        $ = require('jquery');

    //endregion

    return Class.subClass({}, {
        init: function(data, context, controlFactory, controlContainer) {
            var self = this;
            this.viewModel = context.viewModel;

            _.defaults(data, {
                controls: []
            });

            self.controls = ko.observableArray(self._generateControls(controlContainer, data.controls, context, controlFactory));


            self.columnSpan = new ColumnSpan(self.controls, context);

            self.getAllControls = function(skipControlsInsideRepeatables) {
                //getControls calls the function, controls calls the observable with all children
                return TreeUtil.treeToList([this], skipControlsInsideRepeatables ? 'getControls' : 'controls');
            };
            self.getControls = function() {
                return ko.unwrap(self.controls);
            };

            controlContainer.isValid = ko.pureComputed({
                read: function() {
                    var controls = controlContainer.dataSource ? controlContainer.dataSource() :
                        controlContainer.getControls();
                    return _.every(controls, function(control) {
                        return control.isValid();
                    });
                },
                write: function(value) {
                    //ignore
                }
            });
        },
        hasValueProperty: function() {
            return false;
        },
        getParent: function() {
            return this._parent;
        },
        getBindingContext: function() {
            return this.getParent() ? this.getParent().getContextForChildren(this) : '';
        },
        getContextForChildren: function(child) {
            return this.getBindingContext();
        },
        _generateControls: function(controlContainer, jsonControls, context, ControlFactory) {
            var controls = [];
            $.each(jsonControls, function(index, controlData) {
                var control = ControlFactory.createControl(controlData.id, controlData.name, controlData.type, controlData, context, controlContainer);
                controls.push(control);
            });
            return controls;
        },
        findControl: function(controlId) {
            var control = TreeUtil.find(this, 'controls', 'id', controlId);
            control = control == null ? TreeUtil.find(this, 'controls', 'properties.originalId', controlId) : control;
            return control !== null ? control.node : null;
        }

    });
});

define('Row',['require','knockout','ControlTypeId','jquery','ControlContainer','underscore','UUID'],function(require) {

    'use strict';

    //region dependencies

    var ko = require('knockout'),
        ControlTypeId = require('ControlTypeId'),
        $ = require('jquery'),
        ControlContainer = require('ControlContainer'),
        _ = require('underscore'),
        UUID = require('UUID');

    //endregion

    return ControlContainer.subClass({}, {
        init: function(id, data, context, controlFactory, parent) {
            var self = this;
            self.id = id || UUID.createUuid();
            self._parent = parent;
            self._super(data, context, controlFactory, this);

            self.context = context;

            self.type = ControlTypeId.ROW;

            self.hide = ko.pureComputed(function() {
                var hide = true;
                $.each(self.controls(), function() {
                    hide = this.properties.hide();
                    return hide; //break if there is there is one element shown.
                });
                return hide;
            });

        },
        makeCopy: function() {
            var copy = this.toJS();
            copy.id = UUID.createUuid();
            var controls = [];
            _.each(this.controls(), function(control) {
                controls.push(control.makeCopy());
            });
            copy.controls = controls;
            return copy;
        },
        toJS: function() {
            var controls = [];

            $.each(this.controls(), function(i, control) {
                controls.push(control.toJS());
            });
            return {
                id: this.id,
                type: this.type,
                controls: controls
            };
        },
        isRepeatable: function() {
            return false;
        },
        findClosest: function(id) {
            return this.getParent().findClosest(id);
        },
        onDrop: function(dropHandler, dropCoordinates) {
            dropHandler.moveRow(this, dropCoordinates);
        }
    });
});

define('LayoutType',['require','ojL10n!rendererMsg/nls/renderer'],function(require) {

    'use strict';

    //region dependencies

    var msg = require('ojL10n!rendererMsg/nls/renderer');

    //endregion

    return {
        VERTICAL: {
            value: 'VERTICAL',
            label: msg.LAYOUT_VERTICAL
        },
        HORIZONTAL: {
            value: 'HORIZONTAL',
            label: msg.LAYOUT_HORIZONTAL
        }
    };
});

define('PanelControl',['require','ControlTypeId','knockout','jquery','underscore','koToJSUtil','LayoutType','ControlContainer','Control'],function(require) {

    'use strict';

    //region dependencies

    var ControlTypeId = require('ControlTypeId'),
        ko = require('knockout'),
        $ = require('jquery'),
        _ = require('underscore'),
        koToJSUtil = require('koToJSUtil'),
        LayoutType = require('LayoutType'),
        ControlContainer = require('ControlContainer'),
        Control = require('Control');

    //endregion

    /**
     * Container that lets the use group controls vertically/horizontally.
     * Each control will be in a new row/col inside this panel.
     */
    return Control.subClass({}, {
        /* jshint maxparams: 6 */
        init: function(id, name, data, context, controlFactory, parent) {

            var self = this;
            _.defaults(data.properties, {
                layout: [LayoutType.VERTICAL.value],
                label: ''
            });

            self._super(id, name, context.getControlDefinitionByType(ControlTypeId.PANEL), data.properties, context, parent);
            self.container = new ControlContainer(data, context, controlFactory, this);
            //Some Controls (i.e. Rows) inherit directly from ControlContainer
            //Here we need to add the important functions to this, because we inherit from Control
            self.controls = self.container.controls;
            self.getAllControls = self.container.getAllControls.bind(self.container);
            self.getControls = self.container.getControls.bind(self.container);
            self.findControl = self.container.findControl.bind(self.container);

            self.properties.layout = ko.observableArray(data.properties.layout);

            self.isVertical = ko.pureComputed(function() {
                return self.properties.layout()[0] === LayoutType.VERTICAL.value;
            });
        },
        hasValueProperty: function() {
            return false;
        },
        toJS: function() {

            var events = [];
            $.each(this.events(), function(i, event) {
                events.push(event.toJS());
            });
            var controls = [];
            $.each(this.controls(), function(i, control) {
                controls.push(control.toJS());
            });
            return {
                id: this.id,
                name: this.name(),
                type: this.type,
                properties: _.extend({},
                    koToJSUtil.toJS(this.properties), {
                        events: events
                    }),
                controls: controls
            };
        },
        layoutOptions: function() {
            return [LayoutType.VERTICAL, LayoutType.HORIZONTAL];
        },
        colStyle: function(control, columnSpanTypeId) {
            var layoutStyle = '';
            if (this.properties.layout()[0] === LayoutType.VERTICAL.value) {
                layoutStyle = 'oj-row';
            } else {
                layoutStyle = 'oj-col ' + this.container.columnSpan.getStyle(control, columnSpanTypeId);
            }
            return layoutStyle;
        }
    });

});

define('SectionControl',['require','ControlTypeId','knockout','jquery','HeadingType','koToJSUtil','underscore','ControlContainer','Control','ojs/ojcollapsible'],function(require) {

    'use strict';

    //region dependencies

    var ControlTypeId = require('ControlTypeId'),
        ko = require('knockout'),
        $ = require('jquery'),
        HeadingType = require('HeadingType'),
        koToJSUtil = require('koToJSUtil'),
        _ = require('underscore'),
        ControlContainer = require('ControlContainer'),
        Control = require('Control');
    require('ojs/ojcollapsible');

    //endregion

    /**
     * Container that lets the use group controls vertically/horizontally.
     * Each control will be in a new row/col inside this panel.
     */
    return Control.subClass({}, {
        /* jshint maxparams: 6 */
        init: function(id, name, data, context, controlFactory, parent) {
            data.properties = data.properties || {};

            var self = this;
            _.defaults(data.properties, {
                label: name,
                expanded: true,
                headerType: [HeadingType.PARAGRAPH.value],
                lazyLoading: false
            });

            self._super(id, name, context.getControlDefinitionByType(ControlTypeId.SECTION), data.properties, context, parent);
            self.container = new ControlContainer(data, context, controlFactory, this);
            //Some Controls (i.e. Rows) inherit directly from ControlContainer
            //Here we need to add the important functions to this, because we inherit from Control
            self.controls = self.container.controls;
            self.getAllControls = self.container.getAllControls.bind(self.container);
            self.getControls = self.container.getControls.bind(self.container);
            self.findControl = self.container.findControl.bind(self.container);

            this.properties.expanded = ko.observable(data.properties.expanded);
            this.properties.headerType = ko.observableArray(data.properties.headerType);
            this.properties.lazyLoading = ko.observable(data.properties.lazyLoading);

            this.domId = context.getScope() + ' #' + context.config().domIdPrefix + id;

            self.properties.label.subscribe(function() {
                setTimeout(function() {
                    self._refresh();
                }, 0);
            });
            self.properties.headerType.subscribe(function() {
                setTimeout(function() {
                    self._refresh();
                }, 0);
            });
        },
        hasValueProperty: function() {
            return false;
        },
        _refresh: function() {
            var self = this;
            $('#section-' + self.id).ojCollapsible('refresh');
        },
        toJS: function() {
            var events = [];
            $.each(this.events(), function(i, event) {
                events.push(event.toJS());
            });

            var controls = [];
            $.each(this.controls(), function(i, control) {
                controls.push(control.toJS());
            });
            return {
                id: this.id,
                name: this.name(),
                type: this.type,
                properties: _.extend({},
                    koToJSUtil.toJS(this.properties), {
                        events: events
                    }),
                controls: controls
            };
        },
        headingTypes: HeadingType.values()
    });

});

define('TabControl',['require','ControlTypeId','underscore','jquery','ControlContainer','knockout','Control'],function(require) {

    'use strict';

    //region dependencies

    var ControlTypeId = require('ControlTypeId'),
        _ = require('underscore'),
        $ = require('jquery'),
        ControlContainer = require('ControlContainer'),
        ko = require('knockout'),
        Control = require('Control');

    //endregion


    return Control.subClass({}, {
        /* jshint maxparams: 6 */
        init: function(id, name, data, context, controlFactory, parent) {

            var self = this;

            self._super(id, name, context.getControlDefinitionByType(ControlTypeId.TAB), data.properties, context, parent);
            self.container = new ControlContainer(data, context, controlFactory, this);
            //Some Controls (i.e. Rows) inherit directly from ControlContainer
            //Here we need to add the important functions to this, because we inherit from Control
            self.controls = self.container.controls;
            self.getAllControls = self.container.getAllControls.bind(self.container);
            self.getControls = self.container.getControls.bind(self.container);
            self.findControl = self.container.findControl.bind(self.container);

            _.defaults(data.properties, {
                lazyLoading: false
            });

            self.properties.lazyLoading = ko.observable(data.properties.lazyLoading);
        },
        hasValueProperty: function() {
            return false;
        },
        toJS: function() {
            var controls = [];

            $.each(this.controls(), function(i, control) {
                controls.push(control.toJS());
            });
            return _.extend(this._super(), {
                controls: controls
            });
        }
    });

});

define('TabContainerControl',['require','ControlTypeId','knockout','jquery','underscore','ControlContainer','Control','ojs/ojtabs','ojs/ojcollapsible','ojs/ojaccordion'],function(require) {

    'use strict';

    //region dependencies

    var ControlTypeId = require('ControlTypeId'),
        ko = require('knockout'),
        $ = require('jquery'),
        _ = require('underscore'),
        ControlContainer = require('ControlContainer'),
        Control = require('Control');
    require('ojs/ojtabs');
    require('ojs/ojcollapsible');
    require('ojs/ojaccordion');

    //endregion


    return Control.subClass({}, {
        /* jshint maxparams: 6 */
        init: function(id, name, data, context, controlFactory, parent) {

            var self = this;

            self._super(id, name, context.getControlDefinitionByType(ControlTypeId.TAB_CONTAINER), data.properties, context, parent);
            self.container = new ControlContainer(data, context, controlFactory, this);
            //Some Controls (i.e. Rows) inherit directly from ControlContainer
            //Here we need to add the important functions to this, because we inherit from Control
            self.controls = self.container.controls;
            self.getAllControls = self.container.getAllControls.bind(self.container);
            self.getControls = self.container.getControls.bind(self.container);
            self.findControl = self.container.findControl.bind(self.container);

            _.defaults(data.properties, {
                selectedPosition: 0
            });

            self.properties.selectedPosition = ko.observable(data.properties.selectedPosition);

            self.properties.selectedPositionStringComputed = ko.pureComputed({
                read: function() {
                    return [String(self.properties.selectedPosition())];
                },
                write: function(value) {
                    self.properties.selectedPosition(Number(value[0]));
                }
            });
            self.properties.selectedPositionAsArrayComputed = ko.pureComputed({
                read: function() {
                    return [self.properties.selectedPosition()];
                },
                write: function(value) {
                    self.properties.selectedPosition(value[0]);
                }
            });

            self.disabledTabs = ko.pureComputed(function() {
                var disabledTabs = [];
                $.each(self.controls(), function(i, control) {
                    if (control.properties.disabled() && !control.properties.hide()) {
                        disabledTabs.push(i);
                    }
                });
                return disabledTabs;
            });
        },
        hasValueProperty: function() {
            return false;
        },
        hasStyle: function() {
            return true;
        },
        toJS: function() {
            var controls = [];

            $.each(this.controls(), function(i, control) {
                controls.push(control.toJS());
            });
            return _.extend(this._super(), {
                controls: controls
            });
        }
    });

});

define('RepeatableRowControl',['require','Class','underscore','ControlContainer','ControlTypeId'],function(require) {

    'use strict';
    /* globals Promise */

    //region dependencies

    var Class = require('Class'),
        _ = require('underscore'),
        ControlContainer = require('ControlContainer'),
        ControlTypeIds = require('ControlTypeId');

    //endregion


    return Class.subClass({}, {
        // jshint maxparams:7
        type: null, //Will be set in constructor according to parent
        properties: {},
        init: function(id, controlsAccessor, context, controlFactory, repeatableParent, value, rowBindingId) {
            var self = this;
            this.viewModel = context.viewModel;
            this.context = context;

            self._bindingValue = value || {};
            self.id = id;
            self.rowBindingId = rowBindingId;
            self._parent = repeatableParent;

            if (this.getParent().type === ControlTypeIds.TABLE) {
                this.type = ControlTypeIds.TABLE_ROW;
            } else {
                this.type = ControlTypeIds.REPEATABLE_SECTION_ROW;
            }

            var data = {
                controls: []
            };
            if (!!value) {
                _.each(controlsAccessor(), function(control) {
                    data.controls.push(control.makeCopy());
                });
            }
            self.container = new ControlContainer(data, context, controlFactory, this);
            if (!value) {
                self.container.controls = controlsAccessor;
            }
            //Some Controls (i.e. Rows) inherit directly from ControlContainer
            //Here we need to add the important functions to this, because we inherit from Control
            self.controls = self.container.controls;
            self.getAllControls = self.container.getAllControls.bind(self.container);
            self.getControls = self.container.getControls.bind(self.container);
            self.findControl = self.container.findControl.bind(self.container);

            self.executeEventOnAll = self.executeEvent.bind(self);
        },
        executeEvent: function(trigger) {
            var events = [];
            _.each(this.getParent().events(), function(eventRef) {
                var eventTrigger = eventRef.event().trigger;
                if (trigger === eventTrigger()) {
                    events.push(eventRef.execute(this));
                }
            }, this);
            this.context.viewModel.computedExtension.reEvaluateOnControl(trigger, this);
            return Promise.all(events);
        },
        getParent: function() {
            return this._parent;
        },
        getBindingContext: function() {
            return this.getParent() ? this.getParent().getContextForChildren(this) : '';
        },
        getContextForChildren: function(child) {
            return this.getBindingContext();
        },
        findClosest: function(id) {
            var control = this.findControl(id);
            if (!!control) {
                return control;
            } else {
                return this.getParent().findClosest(id);
            }
        },
        findControlInsideRepeatable: function(controlId) {
            var control = this.findControl(controlId);
            if (!control) {
                _.any(this.getAllControls(true), function(childControl) {
                    if (childControl.isRepeatable()) {
                        control = childControl.findControlInsideRepeatable(controlId);
                        return !!control;
                    }
                });
            }
            return control;
        },
        isRepeatable: function() {
            return false;
        }
    });

});

define('InheritableProperty',['require','knockout','underscore'],function(require) {

    'use strict';

    //region dependencies
    var ko = require('knockout');
    var _ = require('underscore');
    //endregion

    return {
        /**
         * Creates a computed property that, when changed, propagates the change to all its childs
         * @param repeatableControl: a repeatable that will have the property
         * @param property: the ko observable where the real value of the property is stored
         * @param accessor: the string to access the property in children
         * @returns {*}
         */
        createInheritableProperty: function(repeatableControl, property, accessor) {
            return ko.computed({
                read: function() {
                    return property();
                },
                write: function(value) {
                    property(value);

                    //Modify all controls, to save the changes in designtime
                    _.each(repeatableControl.getAllControls(true), function(control) {
                        if (control.properties[accessor]) {
                            control.properties[accessor](value);
                        }
                    });

                    //Modify all the rows, to apply the changes in runtime
                    _.each(repeatableControl.getRows(), function(row) {
                        _.each(row.getAllControls(true), function(control) {
                            if (control.properties[accessor]) {
                                control.properties[accessor](value);
                            }
                        });
                    });
                }
            });
        }
    };

});

define('RepeatableControl',['require','underscore','knockout','jquery','ControlContainer','RepeatableRowControl','EventsId','UUID','OptionsFeed','OptionsType','InheritableProperty','Control'],function(require) {

    'use strict';
    /* globals Promise */

    //region dependencies

    var _ = require('underscore'),
        ko = require('knockout'),
        $ = require('jquery'),
        ControlContainer = require('ControlContainer'),
        RepeatableRowControl = require('RepeatableRowControl'),
        EventsId = require('EventsId'),
        UUID = require('UUID'),
        OptionsFeed = require('OptionsFeed'),
        OptionsType = require('OptionsType'),
        InheritableProperty = require('InheritableProperty'),
        Control = require('Control');

    //endregion


    return Control.subClass({}, {
        // jshint maxparams:7
        init: function(id, name, data, context, controlFactory, controlType, parent) {
            // jshint maxstatements: 31

            var self = this;
            self.data = data;
            self.context = context;
            self.controlFactory = controlFactory;
            self._super(id, name, context.getControlDefinitionByType(controlType), data.properties, context, parent);

            self.container = new ControlContainer(data, context, controlFactory, this);
            //Some Controls (i.e. Rows) inherit directly from ControlContainer
            //Here we need to add the important functions to this, because we inherit from Control
            self.controls = self.container.controls;
            self.getAllControls = self.container.getAllControls.bind(self.container);
            self.findControl = self.container.findControl.bind(self.container);
            //Wrapping the private method as an observable, otherwise it was not possible to override the method
            self.getAllBindableControls = ko.computed(function() {
                return self._getAllBindableControls();
            });
            /**
             * @override
             * getControls is used to populate the events controls, and we need to stop
             * the list at the repeatable, as it has its own properties
             */
            self.getControls = function() {
                return [];
            };

            _.defaults(data.properties, {
                canAddDelete: false,
                multipleSelection: false,
                fromConnector: false,
                maxRows: 200,
                optionsFeed: {
                    type: OptionsType.STATIC.value,
                    properties: {}
                }
            });
            this.properties.canAddDelete = ko.observable(data.properties.canAddDelete);
            this.properties.multipleSelection = ko.observable(data.properties.multipleSelection);
            this.properties.maxRows = ko.observable(data.properties.maxRows);
            this.properties.fromConnector = ko.observable();
            this.properties.optionsFeed = ko.observable();
            this.properties.fromConnector.subscribe(function(newValue) {
                if (newValue) {
                    self.properties.optionsFeed(
                        new OptionsFeed(OptionsType.LIST_CONNECTOR.value, context, data.properties.optionsFeed.properties, self.id)
                    );
                } else {
                    self.properties.optionsFeed(
                        new OptionsFeed(OptionsType.STATIC.value, context, {})
                    );
                }
            });
            this.properties.fromConnector(data.properties.fromConnector);

            context.LoVMappingAutoComplete.createAutoCompletes(this, context);

            self.createRow = function(value, rowBindingId) {
                var row = new RepeatableRowControl(UUID.createUuid(), self.controls, self.context, self.controlFactory, self, value, rowBindingId);
                self.context.addControlDecorators(row);
                self._initRow(row, value || {});
                if (value && context.viewModel.form() && context.viewModel.form().loadEventsExecuted()) {
                    //We need to defer the execution of the events until the controls are added to the table, which is executed
                    // all at once after this point
                    // a setTimeout of time 0 makes this code execute immediately after the adding row code is run
                    setTimeout(function() {
                        $.each(row.getAllControls(true), function(i, control) {
                            control.executeEvent(EventsId.ON_LOAD.value);
                        });
                    });
                }
                return row;
            };

            self.canAddRows = ko.pureComputed(function() {
                return self.dataSource().length < self.properties.maxRows();
            });

            /**
             * Selection
             */
            self.selectedRows = ko.observableArray([]);

            //Special table properties
            self.properties._disabled = ko.observable(self.properties.disabled());
            self.properties.disabled =
                InheritableProperty.createInheritableProperty(self, self.properties._disabled, 'disabled');
            self.properties._readonly = ko.observable(data.properties.readonly);
            self.properties.readonly =
                InheritableProperty.createInheritableProperty(self, self.properties._readonly, 'readonly');


            //Subscribe to selection changes
            self.selectedRows.subscribe(function() {
                self.eventsQueue.execute(self, EventsId.ON_SELECTION_CHANGE);
            });
        },
        hasValueProperty: function() {
            return false;
        },
        refreshConnector: function() {
            if (this.properties.fromConnector()) {
                this.properties.optionsFeed().optionsResolver().loadAndSetConnector(this.viewModel.form());
            }
        },

        findControlInsideRepeatable: function(controlId) {
            var control = null;
            _.any(this.getRows(), function(row) {
                control = row.findControlInsideRepeatable(controlId);
                return !!control;
            });
            return control;
        },

        /**
         * Used for events
         */
        isRepeatable: function() {
            return true;
        },

        /**
         * Gets the list of all controls that have a binding, used for REST mapping
         */
        _getAllBindableControls: function() {
            return _.filter(this.getAllControls(true), function(control) {
                return !!control.properties.binding();
            });
        },
        executeEventOnAll: function(trigger) {
            var events = [this.executeEvent(trigger)];
            _.each(this.getRows(), function(row) {
                _.each(row.getAllControls(true), function(control) {
                    events = events.concat(control.executeEventOnAll(trigger));
                });
            });
            return Promise.all(events);
        },

        _initRow: function() {},

        toJS: function() {
            var controls = [];
            _.each(this.controls(), function(column) {
                controls.push(column.toJS());
            });
            var toJs = _.extend(this._super(), {
                controls: controls,
                readonly: this.properties.readonly()
            });
            toJs.properties.optionsFeed = this.properties.optionsFeed().toJS();
            return toJs;
        }
    });

});

define('RepeatableSectionControl',['require','ControlTypeId','knockout','underscore','RepeatableControl'],function(require) {

    'use strict';

    //region dependencies

    var ControlTypeId = require('ControlTypeId'),
        ko = require('knockout'),
        _ = require('underscore'),
        RepeatableControl = require('RepeatableControl');

    //endregion

    return RepeatableControl.subClass({}, {
        /* jshint maxparams: 6 */
        init: function(id, name, data, context, controlFactory, parent) {
            this._triggerBindableReeval = ko.observable(false);
            var self = this;
            self._super(id, name, data, context, controlFactory, ControlTypeId.REPEATABLE_SECTION, parent);

            _.defaults(data.properties, {
                labelBinding: '',
                labelMapping: ''
            });
            this.properties.labelBinding = ko.observable(data.properties.labelBinding);
            this.properties.labelMapping = ko.observable(data.properties.labelMapping);
            this._triggerBindableReeval(!this._triggerBindableReeval());
            context.LoVMappingAutoComplete.initialize(this, context);
        },
        _getAllBindableControls: function() {
            this._triggerBindableReeval();
            var controls = this._super();
            return [{
                id: this.id,
                name: this.msg.LABEL_LABEL,
                properties: {
                    connectorMapping: this.properties.labelMapping,
                    binding: this.properties.labelBinding
                }
            }].concat(controls);
        },
        colStyle: function() {
            return 'oj-row';
        },
        _initRow: function(row, value) {
            this._super(row, value);
            row.properties.label = ko.observable(ko.unwrap(value[this.properties.labelBinding()]));
        }
    });

});

define('TableControl',['require','ControlTypeId','RepeatableControl','knockout','ojL10n!rendererMsg/nls/renderer','underscore'],function(require) {

    'use strict';

    //region dependencies

    var ControlTypeId = require('ControlTypeId'),
        RepeatableControl = require('RepeatableControl'),
        ko = require('knockout'),
        msg = require('ojL10n!rendererMsg/nls/renderer'),
        _ = require('underscore');


    //endregion


    return RepeatableControl.subClass({}, {
        /* jshint maxparams: 6 */
        init: function(id, name, data, context, controlFactory, parent) {

            var self = this;
            self._super(id, name, data, context, controlFactory, ControlTypeId.TABLE, parent);

            _.defaults(data.properties, {
                hideLabels: true
            });

            this.properties.hideLabels = ko.observable(data.properties.hideLabels);

            context.LoVMappingAutoComplete.initialize(this, context);

            _.each(self.styles(), function(style) {
                if (style.type.label === msg.LABEL_TABLE_WIDTH) {
                    // This computed function is for change in column width (i.e. control Styles) from User Screen. Everytime we change the column width
                    //it will calculate and change the TableWidth style so that Reset link will be enabled
                    style.controlValue = ko.computed(function() {
                        var val = [];
                        _.each(self.controls(), function(control) {
                            val.push(control.properties.formattedStyle().tableColumnWidth);
                        });
                        var listWithoutUndefined = _.without(val, undefined);
                        /* istanbul ignore else */
                        if (listWithoutUndefined.length === 0) {
                            style.rawValue(listWithoutUndefined.toString());
                            return listWithoutUndefined.toString();
                        }
                        style.rawValue(val.toString());
                        return val.toString();

                    }, this);
                    // This computed function is for change in rawValue of TableWidth style in case of ResetStyle or Undo command. So everytime the
                    //TableWidth changes, it will change the column width (i.e. control styles)
                    style.newRawValue = ko.computed(function() {
                        var rawValue = style.rawValue();
                        if (rawValue === '') {
                            _.each(self.controls(), function(control) {
                                _.each(control.styles(), function(style) {
                                    /* istanbul ignore else */
                                    if (style.type.label === msg.LABEL_WIDTH) {
                                        style.rawValue('');
                                    }
                                });
                            });
                        } else {
                            var controls = self.controls();
                            var rawValArray = rawValue.split(',');
                            var arrayLength = controls.length;
                            for (var i = 0; i < arrayLength; i++) {
                                controls[i].styles()[0].rawValue(rawValArray[i]);
                            }
                        }
                        return rawValue;

                    }, this);
                }
            });
        }
    });

});

define('TableColumnControl',['require','ControlTypeId','underscore','ControlContainer','Control'],function(require) {

    'use strict';

    //region dependencies

    var ControlTypeId = require('ControlTypeId'),
        _ = require('underscore'),
        ControlContainer = require('ControlContainer'),
        Control = require('Control');


    //endregion


    return Control.subClass({}, {
        /* jshint maxparams: 6 */
        init: function(id, name, data, context, controlFactory, parent) {

            var self = this;
            self._super(id, name, context.getControlDefinitionByType(ControlTypeId.TABLE_COLUMN), data.properties, context, parent);

            self.container = new ControlContainer(data, context, controlFactory, this);
            //Some Controls (i.e. Rows) inherit directly from ControlContainer
            //Here we need to add the important functions to this, because we inherit from Control
            self.controls = self.container.controls;
            self.getAllControls = self.container.getAllControls.bind(self.container);
            self.getControls = self.container.getControls.bind(self.container);
            self.findControl = self.container.findControl.bind(self.container);

        },
        hasValueProperty: function() {
            return false;
        },

        toJS: function() {
            var controls = [];
            _.each(this.controls(), function(control) {
                controls.push(control.toJS());
            });
            return _.extend(this._super(), {
                controls: controls
            });
        }
    });

});

 define('FormReferenceControl',['require','Control','underscore','knockout','jquery','OjSelectItem','TypeCatalog'],function(require) {

     'use strict';

     //region dependencies

     var Control = require('Control'),
         _ = require('underscore'),
         ko = require('knockout'),
         $ = require('jquery'),
         OjSelectItem = require('OjSelectItem'),
         TypeCatalog = require('TypeCatalog');

     //endregion

     return Control.subClass({}, {

         init: function(id, name, data, context, parent) {
             var controlDefinition = context.getFormReferenceControlDefinition(data.properties.reference, context.config().formHandler);
             this._super(id, name, controlDefinition, data.properties, context, parent);
             var self = this;

             self.form = context.config().formHandler.getResolvedControl(data.properties.reference.formId); //Form should be resolved by now
             self.dataType = TypeCatalog.parseRootType('definition', self.form.definition);

             _.extend(self.properties, {
                 reference: ko.observable(controlDefinition.reference),
                 presentation: ko.observableArray([]),
                 defaultValue: {}
             });

             self.presentations = ko.observableArray([]);
             self.computedPresentations = ko.computed(function() {
                 var presentations = [];
                 _.each(self.presentations(), function(presentation) {
                     presentations.push(OjSelectItem.create(presentation.id, presentation.name));
                 });
                 return presentations;
             });

             self.isValidReference = function() {
                 return !$.isEmptyObject(self.form);
             };

             self.getConfig = function() {
                 var config = {};
                 _.extend(config, context.config(), {
                     domIdPrefix: context.config().domIdPrefix + self.id + '-'
                 });
                 //Only the first form should handle the convertion, to avoid double convertion
                 config.convertJSON = false;
                 return config;
             };

             if (data.properties.reference.presentationId) {
                 self._initPresentations(data.properties.reference.presentationId);
             }

             self.selectedPresentation = function() {
                 if (_.isEmpty(self.properties.presentation())) {
                     if (self.isValidReference()) {
                         self._initPresentations();
                     }
                 }
                 var presentation = self.findPresentation(self.properties.presentation()[0]);
                 return this._buildForm(this.form, presentation);
             };

             self.properties.presentation.subscribe(function(ids) {
                 var id = ids[0];
                 self.properties.reference().presentationId(id);
                 self.loadPresentation(id);
             });

             //Callback for the form reference to update the isValid property
             self.onValidStateChange = function(newValue) {
                 self.isValid(newValue);
             };

             self.controlsLoaded = ko.observable(false);

             self.loadedCallback = function() {
                 self.controlsLoaded(true);
             };

             self.translationsHandler = context.config().translationsHandler;
         },
         hasValueProperty: function() {
             return false;
         },
         loadPresentation: function(id) {
             var presentation = $.extend(true, {}, this.findPresentation(id));
             var $formRenderer = $('#' + this.id);
             _.extend(this.translationsHandler._bundles.defaultBundle, this.form.defaultBundle);
             var form = this._buildForm(this.form, presentation);
             if (_.size($formRenderer) === 1) {
                 $formRenderer.trigger('load', {
                     form: form,
                     config: this.getConfig()
                 });
             }
         },
         findPresentation: function(id) {
             return _.find(this.presentations(), function(presentation) {
                 return presentation.id === id;
             }, this);
         },
         _initPresentations: function(presentation) {
             this.presentations(this.form.presentations);
             this.properties.presentation.push(presentation || this.form.defaultPresentation);
         },
         /** @overrides */
         _propertiesToJS: function() {
             var properties = this._super();
             delete properties.presentation;
             properties.reference = this.properties.reference().get();
             return properties;
         },
         getBindings: function() {
             return $('#' + this.domIdPrefix + this.id).triggerHandler('getBindings');
         }
     });
 });

define('ControlFactory',['require','Class','ButtonControl','InputTextControl','TextAreaControl','SelectControl','ChecklistControl','CheckboxControl','RadioButtonControl','NumberControl','DateControl','TimeControl','LinkControl','DateTimeControl','EmailControl','UrlControl','MessageControl','MoneyControl','PhoneControl','ImageControl','VideoControl','ControlTypeId','IdentityControl','Row','PanelControl','SectionControl','TabControl','TabContainerControl','RepeatableSectionControl','TableControl','FormsLogger','TableColumnControl','FormReferenceControl'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class'),
        ButtonControl = require('ButtonControl'),
        InputTextControl = require('InputTextControl'),
        TextAreaControl = require('TextAreaControl'),
        SelectControl = require('SelectControl'),
        ChecklistControl = require('ChecklistControl'),
        CheckboxControl = require('CheckboxControl'),
        RadioButtonControl = require('RadioButtonControl'),
        NumberControl = require('NumberControl'),
        DateControl = require('DateControl'),
        TimeControl = require('TimeControl'),
        LinkControl = require('LinkControl'),
        DateTimeControl = require('DateTimeControl'),
        EmailControl = require('EmailControl'),
        UrlControl = require('UrlControl'),
        MessageControl = require('MessageControl'),
        MoneyControl = require('MoneyControl'),
        PhoneControl = require('PhoneControl'),
        ImageControl = require('ImageControl'),
        VideoControl = require('VideoControl'),
        ControlTypeId = require('ControlTypeId'),
        IdentityControl = require('IdentityControl'),
        Row = require('Row'),
        PanelControl = require('PanelControl'),
        SectionControl = require('SectionControl'),
        TabControl = require('TabControl'),
        TabContainerControl = require('TabContainerControl'),
        RepeatableSectionControl = require('RepeatableSectionControl'),
        TableControl = require('TableControl'),
        FormsLogger = require('FormsLogger'),
        TableColumnControl = require('TableColumnControl'),
        FormReferenceControl = require('FormReferenceControl');

    //endregion

    var CREATE = 'CREATE_';

    var ControlFactory = Class.subClass({

        /* jshint maxparams: 6 */
        createControl: function(id, name, typeId, data, context, parent) {
            var createFunction = ControlFactory[CREATE + typeId];
            if (createFunction) {
                var control = createFunction(id, name, data, context, parent);
                context.addControlDecorators(control);
                ControlFactory._log(typeId, control);
                return control;
            } else {
                throw new Error('Unsupported operation exception');
            }
        },
        CREATE_INPUT_TEXT: function(id, name, data, context, parent) {
            return new InputTextControl(id, name, data.properties || {}, context, parent);
        },
        CREATE_TEXT_AREA: function(id, name, data, context, parent) {
            return new TextAreaControl(id, name, data.properties || {}, context, parent);
        },
        CREATE_BUTTON: function(id, name, data, context, parent) {
            return new ButtonControl(id, name, data.properties || {}, context, parent);
        },
        CREATE_SELECT: function(id, name, data, context, parent) {
            return new SelectControl(id, name, data.properties || {}, context, parent);
        },
        CREATE_CHECKLIST: function(id, name, data, context, parent) {
            return new ChecklistControl(id, name, data.properties || {}, context, parent);
        },
        CREATE_CHECKBOX: function(id, name, data, context, parent) {
            return new CheckboxControl(id, name, data.properties || {}, context, parent);
        },
        CREATE_RADIO_BUTTON: function(id, name, data, context, parent) {
            return new RadioButtonControl(id, name, data.properties || {}, context, parent);
        },
        CREATE_NUMBER: function(id, name, data, context, parent) {
            return new NumberControl(id, name, data.properties || {}, context, parent);
        },
        CREATE_DATE: function(id, name, data, context, parent) {
            return new DateControl(id, name, data.properties || {}, context, parent);
        },
        CREATE_TIME: function(id, name, data, context, parent) {
            return new TimeControl(id, name, data.properties || {}, context, parent);
        },
        CREATE_DATE_TIME: function(id, name, data, context, parent) {
            return new DateTimeControl(id, name, data.properties || {}, context, parent);
        },
        CREATE_EMAIL: function(id, name, data, context, parent) {
            return new EmailControl(id, name, data.properties || {}, context, parent);
        },
        CREATE_URL: function(id, name, data, context, parent) {
            return new UrlControl(id, name, data.properties || {}, context, parent);
        },
        CREATE_MESSAGE: function(id, name, data, context, parent) {
            return new MessageControl(id, name, data.properties || {}, context, parent);
        },
        CREATE_LINK: function(id, name, data, context, parent) {
            return new LinkControl(id, name, data.properties || {}, context, parent);
        },
        CREATE_MONEY: function(id, name, data, context, parent) {
            return new MoneyControl(id, name, data.properties || {}, context, parent);
        },
        CREATE_PHONE: function(id, name, data, context, parent) {
            return new PhoneControl(id, name, data.properties || {}, context, parent);
        },
        CREATE_IMAGE: function(id, name, data, context, parent) {
            return new ImageControl(id, name, data.properties || {}, context, parent);
        },
        CREATE_VIDEO: function(id, name, data, context, parent) {
            return new VideoControl(id, name, data.properties || {}, context, parent);
        },
        CREATE_IDENTITY_BROWSER: function(id, name, data, context, parent) {
            return new IdentityControl(id, name, data.properties || {}, context, parent);
        },
        CREATE_ROW: function(id, name, data, context, parent) {
            return new Row(id, data, context, ControlFactory, parent);
        },
        CREATE_PANEL: function(id, name, data, context, parent) {
            return new PanelControl(id, name, data, context, ControlFactory, parent);
        },
        CREATE_SECTION: function(id, name, data, context, parent) {
            return new SectionControl(id, name, data, context, ControlFactory, parent);
        },
        CREATE_FORM_REFERENCE: function(id, name, data, context, parent) {
            return new FormReferenceControl(id, name, data, context, parent);
        },
        CREATE_TAB: function(id, name, data, context, parent) {
            return new TabControl(id, name, data, context, ControlFactory, parent);
        },
        CREATE_TAB_CONTAINER: function(id, name, data, context, parent) {
            return new TabContainerControl(id, name, data, context, ControlFactory, parent);
        },
        CREATE_REPEATABLE_SECTION: function(id, name, data, context, parent) {
            return new RepeatableSectionControl(id, name, data, context, ControlFactory, parent);
        },
        CREATE_TABLE: function(id, name, data, context, parent) {
            return new TableControl(id, name, data, context, ControlFactory, parent);
        },
        CREATE_TABLE_COLUMN: function(id, name, data, context, parent) {
            return new TableColumnControl(id, name, data, context, ControlFactory, parent);
        },
        CREATE_BUSINESS_TYPE: function(id, name, data, context, parent) {
            return new SectionControl(id, name, data, context, ControlFactory, parent);
        },
        _log: function(typeId, control) {
            var logger = FormsLogger.getLogger();
            if (logger.debug && typeId !== ControlTypeId.ROW) {
                logger.count('[COUNT] [CONTROL]' + typeId);
                control.registerRenderListener(function() {
                    logger.count('[COUNT] [RENDERED]' + typeId);
                    return true;
                });
            }
        }

    }, {});
    return ControlFactory;
});

define('Assert',[],function() {
	'use strict';

	return function(condition, message) {
		if (!condition) {
			throw new Error(message || 'Assertion failed');
		}
	};

});

define('EventBlock',['require','Class','Assert'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class'),
        assert = require('Assert');

    //endregion

    return Class.subClass({}, {
        init: function(model, viewModel, scope) {
            assert(!!this._class.TYPE);
            assert(!!scope);

            this.id = model.id;
            this.viewModel = viewModel;
            this.scope = scope;
        },


        getType: function() {
            return this._class.TYPE;
        },
        getComponentName: function() {
            return this._class.TEMPLATE_NAME;
        },

        execute:
            /* istanbul ignore next */
            function() {
                throw 'Must be overriden';
            },

        toJS: function() {
            return {
                id: this.id,
                type: this.getType()
            };
        }
    });
});

define('BlockTypes',['require'],function(require) {

    'use strict';

    return {
        ACTION_BLOCK: 'ACTION_BLOCK',
        IF_BLOCK: 'IF_BLOCK',
        CONNECTOR_BLOCK: 'CONNECTOR_BLOCK',
        ERROR_BLOCK: 'ERROR_BLOCK'
    };
});

define('EventAction',['require','Class'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class');

    //endregion

    return Class.subClass({
        ACTION_NAME: 'DO_NOTHING'
    }, {
        init: function(model, viewModel, scope, control) {
            this.viewModel = viewModel;
            this.scope = scope;
        },

        getType: function() {
            return this._class.ACTION_NAME;
        },

        template: function() {
            return false;
        },
        component: function() {
            return false;
        },

        execute: function(component) {
            //do nothing
        },

        toJS: function() {
            return {
                type: this.getType()
            };
        }
    });
});

define('SetPropertyAction',['require','EventAction','Assert','Value','underscore'],function(require) {

    'use strict';

    //region dependencies

    var EventAction = require('EventAction'),
        assert = require('Assert'),
        Value = require('Value'),
        _ = require('underscore');

    //endregion

    return EventAction.subClass({
        ACTION_NAME: '',
        ACCESSOR: '',
        createPropertyAction: function(actionName, accessor) {
            return this.subClass({
                ACTION_NAME: actionName,
                ACCESSOR: accessor
            }, {
                init: function(model, viewModel, scope, control) {
                    this._super(model, viewModel, scope, control);
                }
            });
        }
    }, {
        init: function(model, viewModel, scope, control) {
            this._super(model, viewModel, scope, control);
            assert(this._class.ACCESSOR.length > 0, 'SetPropertyAction class is abstract');

            var defaultValue = control ? control.properties[this._class.ACCESSOR]() : null;

            this.value = new Value(model.value || {
                expression: defaultValue,
                controlResolver: {}
            }, viewModel, this.scope);
        },

        template: function() {
            return 'valueAccessorEventTemplate';
        },

        execute: function(control) {
            control.properties[this._class.ACCESSOR](this.value.resolve(this.viewModel));
        },

        toJS: function() {
            return _.extend({}, this._super(), {
                value: this.value.toJS()
            });
        }
    });
});

define('SetStateAction',['require','EventAction','Assert'],function(require) {

    'use strict';

    //region dependencies

    var EventAction = require('EventAction'),
        assert = require('Assert');

    //endregion

    return EventAction.subClass({
        ACTION_NAME: '',
        ACCESSOR: '',
        VALUE: false,
        createStateAction: function(actionName, accessor, value) {
            return this.subClass({
                ACTION_NAME: actionName,
                ACCESSOR: accessor,
                VALUE: value
            }, {
                init: function(model, viewModel, scope, control) {
                    this._super(model, viewModel, scope, control);
                }
            });
        }
    }, {
        init: function(model, viewModel, scope, control) {
            this._super(model, viewModel, scope, control);
            assert(this._class.ACCESSOR.length > 0, 'SetPropertyAction class is abstract');
        },

        execute: function(control) {
            control.properties[this._class.ACCESSOR](this._class.VALUE);
        }
    });
});

define('SetValueAction',['require','EventAction','Value','knockout','underscore'],function(require) {

    'use strict';

    //region dependencies

    var EventAction = require('EventAction'),
        Value = require('Value'),
        ko = require('knockout'),
        _ = require('underscore');

    //endregion

    return EventAction.subClass({
        ACTION_NAME: 'VALUE'
    }, {
        init: function(model, viewModel, scope, control) {
            this._super(model, viewModel, scope, control);

            var defaultValue = control ? ko.utils.unwrapObservable(control.properties.defaultValue) : null;
            var controlId = control ? control.id : null;


            this.value = new Value(model.value || {
                expression: defaultValue,
                controlResolver: {},
                controlId: controlId
            }, viewModel, this.scope);
        },

        template: function() {
            return 'valueAccessorEventTemplate';
        },

        execute: function(control, blockId) {
            control.setValue(this.value.resolve(this.viewModel));
        },

        toJS: function() {
            return _.extend({}, this._super(), {
                value: this.value.toJS()
            });
        }
    });
});

define('SetLabelBindingAction',['require','Value','SetValueAction','knockout'],function(require) {

    'use strict';

    //region dependencies

    var Value = require('Value'),
        SetValueAction = require('SetValueAction'),
        ko = require('knockout');

    //endregion

    return SetValueAction.subClass({
        ACTION_NAME: 'LABEL_BINDING'
    }, {
        init: function(model, viewModel, scope, control) {
            this._super(model, viewModel, scope, control);

            var defaultLabel = control ? ko.utils.unwrapObservable(control.properties.defaultLabel) : null;
            var controlId = control ? control.id : null;


            this.value = new Value(model.value || {
                expression: defaultLabel,
                controlResolver: {},
                controlId: controlId
            }, viewModel, this.scope);
        },

        execute: function(control) {
            control.setLabelVal(this.value.resolve(this.viewModel));
        }
    });
});

define('SetImageValueAction',['require','SetValueAction'],function(require) {

    'use strict';

    //region dependencies

    var SetValueAction = require('SetValueAction');

    //endregion

    return SetValueAction.subClass({
        ACTION_NAME: 'IMAGE_URL'
    }, {
        init: function(model, viewModel, scope, control) {
            this._super(model, viewModel, scope, control);
        }
    });
});

define('SetVideoValueAction',['require','SetValueAction'],function(require) {

    'use strict';

    //region dependencies

    var SetValueAction = require('SetValueAction');

    //endregion

    return SetValueAction.subClass({
        ACTION_NAME: 'VIDEO_SRC'
    }, {
        init: function(model, viewModel, scope, control) {
            this._super(model, viewModel, scope, control);
        }
    });
});

define('SelectTabAction',['require','EventAction'],function(require) {

    'use strict';

    //region dependencies

    var EventAction = require('EventAction');

    //endregion

    return EventAction.subClass({
        ACTION_NAME: 'SELECT'
    }, {
        init: function(model, viewModel, scope, control) {
            this._super(model, viewModel, scope, control);
        },

        execute: function(control) {
            var parent = this.viewModel.form().findControlAndParent(control.id).parent;
            var newIndex = parent.controls().indexOf(control);
            parent.properties.selectedPosition(newIndex);
        }
    });
});

define('RefreshGlobalConnectorAction',['require','EventAction','knockout','underscore'],function(require) {

    'use strict';

    //region dependencies

    var EventAction = require('EventAction'),
        ko = require('knockout'),
        _ = require('underscore');

    //endregion

    return EventAction.subClass({
        ACTION_NAME: 'REFRESH_GLOBAL_CONNECTOR'
    }, {
        init: function(model, viewModel, scope, control) {
            this._super(model, viewModel, scope, control);
            this.value = ko.observable(model.value || '');
        },

        template: function() {
            return 'globalConnectorSelectTemplate';
        },

        execute: function(control) {
            var self = this;
            var id = this.value()[0];
            var connector = _.find(control.globalConnectors(), function(c) {
                return c.id === id;
            });
            return connector.execute().then(function() {
                self.viewModel.computedExtension.reEvaluateOnScope(id);
            });
        },

        toJS: function() {
            return _.extend({}, this._super(), {
                value: this.value()
            });
        }
    });
});

define('SetMessageValueAction',['require','SetValueAction'],function(require) {

    'use strict';

    //region dependencies

    var SetValueAction = require('SetValueAction');

    //endregion

    return SetValueAction.subClass({
        ACTION_NAME: 'MESSAGE'
    }, {
        init: function(model, viewModel, scope, control) {
            this._super(model, viewModel, scope, control);
        }
    });
});

define('RefreshConnectorAction',['require','EventAction'],function(require) {

    'use strict';

    //region dependencies

    var EventAction = require('EventAction');

    //endregion

    return EventAction.subClass({
        ACTION_NAME: 'REFRESH_CONNECTOR'
    }, {
        init: function(model, viewModel, scope, control) {
            this._super(model, viewModel, scope, control);
        },

        execute: function(control) {
            control.refreshConnector();
        }
    });
});

define('AddRowAction',['require','EventAction'],function(require) {

    'use strict';

    //region dependencies

    var EventAction = require('EventAction');

    //endregion

    return EventAction.subClass({
        ACTION_NAME: 'ADD_ROW'
    }, {
        init: function(model, viewModel, scope, control) {
            this._super(model, viewModel, scope, control);
        },

        execute: function(control) {
            control.addRow();
        }
    });
});

define('SetRepeatableValueAction',['require','EventAction','Value','knockout','underscore'],function(require) {

    'use strict';

    //region dependencies

    var EventAction = require('EventAction'),
        Value = require('Value'),
        ko = require('knockout'),
        _ = require('underscore');

    //endregion

    return EventAction.subClass({
        ACTION_NAME: 'REPEATABLE_VALUE'
    }, {
        init: function(model, viewModel, scope, control) {
            this._super(model, viewModel, scope, control);

            var controlId = control ? control.id : null;

            this.value = new Value(model.value || {
                expression: '',
                controlResolver: {},
                controlId: controlId
            }, viewModel, this.scope);

            this.mapping = ko.observable(model.mapping || {});
        },

        component: function() {
            return 'repeatable-value-mapping';
        },

        execute: function(control) {

            //Resolve the value
            var value = this.value.resolve(this.viewModel);

            /**
             * mapping is [controlId]:newValuePropertyName
             * valueMapper is [controlBinding]:newValuePropertyName
             * We need to do it this way, to provide multiple bindings to different controls
             */
            var bindings = {};
            _.each(this.mapping(), function(mapped, key) {
                if (key === control.id) {
                    bindings[control.properties.labelBinding()] = mapped;
                } else {
                    var childControl = control.findControl(key);
                    if (childControl) {
                        bindings[childControl.properties.binding()] = mapped;
                    }
                }
            });

            /**
             * value is [newValuePropertyName]:value
             * mappedValue is [controlBinding]:value
             */
            var mappedValue = [];
            _.each(value, function(entry) {
                var mappedEntry = {};
                //For each property in the entry, get the mapped binding
                _.each(entry, function(v, key) {
                    _.each(bindings, function(mapped, binding) {
                        if (mapped === key) {
                            mappedEntry[binding] = v;
                        }
                    });
                });
                mappedValue.push(mappedEntry);
            });

            control.setValue(mappedValue);
        },

        toJS: function() {
            return _.extend({}, this._super(), {
                value: this.value.toJS(),
                mapping: this.mapping()
            });
        }
    });
});

define('SetInvalidAction',['require','EventAction','underscore','knockout'],function(require) {

    'use strict';

    //region dependencies

    var EventAction = require('EventAction'),
        _ = require('underscore'),
        ko = require('knockout');

    //endregion

    return EventAction.subClass({
        ACTION_NAME: 'SET_INVALID'
    }, {
        init: function(model, viewModel, scope, control) {
            this._super(model, viewModel, scope, control);
            this.summary = ko.observable(model.summary || '');
            this.detail = ko.observable(model.detail || '');
        },

        template: function() {
            return 'errorValueEventTemplate';
        },

        execute: function(control) {
            control.setError(this.summary(), this.detail());
        },

        toJS: function() {
            return _.extend({}, this._super(), {
                summary: this.summary(),
                detail: this.detail()
            });
        }
    });
});

define('ClearValueAction',['require','EventAction'],function(require) {

    'use strict';

    //region dependencies

    var EventAction = require('EventAction');

    //endregion

    return EventAction.subClass({
        ACTION_NAME: 'CLEAR_VALUE'
    }, {
        init: function(model, viewModel, scope, control) {
            this._super(model, viewModel, scope, control);
        },

        execute: function(control) {
            control.setValue('');
        }
    });
});

define('SetOptionsAction',['require','EventAction','Value','knockout','OptionsType','underscore'],function(require) {

    'use strict';

    //region dependencies

    var EventAction = require('EventAction'),
        Value = require('Value'),
        ko = require('knockout'),
        OptionsType = require('OptionsType'),
        _ = require('underscore');

    //endregion

    return EventAction.subClass({
        ACTION_NAME: 'OPTIONS'
    }, {
        init: function(model, viewModel, scope, control) {
            this._super(model, viewModel, scope, control);

            var controlId = control ? control.id : null;

            this.value = new Value(model.value || {
                expression: '',
                controlResolver: {},
                controlId: controlId
            }, viewModel, this.scope);

            this.mappingLabel = ko.observable(model.mappingLabel || '');
            this.mappingValue = ko.observable(model.mappingValue || '');
        },

        component: function() {
            return 'repeatable-value-mapping';
        },

        execute: function(control) {
            //Resolve the value
            var value = this.value.resolve(this.viewModel);
            var properties = {
                optionsNames: '',
                optionsValues: '',
                defaultValue: control.properties.optionsFeed().properties.defaultValue
            };

            _.each(value, function(entry, i) {
                var label = entry,
                    value = entry;
                if (_.isObject(entry)) {
                    label = entry[this.mappingLabel()] || entry.label;
                    value = entry[this.mappingValue()] || entry.value;
                }
                if (i === 0) {
                    properties.optionsNames = label;
                    properties.optionsValues = value;
                } else {
                    properties.optionsNames += '\n' + label;
                    properties.optionsValues += '\n' + value;
                }
            }, this);


            var context = this.viewModel.context;
            var newOptionsResolver = context.optionsResolverFactory.createResolver(OptionsType.STATIC.value, context, properties);
            control.properties.optionsFeed().optionsResolver(newOptionsResolver);
            control.properties.optionsFeed().properties = newOptionsResolver.properties;
            control.properties.optionsFeed().type(OptionsType.STATIC);

        },

        toJS: function() {
            return _.extend({}, this._super(), {
                value: this.value.toJS(),
                mappingLabel: this.mappingLabel(),
                mappingValue: this.mappingValue()
            });
        }
    });
});

define('SetDataAction',['require','EventAction','Value','ValueTypes','underscore'],function(require) {

    'use strict';

    //region dependencies

    var EventAction = require('EventAction'),
        Value = require('Value'),
        ValueTypes = require('ValueTypes'),
        _ = require('underscore');

    //endregion

    return EventAction.subClass({
        ACTION_NAME: 'SET_DATA'
    }, {
        init: function(model, viewModel, scope, control) {
            this._super(model, viewModel, scope, control);

            this.dataAccessor = new Value({
                expression: model.dataAccessor || '',
                type: ValueTypes.DATA.value,
                controlResolver: {},
                controlId: null
            }, viewModel, this.scope);

            this.value = new Value(model.value || {
                expression: '',
                controlResolver: {},
                controlId: null
            }, viewModel, this.scope);
        },

        template: function() {
            return 'setDataEventTemplate';
        },

        execute: function(control) {
            var dataName = this.dataAccessor.expression(),
                newValue = this.value.resolve(this.viewModel);

            this.viewModel.context.payload().setBindingValue(dataName, newValue);
            this.viewModel.context.payloadContext.setValue(dataName, newValue);
        },

        toJS: function() {
            return _.extend({}, this._super(), {
                dataAccessor: this.dataAccessor.expression(),
                value: this.value.toJS()
            });
        }
    });
});

define('RemoveRowAction',['require','EventAction'],function(require) {

    'use strict';

    //region dependencies

    var EventAction = require('EventAction');

    //endregion

    return EventAction.subClass({
        ACTION_NAME: 'REMOVE_ROW'
    }, {
        init: function(model, viewModel, scope, control) {
            this._super(model, viewModel, scope, control);
        },

        execute: function(control) {
            control.getParent().removeRow(control);
        }
    });
});

define('ActionsMap',['require','ojL10n!rendererMsg/nls/renderer','EventAction','SetPropertyAction','SetStateAction','SetValueAction','SetLabelBindingAction','SetImageValueAction','SetVideoValueAction','SelectTabAction','RefreshGlobalConnectorAction','SetMessageValueAction','RefreshConnectorAction','AddRowAction','SetRepeatableValueAction','SetInvalidAction','ClearValueAction','SetOptionsAction','SetDataAction','RemoveRowAction'],function(require) {

    'use strict';

    //region dependencies


    var msg = require('ojL10n!rendererMsg/nls/renderer'),
        EventAction = require('EventAction'),
        SetPropertyAction = require('SetPropertyAction'),
        SetStateAction = require('SetStateAction'),
        SetValueAction = require('SetValueAction'),
        SetLabelBindingAction = require('SetLabelBindingAction'),
        SetImageValueAction = require('SetImageValueAction'),
        SetVideoValueAction = require('SetVideoValueAction'),
        SelectTabAction = require('SelectTabAction'),
        RefreshGlobalConnectorAction = require('RefreshGlobalConnectorAction'),
        SetMessageValueAction = require('SetMessageValueAction'),
        RefreshConnectorAction = require('RefreshConnectorAction'),
        AddRowAction = require('AddRowAction'),
        SetRepeatableValueAction = require('SetRepeatableValueAction'),
        SetInvalidAction = require('SetInvalidAction'),
        ClearValueAction = require('ClearValueAction'),
        SetOptionsAction = require('SetOptionsAction'),
        SetDataAction = require('SetDataAction'),
        RemoveRowAction = require('RemoveRowAction');
    //endregion

    return {
        'DO_NOTHING': {
            value: 'DO_NOTHING',
            label: msg.DO_NOTHING,
            disabled: true,
            Action: EventAction
        },
        'VALUE': {
            value: 'VALUE',
            label: msg.LABEL_VALUE,
            Action: SetValueAction
        },
        'SHOW': {
            value: 'SHOW',
            label: msg.SHOW,
            Action: SetStateAction.createStateAction('SHOW', 'hide', false)
        },
        'HIDE': {
            value: 'HIDE',
            label: msg.LABEL_HIDE,
            Action: SetStateAction.createStateAction('HIDE', 'hide', true)
        },
        'ENABLE': {
            value: 'ENABLE',
            label: msg.ENABLE,
            Action: SetStateAction.createStateAction('ENABLE', 'disabled', false)
        },
        'DISABLE': {
            value: 'DISABLE',
            label: msg.DISABLE,
            Action: SetStateAction.createStateAction('DISABLE', 'disabled', true)
        },
        'REQUIRED': {
            value: 'REQUIRED',
            label: msg.LABEL_REQUIRED,
            Action: SetStateAction.createStateAction('REQUIRED', 'required', true)
        },
        'OPTIONAL': {
            value: 'OPTIONAL',
            label: msg.OPTIONAL,
            Action: SetStateAction.createStateAction('OPTIONAL', 'required', false)
        },
        'EXPAND': {
            value: 'EXPAND',
            label: msg.EXPAND,
            Action: SetStateAction.createStateAction('EXPAND', 'expanded', true)
        },
        'COLLAPSE': {
            value: 'COLLAPSE',
            label: msg.COLLAPSE,
            Action: SetStateAction.createStateAction('COLLAPSE', 'expanded', false)
        },
        'READONLY': {
            value: 'READONLY',
            label: msg.LABEL_READONLY,
            Action: SetStateAction.createStateAction('READONLY', 'readonly', true)
        },
        'EDITABLE': {
            value: 'EDITABLE',
            label: msg.EDITABLE,
            Action: SetStateAction.createStateAction('EDITABLE', 'readonly', false)
        },
        'LABEL': {
            value: 'LABEL',
            label: msg.LABEL_LABEL,
            Action: SetPropertyAction.createPropertyAction('LABEL', 'label')
        },
        'MESSAGE': {
            value: 'MESSAGE',
            label: msg.MESSAGE,
            Action: SetMessageValueAction
        },
        'IMAGE_URL': {
            value: 'IMAGE_URL',
            label: msg.IMAGE_URL,
            Action: SetImageValueAction
        },
        'VIDEO_SRC': {
            value: 'VIDEO_SRC',
            label: msg.LABEL_SOURCE_URL,
            Action: SetVideoValueAction
        },
        'ALTERNATIVE_TEXT': {
            value: 'ALTERNATIVE_TEXT',
            label: msg.LABEL_ALT_TEXT,
            Action: SetPropertyAction.createPropertyAction('ALTERNATIVE_TEXT', 'alt')
        },
        'HINT': {
            value: 'HINT',
            label: msg.LABEL_HINT,
            Action: SetPropertyAction.createPropertyAction('HINT', 'hint')
        },
        'HELP': {
            value: 'HELP',
            label: msg.LABEL_HELP,
            Action: SetPropertyAction.createPropertyAction('HELP', 'help')
        },

        'MIN_VALUE': {
            value: 'MIN_VALUE',
            label: msg.LABEL_MIN_VALUE,
            Action: SetPropertyAction.createPropertyAction('MIN_VALUE', 'minValue')
        },
        'MAX_VALUE': {
            value: 'MAX_VALUE',
            label: msg.LABEL_MAX_VALUE,
            Action: SetPropertyAction.createPropertyAction('MAX_VALUE', 'maxValue')
        },
        'MIN_LENGTH': {
            value: 'MIN_LENGTH',
            label: msg.LABEL_MIN_LENGTH,
            Action: SetPropertyAction.createPropertyAction('MIN_LENGTH', 'minLength')
        },
        'MAX_LENGTH': {
            value: 'MAX_LENGTH',
            label: msg.LABEL_MAX_LENGTH,
            Action: SetPropertyAction.createPropertyAction('MAX_LENGTH', 'maxLength')
        },

        'PATTERN': {
            value: 'PATTERN',
            label: msg.LABEL_PATTERN_VALUE,
            Action: SetPropertyAction.createPropertyAction('PATTERN', 'pattern')
        },
        'PLACEHOLDER': {
            value: 'PLACEHOLDER',
            label: msg.LABEL_PLACEHOLDER,
            Action: SetPropertyAction.createPropertyAction('PLACEHOLDER', 'placeHolder')
        },
        'SELECT': {
            value: 'SELECT',
            label: msg.SELECT,
            Action: SelectTabAction
        },
        'ADD_ROW': {
            value: 'ADD_ROW',
            label: msg.ADD_ROW,
            Action: AddRowAction
        },
        'REFRESH_CONNECTOR': {
            value: 'REFRESH_CONNECTOR',
            label: msg.REFRESH_CONNECTOR,
            Action: RefreshConnectorAction
        },
        'SET_INVALID': {
            value: 'SET_INVALID',
            label: msg.THROW_ERROR,
            Action: SetInvalidAction
        },
        'REPEATABLE_VALUE': {
            value: 'REPEATABLE_VALUE',
            label: msg.LABEL_VALUE,
            Action: SetRepeatableValueAction
        },
        'OPTIONS': {
            value: 'OPTIONS',
            label: msg.SET_OPTIONS,
            Action: SetOptionsAction
        },
        'LABEL_BINDING': {
            value: 'LABEL_BINDING',
            label: msg.LABEL_LABEL,
            Action: SetLabelBindingAction
        },
        'CLEAR_VALUE': {
            value: 'CLEAR_VALUE',
            label: msg.CLEAR_VALUE,
            Action: ClearValueAction
        },
        'REMOVE_ROW': {
            value: 'REMOVE_ROW',
            label: msg.REMOVE_ROW,
            Action: RemoveRowAction
        },
        'CAN_ADD_REMOVE_ROWS': {
            value: 'CAN_ADD_REMOVE_ROWS',
            label: msg.ENABLE_ADD_REMOVE_ROWS,
            Action: SetStateAction.createStateAction('CAN_ADD_REMOVE_ROWS', 'canAddDelete', true)
        },
        'CANT_ADD_REMOVE_ROWS': {
            value: 'CANT_ADD_REMOVE_ROWS',
            label: msg.DISABLE_ADD_REMOVE_ROWS,
            Action: SetStateAction.createStateAction('CANT_ADD_REMOVE_ROWS', 'canAddDelete', false)
        },
        'REFRESH_GLOBAL_CONNECTOR': {
            value: 'REFRESH_GLOBAL_CONNECTOR',
            label: msg.REFRESH_GLOBAL_CONNECTOR,
            Action: RefreshGlobalConnectorAction
        },
        'SET_DATA': {
            value: 'SET_DATA',
            label: msg.SET_DATA,
            Action: SetDataAction
        }
    };


});

define('SetStyleAction',['require','EventAction','Assert','knockout','underscore'],function(require) {

    'use strict';

    //region dependencies

    var EventAction = require('EventAction'),
        assert = require('Assert'),
        ko = require('knockout'),
        _ = require('underscore');

    //endregion

    return EventAction.subClass({
        ACTION_NAME: '',
        STYLE: null,
        createStyleAction: function(actionName, styleType) {
            return this.subClass({
                ACTION_NAME: actionName,
                STYLE: styleType
            }, {
                init: function(model, viewModel, scope, control) {
                    this._super(model, viewModel, scope, control);
                }
            });
        }
    }, {
        init: function(model, viewModel, scope, control) {
            this._super(model, viewModel, scope, control);
            assert(!!this.style(), 'SetStyleAction class is abstract');

            var defaultValue = control ? ko.unwrap(control.properties.formattedStyle()[this.style().name]) : null;
            defaultValue = defaultValue || this.style().default;

            this.value = ko.observable(model.value || defaultValue);
        },

        template: function() {
            return 'styleValueEventTemplate';
        },

        style: function() {
            return this._class.STYLE;
        },

        execute: function(control) {
            var style = _.find(control.styles(), function(s) {
                return s.type.name === this.style().name;
            }, this);
            style.value(this.value());
        },

        toJS: function() {
            return _.extend({}, this._super(), {
                value: this.value()
            });
        }
    });
});

define('ToggleClassAction',['require','EventAction','knockout','StyleTypeId','underscore'],function(require) {

    'use strict';

    //region dependencies

    var EventAction = require('EventAction'),
        ko = require('knockout'),
        StyleTypeId = require('StyleTypeId'),
        _ = require('underscore');

    //endregion

    return EventAction.subClass({
        ACTION_NAME: 'TOGGLE_CLASS',
        STYLE: StyleTypeId.CLASS_NAME
    }, {
        init: function(model, viewModel, scope, control) {
            this._super(model, viewModel, scope, control);

            this.value = ko.observable(model.value || '');
        },

        template: function() {
            return 'styleValueEventTemplate';
        },

        style: function() {
            return this._class.STYLE;
        },

        execute: function(control) {
            var style = _.find(control.styles(), function(s) {
                return s.type.name === this.style().name;
            }, this);
            var classes = style.value().split(' ');

            if (_.contains(classes, this.value())) {
                style.value(_.without(classes, this.value()).join(' '));
            } else {
                style.value(classes.concat([this.value()]).join(' '));
            }
        },

        toJS: function() {
            return _.extend({}, this._super(), {
                value: this.value()
            });
        }
    });
});

define('AddClassAction',['require','ToggleClassAction','underscore'],function(require) {

    'use strict';

    //region dependencies

    var ToggleClassAction = require('ToggleClassAction'),
        _ = require('underscore');

    //endregion

    return ToggleClassAction.subClass({
        ACTION_NAME: 'ADD_CLASS'
    }, {
        init: function(model, viewModel, scope, control) {
            this._super(model, viewModel, scope, control);
        },


        execute: function(control) {
            var style = _.find(control.styles(), function(s) {
                return s.type.name === this.style().name;
            }, this);
            var classes = style.value().split(' ');
            style.value(classes.concat([this.value()]).join(' '));
        }
    });
});

define('RemoveClassAction',['require','ToggleClassAction','underscore'],function(require) {

    'use strict';

    //region dependencies

    var ToggleClassAction = require('ToggleClassAction'),
        _ = require('underscore');

    //endregion

    return ToggleClassAction.subClass({
        ACTION_NAME: 'REMOVE_CLASS'
    }, {
        init: function(model, viewModel, scope, control) {
            this._super(model, viewModel, scope, control);
        },


        execute: function(control) {
            var style = _.find(control.styles(), function(s) {
                return s.type.name === this.style().name;
            }, this);
            var classes = style.value().split(' ');
            style.value(_.without(classes, this.value()).join(' '));
        }
    });
});

define('StyleActionsMap',['require','ojL10n!rendererMsg/nls/renderer','SetStyleAction','StyleTypeId','ToggleClassAction','AddClassAction','RemoveClassAction'],function(require) {

    'use strict';

    //region dependencies

    var msg = require('ojL10n!rendererMsg/nls/renderer');
    var SetStyleAction = require('SetStyleAction');
    var StyleTypeId = require('StyleTypeId');
    var ToggleClassAction = require('ToggleClassAction');
    var AddClassAction = require('AddClassAction');
    var RemoveClassAction = require('RemoveClassAction');
    //endregion

    return {
        'BACKGROUND_COLOR': {
            value: 'BACKGROUND_COLOR',
            label: StyleTypeId.BACKGROUND_COLOR.label,
            Action: SetStyleAction.createStyleAction('BACKGROUND_COLOR', StyleTypeId.BACKGROUND_COLOR)
        },
        'COLOR': {
            value: 'COLOR',
            label: StyleTypeId.COLOR.label,
            Action: SetStyleAction.createStyleAction('COLOR', StyleTypeId.COLOR)
        },
        'SIZE': {
            value: 'SIZE',
            label: StyleTypeId.SIZE.label,
            Action: SetStyleAction.createStyleAction('SIZE', StyleTypeId.SIZE)
        },
        'TEXT_ALIGN': {
            value: 'TEXT_ALIGN',
            label: StyleTypeId.TEXT_ALIGN.label,
            Action: SetStyleAction.createStyleAction('TEXT_ALIGN', StyleTypeId.TEXT_ALIGN)
        },
        'WIDTH': {
            value: 'WIDTH',
            label: StyleTypeId.WIDTH.label,
            Action: SetStyleAction.createStyleAction('WIDTH', StyleTypeId.WIDTH)
        },
        'HEIGHT': {
            value: 'HEIGHT',
            label: StyleTypeId.HEIGHT.label,
            Action: SetStyleAction.createStyleAction('HEIGHT', StyleTypeId.HEIGHT)
        },
        'BORDER_COLOR': {
            value: 'BORDER_COLOR',
            label: StyleTypeId.BORDER_COLOR.label,
            Action: SetStyleAction.createStyleAction('BORDER_COLOR', StyleTypeId.BORDER_COLOR)
        },
        'BORDER_STYLE': {
            value: 'BORDER_STYLE',
            label: StyleTypeId.BORDER_STYLE.label,
            Action: SetStyleAction.createStyleAction('BORDER_STYLE', StyleTypeId.BORDER_STYLE)
        },
        'BORDER_WIDTH': {
            value: 'BORDER_WIDTH',
            label: StyleTypeId.BORDER_WIDTH.label,
            Action: SetStyleAction.createStyleAction('BORDER_WIDTH', StyleTypeId.BORDER_WIDTH)
        },
        'BORDER_RADIUS': {
            value: 'BORDER_RADIUS',
            label: StyleTypeId.BORDER_RADIUS.label,
            Action: SetStyleAction.createStyleAction('BORDER_RADIUS', StyleTypeId.BORDER_RADIUS)
        },
        'CONTROL_ALIGN': {
            value: 'CONTROL_ALIGN',
            label: StyleTypeId.CONTROL_ALIGN.label,
            Action: SetStyleAction.createStyleAction('CONTROL_ALIGN', StyleTypeId.CONTROL_ALIGN)
        },
        'LABEL_COLOR': {
            value: 'LABEL_COLOR',
            label: StyleTypeId.LABEL_COLOR.label,
            Action: SetStyleAction.createStyleAction('LABEL_COLOR', StyleTypeId.LABEL_COLOR)
        },
        'LABEL_SIZE': {
            value: 'LABEL_SIZE',
            label: StyleTypeId.LABEL_SIZE.label,
            Action: SetStyleAction.createStyleAction('LABEL_SIZE', StyleTypeId.LABEL_SIZE)
        },

        'TOGGLE_CLASS': {
            value: 'TOGGLE_CLASS',
            label: msg.TOGGLE_CLASS,
            Action: ToggleClassAction
        },
        'ADD_CLASS': {
            value: 'ADD_CLASS',
            label: msg.ADD_CLASS,
            Action: AddClassAction
        },
        'REMOVE_CLASS': {
            value: 'REMOVE_CLASS',
            label: msg.REMOVE_CLASS,
            Action: RemoveClassAction
        }
    };


});

define('ActionFactory',['require','ActionsMap','underscore','StyleActionsMap'],function(require) {

    'use strict';

    //region dependencies

    var ActionsMap = require('ActionsMap');
    var _ = require('underscore');
    var StyleActionsMap = require('StyleActionsMap');

    //endregion

    return {
        createAction: function(viewModel, scope, model, control, actionName) {
            var action = ActionsMap[actionName] || StyleActionsMap[actionName] || ActionsMap.DO_NOTHING;
            //If control is an array, we keep only the first, as we need it for a default value and type check only
            // the only case for this being an array is multiple selection, and all controls would be the same type
            control = _.isArray(control) ? control[0] : control;
            return new action.Action(model, viewModel, scope, control);
        }
    };
});

define('EventActionBlock',['require','EventBlock','knockout','underscore','BlockTypes','ControlResolver','Value','ActionFactory'],function(require) {

    'use strict';

    //region dependencies

    /* globals Promise */

    var EventBlock = require('EventBlock'),
        ko = require('knockout'),
        _ = require('underscore'),
        BlockTypes = require('BlockTypes'),
        ControlResolver = require('ControlResolver'),
        Value = require('Value'),
        ActionFactory = require('ActionFactory');

    //endregion

    return EventBlock.subClass({
        TYPE: BlockTypes.ACTION_BLOCK,
        TEMPLATE_NAME: 'event-block'
    }, {
        init: function(model, viewModel, scope) {
            this._super(model, viewModel, scope);

            this.controlResolver = new ControlResolver(model.controlResolver, viewModel, scope);

            this.action = ko.observable(
                ActionFactory.createAction(viewModel, this.scope, model.action, this.control(), model.action.type)
            );
        },

        control: function() {
            var form = this.viewModel.form();
            if (form) {
                return this.controlResolver.resolve(form.presentation(), this.scope.eventControl);
            }
        },

        execute: function() {
            var self = this;
            var controls = this.control();
            if (!_.isArray(controls)) {
                controls = [controls];
            }
            var promise = Promise.resolve();
            //Execute for each control, to allow iteration
            _.each(_.flatten(controls), function(control) {
                var eventControl = self.scope.eventControl;
                promise = promise.then(function() {
                    try {
                        //Set the value of the control in the scope, to allow for CURRENT_ITERATION resolver
                        self.scope.currentRowControl = control;
                        //Set the eventControl, as it may have been lost due to asynchronicity
                        self.scope.eventControl = eventControl;
                        return ko.unwrap(self.action).execute(control) || Promise.resolve();
                    } catch (e) {
                        console.error('User Events Error: Error executing action."');
                    }
                });
            }, this);
            return promise;

        },

        getBundle: function() {
            var bundle = {};
            var blockId = this.id;
            var action = this.action();
            if (action && action.value && (ko.utils.unwrapObservable(action.value) instanceof Value)) {
                var bundleArr = action.value._getBundle();
                if (bundleArr.length > 0) {
                    bundle[blockId] = bundleArr;
                }
            }
            return bundle;
        },

        decorate: function() {
            var blockId = this.id;
            var action = this.action();
            if (action && action.value && (ko.utils.unwrapObservable(action.value) instanceof Value)) {
                action.value.decorate(this.viewModel, blockId);
            }
            return true;
        },

        toJS: function() {
            return _.extend(this._super(), {
                action: this.action().toJS(),
                controlResolver: this.controlResolver.toJS()
            });
        }
    });
});

define('ComparatorMap',['require','ojL10n!rendererMsg/nls/renderer'],function(require) {

    'use strict';

    //region dependencies
    var msg = require('ojL10n!rendererMsg/nls/renderer');
    //endregion

    var Comparators = {
        'IS_TRUE': {
            value: 'IS_TRUE',
            label: msg.IS_TRUE,
            isTrue: function(v1) {
                return !!v1;
            }
        },
        'IS_FALSE': {
            value: 'IS_FALSE',
            label: msg.IS_FALSE,
            isTrue: function(v1) {
                return !Comparators.IS_TRUE.isTrue(v1);
            }
        },
        'EQUALS': {
            value: 'EQUALS',
            label: msg.EQUALS,
            isTrue: function(v1, v2) {
                /* jshint eqeqeq: false */
                //We are intentionally using the == comparator
                //So the user can compare with numbers, as the constant value will always be a string
                return v1 == v2;
            }
        },
        'NOT_EQUALS': {
            value: 'NOT_EQUALS',
            label: msg.NOT_EQUALS,
            isTrue: function(v1, v2) {
                return !Comparators.EQUALS.isTrue(v1, v2);
            }
        },
        'IS_GREATER': {
            value: 'IS_GREATER',
            label: msg.IS_GREATER,
            isTrue: function(v1, v2) {
                return v1 > v2;
            }
        },
        'IS_NOT_GREATER': {
            value: 'IS_NOT_GREATER',
            label: msg.IS_NOT_GREATER,
            isTrue: function(v1, v2) {
                return !Comparators.IS_GREATER.isTrue(v1, v2);
            }
        },
        'IS_LESS': {
            value: 'IS_LESS',
            label: msg.IS_LESS,
            isTrue: function(v1, v2) {
                return v1 < v2;
            }
        },
        'IS_NOT_LESS': {
            value: 'IS_NOT_LESS',
            label: msg.IS_NOT_LESS,
            isTrue: function(v1, v2) {
                return !Comparators.IS_LESS.isTrue(v1, v2);
            }
        }
    };

    return Comparators;
});

define('EventCondition',['require','Class','Value','knockout','ValueTypes','underscore','ComparatorMap'],function(require) {

    'use strict';

    //region dependencies

    var Class = require('Class');
    var Value = require('Value');
    var ko = require('knockout');
    var ValueTypes = require('ValueTypes');
    var _ = require('underscore');
    var ComparatorMap = require('ComparatorMap');

    //endregion

    return Class.subClass({}, {
        init: function(model, viewModel, scope, ifBlockId) {
            this.viewModel = viewModel;
            this.scope = scope;
            var defaultValue = _.extend({
                type: ValueTypes.CONTROL.value
            }, model.value);

            this.value = new Value(defaultValue, viewModel, scope);
            this.comparator = ko.observable(model.comparator || ComparatorMap.EQUALS.value);
            this.value2 = new Value(model.value2, viewModel, scope);
            this.union = ko.observable(model.union || 'AND');
            this.ifBlockId = ifBlockId;
        },

        isTrue: function() {
            return ComparatorMap[this.comparator()].isTrue(
                this.value.resolve(this.viewModel),
                this.value2.resolve(this.viewModel)
            );
        },

        getBundle: function() {
            var bundle = {};
            var conditionBundle = _.union(this.value._getBundle(), this.value2._getBundle());
            /* istanbul ignore else */
            if (conditionBundle.length) {
                bundle[this.ifBlockId] = conditionBundle;
            }
            return bundle;
        },

        decorate: function() {
            this.value.decorate(this.viewModel, this.ifBlockId, this.value);
            this.value2.decorate(this.viewModel, this.ifBlockId, this.value);
            return true;
        },

        toJS: function() {
            return {
                value: this.value.toJS(),
                comparator: this.comparator(),
                value2: this.value2.toJS(),
                union: this.union()
            };
        }
    });
});

define('EventIfBlock',['require','EventBlock','knockout','underscore','BlockTypes','EventCondition','BlockFactory'],function(require) {

    'use strict';
    /* global Promise */

    //region dependencies

    var EventBlock = require('EventBlock');
    var ko = require('knockout');
    var _ = require('underscore');
    var BlockTypes = require('BlockTypes');
    var EventCondition = require('EventCondition');

    //endregion

    return EventBlock.subClass({
        TYPE: BlockTypes.IF_BLOCK,
        TEMPLATE_NAME: 'event-if-block',
        ELSE_ACTIONS: 'elseActions',
        THEN_ACTIONS: 'thenActions'
    }, {
        init: function(model, viewModel, scope) {
            var BlockFactory = require('BlockFactory');
            this._super(model, viewModel, scope);

            var conditions = [];
            var self = this;
            _.each(model.conditions, function(condition) {
                conditions.push(new EventCondition(condition, viewModel, scope, self.id));
            });
            if (conditions.length === 0) {
                conditions.push(new EventCondition({}, viewModel, scope, this.id));
            }
            this.conditions = ko.observableArray(conditions);

            var thenActions = [];
            _.each(model.thenActions, function(block) {
                thenActions.push(BlockFactory.createBlock(viewModel, block, scope));
            });
            this.thenActions = ko.observableArray(thenActions);

            var elseActions = [];
            _.each(model.elseActions, function(block) {
                elseActions.push(BlockFactory.createBlock(viewModel, block, scope));
            });
            this.elseActions = ko.observableArray(elseActions);
        },

        isTrue: function() {
            var unionStrings = {
                'AND': ' && ',
                'OR': ' || '
            };
            var booleanString = 'true';
            _.each(this.conditions(), function(condition) {
                var union = unionStrings[condition.union()];
                booleanString = booleanString + union + (!!condition.isTrue()).toString();
            });
            /**
             * We are calling eval to evaluate the logical string that we just made
             * It won't allow the execution of harmful code, because the string is created in the previous function,
             * and it can only be logical connectors (|| and &&) or logical statements (true and false)
             * It is created using the string concatenation of this values
             * Regardless of what condition.isTrue return, the double negation (!!) converts that to a boolean value, then converted to a string ('true' or 'false')
             * if condition.union() is not 'AND' or 'OR', then the union will be 'undefined', which will throw an error, but won't allow code to run.
             */
            return eval(booleanString); // jshint ignore:line
        },

        execute: function() {

            var actions = this.isTrue() ? this.thenActions() : this.elseActions();
            var eventControl = this.scope.eventControl;
            var self = this;

            var p = Promise.resolve();
            _.each(ko.unwrap(actions), function(block) {
                p = p.then(function() {
                    //Make sure we have not lost the control
                    self.scope.eventControl = eventControl;
                    return block.execute() || Promise.resolve();
                });
            });
            return p;
        },
        getElseActionsJS: function() {
            var elseActions = [];
            _.each(this.elseActions(), function(block) {
                elseActions.push(block.toJS());
            });
            return elseActions;
        },

        getBundle: function() {
            var bundle = {};
            _.each(this.conditions(), function(block) {
                _.extend(bundle, block.getBundle());
            });
            _.each(this.thenActions(), function(block) {
                _.extend(bundle, block.getBundle());
            });
            _.each(this.elseActions(), function(block) {
                _.extend(bundle, block.getBundle());
            });

            return bundle;
        },

        decorate: function() {
            _.each(this.conditions(), function(block) {
                block.decorate();
            });
            _.each(this.thenActions(), function(block) {
                block.decorate();
            });
            _.each(this.elseActions(), function(block) {
                block.decorate();
            });

            return true;
        },

        toJS: function() {
            var conditions = [];
            _.each(this.conditions(), function(condition) {
                conditions.push(condition.toJS());
            });

            var thenActions = [];
            _.each(this.thenActions(), function(block) {
                thenActions.push(block.toJS());
            });

            return _.extend(this._super(), {
                conditions: conditions,
                thenActions: thenActions,
                elseActions: this.getElseActionsJS()
            });
        }
    });
});

define('EventConnectorBlock',['require','EventBlock','knockout','BlockTypes','underscore','OptionsFeed','NameGenerator','OptionsType','BlockFactory'],function(require) {

    'use strict';

    /* globals Promise */
    //region dependencies

    var EventBlock = require('EventBlock'),
        ko = require('knockout'),
        BlockTypes = require('BlockTypes'),
        _ = require('underscore'),
        OptionsFeed = require('OptionsFeed'),
        NameGenerator = require('NameGenerator'),
        OptionsType = require('OptionsType');

    //endregion

    return EventBlock.subClass({
        TYPE: BlockTypes.CONNECTOR_BLOCK,
        TEMPLATE_NAME: 'event-connector-block'
    }, {
        init: function(model, viewModel, scope) {
            var BlockFactory = require('BlockFactory');
            this._super(model, viewModel, scope);

            this.connectorFeed = new OptionsFeed(OptionsType.EVENT_CONNECTOR.value, viewModel.context, model.connectorFeedProperties, scope.controlId);

            this.responseName = ko.observable(model.responseName || NameGenerator.generateName('response', scope.getAttributes()));

            var errorBlocks = [];
            _.each(model.errorBlocks, function(block) {
                errorBlocks.push(BlockFactory.createBlock(viewModel, block, scope));
            });
            this.errorBlocks = ko.observableArray(errorBlocks);

            this.form = viewModel.form();
            viewModel.form.subscribe(function(newForm) {
                this.form = newForm;
            }, this);
        },

        execute: function() {

            var self = this;

            return new Promise(function(resolve, reject) {

                self.connectorFeed.optionsResolver().controlId = self.scope.eventControl.id;
                self.connectorFeed.optionsResolver().loadConnector(self.form).then(function(response) {

                    self.scope.setValue(self.responseName(), response.response);

                    resolve();

                }).catch(function(e) {

                    //ToDo 16.4.5 This should come parsed from the handler
                    var error = JSON.parse(e);

                    _.each(self.errorBlocks(), function(errorBloq) {
                        errorBloq.execute(error);
                    });

                    reject();

                });
            });


        },

        getBundle: function() {
            var bundle = {};
            _.each(this.errorBlocks(), function(block) {
                _.extend(bundle, block.getBundle());
            });

            return bundle;
        },

        decorate: function() {
            _.each(this.errorBlocks(), function(block) {
                block.decorate();
            });

            return true;
        },

        toJS: function() {
            var errorBlocks = [];
            _.each(this.errorBlocks(), function(block) {
                errorBlocks.push(block.toJS());
            });

            return _.extend(this._super(), {
                connectorFeedProperties: this.connectorFeed.toJS().properties,
                errorBlocks: errorBlocks,
                responseName: this.responseName()
            });
        }
    });
});

define('EventErrorBlock',['require','EventActionBlock','knockout','BlockTypes','underscore'],function(require) {

    'use strict';

    //region dependencies

    var EventActionBlock = require('EventActionBlock'),
        ko = require('knockout'),
        BlockTypes = require('BlockTypes'),
        _ = require('underscore');

    //endregion

    return EventActionBlock.subClass({
        TYPE: BlockTypes.ERROR_BLOCK,
        TEMPLATE_NAME: 'event-error-block'
    }, {
        init: function(model, viewModel, scope) {
            this._super(model, viewModel, new viewModel.context.scopeFactory.ErrorScope(viewModel.getCurrentGlobalScope()));
            this.errorCode = ko.observable(model.errorCode || 0);
        },

        execute: function(error) {
            /* jshint eqeqeq: false */
            //We are intentionally using the == comparator
            //Because the errorCode in the server is a string, but we store it as a number
            if (!this.errorCode() || this.errorCode() == error.errorCode) {
                this.scope.setValue('error', error);
                this._super();
            }
        },

        toJS: function() {
            return _.extend(this._super(), {
                errorCode: this.errorCode()
            });
        }
    });
});

define('BlockFactory',['require','UUID','underscore','EventActionBlock','EventIfBlock','EventConnectorBlock','EventErrorBlock','ActionsMap'],function(require) {

    'use strict';

    //region dependencies

    var UUID = require('UUID'),
        _ = require('underscore'),
        EventActionBlock = require('EventActionBlock'),
        EventIfBlock = require('EventIfBlock'),
        EventConnectorBlock = require('EventConnectorBlock'),
        EventErrorBlock = require('EventErrorBlock'),
        ActionsMap = require('ActionsMap');

    //endregion

    return {
        createBlock: function(viewModel, model, scope) {
            //Set default values
            model = _.extend({
                id: UUID.createUuid(),
                type: EventActionBlock.TYPE
            }, model);
            return this[model.type](viewModel, model, scope);
        },

        'ACTION_BLOCK': function(viewModel, model, scope) {
            model = _.extend({
                action: {
                    type: ActionsMap.DO_NOTHING.value
                },
                controlResolver: {}
            }, model);
            return new EventActionBlock(model, viewModel, scope);
        },
        'IF_BLOCK': function(viewModel, model, scope) {
            return new EventIfBlock(model, viewModel, scope);
        },
        'CONNECTOR_BLOCK': function(viewModel, model, scope) {
            model = _.extend({
                connectorFeedProperties: {}
            }, model);
            return new EventConnectorBlock(model, viewModel, scope);
        },
        'ERROR_BLOCK': function(viewModel, model, scope) {
            model = _.extend({
                action: {
                    type: ActionsMap.DO_NOTHING.value
                },
                controlResolver: {}
            }, model);
            return new EventErrorBlock(model, viewModel, scope);
        }
    };
});

define('Presentation',['require','knockout','Form','ControlTypeId','underscore','ControlFactory','BlockFactory','EventReference','TreeUtil','jquery','ControlEventsMap','UUID'],function(require) {

    'use strict';
    /* globals Promise */

    //region dependencies

    var ko = require('knockout'),
        Form = require('Form'),
        ControlTypeId = require('ControlTypeId'),
        _ = require('underscore'),
        ControlFactory = require('ControlFactory'),
        BlockFactory = require('BlockFactory'),
        EventReference = require('EventReference'),
        TreeUtil = require('TreeUtil'),
        $ = require('jquery'),
        ControlEventsMap = require('ControlEventsMap'),
        UUID = require('UUID');

    //endregion

    var DEFAULT_BORDER_COLOR = '#d6dfe6',
        DEFAULT_BACKGROUND_COLOR = '#ffffff';

    return Form.subClass({}, {
        type: ControlTypeId.FORM_PRESENTATION,
        init: function(json, context) {
            this._super(json);
            this.viewModel = context.viewModel;
            context.calls = this.calls;

            _.defaults(json, {
                borderColor: DEFAULT_BORDER_COLOR,
                borderStyle: null,
                borderWidth: null,
                backgroundColor: DEFAULT_BACKGROUND_COLOR,
                properties: {}
            });

            _.extend(this.properties, {
                borderColor: ko.observable(json.borderColor),
                borderStyle: ko.observable(json.borderStyle),
                borderWidth: ko.observable(json.borderWidth),
                backgroundColor: ko.observable(json.backgroundColor)
            });
            this.name = this.properties.name;


            this.globalConnectors = ko.observableArray();
            this.globalScope = new context.scopeFactory.Scope(null, this.globalConnectors);
            this.globalScope.eventControl = this;
            this.viewModel.globalScope = this.globalScope;
            var globalConnectors = [];
            _.each(ko.unwrap(json.properties.globalConnectors), function(connector) {
                globalConnectors.push(BlockFactory.createBlock(context.viewModel, connector, this.viewModel.globalScope));
            }, this);
            this.globalConnectors(globalConnectors);

            var controls = [];
            _.each(json.controls, function(controlData) {
                var row = ControlFactory.createControl(controlData.id, controlData.name, controlData.type, controlData, context, this);
                controls.push(row);
            }, this);
            this.controls = ko.observableArray(controls);

            this.isValid = ko.pureComputed(function() {
                return _.every(this.controls(), function(control) {
                    return control.isValid();
                });
            }.bind(this));

            var events = [];
            _.each(ko.unwrap(json.properties.events), function(event) {
                events.push(new EventReference(event.id, context.viewModel));
            }, this);
            this.events = ko.observableArray(events);
        },

        executeGlobalConnectors: function() {
            var connectorPromise = [];

            _.each(this.globalConnectors(), function(con) {
                if (!con.connectorFeed.properties().skipDuringLoad()) {
                    connectorPromise.push(con.execute());
                }
            });

            return Promise.all(connectorPromise);
        },
        /**
         * Return the current presentation
         * This allows to do form.presentation() in both builder (in which form is a form that has presentations) and renderer (in which form is the presentation)
         * @returns Presentation
         */
        presentation: function() {
            return this;
        },

        executeEvent: function(trigger) {
            var events = [];
            _.each(this.events(), function(eventRef) {
                var eventTrigger = eventRef.event().trigger;
                if (trigger === eventTrigger()) {
                    events.push(eventRef.execute());
                }
            }, this);
            return Promise.all(events);
        },
        executeEventOnAll: function(trigger) {
            var events = [this.executeEvent(trigger)];
            var self = this;
            $.each(self.getAllControls(true), function(i, control) {
                events = events.concat(control.executeEventOnAll(trigger));
            });
            return Promise.all(events);
        },
        getValidEvents: function() {
            return ControlEventsMap.PRESENTATION;
        },
        /** override */
        getAllControls: function(skipControlsInsideRepeatables) {
            //getControls calls a function, in which repeatables skip the children
            //controls calls directly the observable
            return TreeUtil.treeToList(this.controls(), skipControlsInsideRepeatables ? 'getControls' : 'controls');
        },
        /** override */
        findControl: function(controlId) {
            if (controlId === this.id) {
                return this;
            }
            var control = this.findControlAndParent(controlId);
            return control !== null ? control.node : null;
        },
        findClosest: function(id) {
            return this.findControl(id);
        },
        findControlInsideRepeatable: function(controlId) {
            var control = this.findControl(controlId);
            if (!control) {
                _.any(this.getAllControls(true), function(childControl) {
                    if (childControl.isRepeatable()) {
                        control = childControl.findControlInsideRepeatable(controlId);
                        return !!control;
                    }
                });
            }
            return control;
        },
        /** override */
        getAllPresentationControls: function() {
            return _.union([this], this.getAllControls());
        },
        findControlAndParent: function(controlId) {
            return TreeUtil.find(this, 'controls', 'id', controlId);
        },
        getContextForChildren: function(child) {
            return '';
        },
        makeCopy: function() {
            var copy = this.toJS();
            copy.id = UUID.createUuid();
            var controls = [];
            _.each(this.controls(), function(control) {
                controls.push(control.makeCopy());
            });
            copy.controls = controls;
            return copy;
        },
        isRepeatable: function() {
            return false;
        },
        toJS: function() {
            var controls = [];
            _.each(this.controls(), function(control) {
                controls.push(control.toJS());
            });
            var events = [];
            _.each(this.events(), function(event) {
                events.push(event.toJS());
            });
            var globalConnectors = [];
            _.each(this.globalConnectors(), function(connector) {
                globalConnectors.push(connector.toJS());
            });

            return {
                id: this.id,
                name: this.properties.name(),
                description: this.properties.description(),
                borderColor: this.properties.borderColor(),
                borderWidth: this.properties.borderWidth(),
                borderStyle: this.properties.borderStyle(),
                backgroundColor: this.properties.backgroundColor(),
                controls: controls,
                properties: {
                    events: events,
                    globalConnectors: globalConnectors
                }
            };
        }
    });
});

define('EventsTranslator',['require','underscore'],function(require) {

    'use strict';

    //region dependencies

    var _ = require('underscore');

    //end region

    return {
        translate: function(eventActions) {
            _.each(eventActions, function(eventAction) {
                var blocks = eventAction.blocks();
                _.each(blocks, function(block) {
                    block.decorate();
                });

                var connectors = eventAction.connectors();
                _.each(connectors, function(connector) {
                    connector.decorate();
                });
            });
        }
    };
});

define('EventTrigger',['require','Class','knockout','BlockFactory','jquery','underscore'],function(require) {

    'use strict';

    /* globals Promise */

    //region dependencies

    var Class = require('Class'),
        ko = require('knockout'),
        BlockFactory = require('BlockFactory'),
        $ = require('jquery'),
        _ = require('underscore');

    //endregion

    return Class.subClass({}, {
        // jshint maxparams:7
        init: function(id, name, trigger, controlId, blocks, connectors, viewModel) {
            this.id = id;
            this.name = name;
            this.controlId = controlId;
            this.trigger = ko.observable(trigger);
            this.viewModel = viewModel;

            this.connectors = ko.observableArray();
            this.scope = new viewModel.context.scopeFactory.Scope(viewModel.getCurrentGlobalScope(), this.connectors);
            this.scope.controlId = controlId;

            var connectorArray = [];
            _.each(connectors, function(connector) {
                connectorArray.push(BlockFactory.createBlock(viewModel, connector, this.scope));
            }, this);
            this.connectors(connectorArray);

            var blocksArray = [];
            _.each(blocks, function(block) {
                blocksArray.push(BlockFactory.createBlock(viewModel, block, this.scope));
            }, this);
            this.blocks = ko.observableArray(blocksArray);

        },

        execute: function(eventControl) {

            this.scope.clearValues();
            $('.spinnerContainer').stop().fadeIn();
            var self = this;

            var promises = [];
            _.each(self.connectors(), function(connector) {
                self.scope.eventControl = eventControl;
                promises.push(connector.execute());
            });

            return new Promise(function(resolve) {
                Promise.all(promises).then((function() {

                    //Create a new promise
                    var promise = Promise.resolve();
                    _.each(ko.unwrap(self.blocks()), function(block) {
                        //For each block, execute the block
                        promise = promise.then(function() {
                            //Make sure that the eventControl is correct
                            self.scope.eventControl = eventControl;
                            //If the block doesn't return a promise, create and resolve a new promise
                            return block.execute() || Promise.resolve();
                        });
                    });
                    //After all blocks have run, stop the spinner
                    promise.then(function() {
                        $('.spinnerContainer').stop().fadeOut();
                        resolve();
                    });
                }).bind(self)).catch((function() {
                    $('.spinnerContainer').stop().fadeOut();
                    resolve();
                }).bind(self));
            });
        },

        toJS: function() {
            var blocks = [];
            _.each(this.blocks(), function(block) {
                blocks.push(block.toJS());
            });
            var connectors = [];
            _.each(this.connectors(), function(connector) {
                connectors.push(connector.toJS());
            });
            return {
                id: this.id,
                name: this.name,
                trigger: this.trigger(),
                controlId: this.controlId,
                blocks: blocks,
                connectors: connectors
            };
        }
    });
});

define('StylePreprocessor',['require','Class'],function(require) {

    'use strict';


    //region dependencies

    var Class = require('Class');

    //endregion

    return Class.subClass({
        sanitize: function(styleContent, selector) {
            selector = selector ? selector + ' ' : '';
            var processedStyle = '';

            var rules = this.rulesForCssText(styleContent);
            for (var i = 0; i < rules.length; i++) {
                var cssSelectors = rules[i].selectorText.split(','),
                    formattedSelector = rules[i].cssText;
                for (var j = 0; j < cssSelectors.length; j++) {
                    formattedSelector = formattedSelector.replace(cssSelectors[j], selector + cssSelectors[j]);
                }
                processedStyle += formattedSelector + ' ';
            }
            return processedStyle;
        },
        rulesForCssText: function(styleContent) {
            var doc = document.implementation.createHTMLDocument(''),
                styleElement = document.createElement('style');

            styleElement.textContent = styleContent;
            // the style will only be parsed once it is added to a document
            doc.body.appendChild(styleElement);

            return styleElement.sheet.cssRules;
        }
    }, {});
});

define('FormExtensions',['require','knockout','jquery','underscore','EventTrigger','StylePreprocessor','Class'],function(require) {

    'use strict';

    //region dependencies

    var ko = require('knockout'),
        $ = require('jquery'),
        _ = require('underscore'),
        EventTrigger = require('EventTrigger'),
        StylePreprocessor = require('StylePreprocessor'),
        Class = require('Class');

    //endregion

    return Class.subClass({}, {
        init: function(json, context) {
            _.defaults(json, {
                eventActions: [],
                stylesheet: {}
            });

            this.stylesheet = ko.observable(json.stylesheet);

            var eventActions = [];
            _.each(json.eventActions, function(event) {
                eventActions.push(new EventTrigger(event.id, event.name, event.trigger, event.controlId, event.blocks, event.connectors, context.viewModel));
            }, this);
            this.eventActions = ko.observableArray(eventActions);

            this.applyStylesheet(this.stylesheet(), context);
        },
        findEvent: function(id) {
            return _.find(this.eventActions(), function(e) {
                return e.id === id;
            });
        },
        applyStylesheet: function(stylesheet, context) {
            var className = context.getScope() + '-applied-stylesheet';
            if (_.isEmpty(context.config().domIdPrefix)) {
                //only remove if root renderer/builder tag.
                $('.' + className).remove();
            }
            if (!_.isEmpty(stylesheet) && stylesheet.id) {
                //need to fetch style content
                var self = this;
                context.config().cssHandler.getResolvedControl(stylesheet.id).then(function(stylesheetData) {
                    if (!$.isEmptyObject(stylesheetData)) {
                        self._addStyleSheetTag(className, stylesheetData.content);
                    }
                });
            } else {
                //style content sent directly
                this._addStyleSheetTag(className, stylesheet);
            }
        },
        _addStyleSheetTag: function(className, cssContent) {
            if (!_.isEmpty(cssContent)) {
                var style = document.createElement('style');
                style.className = className + ' applied-stylesheet';
                var stylesheetContent = StylePreprocessor.sanitize(cssContent, '.canvas-container');
                style.appendChild(document.createTextNode(stylesheetContent));
                document.head.appendChild(style);
            }
        },
        toJS: function() {
            var eventActions = [];
            _.each(this.eventActions(), function(event) {
                eventActions.push(event.toJS());
            });
            return {
                eventActions: eventActions,
                stylesheet: $.isEmptyObject(this.stylesheet()) ? this.stylesheet() : {
                    id: this.stylesheet().id
                }
            };
        }
    });
});

define('RendererForm',['require','underscore','jquery','Presentation','EventsId','EventsTranslator','knockout','Payload','FormExtensions','PayloadUtil'],function(require) {

    'use strict';

    //region dependencies

    var _ = require('underscore'),
        $ = require('jquery'),
        Presentation = require('Presentation'),
        EventsId = require('EventsId'),
        EventsTranslator = require('EventsTranslator'),
        ko = require('knockout'),
        Payload = require('Payload'),
        FormExtensions = require('FormExtensions'),
        PayloadUtil = require('PayloadUtil');

    //endregion

    return Presentation.subClass({}, {
        init: function(json, context) {
            this._super(json, context);

            this.extensions = new FormExtensions(json, context);
            this.payload = new Payload(json, context);
            //adding payload to the context, used to get options dynamically.
            context.payload(this.payload);

            this.controlsLoaded = ko.observable(this.controls().length === 0);
            this.loadEventsExecuted = ko.observable(!!this.viewModel.staticForm);

            var self = this;
            this.loaded = ko.pureComputed({
                read: function() {
                    return self.controlsLoaded() && self.loadEventsExecuted();
                }
            });

        },
        initPayloadAndRunEvents: function() {
            var self = this;
            self.populateValues();

            EventsTranslator.translate(self.extensions.eventActions());
            //Finally run the onLoad event
            setTimeout(function() {
                self.executeOnLoadEvents();
            });
        },
        populateValues: function() {

            var payloadBindings = this.payload.getBindings();
            if (_.size(payloadBindings) > 0) {
                //Skip the controls inside repeatables, as they are set by its parent
                _.each(this.getAllControls(true), function(control) {
                    PayloadUtil.initValueFromPayload(control, payloadBindings);
                }, this);

                //set the values in the payload Context
                _.each(payloadBindings, function(value, key) {
                    //Only set values that are not observables,
                    // as values that are observables are already set by controls
                    // and each control may have a custom setValue (ie. DateValueDecorator)
                    // overriding that can create issues
                    if (!this.payload.payloadContext.isObservableDefined(key)) {
                        this.payload.payloadContext.setValue(key, value);
                    }
                }, this);
            }
        },
        updateBindings: function() {
            this.payload.updateBindings(this.controls);
        },
        getBindings: function() {
            this.updateBindings();
            return this.payload.getBindings();
        },
        executeOnLoadEvents: function() {
            var self = this;
            $('.spinnerContainer').stop().fadeIn();

            return this.executeGlobalConnectors().then(function() {
                return self.executeEventOnAll(EventsId.ON_LOAD.value).then(function() {
                    self.loadEventsExecuted(true);
                    $('.spinnerContainer').stop().fadeOut();
                });
            });
        },
        afterRenderingRowControls: function(dom) {
            var self = this;
            var subscribe = self.viewModel.context.runningAsyncTemplates.subscribe(function(val) {
                if (val === 0) {
                    subscribe.dispose();
                    self.viewModel.context.focusControl($(dom).parents('form-renderer').find('[autofocus]'));
                    self.controlsLoaded(true);
                }
            });
        },
        toJS: function() {
            return _.extend(this._super(), this.extensions.toJS(), {
                payload: this.payload.toJS(),
                calls: this._callsToJS()
            });
        }
    });
});

define('ComputedExtension',['require','EventsId','underscore','FormsLogger','ControlReferenceMap','Class'],function(require) {

    'use strict';

    //region dependencies

    var EventsId = require('EventsId'),
        _ = require('underscore'),
        FormsLogger = require('FormsLogger'),
        ControlReferenceMap = require('ControlReferenceMap'),
        Class = require('Class');

    //endregion

    var CHANGE_EVENTS = [
        EventsId.ON_CHANGE.value,
        EventsId.ON_CHILDREN_CHANGE.value,
        EventsId.ON_ADD_ROW.value,
        EventsId.ON_REMOVE_ROW.value
    ];

    var structuralReferences = [
        ControlReferenceMap.FIRST.value,
        ControlReferenceMap.LAST.value,
        ControlReferenceMap.INDEX.value,
        ControlReferenceMap.SELECTED.value
    ];

    function pushUnique(array, newElement) {
        array = array || [];
        if (!_.contains(array, newElement)) {
            array.push(newElement);
        }
        return array;
    }
    return Class.subClass({}, {
        /**
         * Map with [controlId]: computedControl
         */
        structuralControlDependencies: {},
        controlDependencies: {},
        scopeDependencies: {},
        dataDependencies: {},
        subscriptions: [],
        viewModel: undefined,
        init: function(viewModel) {
            this.viewModel = viewModel;
        },

        /*jshint camelcase: false */
        _register_CONSTANT: function() {
            //Nothing to Do, a constant never changes
        },
        /*jshint camelcase: false */
        _register_DATA: function(control, value) {
            var valueName = value.expression();
            var observableValue = this.viewModel.context.payloadContext.getObservableValue(valueName, true);

            this.subscriptions.push(observableValue.subscribe(this.reEvaluateOnData.bind(this, control)));

            this.dataDependencies[valueName] = pushUnique(this.dataDependencies[valueName], control);
        },
        /*jshint camelcase: false */
        _register_CONTROL: function(control, value) {
            this._registerControlDependency(value.controlResolver, control);
        },
        /*jshint camelcase: false */
        _register_FUNCTION: function(control, value) {
            _.each(value.propertyParam(), function(paramValue) {
                this[this._getRegisterFunction(paramValue)](control, paramValue);
            }, this);
        },
        /*jshint camelcase: false */
        _register_SCOPE: function(control, value) {
            var scopeName = value.expression().split('.')[0];

            var connector = _.find(this.viewModel.form().globalConnectors(), function(c) {
                return c.responseName() === scopeName;
            });

            this.scopeDependencies[connector.id] = pushUnique(this.scopeDependencies[connector.id], control);
        },

        /**
         * registers the control as a dependency of controlResolver, to be updated when the value of controlResolver changes
         * */
        _registerControlDependency: function(controlResolver, control) {
            var depControl = controlResolver.resolve(control.viewModel.form(), control);
            // By default use __undefined__, to indicate a control that is not possible to resolve now,
            //  but may be valid in the future (ie. a FRIST selector of an empty table
            var depControlIds = ['__undefined__'];
            if (!_.isEmpty(depControl)) {
                if (!_.isArray(depControl)) {
                    depControlIds = [depControl.id];
                } else {
                    depControlIds = _.map(depControl, function(ctrl) {
                        return ctrl.id;
                    });
                }
            }
            //use depControlsIds as an array, to allow multiple dependencies (ie. multiple selection)
            _.each(depControlIds, function(depControlId) {
                this.controlDependencies[depControlId] = pushUnique(this.controlDependencies[depControlId], control);
            }, this);

            this._registerStructuralControlDependency(controlResolver, control.viewModel.form(), control, depControlIds);
        },

        /**
         * register controls that when the  structure changes, we need to recalculate the dependencies
         * ie. a selector inside a table, when the table changes, we need to recalulate the dependencies of the FIRST, LAST, etc
         */
        _registerStructuralControlDependency: function(controlResolver, context, control, depControlIds) {
            //If context is empty (because resolveChildContext didnt find anything) or this is SELF reference
            //  dont add a structural dependency
            if (!_.isEmpty(context) && _.contains(structuralReferences, controlResolver.reference())) {

                var parentControl = controlResolver.getControl(context);
                if (!_.isEmpty(parentControl)) {
                    //Add the dependency
                    _.each(depControlIds, function(depControlId) {
                        this.structuralControlDependencies[parentControl.id] = pushUnique(this.structuralControlDependencies[parentControl.id], depControlId);
                    }, this);

                    //recursive
                    this._registerStructuralControlDependency(
                        controlResolver.childControl(),
                        controlResolver.resolveChildContext(context, control),
                        control,
                        depControlIds
                    );
                }
            }

        },
        _getRegisterFunction: function(value) {
            return '_register_' + value.type().value;
        },

        _evaluateComputed: function(control) {
            FormsLogger.getLogger().count('[COUNT] [COMPUTED]');
            control.properties.computedValue.scope.eventControl = control;
            control.setValue(control.properties.computedValue.resolve(this.viewModel));
        },
        _evaluateOnLoad: function(control) {
            if (control.properties.computed && control.properties.computed()) {
                //Register the dependencies
                this[this._getRegisterFunction(control.properties.computedValue)](control, control.properties.computedValue);
                this._evaluateComputed(control);
            }
        },

        reEvaluateOnControl: function(trigger, control) {
            if (trigger === EventsId.ON_LOAD.value) {
                //If this is ON_LOAD, we need to evaluate the control if it is computed, and register the dependencies
                this._evaluateOnLoad(control);
            } else if (!!control && _.contains(CHANGE_EVENTS, trigger)) {
                this._reEvaluateOnControl(trigger, control);
            } else if (!!control && trigger === EventsId.ON_SELECTION_CHANGE.value) {
                //trigger check for recalculation, if we have some SELECTED dependency
                this._reCalculateDependencies(control);
            }

        },
        _reCalculateDependencies: function(control) {
            var depIds = this.structuralControlDependencies[control.id];
            this.structuralControlDependencies[control.id] = [];
            _.each(depIds, function(depControlId) {
                var controls = this.controlDependencies[depControlId];
                this.controlDependencies[depControlId] = [];
                _.each(controls, function(control) {
                    this._evaluateOnLoad(control);
                }, this);
            }, this);
        },
        _reEvaluateOnControl: function(trigger, control) {
            //If this is a Change event, we need to get the list of all dependant controls to re-evaluate them
            var controlsToReEvaluate = [];
            //Get the controls that depend on this
            controlsToReEvaluate = _.union(controlsToReEvaluate, this.controlDependencies[control.id]);

            //Execute the re-evaluations

            _.each(controlsToReEvaluate, function(dependantControl) {
                this._evaluateComputed(dependantControl);
            }, this);

            //If this control has a parent, we need to trigger an event to make sure that all controls are re-evaluated
            //An example of this is A SUMMATION function of a table. A change in any of the controls will trigger the need for the table to re-evaluate as a whole
            if (control.getParent) {
                this.reEvaluateOnControl(EventsId.ON_CHILDREN_CHANGE.value, control.getParent());
            }

            //check if we need to recalculate some dependecy
            this._reCalculateDependencies(control);

        },
        reEvaluateOnScope: function(scopeChanged) {
            _.each(this.scopeDependencies[scopeChanged], function(dependantControl) {
                this._evaluateComputed(dependantControl);
            }, this);
        },
        reEvaluateOnData: function(control) {
            this._evaluateComputed(control);
        }
    });
});

define('DomPolyfill',['require','underscore'],function (require) {
	'use strict';
	/* global Element*/
	var _ = require('underscore');


	/**
	 * Each property inside of polifills is a different element to which functions will be added (named to be easier to test)
	 * Each has an element, which will be extended, and an object of functions (named to be easier to test)
	 */
	var polyfills = {
		'Element': {
			'element': Element.prototype,
			'functions': {
				'remove': function () {
					/* valid this */
					var parentNode = this.parentNode;
					if (parentNode) {
						parentNode.removeChild(this);
					}
				}
			}
		}
	};

	_.each(polyfills, function (polyfill) {
		_.each(polyfill.functions, function (method, key) {
			if (!polyfill.element[key]) {
				polyfill.element[key] = method;
			}
		});
	});


	return polyfills;
});

define('RendererViewModel',['require','RendererContext','knockout','jquery','Form','EventsId','RendererLoadPreProcessor','RendererForm','ComputedExtension','FormsLogger','FormValidator','RendererId','DomPolyfill'],function(require) {
    'use strict';

    //region dependencies

    var RendererContext = require('RendererContext'),
        ko = require('knockout'),
        $ = require('jquery'),
        Form = require('Form'),
        EventsId = require('EventsId'),
        RendererLoadPreProcessor = require('RendererLoadPreProcessor'),
        RendererForm = require('RendererForm'),
        ComputedExtension = require('ComputedExtension'),
        FormsLogger = require('FormsLogger'),
        FormValidator = require('FormValidator'),
        RendererId = require('RendererId');
    require('DomPolyfill');
    //endregion

    /* global Promise */

    return function(params) {
        var self = this;
        //static forms only show the UI, no events are executed and no Data is passed to the controls.
        this.staticForm = ko.unwrap(params.staticForm);
        //We need to have the real form id, if this is a reference, to call the correct connector calls
        this.formId = ko.unwrap(params.formId) || ko.unwrap(params.value).form.id;
        this.presentationId = ko.unwrap(params.presentationId) || null;

        this.onValidStateChange = params.onValidStateChange || function() {};

        self.form = ko.observable();
        self.computedExtension = new ComputedExtension(self);

        self.load = function(modelData, loadedCallback) {
            FormsLogger.getLogger().time('[LOAD]');
            var rendererModel = RendererLoadPreProcessor.preProcess(modelData);

            self.rendererContext = new RendererContext(rendererModel, self, ko.unwrap(params.value).controlBindings, ko.unwrap(params.value).bindingContext);
            self.context = self.rendererContext;
            self.form(new RendererForm(rendererModel.form, self.rendererContext));

            if (!self.staticForm) {
                self.form().initPayloadAndRunEvents();
            }
            var loadedSubscription = self.form().loaded.subscribe(function() {
                loadedSubscription.dispose();
                if (loadedCallback) {
                    loadedCallback();
                }
            });

            //Subscribe to the isValid of the form, which is a pureComputed, and trigger the callback
            self.form().isValid.subscribe(function(newValue) {
                self.onValidStateChange(newValue);
            });
            self.onValidStateChange(self.form().isValid());

            //Return a promise that resolves when the form finish loading
            //To get this promise, it is needed to trigger the event using:
            // $('form-renderer').triggerHandler('load', formData)
            return RendererForm.resolveOnLoaded(self.form());

        };

        self.getValues = function() {
            self.form().updateBindings();
            self.form().executeEventOnAll(EventsId.ON_SUBMIT.value);
            return {
                payload: self.form().payload.toJS()
            };
        };

        //region Async get values functions
        /**
         * Validates the data and resolves
         * @param resolve
         * @param reject
         * @param isSubmitting
         */
        function validateAndResolve(resolve, reject, isSubmitting) {
            self.form().updateBindings();
            if (!isSubmitting || self.validateData()) {
                resolve({
                    payload: self.form().payload.toJS()
                });
            } else {
                reject();
            }
        }

        /**
         * Executes the on submit events, and waits for the events queue to be empty
         * @param resolve
         * @param reject
         * @param isSubmitting
         */
        function executeOnSubmitAndResolve(resolve, reject, isSubmitting) {
            self.form().updateBindings();
            if (isSubmitting) {
                self.form().executeEventOnAll(EventsId.ON_SUBMIT.value).then(function() {
                    return self.rendererContext.eventsQueue.resolveWhenEmpty();
                }).then(function() {
                    validateAndResolve(resolve, reject, isSubmitting);
                });
            } else {
                validateAndResolve(resolve, reject, isSubmitting);
            }

        }

        /**
         * Waits for the form to be loaded and for the current event queue to be empty
         * before resolving to the current payload
         * @param isSubmitting: is true, execute ON_SUBMIT events and validate data
         * @returns {Promise}
         */
        function waitForLoadingAndResolve(isSubmitting) {
            return new Promise(function(resolve, reject) {
                //Wait for the form to be finished loading
                Form.resolveOnLoaded(self.form()).then(function() {
                    return self.rendererContext.eventsQueue.resolveWhenEmpty();
                }).then(function() {
                    executeOnSubmitAndResolve(resolve, reject, isSubmitting);
                });

            });
        }
        //endregion

        self.submit = function() {
            return waitForLoadingAndResolve(true);
        };

        self.save = function() {
            return waitForLoadingAndResolve(false);
        };

        self.getCurrentGlobalScope = function() {
            return self.globalScope;
        };

        self.getBindings = function() {
            return self.form().getBindings();
        };

        //using always readOnlyFormValidator to avoid a OJET bug.
        //http://myforums.oracle.com/jive3/thread.jspa?threadID=2136163
        //when bug is fixed FormValidator should be used.
        self.formValidator = new FormValidator();

        self.validateData = function() {
            return self.formValidator.validate(self.form().getAllControls(true), self.rendererContext);
        };

        function getRendererTag(elements) {
            var $divs = $($(elements).find('div')[0]);
            return $divs.closest(RendererId.FORM_RENDERER);
        }

        self.registerCustomEvents = function(elements) {
            var formRendererTag = getRendererTag(elements);
            //registering getValues
            $(formRendererTag).on('getValues', self.getValues);
            $(formRendererTag).on('submit', self.submit);
            $(formRendererTag).on('save', self.save);

            //registering getBindings
            $(formRendererTag).on('getBindings', self.getBindings);

            //registering validateData
            $(formRendererTag).on('validateData', self.validateData);

            //registering load
            $(formRendererTag).on('load', function(event, data) {
                return self.load(data);
            });
        };

        /* istanbul ignore next */
        self.detachCustomListeners = function(elements) {
            var formRendererTag = getRendererTag(elements);
            //removing getValues listener
            var $formRenderer = $(formRendererTag);
            $formRenderer.off('getValues');
            $formRenderer.off('submit');
            $formRenderer.off('save');
            //removing getBindings listener
            $formRenderer.off('getBindings');
            //removing validateData listener
            $formRenderer.off('validateData');
            //removing load listener
            $formRenderer.off('load');

            //cleaning everything to avoid a memory leak.
            $formRenderer.find('*').each(function() {
                $(this).unbind();
            });
        };


        //loading the model with the parameters.
        self.load(params.value, params.loadedCallback);
    };

});

define('IconComponent',['require','knockout'],function(require) {

    'use strict';

    //region dependencies
    var ko = require('knockout');
    //endregion

    return function(params) {
        var self = this;
        self.styleClass = params.styleClass;
        self.icon = ko.utils.unwrapObservable(params.icon);
        self.alt = params.alt || '';
    };
});

define('MediaQueryInspector',['require','MediaQueryType','knockout'],function(require) {

    'use strict';

    //region dependencies

    var MediaQueryType = require('MediaQueryType'),
        ko = require('knockout');

    //end region

    return function() {
        var self = this;

        self.findMediaQuery = function() {
            var mediaQuery = MediaQueryType.EXTRA_LARGE;
            for (var type in MediaQueryType) {
                if (MediaQueryType.hasOwnProperty(type) && self._mediaMatches(MediaQueryType[type].query)) {
                    mediaQuery = MediaQueryType[type];
                    break;
                }
            }
            return mediaQuery;
        };

        self.mediaQueryChanged = function() {
            self.mediaQuery(self.findMediaQuery());
        };

        self._mediaMatches = function(media) {
            return window.matchMedia(media).matches;
        };

        self.mediaQuery = ko.observable(self.findMediaQuery());
    };
});

define('mediaBindingHandler',['require','knockout','jquery','MediaQueryInspector'],function(require) {

    'use strict';

    //region dependencies

    var ko = require('knockout'),
        $ = require('jquery'),
        MediaQueryInspector = require('MediaQueryInspector');

    //endregion
    ko.bindingHandlers.ifMedia = {
        init: function(element) {
            var mediaQueryInspector = ko.bindingHandlers.ifMedia.mediaQueryInspector;
            $(window).on('resize orientationchange load', mediaQueryInspector.mediaQueryChanged);
            ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                $(window).off('resize orientationchange load', mediaQueryInspector.mediaQueryChanged);
            });
        },
        preprocess: function(val, name, addBinding) {
            addBinding('if', 'ko.bindingHandlers.ifMedia.mediaQueryInspector.mediaQuery().accept(' + val + ')');
            return val;
        }
    };

    ko.bindingHandlers.ifMedia.mediaQueryInspector = new MediaQueryInspector();
});

define('RenderingQueue',['require','knockout','jquery'],function(require) {

    'use strict';

    //region dependencies

    var ko = require('knockout'),
        $ = require('jquery');

    //end region

    return function(element, bindingContext, asyncRenderer) {
        var templateData = asyncRenderer.getTemplateData();
        var list = ko.unwrap(templateData.foreach);
        var afterLazyRenderAll = templateData.afterLazyRenderAll || function() {};
        var pageSize = ko.unwrap(templateData.pageSize) || 1;
        var queue = [];

        //render temporary placeholders.
        var temp = $(asyncRenderer.getPlaceholder());
        for (var i = 0; i < list.length; i++) {
            var innerBindingContext = bindingContext.createChildContext(list[i]);
            var newNode = $(asyncRenderer.getPlaceholder());
            temp.append(newNode);
            queue.push(asyncRenderer.renderTemplate.bind(asyncRenderer, innerBindingContext, newNode));
        }
        temp.children().appendTo(element);


        /**
         * render the current Page.
         * If all the elements have been rendered, then will execute the callback.
         * @param queue elements in queue
         * @param i the current index (beginning of page)
         * @param pageSize the amount of elements per page
         * @param afterLazyRenderAll callback when all the elements have been executed.
         */
        var executeQueuePage = function(queue, i, pageSize, afterLazyRenderAll) {
            for (var j = 0; j < pageSize; j++) {
                queue[i + j]();
                if (i + j === queue.length - 1) {
                    afterLazyRenderAll(element);
                }
            }
        };

        /**
         * will start rendering the controls in intervals, based on a page size.
         */
        this.execute = function() {
            setTimeout(function() {
                for (var i = 0; i < queue.length;) {
                    var remaining = queue.length - i;
                    if (remaining >= pageSize) {
                        setTimeout(executeQueuePage.bind(null, queue, i, pageSize, afterLazyRenderAll), 10);
                        i += pageSize;
                    } else {
                        setTimeout(executeQueuePage.bind(null, queue, i, 1, afterLazyRenderAll), 10);
                        i++;
                    }
                }
            }, 10);
        };
    };
});

define('AsyncRenderer',['require','knockout','jquery'],function(require) {

    'use strict';

    //region dependencies
    var ko = require('knockout'),
        $ = require('jquery');
    //end region

    return function(templateData) {

        this._templateData = templateData;

        /**
         * render a template using ths ko.renderTemplate method.
         * @param innerBindingContext
         * @param node
         */
        this.renderTemplate = function(innerBindingContext, node) {
            if (this._templateData.as) {
                innerBindingContext[this._templateData.as] = innerBindingContext.$data;
            }
            ko.renderTemplate(ko.unwrap(this._templateData.name), innerBindingContext, this._templateData, node, 'replaceNode');
        };

        /**
         * listen and react to modification changes (add, remove, sort)
         * @param element
         * @param bindingContext
         */
        this.subscribeToChanges = function(element, bindingContext) {
            var self = this;
            var subscribe = this._templateData.foreach.subscribe(function(changes) {

                var removeChanges = [];
                var addChanges = [];
                ko.utils.arrayForEach(changes, function(change) {
                    switch (change.status) {
                        case 'added':
                            addChanges.push(change);
                            break;
                        case 'deleted':
                            removeChanges.push(change);
                            break;
                    }
                });

                //first remove elements in reverse order to preserve the index.
                removeChanges = removeChanges.reverse();
                for (var b = 0; b < removeChanges.length; b++) {
                    $($(element).children().get(removeChanges[b].index)).remove();
                }


                //add changes in the order they came.
                for (var i = 0; i < addChanges.length; i++) {
                    var change = addChanges[i];
                    var innerBindingContext = bindingContext.createChildContext(change.value);
                    var newNode = $(self.getPlaceholder());

                    if (change.index) {
                        var beforeNode = $($(element).children().get(change.index - 1));
                        newNode.insertAfter(beforeNode);
                    } else {
                        $(element).prepend(newNode);
                    }

                    setTimeout(self.renderTemplate.bind(self, innerBindingContext, newNode), 10);
                }
            }, self, 'arrayChange');

            ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                subscribe.dispose();
            });
        };

        /**
         * template for placeholder elements (displayed while the real node is in the queue).
         * @returns {string} the template.
         */
        this.getPlaceholder = function() {
            var temporaryNodeClass = ko.unwrap(this._templateData.hideLoading) ? '' : 'loading__placeholder';
            return '<div class="' + temporaryNodeClass + '"></div>';
        };

        this.getTemplateData = function() {
            return this._templateData;
        };
    };
});

define('AsyncTemplateBinding',['require','RenderingQueue','AsyncRenderer'],function(require) {

    'use strict';

    //region dependencies
    var RenderingQueue = require('RenderingQueue'),
        AsyncRenderer = require('AsyncRenderer');

    //end region

    return {
        init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
            var templateData = valueAccessor();
            var asyncRenderer = new AsyncRenderer(templateData);

            if (templateData.foreach.subscribe) {
                asyncRenderer.subscribeToChanges(element, bindingContext);
            }

            var queue = new RenderingQueue(element, bindingContext, asyncRenderer);

            //start executing the templates.
            queue.execute();

            //descendant bindings are managed by the AsyncTemplateRenderer
            return {
                'controlsDescendantBindings': true
            };
        }
    };
});

define('knockoutExtensions',['require','knockout','underscore','jquery','AsyncTemplateBinding'],function(require) {

    'use strict';

    //region dependencies

    var ko = require('knockout'),
        _ = require('underscore'),
        $ = require('jquery'),
        AsyncTemplateBinding = require('AsyncTemplateBinding');

    //endregion


    ko.subscribable.fn.subscribeChanged = function(callback) {
        var oldValue;
        var oldValueSubscription = this.subscribe(function(_oldValue) {
            oldValue = _.clone(_oldValue);
        }, this, 'beforeChange');

        var newValueSubscription = this.subscribe(function(newValue) {
            callback(newValue, oldValue);
        });

        return {
            dispose: function() {
                oldValueSubscription.dispose();
                newValueSubscription.dispose();
            }
        };
    };

    ko.bindingHandlers.refresh = {
        init: function(element, updatedObservable, allBindings) {
            var subscription = updatedObservable().subscribe(function() {
                var componentType = allBindings().ojComponent.component;
                $(element)[componentType]('refresh');
            });

            ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                subscription.dispose();
            });
        }
    };

    /* istanbul ignore next */
    ko.bindingHandlers.clean = {
        init: function(element, scope) {
            ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                $('.' + scope() + '-applied-stylesheet').remove();
            });
        }
    };

    /**
     * render a particular template foreach element using timeout to avoid freezing the UI thread.
     * It is recommended for large lists that will not change much after being rendered.
     * Following properties are supported:
     * - name: template name
     * - foreach: list of elements.
     * - afterLazyRenderAll[optional]: to be called when all the elements have been rendered
     * - pageSize [optional]: Number of elements to be rendered in one cycle. Default value is 1.
     * - hideLoading: By default a loading placeholder is shown, to avoid it set this flag to true.
     * @type {{init: init}}
     */
    ko.bindingHandlers.asyncTemplate = AsyncTemplateBinding;

    /**
     * subscribe to a DOM element render and remove.
     * afterRender will be called as soon as the binding is initialized.
     * beforeRemove will be called when the node is being disposed.
     * @type {{init: init}}
     */
    ko.bindingHandlers.subscribe = {
        init: function(element, valueAccessor) {
            var callbacks = valueAccessor();

            callbacks.afterRender(element);

            ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                callbacks.beforeRemove(element);
            });
        }
    };

    /**
     * Opposite to apply bindings. Use this to clean the ko and oj context for a previously applied binding.
     * It also clears any jquery event bind registered.
     * @param $node jquery node where pointing to the DOM element where the binding was originally applied
     * @param remove true to remove the DOM element, false just to clean the context.
     */
    ko.unApplyBindings = function($node, remove) {
        // unbind events
        $node.find('*').each(function() {
            $(this).off();
            $(this).unbind();
        });

        $node.off();

        // Remove KO subscriptions and references
        ko.cleanNode($node[0]);
        $node.find('*').each(function() {
            $(this).remove();
        });

        if (remove) {
            ko.removeNode($node[0]);
        }
    };
});

define('HandleEventsBinding',['require','knockout','jquery','underscore','EventsId'],function(require) {

    'use strict';

    //region dependencies

    var ko = require('knockout'),
        $ = require('jquery'),
        _ = require('underscore'),
        EventsId = require('EventsId');

    //endregion

    var EVENTS_TO_IGNORE = [
        //This events are subscribed on ON_EXPAND_TOGGLE
        EventsId.ON_EXPAND.value,
        EventsId.ON_COLLAPSE.value,
        //onLoad is not bind to element, is called when the form finishes loading (load on RendererViewModel)
        EventsId.ON_LOAD.value,
        //onSubmit is triggered by the submit of the form (getValues on RendererViewModel)
        EventsId.ON_SUBMIT.value,
        //This event is subscribed during ON_SELECT
        EventsId.ON_UNSELECTED.value,
        //This event is executed directly by the table
        EventsId.ON_ADD_ROW.value,
        EventsId.ON_REMOVE_ROW.value
    ];

    /**
     * The handle events binding adds the JQuery events binding of the form
     * to the control
     * The expected parameter is the control that will execute the event
     * The valid list of events is deduced by the control type
     * @type {{init: Function}}
     */
    ko.bindingHandlers.handleEvents = {
        init: function(element, valueAccessor) {
            var control = ko.unwrap(valueAccessor()),
                $el = $(element);

            var events = control.getValidEvents();
            var subscriptions = [];
            _.each(events, function(event) {
                var executeThisEvent = control.eventsQueue.execute.bind(this, control, event);

                if (_.contains(EVENTS_TO_IGNORE, event.value)) {
                    return;
                }

                switch (event.value) {
                    case EventsId.ON_CHANGE.value:
                        subscriptions.push(control.value.subscribe(executeThisEvent));
                        break;
                    case EventsId.ON_EXPAND_TOGGLE.value:
                        subscriptions.push(control.properties.expanded.subscribe(function(newValue) {
                            /**
                             * Execute the expand Toggle,
                             * then execute the correct event
                             */
                            executeThisEvent();
                            if (!!newValue) {
                                control.eventsQueue.execute(control, EventsId.ON_EXPAND);
                            } else {
                                control.eventsQueue.execute(control, EventsId.ON_COLLAPSE);
                            }
                        }));
                        break;
                    case EventsId.ON_SELECTED.value:
                        var parent = control.getParent();
                        var index = parent.controls().indexOf(control);
                        subscriptions.push(parent.properties.selectedPosition.subscribeChanged(function(newValue, oldValue) {
                            if (oldValue === index) {
                                control.eventsQueue.execute(control, EventsId.ON_UNSELECTED);
                            }
                            if (newValue === index) {
                                control.eventsQueue.execute(control, EventsId.ON_SELECTED);
                            }
                        }));

                        break;
                    default:
                        $el.on(event.event, executeThisEvent);
                }
            });

            ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                //Dispose of the subscriptions
                _.each(subscriptions, function(subs) {
                    subs.dispose();
                });
            });

        }
    };
});

define('RendererComponent',['require','RendererViewModel','IconComponent','knockout','promise','RendererTemplateLoader','mediaBindingHandler','knockoutExtensions','HandleEventsBinding','!text!iconTemplate','!text!rendererTemplate'],function(require) {

    'use strict';

    //region dependencies

    var RendererViewModel = require('RendererViewModel'),
        IconComponent = require('IconComponent'),
        ko = require('knockout');

    require('promise');
    require('RendererTemplateLoader');
    require('mediaBindingHandler');
    require('knockoutExtensions');
    require('HandleEventsBinding');

    //endregion

    //cannot use just icon due to a bug in ko 3.4 - https://github.com/knockout/knockout/issues/1935
    ko.components.register('actionable-icon', {
        viewModel: IconComponent,
        template: require('!text!iconTemplate')
    });

    ko.components.register('form-renderer', {
        viewModel: RendererViewModel,
        template: require('!text!rendererTemplate')
    });
});

require(['knockout', 'RendererTemplateLoader', 'RendererComponent', 'HandleEventsBinding'], function() {
    'use strict';
});

define("forms.renderer", function(){});

