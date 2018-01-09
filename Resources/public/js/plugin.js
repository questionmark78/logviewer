/**
 * Log viewer plugin for Pimcore 5
 * This Ext class adds a clickable item to the menu to open the log viewer in tab.
 */
pimcore.registerNS("pimcore.plugin.logviewer");

pimcore.plugin.logviewer = Class.create(pimcore.plugin.admin, {

    objRef: null, //object reference to "this" to be used in event listeners

    getClassName: function () {
        return 'pimcore.plugin.logviewer';
    },

    initialize: function () {
        objRef = this;
        pimcore.plugin.broker.registerPlugin(this);
        //Add button below search button
        this.navEl = Ext.get('pimcore_menu_search').insertSibling('<li id="logviewer" data-menu-tooltip="' + t('logviewer.title') + '" class="logviewer_menu_icon">' + t('logviewer.title') + '</li>', 'after');
        Ext.get('logviewer').on("mousedown", function(e) {
            objRef.openLogviewer();
            return false;
        });
    },

    /**
     * Open log viewer tab, or activate when already open.
     */
    openLogviewer: function() {
        try {
            pimcore.globalmanager.get('logviewer').activate();
        } catch (e) {
            logviewerTab = pimcore.globalmanager.add('logviewer', new pimcore.plugin.logviewer.panel());
        }
    },

    pimcoreReady: function (params, broker) {
        var toolbar = pimcore.globalmanager.get('layout_toolbar');
        this.navEl.on('mousedown', toolbar.showSubMenu.bind(toolbar.mdsMenu));
        pimcore.plugin.broker.fireEvent('mdsMenuReady', toolbar.mdsMenu);
    },
});

var logviewerPlugin = new pimcore.plugin.logviewer();