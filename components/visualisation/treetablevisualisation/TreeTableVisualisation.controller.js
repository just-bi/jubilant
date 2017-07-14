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
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/odata/CountMode",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator"  
], 
function(
  TableVisualisation,
  BaseVisualisationController,
  JSONModel,
  CountMode,
  Filter,
  FilterOperator
){
  "use strict";
  var controller = TableVisualisation.extend("jubilant.components.visualisation.treetablevisualisation.TreeTableVisualisation", {
    _nodesPath: "nodes",
    _localDataModelName: "localData",
    _getDataModelName: function(){
      return this._localDataModelName;
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
      this._initLocalDataModel();
    },
    _normalizePath: function(path){
      if (!path) {
        path = "";
      }
      if (path.charAt(path.length-1) !== "/"){
        path += "/";
      }
      return path;
    },
    _getHierarchyFilter: function(fieldUsageRegistry, parentPath){
      var localDataModel = this.getModel(this._localDataModelName);
      var parent = localDataModel.getProperty(parentPath);
      var hierarchyFilter;
      var visualisationHierarchyConditionAreaManager = this._getVisualisationEditorComponentManager("VisualisationHierarchyConditionAreaManager");
      var hierarchyConditions = visualisationHierarchyConditionAreaManager._getHierarchyConditions();
      var hierarchyFilters = [];
      hierarchyConditions.forEach(function(condition){
        if (!condition.keyField || !condition.parentKeyField) {
          return;
        }
        this.registerFieldUsage(fieldUsageRegistry, condition.keyField, visualisationHierarchyConditionAreaManager);
        this.registerFieldUsage(fieldUsageRegistry, condition.parentKeyField, visualisationHierarchyConditionAreaManager);
        var parentValue = parent ? parent[condition.keyField] : null;
        var hierarchyFilter = new Filter({
          path: condition.parentKeyField,
          //TODO: use the operator from the model, lookup the corresponding ui5 filteroperator
          operator: FilterOperator.EQ,
          value1: typeof(parentValue) === "undefined" ? null : parentValue
        });
        hierarchyFilters.push(hierarchyFilter);
      }.bind(this));
      
      if (hierarchyFilters && hierarchyFilters.length) {
        if (hierarchyFilters.length === 1) {
          hierarchyFilter = hierarchyFilters[0];
        }
        else {
          hierarchyFilter = new Filter({
            filters: hierarchyFilters,
            and: true
          });
        }
      }
      return hierarchyFilter;
    },
    _getFilter: function(fieldUsageRegistry, parentPath){
      var filters = [];
      var hierarchyFilter = this._getHierarchyFilter(fieldUsageRegistry, parentPath);
      if (hierarchyFilter) {
        filters.push(hierarchyFilter);
      }

      var filter = TableVisualisation.prototype._getFilter.call(this, fieldUsageRegistry);
      if (filter) {
        filters.push(filter);
      }
      return filters;
    },
    _getSelect: function(fieldUsageRegistry){
      var visualisationAxesAreaManager = this._getVisualisationEditorComponentManager("VisualisationAxesAreaManager");
      var select = visualisationAxesAreaManager.getSelectedAxisItems(this._columnAxisId).map(function(item){
        var key = item.getKey();
        this.registerFieldUsage(fieldUsageRegistry, key, visualisationAxesAreaManager);
        return key;
      }.bind(this));
      
      var visualisationHierarchyConditionAreaManager = this._getVisualisationEditorComponentManager("VisualisationHierarchyConditionAreaManager");
      var hierarchyConditions = visualisationHierarchyConditionAreaManager._getHierarchyConditions();
      if (hierarchyConditions && hierarchyConditions.length) {
        hierarchyConditions.forEach(function(hierarchyCondition){
          if (!hierarchyCondition.keyField) {
            return;
          }
          this.registerFieldUsage(fieldUsageRegistry, hierarchyCondition.keyField, visualisationHierarchyConditionAreaManager);
          if (select.indexOf(hierarchyCondition.keyField) === -1){
            select.push(hierarchyCondition.keyField)
          }
        }.bind(this));
      }
      return select;
    },
    _loadChildNodes: function(callback, parentPath){
      var fieldUsageRegistry = {};
      
      var filters = this._getFilter(fieldUsageRegistry, parentPath);
      var select = this._getSelect(fieldUsageRegistry);
      var sorters = this._getSorters(fieldUsageRegistry);
      
      var expandList = this._getExpandList(fieldUsageRegistry);
      var dataModel = this.getModel(BaseVisualisationController.prototype._dataModelName);
      var urlParameters = {
        "$select": select.join(", ")
      };
      if (expandList.length){
        urlParameters["$expand"] = expandList.join(",");
      }
      dataModel.read(this._getEntitySetPath(), {
        filters: filters,
        sorters: sorters,
        urlParameters: urlParameters,
        success: function(oData, response){
          oData.results.forEach(function(node){
            node[this._nodesPath] = this._dummy;
          }.bind(this));
          var localDataModel = this.getModel(this._localDataModelName);
          localDataModel.setProperty(this._normalizePath(parentPath) + this._nodesPath, oData.results);
          callback();
        }.bind(this),
        error: function(error){
          callback();
          this._showMessageToast(this.getTextFromI18n("errorLoading"));
        }.bind(this)
      });
    },
    _executeQuery: function(callback){
      this._createColumns(null, this._localDataModelName);
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
    },
    onRemoveHierarchyConditionPressed: function(event){
      var visualisationHierarchyConditionAreaManager = this._getVisualisationEditorComponentManager("VisualisationHierarchyConditionAreaManager");
      visualisationHierarchyConditionAreaManager.onRemoveHierarchyConditionPressed(event);
    },
    onAddHierarchyConditionPressed: function(event){
      var visualisationHierarchyConditionAreaManager = this._getVisualisationEditorComponentManager("VisualisationHierarchyConditionAreaManager");
      visualisationHierarchyConditionAreaManager.onAddHierarchyConditionPressed(event);
    }
  });
  return controller;
});