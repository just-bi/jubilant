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
  "jubilant/components/visualisation/tablevisualisation/TableVisualisation.controller",
  "jubilant/components/visualisation/BaseVisualisationController",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/odata/CountMode"
], 
function(
  TableVisualisation,
  BaseVisualisationController,
  Filter,
  FilterOperator,
  JSONModel,
  CountMode
){
  "use strict";
  var controller = TableVisualisation.extend("jubilant.components.visualisation.treetablevisualisation.TreeTableVisualisation", {
    _hierarchyConditionModelName: "hierarchyConditionModel",
    _localDataModelName: "localData",
    _getDataModelName: function(){
      return this._localDataModelName;
    },
    _nodesPath: "nodes",
    _getHierarchyConditionModel: function(){
      var model = this.getModel(this._hierarchyConditionModelName);
      return model;
    },
    _initHierarchyConditionModel: function(){
      var model = new JSONModel();      
      this.setModel(model, this._hierarchyConditionModelName);
      model.setProperty("/" + this._nodesPath, [{
        relationalOperator: "equals"
      }]);
      return model;
    },
    _getLocalDataModel: function(){
      var model = this.getModel(this._localDataModelName);
      return model;
    },
    _initLocalDataModel: function(){
      var model = new JSONModel();      
      this.setModel(model, this._localDataModelName);
      return model;
    },
    _initModels: function(){
      TableVisualisation.prototype._initModels.apply(this, arguments);
      this._initHierarchyConditionModel();
      this._initLocalDataModel();
    },
    _getHierarchyCondition: function(){
      var hierarchyConditionModel = this._getHierarchyConditionModel();      
      var hierarchyCondition = hierarchyConditionModel.getProperty("/" + this._nodesPath + "/0");
      return hierarchyCondition;
    },
    _getHierarchyConditionFilter: function(parentKeyValue){
      var hierarchyCondition = this._getHierarchyCondition();
      if (!hierarchyCondition.parentKeyField || !hierarchyCondition.keyField) {
        return null;
      }
      var hierarchyConditionFilter = new Filter({
        path: hierarchyCondition.parentKeyField,
        operator: FilterOperator.EQ,
        value1: parentKeyValue
      });
      return hierarchyConditionFilter ;
    },
    _loadChildNodes: function(callback, parentPath){
      if (!parentPath) {
        parentPath = "";
      }
      if (parentPath.charAt(parentPath.length-1) !== "/"){
        parentPath += "/";
      }
      var localDataModel = this.getModel(this._localDataModelName);
      
      var filters = [];
      
      var parentKeyValue;
      var parent = localDataModel.getProperty(parentPath);
      var hierarchyCondition = this._getHierarchyCondition();
      if (!parent) {
        parentKeyValue = null;
      }
      else {
        parentKeyValue = parent[hierarchyCondition.keyField];
      }
      
      var hierarchyConditionFilter = this._getHierarchyConditionFilter(parentKeyValue);
      if (hierarchyConditionFilter) {
        filters = [hierarchyConditionFilter];
      }

      var visualisationFilterAreaManager = this._getVisualisationEditorComponentManager("VisualisationFilterAreaManager");
      var filter = visualisationFilterAreaManager.getFilter();
      if (filter) {
        filters.push(filter);
      }
      
      var visualisationAxesAreaManager = this._getVisualisationEditorComponentManager("VisualisationAxesAreaManager");
      var select = visualisationAxesAreaManager.getSelectedAxisItems(this._columnAxisId).map(function(item){
        return item.getKey();
      });
      if (select.indexOf(hierarchyCondition.keyField) === -1) {
        select.push(hierarchyCondition.keyField);
      }
      if (select.indexOf(hierarchyCondition.parentKeyField) === -1) {
        select.push(hierarchyCondition.parentKeyField);
      }

      var sorters;
      var visualisationSortAreaManager = this._getVisualisationEditorComponentManager("VisualisationSortAreaManager");
      sorters = visualisationSortAreaManager.getSorters();
      
      var dataModel = this.getModel(BaseVisualisationController.prototype._dataModelName);
      dataModel.read(this._getEntitySetPath(), {
        filters: filters,
        sorters: sorters,
        urlParameters: {
          "$select": select.join(", ")
        },
        success: function(oData, response){
          oData.results.forEach(function(node){
            node[this._nodesPath] = this._dummy;
          }.bind(this));
          localDataModel.setProperty(parentPath + this._nodesPath, oData.results);
          callback();
        }.bind(this),
        error: function(error){
          callback();
          this._showMessageToast("Error loading");
        }.bind(this)
      });
    },
    _executeQuery: function(callback){
      this._createColumns(this._localDataModelName);
      var visualisation = this._getVisualisation();
      visualisation.unbindRows();
      visualisation.bindRows({
        path: this._localDataModelName + ">/" + this._nodesPath,
        parameters: {
          arrayNames: [this._nodesPath],
          countMode: CountMode.Inline
        }
      });
      this._loadChildNodes(callback);
    },
    _dummy: [{}],
    onToggleOpenState: function(event) {
      if (!event.getParameter("expanded")) {
        return;
      }
      var rowContext = event.getParameter("rowContext");
      var path = rowContext.getPath();
      var model = rowContext.getModel();
      var nodesPath = path + "/" + this._nodesPath;
      if (model.getProperty(nodesPath) !== this._dummy) {
        return;
      }
      this._loadChildNodes(this._queryExecuted.bind(this), path);
    }
  });
  return controller;
});