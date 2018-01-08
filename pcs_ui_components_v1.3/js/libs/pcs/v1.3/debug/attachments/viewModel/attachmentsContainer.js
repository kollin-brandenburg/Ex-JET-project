/**
 * Created by lwagner on 3/14/2016.
 */

define(['ojs/ojcore', 'knockout', 'pcs/util/pcsUtil', 'pcs/attachments/services/attachmentsDataService',
        'ojs/ojknockout', 'ojs/ojdialog', 'ojs/ojbutton', 'text!pcs/attachments/view/attachmentsContainer.html', 'ojL10n!pcsMsg/nls/pcsSnippetsResource'
    ],
    function(oj, ko, pcsUtil, services) {

        'use strict';

        /**
         * The view model for the main content view template
         */
        function AttachmentsContainer(params) {
            var self = this;
            this.data = params.data;

            //Set the resourcebundle
            self.bundle = require('ojL10n!pcsMsg/nls/pcsSnippetsResource');

            self.attachmentList = ko.observableArray([]);
            self.dcsFolderList = ko.observableArray([]);

            self.showDcsFolders = ko.observable(false);
            self.showAttachments = ko.observable(true);
            self.dscSelectedFolderName = ko.observable('');
            self.dscSelectedAppLink = ko.observable('');
            self.displayDcs = ko.observable(false);


            function createFolderList(folders) {

                if (folders) {
                    // if dcs folder count > 0 then
                    //    display folder list
                    //    launch URL of selected folder
                    //self.showDcsFolders(true);
                    self.displayDcs(true);
                    //self.showAttachments(false);
                    for (var i = 0; i < folders.length; i++) {
                        var folder = {
                            folderId: folders[i].folderId,
                            folderName: folders[i].folderName
                        };
                        if (folders[i].type && folders[i].type === 'd') {
                            folder.isFolder = false;
                        } else {
                            folder.isFolder = true;
                        }
                        self.dcsFolderList.unshift(folder);
                    }
                }

                $('#pcs-attachments-overlay').removeClass('pcs-common-load-overlay');
                self.rootElement.trigger('attachments:loaded');
            }

            function exceptionHandler(jqXHR, customMsg) {
                var msg = customMsg;

                if (jqXHR && jqXHR.status === 0) {
                    msg = self.bundle.pcs.common.server_not_reachable;
                }

                if (jqXHR && jqXHR.status === 500) {
                    msg = jqXHR.responseText;
                } else if (jqXHR && jqXHR.status === 401) {
                    // reset valid authInfo as the current auth is invalid
                    msg = self.bundle.pcs.common.access_error_msg;
                }

                $('#pcs-attachments-error-msg', self.rootElement).text(msg);
                $('#pcs-attachments-error-msg-container', self.rootElement).show().delay(5000); //.fadeOut(2000);

                $('#pcs-attachments-overlay').removeClass('pcs-common-load-overlay');

            }


            function createAttachmentsList(attachments) {
                if (attachments) {
                    for (var i = 0; i < attachments.length; i++) {

                        var tmpStr = '';
                        if (attachments[i].updatedDate && attachments[i].updatedBy) {
                            tmpStr = self.bundle.pcs.attachments.dateByUserText;
                            tmpStr = oj.Translations.applyParameters(tmpStr, {
                                '0': attachments[i].updatedDate,
                                '1': attachments[i].updatedBy
                            });
                        }

                        var attachment = {
                            filename: attachments[i].title,
                            fileInfoText: tmpStr,
                            serverUri: attachments[i].uri.href,
                            href: ko.observable('#'),
                            contentType: attachments[i].mimeType
                        };

                        self.attachmentList.unshift(attachment);

                    }
                }

                $('#pcs-attachments-overlay').removeClass('pcs-common-load-overlay');
                self.rootElement.trigger('attachments:loaded');
            }

            function loadAttachments(mode, id) {
                if (mode === 'task') {
                    $('#pcs-attachments-overlay').addClass('pcs-common-load-overlay');

                    // get dcs folders
                    if (self.data.isDocsEnabled) {
                        services.getDcsFolders(mode, id).done(
                            function(data) {
                                createFolderList(data.dcsfolder);
                            }
                        ).fail(
                            function(jqXHR, textStatus, errorThrown) {
                                var msg = self.bundle.pcs.attachments.fetch_attachments_error;
                                exceptionHandler(jqXHR, msg);
                                self.rootElement.trigger('attachments:loaded');
                            }
                        );
                    } else {
                        self.displayDcs(false);
                        // if dcs folder count == 0 then
                        services.getAttachmentList(mode, id).done(
                            function(data) {
                                createAttachmentsList(data.attachment);
                            }
                        ).fail(
                            function(jqXHR, textStatus, errorThrown) {
                                var msg = self.bundle.pcs.attachments.fetch_attachments_error;
                                exceptionHandler(jqXHR, msg);
                                self.rootElement.trigger('attachments:loaded');
                            }
                        );
                    }
                } else if (mode === 'processes') {
                    $('#pcs-attachments-overlay').addClass('pcs-common-load-overlay');

                    services.getAttachmentList(mode, id).done(
                        function(data) {
                            createAttachmentsList(data.attachment);
                        }
                    ).fail(
                        function(jqXHR, textStatus, errorThrown) {
                            var msg = self.bundle.pcs.attachments.fetch_attachments_error;
                            exceptionHandler(jqXHR, msg);
                            self.rootElement.trigger('attachments:loaded');
                        }
                    );
                }
            }

            if (this.data.isDocsEnabled) {
                self.showDcsFolders(true);
                self.showAttachments(false);
            } else {
                self.showDcsFolders(false);
                self.showAttachments(true);
            }
            if (this.data.startFolderName !== '' && this.data.mode !== 'task' && this.data.mode !== 'processes') {
                //self.showDcsFolders(true);
                //self.showAttachments(false);
                self.displayDcs(false);
                var folder = {
                    folderId: '',
                    folderName: this.data.startFolderName,
                    isFolder: true
                };
                self.dcsFolderList.unshift(folder);
            }

            this.data.container = self;

            this.rootElement = self.data.rootElement;

            if (self.data.hideDelete) {
                $('.pcs-attachments-removeFile', self.rootElement).hide();
            }

            if (self.data.hideUploadLink) {
                $('.pcs-attachments-uploadLink', self.rootElement).hide();
            }

            if (self.data.hideTitle) {
                $('.pcs-attachments-title', self.rootElement).hide();
            }

            if (self.data.mode === 'task' || self.data.mode === 'processes') {
                loadAttachments(self.data.mode, self.data.id);
            } else {
                self.rootElement.trigger('attachments:loaded');
            }
            self.openUploadDialog = function() {
                $('.pcs-attachments-dialog-error-msg').css('display', 'none');
                $('#pcs-attachments-fileControl', this.element).val('');
                $('.pcs-attachments-modalDialog').ojDialog('open');
                $('.pcs-attachments-upload-btn').ojButton('option', 'disabled', true);
            };

            function createDocsUI(mafLink) {
                $('#pcs-attachments-overlay').removeClass('pcs-common-load-overlay');
                $('.pcs-attachments-dcsModalDialog').ojDialog('open');

                self.msg = {
                    message: 'setAppLinkTokens',
                    appLinkRefreshToken: JSON.parse(mafLink).refreshToken,
                    appLinkAccessToken: JSON.parse(mafLink).accessToken,
                    appLinkRoleName: JSON.parse(mafLink).role,
                    embedPreview: true
                };

                //This doesnt work if DCS takes more than 10 sec to initialize
                //$('#pcs-attachment-iframe').off('load').on('load', function() {
                //    setTimeout(function() {
                //        document.getElementById('pcs-attachment-iframe').contentWindow.postMessage(msg, '*');
                //    }, 100);
                //});

                //Add the event listerner
                self.addDCSEventListener();

                var appLink = JSON.parse(mafLink).appLinkUrl + '/cfg=hbr,evw,hdc,ndw';
                self.dscSelectedAppLink(appLink);
            }

            self.openFolder = function(data) {
                self.dscSelectedFolderName(data.folderName);
                if (self.data.mode === 'task' && data.folderId !== '') {
                    $('#pcs-attachments-overlay').addClass('pcs-common-load-overlay');
                    services.getDcsFolderInfo(self.data.mode, self.data.id, data.folderId).done(
                        function(data) {
                            createDocsUI(data.mafLink);
                        }
                    ).fail(
                        function(jqXHR, textStatus, errorThrown) {

                            var msg = self.bundle.pcs.attachments.fetch_attachments_error;
                            exceptionHandler(jqXHR, msg);
                        }
                    );
                } else {
                    self.showAttachments(true);
                }
            };

            self.dcsDialogClose = function() {
                console.log('closing');
                self.cleanDCSEventListener();
            };

            self.OnDCSMessageEvent = function(evt) {
                if (evt.data.message === 'appLinkReady') {
                    console.log('recieved');
                    var iframe = $('#pcs-attachment-iframe')[0];
                    var iframewindow = iframe.contentWindow ? iframe.contentWindow : iframe.contentDocument.defaultView;
                    iframewindow.postMessage(self.msg, '*');
                }
            };

            self.cleanDCSEventListener = function() {
                // Remove the PostMessage handler
                console.log('removing');
                pcsUtil.eventHandler.removeHandler(window, 'message', self.OnDCSMessageEvent);
            };

            self.addDCSEventListener = function() {
                // Add the PostMessage handler
                console.log('adding');
                pcsUtil.eventHandler.addHandler(window, 'message', self.OnDCSMessageEvent);
            };

            self.closeFolder = function() {
                self.showAttachments(false);
            };

            self.iconClass = function(filename, contentType) {
                if (filename) {
                    if (contentType === 'application/pdf') {
                        return 'pcs-attachments-filepdf-icon';
                    }
                    if (contentType === 'application/zip') {
                        return 'pcs-attachments-filezip-icon';
                    }
                    if (contentType && contentType.startsWith('image')) {
                        return 'pcs-attachments-fileimage-icon';
                    }
                    if (contentType === 'text/plain') {
                        return 'pcs-attachments-filetxt-icon';
                    }
                    if (filename.endsWith('xls') || filename.endsWith('xlsx')) {
                        return 'pcs-attachments-filexls-icon';
                    }
                    if (filename.endsWith('doc') || filename.endsWith('docx')) {
                        return 'pcs-attachments-filedoc-icon';
                    }
                    if (filename.endsWith('ppt') || filename.endsWith('pptx')) {
                        return 'pcs-attachments-fileppt-icon';
                    } else {
                        return 'pcs-attachments-fileother-icon';
                    }
                }
            };

            self.removeFileFromList = function(data, event) {
                var parent = $(event.currentTarget).parent();
                parent.siblings().find('.pcs-attachments-delete-dialog').ojDialog('open');
            };

            // Method called when yes button clicked on the delete dialog
            self.yesDeleteDialog = function(data) {

                if (self.data.mode === 'task' || self.data.mode === 'processes') {
                    var attachmentName = data.filename;
                    var attachmentItem = data;
                    $('#pcs-attachments-overlay').addClass('pcs-common-load-overlay');
                    services.deleteAttachment(self.data.mode, self.data.id, attachmentName).done(
                        function(data) {
                            self.attachmentList.remove(attachmentItem);
                            self.rootElement.trigger('attachments:attachmentRemoved', [attachmentItem]);
                            $('.pcs-attachments-delete-dialog').ojDialog('close');

                            var msg = self.bundle.pcs.attachments.upload_attachment_delete;
                            msg = oj.Translations.applyParameters(msg, {
                                '0': attachmentName
                            });

                            $('#pcs-attachments-success-msg', self.rootElement).text(msg);
                            $('#pcs-attachments-success-msg-container', self.rootElement).show().delay(5000).fadeOut(2000);

                            $('#pcs-attachments-overlay').removeClass('pcs-common-load-overlay');
                        }
                    ).fail(
                        function(jqXHR, textStatus, errorThrown) {

                            var msg = self.bundle.pcs.attachments.delete_attachment_error;
                            exceptionHandler(jqXHR, msg);
                        }
                    );
                } else {
                    self.attachmentList.remove(data);
                    self.rootElement.trigger('attachments:attachmentRemoved', [data]);
                    $('.pcs-attachments-delete-dialog').ojDialog('close');
                }
            };

            // Method called when no button clicked on the delete dialog
            self.noDeleteDialog = function() {
                $('.pcs-attachments-delete-dialog').ojDialog('close');
            };

            var fileInfo = {};


            self.uploadAttachment = function() {
                if (fileInfo.name !== '') {
                    for (var i = 0; i < self.attachmentList().length; i++) {
                        if (self.attachmentList()[i].filename === fileInfo.name) {
                            $('.pcs-attachments-dialog-error-msg').css('display', 'block');
                            return;
                        }
                    }

                    var tmpStr = self.bundle.pcs.attachments.dateByUserTextTmp;

                    var attachment = {
                        filename: fileInfo.name,
                        fileInfoText: tmpStr,
                        href: fileInfo.src,
                        contentType: fileInfo.contentType,
                        content: fileInfo.content
                    };

                    if (self.data.mode === 'task' || self.data.mode === 'processes') {

                        $('#pcs-attachments-overlay').addClass('pcs-common-load-overlay');
                        var boundary = 'Boundary_' + '123456789_123456789';
                        var header = '--' + boundary + '\r\n';

                        var footer = '\r\n--' + boundary + '--\r\n';

                        var contents = header;
                        contents += 'Content-Disposition: inline' + '\r\n';
                        contents += 'Content-Type: application/json' + '\r\n\r\n';

                        var payload = {
                            'attachmentName': attachment.filename,
                            'mimeType': attachment.contentType,
                            'attachmentSize': fileInfo.size,
                            'attachmentScope': 'BPM'
                        };
                        contents += JSON.stringify(payload) + '\r\n';
                        contents += header;

                        contents += 'Content-Transfer-Encoding: binary\r\n\r\n';
                        contents += attachment.content;
                        contents += footer;
                        var contentType = 'multipart/mixed; boundary=' + boundary;

                        services.uploadAttachment(self.data.mode, self.data.id, contents, contentType).done(
                            function(data) {
                                self.attachmentList.unshift(attachment);
                                self.rootElement.trigger('attachments:attachmentUploaded', [attachment]);

                                var msg = self.bundle.pcs.attachments.upload_attachment_success;
                                msg = oj.Translations.applyParameters(msg, {
                                    '0': attachment.filename
                                });

                                $('#pcs-attachments-success-msg', self.rootElement).text(msg);
                                $('#pcs-attachments-success-msg-container', self.rootElement).show().delay(5000).fadeOut(2000);

                                $('#pcs-attachments-overlay').removeClass('pcs-common-load-overlay');
                            }
                        ).fail(
                            function(jqXHR, textStatus, errorThrown) {

                                var msg = self.bundle.pcs.attachments.upload_attachment_error;
                                exceptionHandler(jqXHR, msg);
                            }
                        );
                    } else {
                        self.attachmentList.unshift(attachment);
                        self.rootElement.trigger('attachments:attachmentUploaded', [attachment]);
                    }
                }
                $('.pcs-attachments-modalDialog').ojDialog('close');
            };

            if (self.data.attachments) {
                for (var i = 0; i < self.data.attachments.length; i++) {

                    var textFile = null;
                    var makeTextFile = function(text, contentType) {

                        var bytes = new Uint8Array(text.length);
                        for (var i = 0; i < text.length; i++) {
                            bytes[i] = text.charCodeAt(i);
                        }

                        var data = new Blob([bytes], {
                            type: contentType
                        });

                        // If we are replacing a previously generated file we need to
                        // manually revoke the object URL to avoid memory leaks.
                        if (textFile !== null) {
                            window.URL.revokeObjectURL(textFile);
                        }

                        textFile = window.URL.createObjectURL(data);

                        // returns a URL you can use as a href
                        return textFile;
                    };

                    var attachment = self.data.attachments[i];

                    if (attachment.href === '') {
                        attachment.href = makeTextFile(attachment.content, attachment.contentType);
                    }
                    self.attachmentList.unshift(attachment);
                }

            }

            function abToStr(buffer) {
                var view = new Uint8Array(buffer);

                var CHUNK_SZ = 0x8000;
                var c = [];
                for (var i = 0; i < view.length; i += CHUNK_SZ) {
                    c.push(String.fromCharCode.apply(null, view.subarray(i, i + CHUNK_SZ)));
                }
                return c.join('');

            }

            $('#pcs-attachments-fileControl').change(function(evt) {

                var file = evt.target.files[0];

                if (file) {
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        fileInfo.name = file.name;
                        //fileInfo.content = e.target.result;
                        fileInfo.content = abToStr(e.target.result);
                        if (file.type === '') {
                            // if empty then treat as binary
                            fileInfo.contentType = 'application/octet-stream';
                        } else {
                            fileInfo.contentType = file.type;
                        }
                        fileInfo.size = file.size;
                        fileInfo.src = window.URL.createObjectURL(file);
                    };
                    reader.readAsArrayBuffer(file);
                } else {
                    console.log('Failed to load file');
                }

                $('.pcs-attachments-upload-btn').ojButton('option', 'disabled', false);
            });


			/**
			 * method to clean up everything
			 */
			self.dispose = function() {
				console.log('dispose in attachment Containor');

				// clean up the events
			};

            self.viewAttachment = function(attachment, event) {
                var bytes, data, i;
                if (ko.isObservable(attachment.href)) {
                    var currentTarget = $(event.currentTarget);
                    var fetchAttachment = function(attachment, response) {
                        var data = new Blob([response], {
                            type: attachment.contentType
                        });
                        var textFile = window.URL.createObjectURL(data);

                        attachment.href(textFile);
                        attachment.content = abToStr(response);

                        $('#pcs-attachments-overlay').removeClass('pcs-common-load-overlay');
                        if (window.navigator.msSaveOrOpenBlob) {
                            window.navigator.msSaveOrOpenBlob(data, attachment.filename);
                        } else {
                            currentTarget[0].click();
                        }
                    };

                    if (attachment.href() === '#') {
                        $('#pcs-attachments-overlay').addClass('pcs-common-load-overlay');
                        services.getAttachmentStream(attachment.serverUri, attachment, fetchAttachment, currentTarget);
                        return false;
                    } else {
                        if (window.navigator.msSaveOrOpenBlob) {
                            bytes = new Uint8Array(attachment.content.length);
                            for (i = 0; i < attachment.content.length; i++) {
                                bytes[i] = attachment.content.charCodeAt(i);
                            }
                            data = new Blob([bytes], {
                                type: attachment.contentType
                            });
                            window.navigator.msSaveOrOpenBlob(data, attachment.filename);
                            return false;
                        } else {
                            return true;
                        }

                        return true;
                    }
                } else {
                    if (window.navigator.msSaveOrOpenBlob) {
                        bytes = new Uint8Array(attachment.content.length);
                        for (i = 0; i < attachment.content.length; i++) {
                            bytes[i] = attachment.content.charCodeAt(i);
                        }
                        data = new Blob([bytes], {
                            type: attachment.contentType
                        });
                        window.navigator.msSaveOrOpenBlob(data, attachment.filename);
                        return false;
                    } else {
                        return true;
                    }
                }
            };
        }
        return AttachmentsContainer;
    });
