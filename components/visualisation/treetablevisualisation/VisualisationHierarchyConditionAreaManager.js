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
  "jubilant/components/visualisation/BaseVisualisationEditorComponentManager"
], 
function(
   BaseVisualisationEditorComponentManager,
   Filter,
   FilterOperator
){
  var VisualisationHierarchyConditionAreaManager = BaseVisualisationEditorComponentManager.extend("jubilant.components.visualisation.treetablevisualisation.VisualisationHierarchyConditionAreaManager", {
    _nodesPath: "nodes",
    constructor: function(visualisationController){
      BaseVisualisationEditorComponentManager.prototype.constructor.apply(this, arguments);
    },
    _initModels: function(){
      BaseVisualisationEditorComponentManager.prototype._initModels.apply(this, arguments);
      var visualisationStateModel = this._getVisualisationStateModel();
      var path = this._getVisualisationStateModelPath();
      visualisationStateModel.setProperty(path, {});
      visualisationStateModel.setProperty(path + "/" + this._nodesPath, [{
        relationalOperator: "equals"
      }]);
    },
    _getHierarchyConditions: function(){
      var visualisationStateModel = this._getVisualisationStateModel();
      var path = this._getVisualisationStateModelPath();
      var hierarchyConditions = visualisationStateModel.getProperty(path + "/" + this._nodesPath);
      return hierarchyConditions;
    },
    _getRowForEvent: function(event){
      var button = event.getSource();
      var row = button.getParent().getParent();
      return row;
    },
    _getRowContextForEvent: function(event){
      var row = this._getRowForEvent(event);
      var bindingContext = row.getBindingContext("visualisationState");
      return bindingContext;
    },
    _getRowIndexForEvent: function(event){
      var context = this._getRowContextForEvent(event);
      var path = context.getPath();
      var pathParts = path.split("/");
      var index = pathParts.pop();
      return parseInt(index, 10);
    },
    onRemoveHierarchyConditionPressed: function(event){
      var visualisationStateModel = this._getVisualisationStateModel();
      var path = this._getVisualisationStateModelPath() + "/" + this._nodesPath;
      var hierarchyConditions = this._getHierarchyConditions();
      if (hierarchyConditions.length === 1) {
        return;
      }
      var index = this._getRowIndexForEvent(event);
      hierarchyConditions.splice(index, 1);
      visualisationStateModel.setProperty(path, hierarchyConditions);
    },
    onAddHierarchyConditionPressed: function(event){
      var visualisationStateModel = this._getVisualisationStateModel();
      var path = this._getVisualisationStateModelPath() + "/" + this._nodesPath;
      var index = this._getRowIndexForEvent(event);
      var hierarchyConditions = this._getHierarchyConditions();
      hierarchyConditions.splice(index, 0, {
        keyField: null,
        relationalOperator: "equals",
        parentKeyField: null
      });
      visualisationStateModel.setProperty(path, hierarchyConditions);
    }
  });
  return VisualisationHierarchyConditionAreaManager;
});