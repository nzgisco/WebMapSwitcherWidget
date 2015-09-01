define([
	'dojo/_base/declare',
	'dojo/_base/array',
	'dojo/_base/lang',
	'dojo/_base/html',
    'dojo/dom-construct',
    'dojo/aspect',
    "dojo/topic",
    'dojo/Deferred',
	'dojo/on',
    'dojo/query',
	'jimu/BaseWidget',
    'jimu/PanelManager',
	'jimu/LayerInfos/LayerInfos',
     'jimu/dijit/Message',
     'esri/dijit/util/busyIndicator',
	'dijit/_WidgetsInTemplateMixin',
    'dijit/layout/ContentPane',
    'esri/request',
	'esri/dijit/BasemapGallery',
    'esri/arcgis/utils',
    'esri/layers/FeatureLayer',
    'esri/layers/ArcGISDynamicMapServiceLayer',
    'jimu/MapManager',
    'dijit/form/Select'
    
    
], function (declare, array, lang, html, domConstruct, aspect, topic, Deferred, on, query, BaseWidget, PanelManager, LayerInfos, Message,busyUtil,
	_WidgetsInTemplateMixin, ContentPane, esriRequest, BasemapGallery, esriUtils, FeatureLayer, ArcGISDynamicMapServiceLayer, MapManager) {
    return declare([BaseWidget, _WidgetsInTemplateMixin], {

        baseClass: 'jimu-widget-themesgallery',
        themesDijit: null,
        _drawnGraphics:false,
        startup: function() {
            this.inherited(arguments);
            this.renderThemeSwitcher();
        },
        renderThemeSwitcher: function () {

            var me = this;

            var portalUrl = this.appConfig.portalUrl;
            var map = this.map;
            var groupId =  {
                "id": me.config.groupID
            };

            this.themesDijit = new BasemapGallery({
                showArcGISBasemaps: false,
                map: map,
                id: "themes-gallery-widget",
                portalUrl: portalUrl,
                basemapsGroup: groupId
            }, this.themeGalleryDiv);
            this.themesDijit._onNodeClick = lang.hitch(this, function (b) {
                if (me.appConfig._drawnGraphics) {
                    var popup = new Message({
                        message: this.nls.webmapSwitchWarning,
                        buttons: [{
                            label: this.nls.cancel,
                            onClick: function () {
                                popup.close();
                            }
                        }, {
                            label: this.nls.confirm,
                            onClick:lang.hitch(this, function () {
                                popup.close();
                                this._switchWebMap(b)
                            })
                        }]
                    });
                    return false;
                } else {
                    this._switchWebMap(b)
                }

            });
            this.themesDijit.startup();
            return this.themesDijit;
        },
        _switchWebMap:function(b){
            this.appConfig.map.itemId = b.itemId;
            this.appConfig.map.mapOptions.extent = this.map.extent;
            this.appConfig._drawnGraphics = false;
            MapManager.getInstance()._recreateMap(this.appConfig);
        },
        destroythemesDijit: function() {
            if (this.themesDijit && this.themesDijit.destroy) {
                this.themesDijit.destroy();
                this.themesDijit = null;
            }
        },
        destroy: function() {
            this.destroythemesDijit();
            this.inherited(arguments);
        },
		_responsive: function () {
		    // the default width of esriBasemapGalleryNode is 85px,
		    // margin-left is 10px, margin-right is 10px;
		    var paneNode = query('#' + this.id)[0];
		    var width = html.getStyle(paneNode, 'width');
		    console.log(width);
		    var column = parseInt(width / 105, 10);
		    console.log(column);
		    if (column > 0) {
		        var margin = width % 105;
		        var addWidth = parseInt(margin / column, 10);
		        console.log(addWidth);
		        query('.esriBasemapGalleryNode', this.id).forEach(function (node) {
		            html.setStyle(node, 'width', 85 + addWidth + 'px');
		        });
		    }
		}
		
	});
});