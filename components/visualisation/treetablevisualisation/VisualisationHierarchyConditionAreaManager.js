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
  "jubilant/components/visualisation/BaseVisualisationEditorComponentManager",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator"
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
    _getHierarchyCondition: function(){
      var visualisationStateModel = this._getVisualisationStateModel();
      var path = this._getVisualisationStateModelPath();
      var hierarchyCondition = visualisationStateModel.getProperty(path + "/" + this._nodesPath + "/0");
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
    }
  });
  return VisualisationHierarchyConditionAreaManager;
});