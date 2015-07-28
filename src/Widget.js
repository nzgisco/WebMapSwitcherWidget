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
	'dijit/form/Select',
    
], function (declare, array, lang, html, domConstruct, aspect, topic, Deferred, on, query, BaseWidget, PanelManager, LayerInfos, Message,busyUtil,
	_WidgetsInTemplateMixin, ContentPane,esriRequest, BasemapGallery, esriUtils, FeatureLayer, ArcGISDynamicMapServiceLayer) {
    return declare([BaseWidget, _WidgetsInTemplateMixin], {

        baseClass: 'jimu-widget-themesgallery',
        themesDijit: null,
        operationalLayers: [],
        editableLayers: [],
		startup: function() {
		    this.inherited(arguments);
		    this.renderThemeSwitcher();
		    this._createBusyIndicator();
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
		    var deferred = new Deferred();
		    var theme = this.themesDijit.getSelected();
		    var id = theme.itemId;
		    var me = this;

            //show loading
		    this._toggleLoading(true);

		    //remove all existing layers except the basemap,as the basemap has already changed to the one selected in the theme
		    this._removeExistingLayers();

		    // load a dummy map to get access to layers with user's permissions
		    var tempDiv = domConstruct.create("div", {
		        id: 'temp-dummy-map-div-themes',
		        style: "display:none;height:0px;width:0px;"
		    });
		    var mapDeferred = esriUtils.createMap(id, tempDiv, {
		        mapOptions: {},
		        ignorePopups: true
		    });
		    mapDeferred.addCallback(function (response) {
		        processMapResponse(response);
		    });
		    mapDeferred.addErrback(function (error) {
		        me._toggleLoading(false);
		        me._showErrorMessage(error.message)
		    });



		    function processMapResponse(response) {

		        var subItemQueryList = new Array();
		        var operationalLayers = response.itemInfo.itemData.operationalLayers;
		        var accessibleOperationalLayers = [];
		        var inaccessibleOperationalLayers = [];
		        var deferredsToCheckCount = 0;
		        var failedServiceUrls = [];



		        // extract urls of services user doesn't have access to
		        // from verbose error message
		        if (response.errors.length > 0) {
		            var errRegex = /\[url:(.*?)\]/;
		            array.forEach(response.errors, function (error) {
		                if (error.code === "IdentityManagerBase.1") {
		                    var errMessage = error.message;
		                    var urls = errMessage.match(errRegex);
		                    if (urls.length > 0) {
		                        var url = urls[0];
		                        url = url.replace("[url:", "").replace("]", "");
		                        failedServiceUrls.push(url);
		                    }
		                }
		            });
		        }


		        // split op layers into accessible and inaccessible
		        array.forEach(operationalLayers, function (layerConfig) {
		            var isAccessible = true;
		            // may not be permissions issues, check for other errors such as wrong url 
		            if (layerConfig.errors && layerConfig.errors.length > 0) {
		                isAccessible = false;
		                inaccessibleOperationalLayers.push(layerConfig);

		            } else {
		                // check failed service urls for a match
		                array.forEach(failedServiceUrls, function (failedServiceUrl, ind) {
		                    if (layerConfig.url.toLowerCase() === failedServiceUrl.toLowerCase()) {
		                        isAccessible = false;
		                        inaccessibleOperationalLayers.push(layerConfig);
		                    }
		                });
		            }
		            // accessible layers
		            if (isAccessible) {
		                accessibleOperationalLayers.push(layerConfig);
		            }

		        });


		        // get info for all accessible layers and process when done
		        array.forEach(accessibleOperationalLayers, function (layerConfig, i) {
		            subItemQueryList.push(esriRequest({
		                url: layerConfig.url,
		                content: { f: "json" },
		                handleAs: "json",
		                callbackParamName: "callback"
		            }));

		        });
		        deferredsToCheckCount = subItemQueryList.length;
		       
		        if (deferredsToCheckCount == 0) {
		            checkComplete();
		            return;
		        }

		        array.forEach(subItemQueryList, function (itemDeferred, i) {
		            itemDeferred.then(function (serviceInfo) {
		                accessibleOperationalLayers[i].serviceInfo = serviceInfo;
		                checkComplete();
		            }, function (err) {
		                checkComplete();
		            });
		        });
		       
		        function checkComplete() {
		            deferredsToCheckCount--;
		            if (deferredsToCheckCount < 1) {
		                if (inaccessibleOperationalLayers.length > 0) {
		                    me._toggleLoading(false);
		                    me._showErrorMessage(me.nls.noPermissionMsg)
		                }
		                if (accessibleOperationalLayers.length > 0 ) {
		                    me.addOperationalLayers(accessibleOperationalLayers).then(function (event) {
		                        me._toggleLoading(false);
		                        deferred.resolve(true);
		                    });
		                } else {
		                    me._toggleLoading(false);
		                    deferred.resolve(true);
		                }
		                
		            }
		        }

		    }

		    return deferred.promise;
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
		},
		_removeExistingLayers:function(){
		    var map = this.map;
		    var layerIds = map.layerIds;
		    layerIds=layerIds.concat(map.graphicsLayerIds);
		    array.forEach(layerIds, function (id) {
		        var layer = map.getLayer(id);
		        if (layer && !layer._basemapGalleryLayerType) {
		             map.removeLayer(map.getLayer(id));
		        }
		    });
		},
		addOperationalLayers:function(layerConfigArray){
		    var me = this;
		    var map = this.map;
		    var deferred = new Deferred();
            
		    //add operational layers into the map
		    var operationalLayers = new Array();
		    array.forEach(layerConfigArray, function (layerConfig, index) {
		        var url = layerConfig.url;
		        var opacity = layerConfig.opacity;
		        var layerId = layerConfig.id;
		        if (typeof (map.getLayer(layerId)) != 'undefined') {
		            map.removeLayer(map.getLayer(layerId));
		        }
		        var overlayLayer = null;
		        if (typeof (layerConfig.mode) != 'undefined' || (layerConfig.layerType && layerConfig.layerType === "ArcGISFeatureLayer")) {
		            //feature layer
		            overlayLayer = new FeatureLayer(url, {
		                showAttribution: true,
		                mode: layerConfig.mode,
		                opacity: opacity,
		                visible:layerConfig.visibility,
		                id: layerId
		            });
                    
		        } else if (layerConfig.serviceInfo && layerConfig.serviceInfo.singleFusedMapCache) {
		            //tiled service layer
		            overlayLayer = new ArcGISTiledMapServiceLayer(url, {
		                showAttribution: true,
		                opacity: opacity,
		                visible: layerConfig.visibility,
		                id: layerId
		            });
		        } else {

		            //dynamic service layer
		            overlayLayer = new ArcGISDynamicMapServiceLayer(url, {
		                showAttribution: true,
		                opacity: opacity,
		                visible: layerConfig.visibility,
		                id: layerId
		            });
		        }
		        operationalLayers.push(overlayLayer);
		        overlayLayer.title = layerConfig.title;
		        overlayLayer.on("error", function(err) {
                    
		        });

		    });
		    var addCount = operationalLayers.length;
		    var layerAddHandle = map.on("layer-add-result", function(event) {
		        if (event.error) {
                    
		        }
		        addedHandler();
		    });
		    function addedHandler() {

		        addCount--;
		        if (addCount < 1) {
		            layerAddHandle.remove();
		            deferred.resolve(true);
		        }
		    }
		    map.addLayers(operationalLayers);
		    return deferred.promise;
		
		},
		_createBusyIndicator: function () {
		    this._busyLoader = busyUtil.create(this.domNode)
		},
		_toggleLoading: function (state) {
		    state ? this._busyLoader.show() : this._busyLoader.hide();
		},
		_showErrorMessage: function (msg) {
		    var popup = new Message({
		        message: msg,
		        buttons: [{
		            label: "OK",
		            onClick: lang.hitch(this, function () {
		                popup.close();
		            })
		        }]
		    });
		}
	});
});