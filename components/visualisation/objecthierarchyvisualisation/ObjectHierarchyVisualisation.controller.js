/**
*  Copyright 2017 Roland.Bouman@gmail.com; Just-BI.nl
*
*  Licensed under the Apache License, Version 2.0 (the "License");
*  you may not use this file except in compliance with the License.
*  You may obtain a copy of the License at
*
*      http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing, software
*  distributed under the License is distributed on an "AS IS" BASIS,
*  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*  See the License for the specific language governing permissions and
*  limitations under the License.
*
*/
sap.ui.define([
  "jubilant/components/visualisation/BaseVisualisationController",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/odata/CountMode"
], 
function(
  BaseVisualisationController,
  JSONModel,
  CountMode
){
  "use strict";
  var controller = BaseVisualisationController.extend("jubilant.components.visualisation.objecthierarchyvisualisation.ObjectHierarchyVisualisation", {
    _nodesPath: "nodes",
    _dummyNode: {},
    _emptyODataResponse: {
      results: []
    },
    _localDataModelName: "localData",
    _objectHierarchyTreeTableId: "_objectHierarchyTreeTableId",
    _getObjectHierarchyTreeTable: function(){
      return this.byId(this._objectHierarchyTreeTableId);
    },
    _getLocalDataModel: function(){
      var model = this.getModel(this._localDataModelName);
      return model;
    },
    _initModels: function(){
      BaseVisualisationController.prototype._initModels.apply(this, arguments);
      var localDataModel = new JSONModel();
      this.setModel(localDataModel, this._localDataModelName);
      var visualisation = this._getObjectHierarchyTreeTable();
      this._setQueryChanged(true);
    },
    onToggleOpenState: function(event){
      if (!event.getParameter("expanded")) {
        //if we're not expanding the node, we don't need to do anything
        return;
      }
      //get the row that is being expanded
      var rowContext = event.getParameter("rowContext"); 
      var path = rowContext.getPath();
      var localDataModel = rowContext.getModel();
      var node = localDataModel.getProperty(path);
      if (node.nodeType !== "navigationProperty") {
        //if we're not expanding a navigationProperty, we can't do anything.
        return;
      }
      //check the childNodes of this navigationProperty
      var nodes = node[this._nodesPath];
      if (nodes && nodes.length && nodes[0] !== this._dummyNode) {
        //if was already expanded, then we can't do anything.
        return;
      }
      //set the row to the busy state.
      var table = event.getSource();  
      table.setBusy(true);
      //construct the uri for the navigation set.
      
      //first, get the topmost ancestor to establish the base uri
      var pathparts = path.split("/");
      var rootPath = pathparts.slice(0, 3).join("/");
      var root = localDataModel.getProperty(rootPath);
      var rootUri = root.uri;
      var rootUriParts = rootUri.split("/");
      rootUriParts.pop();
      var baseUri =  rootUriParts.join("/");

      //now, get the uri for the navigation property, and remove its base uri.
      var uri = node.uri;
      if (uri.indexOf(baseUri) !== 0) {
        this._showMessageToast(this.getTextFromI18n("expandNavigationPropertyNode.errorUriDoesNotStartWithBaseUri"));
        return;
      }
      
      //now we have a path we can push into our ui5 model to do the actual query.
      var entityPath = uri.substr(baseUri.length);
      var options = {
        success: function(oData, response){
          switch (node.multiplicity) {
            case "0..1":
            case "1..1":
            case "1":
              switch (response.statusCode) {
                case 204: //"No Content". For example: https://gegevensmagazijn.tweedekamer.nl/OData/v1/Fractie(guid'8f77c8a9-67f4-4793-9018-2361103dd507')/Logo
                  //I suspect there is an error in the service. For now, we want to treat this as if an empty response was returned.
                  localDataModel.setProperty(path + "/" + this._nodesPath, []);
                  break;
                default:
                  this._renderODataResponseNode(oData, node.type, node.label, node);
                  localDataModel.setProperty(path, node);
              }
              break;
            default:
              switch (response.statusCode) {
                case 204: //"No Content". For example: https://gegevensmagazijn.tweedekamer.nl/OData/v1/Fractie(guid'8f77c8a9-67f4-4793-9018-2361103dd507')/Logo
                  //I suspect there is an error in the service. For now, we want to treat this as if an empty response was returned.
                  if (typeof(oData) === "undefined") {
                    oData = this._emptyODataResponse;
                    jQuery.sap.log.info("OData response was 204: No Content", entityPath, "Substituting for an empty response.");
                  }
                  break;
              }
              this._renderODataResponse(oData, response, path, node.type, node.label);
          }
          table.setBusy(false);
        }.bind(this),
        error: function(error){
          table.setBusy(false);
          this._showMessageToast(this.getTextFromI18n("errorLoading"));
        }
      };
      var dataModel = this.getDataModel();
      dataModel.read(entityPath, options);
    },
    _renderODataResponseNode: function(dataItem, type, typeName, node){
      var jubilantMetaModel = this.getJubilantMetaModel();
      var entityTypeDescriptor = jubilantMetaModel.getEntityTypeDescriptor(type);
      var properties = entityTypeDescriptor.properties;
      var navigationProperties = entityTypeDescriptor.navigationProperties;

      var uri = dataItem.__metadata.uri;
      if (!node) {
        node = {
          nodeType: "entity",
          type: type,
          uri: uri
        };
      }
      var propertyNode, propertyNodes = [], property, value, label = [];
      navigationProperties.forEach(function(navigationProperty){
        var oDataNavigationProperty = navigationProperty.oDataNavigationProperty;
        var relationship = oDataNavigationProperty.relationship;
        var fromRole = oDataNavigationProperty.fromRole;
        var toRole = oDataNavigationProperty.toRole;
        var associationEnd = navigationProperty.associationEnd;
        var role = associationEnd.role;
        propertyNode = {
          nodeType: "navigationProperty",
          label: oDataNavigationProperty.name,
          type: associationEnd.type,
          multiplicity: associationEnd.multiplicity,
          uri: dataItem[oDataNavigationProperty.name].__deferred.uri,
          relationship: relationship,
          role: role,
          fromRole: fromRole,
          toRole: toRole,
        };
        propertyNode[this._nodesPath] = [this._dummyNode];
        propertyNodes.push(propertyNode);
      }.bind(this));
      properties.forEach(function(property){
        value = dataItem[property.oDataProperty.name];
        if (property.keyOrdinal !== -1) {
          label[property.keyOrdinal] = value;
        }
        propertyNode = {
          nullable: property.oDataProperty.nullable,
          nodeType: "property",
          type: property.oDataProperty.type,
          label: property.oDataProperty.name,
          value: value
        };
        propertyNodes.push(propertyNode);
      });
      propertyNodes.sort(function(a, b){
        return (a.label > b.label) ? 1 : -1;
      });
      node.label = typeName + ": " + label.join(" - ");
      node[this._nodesPath] = propertyNodes;
      return node;
    },
    _renderODataResponse: function(data, response, path, type, typeName){
      if (!path && !type) {
        path = "";
        var entityDescriptorModel = this._getEntitySetDescriptorModel(); 
        type = entityDescriptorModel.getProperty("/oDataEntitySet/entityType");
        typeName = entityDescriptorModel.getProperty("/oDataEntitySet/name");
      }
      path += "/" + this._nodesPath;
      var nodes = [];
      var results = data.results;
      results.forEach(function(dataItem, index){
        var node = this._renderODataResponseNode(dataItem, type, typeName);
        nodes.push(node);
      }.bind(this));
      var localDataModel = this._getLocalDataModel();
      localDataModel.setProperty(path, nodes);
    },
    _clearVisualization: function(){
      var objectHierarchyTreeTable = this._getObjectHierarchyTreeTable();
      this._getLocalDataModel().setData({});
      objectHierarchyTreeTable.unbindRows();
      objectHierarchyTreeTable.bindRows({
        path: 'localData>/nodes',
        parameters: {
          arrayNames: ['nodes'],
          countMode: CountMode.Inline
        }
      });
    },
    _checkCanExecuteQuery: function(){
      return true;
    },
    _getFilter: function(fieldUsageRegistry){
      var visualisationFilterAreaManager = this._getVisualisationEditorComponentManager("VisualisationFilterAreaManager");
      var filter = visualisationFilterAreaManager.getFilter(fieldUsageRegistry);
      return filter;
    },
    _getSorters: function(fieldUsageRegistry){
      var visualisationSortAreaManager = this._getVisualisationEditorComponentManager("VisualisationSortAreaManager");
      var sorters = visualisationSortAreaManager.getSorters(fieldUsageRegistry);
      return sorters;
    },
    _executeQuery: function(callback){
      this._clearVisualization();
      var options = {
        success: function(oData, response){
          this._renderODataResponse(oData, response);
          callback();
        }.bind(this),
        error: function(error){
          callback();
          this._showMessageToast(this.getTextFromI18n("errorLoading"));
        }.bind(this)
      };
      var fieldUsageRegistry = {};
      
      var filter = this._getFilter(fieldUsageRegistry);
      if (filter) {
        options.filters = [filter];
      }
      var sorters = this._getSorters(fieldUsageRegistry);
      if (sorters) {
        options.sorters = sorters;
      }      
      var expandList = this._getExpandList(fieldUsageRegistry);
      if (expandList.length){
        var urlParameters = {
          "$expand": expandList.join(",")
        };
        options.urlParameters = urlParameters;
      }
      var dataModel = this.getDataModel();
      var currentReadRequest = dataModel.read(this._getEntitySetPath(), options);
      currentReadRequest.callback = callback;
      this._currentReadRequest = currentReadRequest;
    },
    _formatValueForTooltip: function(nodeType, dataType, value){
      if (nodeType !== "property") {
        return '';
      }
      return this._formatValue(value, dataType);
    },
  });
  return controller;
});