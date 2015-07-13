define([
	'dojo/_base/declare',
	'dojo/_base/array',
	'dojo/_base/lang',
	'dojo/_base/html',
    'dojo/dom-construct',
    'dojo/aspect',
	'dojo/on',
    'dojo/query',
	'jimu/BaseWidget',
    'jimu/PanelManager',
	'jimu/LayerInfos/LayerInfos',
	'dijit/_WidgetsInTemplateMixin',
    'dijit/layout/ContentPane',
	'esri/dijit/BasemapGallery',
    'esri/arcgis/utils',
    'esri/layers/FeatureLayer',
    'esri/layers/ArcGISDynamicMapServiceLayer',
	'dijit/form/Select'
], function(declare, array, lang, html,domConstruct,aspect, on, query, BaseWidget,PanelManager, LayerInfos,
	_WidgetsInTemplateMixin, ContentPane, BasemapGallery, esriUtils, FeatureLayer, ArcGISDynamicMapServiceLayer) {
    return declare([BaseWidget, _WidgetsInTemplateMixin], {

        baseClass: 'jimu-widget-themesgallery',
        themesDijit: null,
        operationalLayers: [],
        editableLayers: [],
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
		    this.themesDijit.startup();
		    //this._responsive();

		    this.own(on(me.themesDijit,
                      "selection-change",
                      lang.hitch(this, this.selectionChange)));
		    return this.themesDijit;
		},
		selectionChange: function () {
		    var me = this;
		    var theme = this.themesDijit.getSelected();
		    esriUtils.getItem(theme.itemId).then(function (response) {
		
		        console.log(response);
		        me.addOperationalLayers(response.itemData.operationalLayers, true);
		        me.storeEditableLayers(response.itemData.operationalLayers, true);
		    }, function (err) {
		        console.log(err);
		        alert("Error executing request.Overlay layers will not be loaded");
		    });
		},
		destroythemesDijit: function() {
		    if (this.themesDijit && this.themesDijit.destroy) {
		        this.themesDijit.destroy();
		        this.themesDijit = null;
				//this.layerSwipe = html.create('div', {}, this.swipeLayersMenu, 'after');
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
		},
		storeOperationalLayers: function (opsLayers, clean) {
		    var me = this;
		    if (clean) {
		        //clear existing operational layers
		        this.clearOperationalLayers();
		    }
		    dojo.forEach(opsLayers, function (layer, index) {
		        var layerId = layer.id;
		        me.operationalLayers.push(layerId);
		    });
		},
		storeEditableLayers: function (opsLayers, clean) {
		    var me = this;
		    if (clean) {
		        this.clearEditableLayers();
		    }
		    dojo.forEach(opsLayers, function (layer, index) {
		        var layerId = layer.id;
		        if (layer && layer.layerObject) {
		            var eLayer = layer.layerObject;
		            if (eLayer instanceof esri.layers.FeatureLayer && eLayer.isEditable()) {
		                if (eLayer.capabilities && eLayer.capabilities === "Query") {
		                    //is capabilities set to Query if so then editing was disabled in the web map so 
		                    //we won't add to editable layers.
		                } else {
		                    me.editableLayers.push({ 'featureLayer': eLayer });
		                }
		            }
		        }
		    });
		},
		addOperationalLayers: function (layerConfigArray, clean) {
		    var map = this.map;
		    //store operational layers
		    this.storeOperationalLayers(layerConfigArray, clean);
		    //add operational layers into the map
		    var legendLayers = new Array();
		    dojo.forEach(layerConfigArray, function (layerConfig, index) {
		        var url = layerConfig.url;
		        var opacity = layerConfig.opacity;
		        var layerId = layerConfig.id;
		        
		        if (typeof (map.getLayer(layerId)) != 'undefined') {
		            map.removeLayer(map.getLayer(layerId));
		        }
		        console.log("layerId");
		        
		        console.log(layerConfig);
		        if (typeof (layerConfig.mode) != 'undefined' || (layerConfig.layerType && layerConfig.layerType == "ArcGISFeatureLayer")) {
		            //feature layer
		            console.log("got it");
		            var overlayLayer = new FeatureLayer(url,{
		                //showAttribution: false,
		            //    mode: layerConfig.mode,
		                opacity: opacity,
		                visibility: layerConfig.visibility,
		                id: layerId
		            });
		            console.log("overlayLayer");
		            console.log(overlayLayer);
		            map.addLayer(overlayLayer);
		            overlayLayer.title = layerConfig.title;
		            //legendLayers.push(overlayLayer);

		        } else {
		            //dynamic service layer
		            var overlayLayer = new ArcGISDynamicMapServiceLayer(url, {
		                //showAttribution: true,
		                opacity: opacity,
		                visibility: layerConfig.visibility,
		                id: layerId
		            });
		            console.log("qwqwq");
		            map.addLayer(overlayLayer);
		            overlayLayer.title = layerConfig.title;
		            legendLayers.push(overlayLayer);
		        }
		    });
		    //updateLegendPanel(map, legendLayers, 'add');
		},
		clearOperationalLayers: function () {
		    var opsLayerIds = this.operationalLayers;
		    var opsLayers = new Array();
		    var map = this.map;
		    dojo.forEach(opsLayerIds, function (id) {
		        var layer = map.getLayer(id);
		        if (typeof (layer) != 'undefined') {
		            map.removeLayer(layer);
		        }
		    });
		    this.operationalLayers = [];
		},
		clearEditableLayers: function (layer) {
		    if (typeof (layer) != 'undefined') {
		        var layerId = layer.id;
		        var index = array.indexOf(this.editableLayers, layerId);
		        if (index != -1) {
		            this.editableLayers.splice(index, 1);
		        }
		    } else {
		        this.editableLayers = [];
		    }
		},
	});
});