define([
	'dojo/_base/declare',
	'dojo/_base/array',
	'dojo/_base/lang',
	'dojo/_base/html',
    'dojo/dom-construct',
    'dojo/query',
    'dojo/dom-attr',
    'dojo/Deferred',
	'dojo/on',
	'jimu/BaseWidget',
    'jimu/PanelManager',
     'jimu/dijit/Message',
	'dijit/_WidgetsInTemplateMixin',
	'esri/dijit/BasemapGallery',
    'jimu/MapManager',
    'dojo/cookie',
    'esri/request',
    'esri/IdentityManager'

    
], function (declare, array, lang, html, domConstruct, domQuery, domAttr,  Deferred, on, BaseWidget, PanelManager, Message,
	_WidgetsInTemplateMixin, BasemapGallery, MapManager, cookie, esriRequest, esriId) {
    return declare([BaseWidget, _WidgetsInTemplateMixin], {

        baseClass: 'jimu-widget-themesgallery',
        themesDijit: null,
        _drawnGraphics:false,
        startup: function() {
            this.inherited(arguments);
            this.renderThemeSwitcher();
            this._setVersionTitle();
        },
        renderThemeSwitcher: function () {
            //var cookieString = cookie("esri_auth") || cookie("wab_auth");
            //var token;
            //if (cookieString && JSON.parse(cookieString).token) {
            //    token = JSON.parse(cookieString).token;
            //}
            var me = this;
            var portalUrl = this.appConfig.portalUrl;
            var map = this.map;
            var groupId =  {
                "id": this.config.groupID
            };
            this.themesDijit = new BasemapGallery({
                showArcGISBasemaps: false,
                map: map,
                portalUrl: portalUrl,
                basemapsGroup: groupId
            }, this.themeGalleryDiv);
            this.themesDijit.startup();
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
		},

		_setVersionTitle: function () {
		    var labelNode = this._getLabelNode(this);
		    var manifestInfo = this.manifest;
		    var devVersion = manifestInfo.version;
		    var devWabVersion = manifestInfo.developedAgainst || manifestInfo.wabVersion;
		    var codeSourcedFrom = manifestInfo.codeSourcedFrom;
		    var client = manifestInfo.client;

		    var title = "Dev version: " + devVersion + "\n";
		    title += "Developed/Modified against: WAB" + devWabVersion + "\n";
		    title += "Client: " + client + "\n";
		    if (codeSourcedFrom) {
		        title += "Code sourced from: " + codeSourcedFrom + "\n";
		    }

		    if (labelNode) {
		        domAttr.set(labelNode, 'title', title);
		    }

		},
		_getLabelNode: function (widget) {
		    var labelNode;
		    if (!(widget.labelNode) && !(widget.titleLabelNode)) {
		        if (widget.getParent()) {
		            labelNode = this._getLabelNode(widget.getParent());
		        }
		    } else {
		        labelNode = widget.labelNode || widget.titleLabelNode;
		    }
		    return labelNode;

		}

	});
});
