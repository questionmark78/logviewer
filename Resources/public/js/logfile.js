/**
 * Log file viewer panel component.
 * Displays the contents of a single log file with UI components for the following actions:
 * - Automatically refresh log every x seconds
 * - Clear the viewer
 * - Download the log file
*/
pimcore.registerNS("pimcore.plugin.logviewer.item");
pimcore.plugin.logviewer.item = Class.create({

    objRef: null, //object reference to "this" to be used in event listeners

    /**
     * Initalize this component.
     * @param data Object containing filename and lines retrieved from server.
     * @param parentPanel the containing element of this tab panel.
    */
    initialize: function (data, parentPanel) {
        this.parentPanel = parentPanel;
        this.data = data;
        this.currentIndex = 0;
        this.lineRendererId = 'logviewer-lines-' + data.id;
        this.refreshInterval = 5;

        this.addLayout();

        this.appendLines(data.lines);

        objRef = this;
    },

    /**
     * Append lines to log viewer. We use a plain HTML element as a "line renderer" instead of an Ext Component.
     * Th reas on is that there is no suitable existing Ext component.
     * The log can contain many lines and the element needs to be light weight.
     * After adding content the height of parent containers is adjusted and after a small time out the browser scrolls to the bottom.
     * @param array List of log lines.
    */
    appendLines: function(lines) {
 
        var lineRenderer = Ext.getDom(this.lineRendererId);

        var html = '';
        if(Array.isArray(lines)) {
            for(i = 0; i < lines.length; i++) {
                html += '<div class="line">' + lines[i] + '</div>'; 
            }
        }

        html += '<div class="line endoffile">End of file, retrieved on ' + this.data.timestamp + ', size ' + this.data.size + ' bytes.</div>'; 

        lineRenderer.innerHTML += html;
        //update height of parent elements, otherwise it won't show updates
        lineRenderer.parentElement.parentElement.parentElement.style.height = lineRenderer.scrollHeight + 'px';
        lineRenderer.parentElement.parentElement.parentElement.parentElement.style.height = lineRenderer.scrollHeight + 'px';
        
        //scroll to bottom, needs a time out to work.
        setTimeout(function(id) {
            document.getElementById('pimcore_logviewer_panel_' + id + '-body').scrollTop = lineRenderer.scrollHeight;
        }, 50, this.data.id);
    },

    /**
     * Append an error message to the end of the log viewer.
    */
    appendError: function(message,) {
        var lineRenderer = Ext.getDom(this.lineRendererId);
        lineRenderer.innerHTML += '<div class="line error">' + message + '</div>';
    },

    /**
     * Create UI; viewer panel with buttons below.
    */
    addLayout: function () {
        var panelButtons = [];

        this.autoRefreshTask = {
            run: function() {
                this.retrieveFile();
            }.bind(this),
            interval: (this.refreshInterval * 1000)
        };

        this.intervalInSeconds = {
            xtype: "numberfield",
            name: "interval",
            width: 70,
            value: 5,
            listeners: {
                change: function (item, value) {
                    if(value < 1){
                        value = 1;
                    }
                    Ext.TaskManager.stop(this.autoRefreshTask);
                    if(this.autoRefresh.getValue()){
                        this.autoRefreshTask.interval = value * 1000;
                        Ext.TaskManager.start(this.autoRefreshTask);
                    }

                }.bind(this)
            }
        }

        this.autoRefresh = new Ext.form.Checkbox({
            stateful: true,
            stateId: 'log_auto_refresh',
            stateEvents: ['click'],
            checked : false,
            boxLabel: t('log_refresh_label'),
            listeners: {
                change: function (cbx, checked) {
                    if (checked) {
                        // this.resultpanel.view.loadMask.destroy();
                        Ext.TaskManager.start(this.autoRefreshTask);
                    } else {
                        //Todo: enable load mask
                        Ext.TaskManager.stop(this.autoRefreshTask);
                    }
                }.bind(this)
            }
        });

        
        panelButtons.push(this.autoRefresh);
        panelButtons.push(this.intervalInSeconds);
        panelButtons.push(t('log_refresh_seconds'));
        panelButtons.push('-');

        panelButtons.push({
            text: t('refresh'),
            iconCls: 'logviewer_icon_refresh',
            handler: this.refreshFile.bind(this)
        });

        panelButtons.push({
            text: t('clear'),
            iconCls: 'logviewer_icon_clear',
            handler: this.clearViewer.bind(this)
        });

         panelButtons.push({
            text: t('download'),
            iconCls: 'logviewer_icon_download',
            handler: this.downloadFile.bind(this)
        });

        this.logContents = new Ext.Panel({
            width: "100%",
            height: "100%",
            html: '<div class="logviewer-linerenderer" id="' + this.lineRendererId + '"></div>'
        });

        this.panel = new Ext.Panel({
            border: false,
            closable: true,
            autoScroll: true,
            bodyStyle: "padding: 0px;",
            title: this.data.file,
            cls: 'logviewer-file-panel',
            id: "pimcore_logviewer_panel_" + this.data.id,
            items: [this.logContents],
            buttons: panelButtons,
            listeners: {
                close: function(btn) {
                    //stop any running refresh tasks when closing tab.
                    Ext.TaskManager.stop(objRef.autoRefreshTask);
                }
            }
        });

        this.parentPanel.getViewPanel().add(this.panel);
        this.parentPanel.getViewPanel().setActiveTab(this.panel);

        pimcore.layout.refresh();
    },

    /**
     * Clear the log viewer UI. The file on the server remains untouched.
    */
    clearViewer: function() {
        var lineRenderer = Ext.getDom(this.lineRendererId);
        lineRenderer.innerHTML = '';
    },

    /**
     * Retrieve file from server and append new lines to viewer.
    */
    refreshFile: function() {
        this.retrieveFile();
    },

    /**
     * Request original log file from server and pass it to the user as file download.
    */
    downloadFile: function() {
        pimcore.helpers.download(this.data.download + '?filename=' + this.data.file);
    },

    /**
     * Fetch content log file, only fetches part after what already has been retrieved (using filesize)
     * After receiving it appends the lines to the viewer.
    */
    retrieveFile: function() {
        Ext.Ajax.request({
            url: this.data.url,
            params: {
                filename: this.data.file,
                size: this.data.size,
                q: ''
            },
            failure: function(response) {
                console.log('Failed to retrieve log.');
                this.appendError('Failed to retrieve log ' + this.data.file + '. Message: ' + response.statusText);
            },
            success: function (response) {
                console.log('retrieved');
                var data = Ext.decode(response.responseText);
                if(data.status == 'ok') {
                    this.data = data;
                    this.appendLines(data.lines);
                } else {
                    this.appendError('Failed to retrieve log ' + data.file + '. Message: ' + data.message);
                }
            }.bind(this)
        });
    },

    /**
     * get current tab index, can be called by otehr components.
    */
    getCurrentIndex: function () {
        return this.currentIndex;
    }

});
