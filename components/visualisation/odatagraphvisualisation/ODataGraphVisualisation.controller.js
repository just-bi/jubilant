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
  "sap/ui/model/json/JSONModel"
], 
function(
  BaseVisualisationController,
  JSONModel,
  edgeStyles
){
  "use strict";
  var iconsModel = new JSONModel();
  iconsModel.attachRequestCompleted(function(event){
    var model = event.getSource();
    var data = model.getData();
    var icons = [];
    var groups = data.groups, group;
    for (group in groups) {
      group = groups[group];
      group.icons.forEach(function(icon){
        icon = icon.name;
        if (icons.indexOf(icon) === -1) {
          icons.push(icon);
        }
      });
    }
    model.setProperty("/icons", icons.sort());
  });
  iconsModel.loadData("https://sapui5.hana.ondemand.com/resources/sap/ui/demokit/icex/model/groups.json");

  var modelsPath = "components/visualisation/odatagraphvisualisation/";
  var nodeShapesModel = new JSONModel(modelsPath + "nodeShapes.json");
  var edgeStylesModel = new JSONModel(modelsPath + "edgeStyles.json");
  
  var controller = BaseVisualisationController.extend("jubilant.components.visualisation.odatagraphvisualisation.ODataGraphVisualisation", {
    _nodesPath: "nodes",
    _iconsModelName: "icons",
    _initIconsModel: function(){
      this.setModel(iconsModel, this._iconsModelName);
    },
    _nodeShapesModelName: "nodeShapes",
    _initNodeShapesModel: function(){
      this.setModel(nodeShapesModel, this._nodeShapesModelName);
    },
    _edgeStylesModelName: "edgeStyles",
    _initEdgeStylesModel: function(){
      this.setModel(edgeStylesModel, this._edgeStylesModelName);
    },
    _associationsModelName: "associationsModel",
    _initAssociationsModel: function(){
      var data = {};
      data[this._nodesPath] = [];
      var model = new JSONModel(data);
      this.setModel(model, this._associationsModelName);
    },
    _getAssocationsModel: function(){
      var model = this.getModel(this._associationsModelName);
      return model;
    },
    _initModels: function(){
      BaseVisualisationController.prototype._initModels.apply(this, arguments);
      this._initIconsModel();
      this._initNodeShapesModel();
      this._initEdgeStylesModel();
      this._initAssociationsModel();
    },
    _getAssocationsTable: function(){
      var assocationsTable = this.byId("associationsTable");
      return assocationsTable;
    },
    _dummyNode: {},
    _defaultNodeShape: "circle",
    _defaultEdgeStyle: "solid",
    _defaultNodeColor: "#FDFDFD",
    _defaultEdgeColor: "#F0F0F0",
    _getKeyPropertyNames: function(entityTypeDescriptor){
      var keyPropertyNames = [];
      entityTypeDescriptor.properties.forEach(function(property){
        var propertyName = property.oDataProperty.name;
        if (property.keyOrdinal === -1) {
          return;
        }
        keyPropertyNames[property.keyOrdinal] = propertyName;
      });
      return keyPropertyNames;
    },
    _createNodeForNavigationProperty: function(navigationProperty){
      var dataFoundation = this._dataFoundation;
      var jubilantMetaModel = dataFoundation.jubilantMetaModel;
      var entityTypeDescriptor = jubilantMetaModel.getProperty("/entityTypes/" + navigationProperty.associationEnd.type);
      var keyProperties = this._getKeyPropertyNames(entityTypeDescriptor);
      var navigationPropertyNode = {
        navigationProperty: navigationProperty,
        allProperties: entityTypeDescriptor.properties,
        labelProperties: [],
        keyProperties: keyProperties,
        mappingType: "none",
        nodeShape: this._defaultNodeShape,
        nodeColor: this._defaultNodeColor,
        edgeColor: this._defaultEdgeColor,
        edgeStyle: this._defaultEdgeStyle
      };
      var nodes = [];
      if (this._getNavigationPropertiesForNode(navigationPropertyNode).length) {
        //only create an expandable node if we actually have navigation properties.
        nodes.push(this._dummyNode);
      }
      navigationPropertyNode[this._nodesPath] = nodes;
      return navigationPropertyNode;
    },
    _dataFoundationSet: function(){
      var dataFoundation = this._dataFoundation;
      var entitySetDescriptor = dataFoundation.entitySetDescriptor;
      var entityTypeDescriptor = entitySetDescriptor.type;
      var associationsModel = this._getAssocationsModel();
      var keyProperties = this._getKeyPropertyNames(entityTypeDescriptor);
      var initialAssociation = {
        entityType: entitySetDescriptor.oDataEntitySet.entityType,
        allProperties: entityTypeDescriptor.properties,
        labelProperties: [],
        keyProperties: keyProperties,
        mappingType: "none",
        nodeShape: this._defaultNodeShape,
        nodeColor: this._defaultNodeColor,
        edgeColor: this._defaultEdgeColor,
        edgeStyle: this._defaultEdgeStyle
      };
      var navigationProperties = entityTypeDescriptor.navigationProperties.map(function(navigationProperty){
        return this._createNodeForNavigationProperty(navigationProperty);
      }.bind(this));
      initialAssociation[this._nodesPath] = navigationProperties;
      associationsModel.setProperty("/" +  this._nodesPath + "/0", initialAssociation);
      //this should not be necessary but numberOfExpandedLevels does not seem to work so we have to do it ourselves.
      this._getAssocationsTable().expand(0);
    },
    _getNavigationPropertiesForNode: function(node){
      var parentNavigationProperty = node.navigationProperty;

      var dataFoundation = this._dataFoundation;
      var jubilantMetaModel = dataFoundation.jubilantMetaModel;
      var entityTypeDescriptor = jubilantMetaModel.getProperty("/entityTypes/" + parentNavigationProperty.associationEnd.type);
      
      var navigationProperties = [];
      var parentODataNavigationProperty = parentNavigationProperty.oDataNavigationProperty;
      entityTypeDescriptor.navigationProperties.forEach(function(navigationProperty){
        var oDataNavigationProperty = navigationProperty.oDataNavigationProperty;
        if (
          oDataNavigationProperty.relationship === parentODataNavigationProperty.relationship && (
          (
            navigationProperty.associationEnd.role === oDataNavigationProperty.fromRole &&
            parentNavigationProperty.assocationEnd.role === oDataNavigationProperty.toRole
          ) || (
            navigationProperty.associationEnd.role === oDataNavigationProperty.toRole &&
            parentNavigationProperty.associationEnd.role === oDataNavigationProperty.fromRole
          )
        )) {
          return;
        }
        navigationProperties.push(navigationProperty);
      }.bind(this));
      return navigationProperties;
    },
    onToggleOpenState: function(event) {
      if (event.getParameter("expanded") === false){
        return;
      }
      var rowContext = event.getParameter("rowContext");
      var model = rowContext.getModel();
      var navigationPropertiesPath = rowContext.getPath() + "/" + this._nodesPath;
      var nodes = model.getProperty(navigationPropertiesPath);
      if (nodes[0] !== this._dummyNode) {
        return;
      }
      var node = rowContext.getObject();      
      var navigationPropertyNodes = this._getNavigationPropertiesForNode(node).map(function(navigationProperty){
        return this._createNodeForNavigationProperty(navigationProperty);
      }.bind(this));
      
      model.setProperty(navigationPropertiesPath, navigationPropertyNodes);
    },
    onMappingTypeChanged: function(event){
      this._setQueryChanged(true);
    },
    onEdgeColorChanged: function(event){
      this._setQueryChanged(true);
    },
    onEdgeStyleChanged: function(event){
      this._setQueryChanged(true);
    },
    onKeyPropertiesChanged: function(event){
      this._setQueryChanged(true);
    },
    onLabelPropertiesChanged: function(event){
      this._setQueryChanged(true);
    },
    onNodeShapeChanged: function(event){
      this._setQueryChanged(true);
    },
    onIconChanged: function(event){
      this._setQueryChanged(true);
    },
    onNodeColorChanged: function(event){
      this._setQueryChanged(true);
    },
    _forEachNode: function(callback, scope){
      var model = this._getAssocationsModel();
      var nodes = model.getProperty("/" + this._nodesPath);
      var node, index = 0;
      while (index < nodes.length){
        node = nodes[index++];
        if (node === this._dummyNode) {
          continue;
        }
        if (callback.call(scope, node) === false) {
          return false;
        }
        if (node[this._nodesPath]) {
          nodes = nodes.concat(node[this._nodesPath]);
        }
      }
      return true;
    },
    _checkCanExecuteQuery: function(){
      return !this._forEachNode(function(node){
        return node.mappingType === "none";
      });
    },
    _getQueryForNode: function(path, node, select, expand){
      if (node.mappingType === "node") {
        node.keyProperties.forEach(function(property){
          if (path) {
            property = path + "/" + property;
          }
          select.push(property);
        });
        node.labelProperties.forEach(function(property){
          if (path) {
            property = path + "/" + property;
          }
          if (select.indexOf(property) === -1) {
            select.push(property);
          }
        });
        if (path) {
          expand.push(path);
        }
      }
      var nodes = node[this._nodesPath];
      nodes.forEach(function(childNode){
        if (childNode === this._dummyNode) {
          return;
        }
        var newPath = path ? path + "/" : "";
        newPath += node.navigationProperty.oDataNavigationProperty.name;
        this._getQueryForNode(newPath, childNode, select, expand);
      }.bind(this));
    },
    _executeQuery: function(callback){
      var dataFoundation = this._dataFoundation;
      var select = [], expand = [];
      var model = this._getAssocationsModel();
      var rootNode = model.getProperty("/" + this._nodesPath)[0];
        
      this._getQueryForNode(null, rootNode, select, expand);

      var filters;
      var visualisationFilterAreaManager = this._getVisualisationEditorComponentManager("VisualisationFilterAreaManager");
      var filter = visualisationFilterAreaManager.getFilter();
      if (filter){
        filters = [filter];
      }
      
      var entitySet = dataFoundation.entitySetDescriptor.oDataEntitySet.name;
      var dataModel = this.getDataModel();
      dataModel.read("/" + entitySet, {
        filters: filters,
        urlParameters: {
          $select: select.join(","),
          $expand: expand.join(",")
        },
        success: function(data, response){
          this._renderGraph(data);
          callback.call();
        }.bind(this),
        error: function(error){
          debugger;
          callback.call();
        }
      });
    },
    _gatherGraphDataLevel: function(data, node){
      data.forEach(function(dataItem){
        switch(node.mappingType === "node") {
          case "none":
            break;
          case "edge": 
            break;
          case "node":
            break;
        }
        var nodes = node[this._nodesPath];
        if (nodes) {
          nodes.forEach(function(childNode){
            var navigationPropertyName = node.navigationProperty.oDataNavigationProperty.name;
            this._gatherGraphDataLevel(data[nagivationPropertyName], childNode);
          }.bind(this));
        }
      })
    },
    _gatherGraphData: function(data){
      var nodes = [];
      var edges = {};
      var associationsModel = this._getAssocationsModel();
      var node = associationsModel.getProperty("/" + this._nodesPath)[0];
    },
    _renderGraph: function(data){
      var graphData = this._gatherGraphData(data);
    }
  });
  return controller;
});