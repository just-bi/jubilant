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
  "sap/ui/base/Object",
  "sap/ui/model/json/JSONModel"
], 
function(
   Object,
   JSONModel
){
  "use strict";
  var VisualisationSettingsDialogManager = Object.extend("jubilant.components.visualisation.VisualisationSettingsDialogManager", {
    _nodesPath: "nodes",
    constructor: function(visualisationController){
      this._visualisationController = visualisationController;
      return this;
    },
    _initDialog: function(){
      var controller = this._visualisationController;
      var view = controller.getView();
      var visualisationSettingsDialog = sap.ui.xmlfragment(
        view.getId(), 
        "jubilant.components.visualisation.VisualisationSettingsDialog",
        this
      );
      view.addDependent(visualisationSettingsDialog);
      return visualisationSettingsDialog;
    },
    _getJubilantMetaModel: function(){
      var controller = this._visualisationController;
      var jubilantMetaModel = controller.getJubilantMetaModel();
      return jubilantMetaModel;
    },
    _getExpandableNavigationPropertiesForEntityType: function(entityType, deep){
      var controller = this._visualisationController;
      var jubilantMetaModel = this._getJubilantMetaModel();
      var entityTypeDescriptor;
      switch (typeof(entityType)) {
        case "string":
          entityTypeDescriptor = jubilantMetaModel.getEntityTypeDescriptor(entityType);
          break;
        case "object":
          entityTypeDescriptor = entityType;
          break;
        default:
          throw new Error();
      }
      var expandableNavigationProperties = [];
      entityTypeDescriptor.navigationProperties.forEach(function(navigationProperty){
        var associationEnd = navigationProperty.associationEnd;
        var multiplicity = associationEnd.multiplicity;
        switch (multiplicity) {
          case "1":
          case "0..1":
          case "1..1":
            break;
          default:
            return;
        }
        var oDataNavigationProperty = navigationProperty.oDataNavigationProperty;
        var entityType = associationEnd.type;
        var node = {
          navigationProperty: oDataNavigationProperty.name,
          relationship: oDataNavigationProperty.relationship,
          expanded: false,
          entityType: entityType
        };
        expandableNavigationProperties.push(node);
        if (deep) {
          var childNodes = this._getExpandableNavigationPropertiesForEntityType(entityType);
          if (childNodes.length) {
            node[this._nodesPath] = childNodes;
          }
        }
      }.bind(this));
      return expandableNavigationProperties;
    },
    _getRootPath: function(){
      var metadata = this.getMetadata();
      return "/" + metadata.getName();
    },
    _navigationPropertiesModelName: "navigationPropertiesModel",
    _initModel: function(){
      var controller = this._visualisationController;
      var visualisationStateModel = controller._getVisualisationStateModel();
      var path = this._getRootPath();
      if (!visualisationStateModel.getProperty(path)){
        visualisationStateModel.setProperty(path, {});
      }
      path += "/expandedProperties";
      if (!visualisationStateModel.getProperty(path)){
        visualisationStateModel.setProperty(path, {});
      }
      path += "/" + this._nodesPath;
      if (!visualisationStateModel.getProperty(path)){
        var entityTypeDescriptor = controller._getEntityTypeDescriptor();
        var expandableNavigationProperties = this._getExpandableNavigationPropertiesForEntityType(entityTypeDescriptor, true);
        visualisationStateModel.setProperty(path, expandableNavigationProperties);
      }
      var navigationPropertiesModel = new JSONModel();
      controller.setModel(navigationPropertiesModel, this._navigationPropertiesModelName);
    },
    _getNavigationPropertiesModel: function(){
      var controller = this._visualisationController;
      var navigationPropertiesModel = controller.getModel(this._navigationPropertiesModelName);
      return navigationPropertiesModel;
    },
    _getDialog: function(){
      var controller = this._visualisationController;
      var id = "visualisationSettingsDialog";
      var visualisationSettingsDialog = controller.byId(id);
      if (!visualisationSettingsDialog) {
        visualisationSettingsDialog = this._initDialog();
        this._initModel();
      }
      return visualisationSettingsDialog;
    },
    _clone: function(object){
      var json = JSON.stringify(object);
      var data = JSON.parse(json);
      return data;
    },
    _loadNavigationPropertiesModel: function(){
      var controller = this._visualisationController;
      var visualisationStateModel = controller._getVisualisationStateModel();
      var path = this._getRootPath() + "/expandedProperties";
      var navigationPropertiesData = visualisationStateModel.getProperty(path);

      var navigationPropertiesModel = this._getNavigationPropertiesModel();
      navigationPropertiesModel.setData(this._clone(navigationPropertiesData));
    },
    _saveNavigationPropertiesModel: function(){
      var navigationPropertiesModel = this._getNavigationPropertiesModel();
      var navigationPropertiesData = navigationPropertiesModel.getData();
      
      var controller = this._visualisationController;
      var visualisationStateModel = controller._getVisualisationStateModel();
      var path = this._getRootPath() + "/expandedProperties";
      visualisationStateModel.setProperty(path, this._clone(navigationPropertiesData));
    },
    showDialog: function(showOrHide){
      var visualisationSettingsDialog = this._getDialog();
      var method = visualisationSettingsDialog[showOrHide ? "open" : "close"];
      if (showOrHide) {
        this._loadNavigationPropertiesModel();
      }
      method.call(visualisationSettingsDialog);
    },
    _getQueryProperties: function(queryProperties, navigationPropertiesModelNode, path){
      var jubilantMetaModel = this._getJubilantMetaModel()
      path = (path ? path + "/" : "") + navigationPropertiesModelNode.navigationProperty;
      if (navigationPropertiesModelNode.expanded) {
        var entityTypeDescriptor = jubilantMetaModel.getEntityTypeDescriptor(navigationPropertiesModelNode.entityType);
        entityTypeDescriptor.properties.forEach(function(property){
          var propertyClone = this._clone(property);
          propertyClone.oDataProperty.name = path + "/" + propertyClone.oDataProperty.name;
          queryProperties.push(propertyClone);
        }.bind(this));
      }
      var childNodes = navigationPropertiesModelNode[this._nodesPath];
      if (!childNodes) {
        return;
      }
      childNodes.forEach(function(childNode){
        this._getQueryProperties(queryProperties, childNode, path);
      }.bind(this));
    },
    _updateQueryProperties: function(){
      var jubilantMetaModel = this._getJubilantMetaModel();
      var controller = this._visualisationController;
      var entitySetDescriptorModel = controller._getEntitySetDescriptorModel();
      var entityTypeDescriptor = entitySetDescriptorModel.getProperty("/type");
      var queryProperties = [].concat(entityTypeDescriptor.properties);
      
      var navigationPropertiesModel = this._getNavigationPropertiesModel();
      var nodes = navigationPropertiesModel.getProperty("/" + this._nodesPath);
      nodes.forEach(function(childNode){
        this._getQueryProperties(queryProperties, childNode);
      }.bind(this));
      entitySetDescriptorModel.setProperty("/queryProperties", queryProperties);
    },
    onVisualisationSettingsDialogOkPressed: function(event){
      this._updateQueryProperties();
      this._saveNavigationPropertiesModel();
      this.showDialog(false);
    },
    onVisualisationSettingsDialogCancelPressed: function(event){
      this.showDialog(false);
    },
    onNavigationPropertyOpenStateToggled: function(event) {
      if (!event.getParameter("exanded")) {
        return;
      }
      var rowContext = event.getParameter("rowContext");
      var model = rowContext.getModel();
      var path = rowContext.getPath();
      var node = rowContext.getObject();
      var childNodes = node[this._nodesPath];
      if (!childNodes || !childNodes.length) {
        return;
      }
      childNodes.forEach(function(childNode, childNodeIndex){
        var grandChildNodes = childNode[this._nodesPath];
        if (typeof(grandChildNodes) !== "undefined") {
          return;
        }
        grandChildNodes = this._getExpandableNavigationPropertiesForEntityType(childNode.entityType, true);
        model.setProperty(path + "/" + this._nodesPath + "/" + childNodeIndex + "/" + this.nodesPath, grandChildNodes);
      }.bind(this));
    }
  });
  return VisualisationSettingsDialogManager;
});