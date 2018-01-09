/**
 * User interface for logviewer plugin.
 * Opens a new tab in Pimcore with a list of log files on the left (getTree) and a tab panel on the right where multiple log files can be opened.
 */
pimcore.registerNS('pimcore.plugin.logviewer.panel');
pimcore.plugin.logviewer.panel = Class.create({

    initialize: function () {
        this.getTabPanel();
    },

    activate: function () {
        var tabPanel = Ext.getCmp('pimcore_panel_tabs');
        tabPanel.setActiveItem('pimcore_logviewer');
    },

    getTabPanel: function () {

        if (!this.panel) {
            this.panel = new Ext.Panel({
                id: 'pimcore_logviewer',
                title: t('logviewer'),
                iconCls: 'pimcore_icon_logviewer',
                border: false,
                layout: 'border',
                closable: true,
                items: [this.getTree(), this.getViewPanel()]
            });

            var tabPanel = Ext.getCmp('pimcore_panel_tabs');
            tabPanel.add(this.panel);
            tabPanel.setActiveItem('pimcore_logviewer');

            this.panel.on('destroy', function () {
                pimcore.globalmanager.remove('logviewer');
            }.bind(this));

            pimcore.layout.refresh();
        }
        return this.panel;
    },

    getTree: function () {
        if (!this.tree) {
            var store = Ext.create('Ext.data.TreeStore', {
                autoLoad: false,
                autoSync: true,
                proxy: {
                    type: 'ajax',
                    url: '/admin/logviewer/service/filelist',
                    reader: {
                        type: 'json'
                    }
                },
                root: {
                    iconCls: 'pimcore_icon_logviewer'
                },
                sorters: ['text']
            });


            this.tree = Ext.create('Ext.tree.Panel', {
                store: store,
                id: 'pimcore_panel_logviewer_tree',
                region: "west",
                autoScroll: true,
                animate: false,
                containerScroll: true,
                width: 200,
                split: true,
                root: {
                    id: '0',
                    expanded: true,
                    iconCls: 'pimcore_icon_logviewer'

                },
                listeners: this.getTreeNodeListeners(),
                rootVisible: false,
            });

            this.tree.on('render', function () {
                this.getRootNode().expand();
            });
        }

        return this.tree;
    },

    getViewPanel: function () {
        if (!this.viewPanel) {
            this.viewPanel = new Ext.TabPanel({
                region: "center",
                plugins:
                    [
                        Ext.create('Ext.ux.TabCloseMenu', {
                            showCloseAll: true,
                            showCloseOthers: true
                        }),
                        Ext.create('Ext.ux.TabReorderer', {})
                    ]
            });
        }

        return this.viewPanel;
    },

    getTreeNodeListeners: function () {
        var treeNodeListeners = {
            'itemclick': this.onTreeNodeClick.bind(this),
            'itemcontextmenu': this.onTreeNodeContextmenu.bind(this),
            'beforeitemappend': function (thisNode, newChildNode, index, eOpts) {
                newChildNode.data.leaf = true;
                newChildNode.data.iconCls = 'pimcore_icon_logviewer';
            }
        };

        return treeNodeListeners;
    },

    onTreeNodeClick: function (tree, record, item, index, e, eOpts) {
        this.openLogviewer(record.data);
    },

    openLogviewer: function (data) {

        var existingPanel = Ext.getCmp('pimcore_logviewer_panel_' + data.id);
        if (existingPanel) {
            this.viewPanel.setActiveItem(existingPanel);
            return;
        }

        Ext.Ajax.request({
            url: data.url,
            params: {
                filename: data.filename,
                size: 0,
                q: ''
            },
            failure: function(response) {
                console.log('Failed to retrieve log.');
            },
            success: function (response) {
                var responseData = Ext.decode(response.responseText);
                var logfilePanel = new pimcore.plugin.logviewer.item(responseData, this);
                pimcore.layout.refresh();
            }.bind(this)
        });
    },

    /**
     * Show context menu when right clicking on filename in list.
    */
    onTreeNodeContextmenu: function (tree, record, item, index, e, eOpts) {
        e.stopEvent();

        tree.select();

        var menu = new Ext.menu.Menu();
        menu.add(new Ext.menu.Item({
            text: t('flush'),
            iconCls: 'pimcore_icon_delete',
            handler: this.flushFile.bind(this, tree, record)
        }));

        menu.showAt(e.pageX, e.pageY);
    },

    /**
     * Send request to server to flush a log file and handle the response.
    */
    flushFile: function (tree, record) {
        Ext.Ajax.request({
            url: "/admin/logviewer/service/flush",
            params: {
                filename: record.data.filename
            },
            success: function (response) {
                var responseData = Ext.decode(response.responseText);                
                if(responseData.status == 'ok') {

                    var existingPanel = Ext.getCmp("pimcore_logviewer_panel_" + record.data.id);
                    if (existingPanel) {
                        this.viewPanel.setActiveItem(existingPanel);
                        existingPanel.clearViewer();
                        //retrieve log file to verify to the user that is empty, show the latest messages when the qre quickly generated.
                        existingPanel.retrieveFile();
                    }

                    pimcore.layout.refresh();
                    pimcore.helpers.showNotification(t("flushed"), responseData.message, "success");
                } else {
                    Ext.Msg.alert('Flush failed', responseData.message);
                }
            }.bind(this)
        });
    }
});