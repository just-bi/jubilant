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
  "jubilant/components/visualisation/BaseVisualisationController"
], 
function(
  BaseVisualisationController
){
  "use strict";
  var controller = BaseVisualisationController.extend("jubilant.components.visualisation.startervisualisation.StarterVisualisation", {
    _itemAxisId: "items",
    _oDataResponseTextAreaId: "oDataResponseTextArea",
    _getODataResponseTextArea: function(){
      return this.byId(this._oDataResponseTextAreaId);
    },
    _clearODataResponseTextArea: function(){
      var oDataResponseTextArea = this._getODataResponseTextArea();
      oDataResponseTextArea.setValue("");
    },
    _renderODataResponse: function(data, response){
      var oDataResponseTextArea = this._getODataResponseTextArea();
      oDataResponseTextArea.setGrowing(false);
      var text = JSON.stringify(response);
      oDataResponseTextArea.setValue(text);
      oDataResponseTextArea.setGrowing(true);
    },
    _clearVisualization: function(){
      this._clearODataResponseHTML();
    },
    _checkCanExecuteQuery: function(){
      var visualisationAxesAreaManager = this._getVisualisationEditorComponentManager("VisualisationAxesAreaManager");
      var selectedItems = visualisationAxesAreaManager.getSelectedAxisItems(this._itemAxisId);
      return selectedItems.length > 0;
    },
    _getSelect: function(fieldUsageRegistry){
      var visualisationAxesAreaManager = this._getVisualisationEditorComponentManager("VisualisationAxesAreaManager");
      var selectedItems = visualisationAxesAreaManager.getSelectedAxisItems(this._itemAxisId);
      var select = selectedItems.map(function(item){
        var key = item.getKey();
        this.registerFieldUsage(fieldUsageRegistry, key, visualisationAxesAreaManager);
        return key;
      }.bind(this));
      return select;
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
      var fieldUsageRegistry = {};
      
      var filters = this._getFilter(fieldUsageRegistry);
      var select = this._getSelect(fieldUsageRegistry);
      var sorters = this._getSorters(fieldUsageRegistry);
      
      var expandList = this._getExpandList(fieldUsageRegistry);
      var urlParameters = {
        "$select": select.join(", ")
      };
      if (expandList.length){
        urlParameters["$expand"] = expandList.join(",");
      }
      var dataModel = this.getDataModel();
      dataModel.read(this._getEntitySetPath(), {
        filters: filters,
        sorters: sorters,
        urlParameters: urlParameters,
        success: function(oData, response){
          this._renderODataResponse(oData, response);
          callback();
        }.bind(this),
        error: function(error){
          callback();
          this._showMessageToast(this.getTextFromI18n("errorLoading"));
        }.bind(this)
      });
    },
  });
  return controller;
});