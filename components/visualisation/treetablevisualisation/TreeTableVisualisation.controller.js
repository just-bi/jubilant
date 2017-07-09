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
  "sap/ui/model/odata/CountMode"
], 
function(
  TableVisualisation,
  BaseVisualisationController,
  JSONModel,
  CountMode
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
    _getFilter: function(parentPath){
      var localDataModel = this.getModel(this._localDataModelName);
      var parent = localDataModel.getProperty(parentPath);

      var visualisationHierarchyConditionAreaManager = this._getVisualisationEditorComponentManager("VisualisationHierarchyConditionAreaManager");
      var hierarchyCondition = visualisationHierarchyConditionAreaManager._getHierarchyCondition();

      var parentKeyValue = parent ? parent[hierarchyCondition.keyField] : null;
      var hierarchyConditionFilter = visualisationHierarchyConditionAreaManager._getHierarchyConditionFilter(parentKeyValue);

      var filters = [];
      if (hierarchyConditionFilter) {
        filters.push(hierarchyConditionFilter);
      }

      var visualisationFilterAreaManager = this._getVisualisationEditorComponentManager("VisualisationFilterAreaManager");
      var filter = visualisationFilterAreaManager.getFilter();
      if (filter) {
        filters.push(filter);
      }
      return filters;
    },
    _getSelect: function(){
      var visualisationAxesAreaManager = this._getVisualisationEditorComponentManager("VisualisationAxesAreaManager");
      var select = visualisationAxesAreaManager.getSelectedAxisItems(this._columnAxisId).map(function(item){
        return item.getKey();
      });
      
      var visualisationHierarchyConditionAreaManager = this._getVisualisationEditorComponentManager("VisualisationHierarchyConditionAreaManager");
      var hierarchyCondition = visualisationHierarchyConditionAreaManager._getHierarchyCondition();
      if (hierarchyCondition) {
        if (hierarchyCondition.keyField && select.indexOf(hierarchyCondition.keyField) === -1) {
          select.push(hierarchyCondition.keyField);
        }
        if (hierarchyCondition.parentKeyField && select.indexOf(hierarchyCondition.parentKeyField) === -1) {
          select.push(hierarchyCondition.parentKeyField);
        }
      }
      return select;
    },
    _getSorters: function(){
      var sorters;
      var visualisationSortAreaManager = this._getVisualisationEditorComponentManager("VisualisationSortAreaManager");
      sorters = visualisationSortAreaManager.getSorters();
      return sorters;
    },
    _loadChildNodes: function(callback, parentPath){
      var filters = this._getFilter(parentPath);
      var select = this._getSelect();
      var sorters = this._getSorters();
      
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