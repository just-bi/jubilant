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
  "sap/ui/model/Sorter",
  "sap/ui/model/json/JSONModel",
  "sap/ui/table/Row"
], 
function(
   BaseVisualisationEditorComponentManager,
   Sorter,
   JSONModel,
   Row
){
  var VisualisationSortAreaManager = BaseVisualisationEditorComponentManager.extend("jubilant.components.visualisation.VisualisationSortAreaManager", {
    _sortModelName: "sortModel",
    constructor: function(visualisationController){
      BaseVisualisationEditorComponentManager.prototype.constructor.apply(this, arguments);
    },
    _getNewSortColumnData: function(){
      return {
        field: null,
        "descending": false
      };
    },
    _initSortModelData: function(){
      this._getSortModel().setData([this._getNewSortColumnData()]);
    },
    _initModels: function(){
      var sortModel = new JSONModel();
      var visualisationController = this._visualisationController;
      visualisationController.setModel(sortModel, this._sortModelName);
      this._initSortModelData();
    },
    _getSortModel: function(){
      var visualisationController = this._visualisationController;
      var model = visualisationController.getModel(this._sortModelName);
      return model;
    },
    _getSortModelRowForEvent: function(event){
      var control = event.getSource();
      var row;
      do {
        control = control.getParent();
      } while (control && !(control instanceof Row));
      return control;
    },
    _getSortRowBindingContext: function(row){
      return row.getBindingContext(this._sortModelName);
    },
    _handleSortDirectionButtonPressed: function(row) {
      var rowContext = this._getSortRowBindingContext(row);
      var sortModel = this._getSortModel();
      sortModel.setProperty(rowContext.getPath() + "/descending", !rowContext.getObject().descending);
    },
    handleSortDirectionButtonPressed: function(event) {
      var row = this._getSortModelRowForEvent(event);
      this._handleSortDirectionButtonPressed(row);
    },
    _moveSortColumn: function(row, positions){
      var rowContext = this._getSortRowBindingContext(row);
      var path = rowContext.getPath();
      var index = parseInt(path.split("/").pop(), 10);
      if (index === 0 && positions < 0) {
        //can't move further up
        return;
      }
      var sortModel = this._getSortModel();
      var sortColumns = sortModel.getProperty("/");
      if (index === sortColumns.length - 1 && positions > 0) {
        //can't move further down
        return;
      }
      var object = sortColumns[index];
      sortColumns.splice(index, 1);
      sortColumns.splice(index + positions, 0, object);
      sortModel.setProperty("/", sortColumns);
    },
    _handleSortColumnUpButtonPressed: function(row) {
      this._moveSortColumn(row, -1);
    },
    handleSortColumnUpButtonPressed: function(event) {
      var row = this._getSortModelRowForEvent(event);
      this._handleSortColumnUpButtonPressed(row);
    },
    _handleSortColumnDownButtonPressed: function(row) {
      this._moveSortColumn(row, 1);
    },
    handleSortColumnDownButtonPressed: function(event) {
      var row = this._getSortModelRowForEvent(event);
      this._handleSortColumnDownButtonPressed(row);
    },
    _handleAddSortColumnButtonPressed: function(row){
      var rowContext = this._getSortRowBindingContext(row);
      var path = rowContext.getPath().split("/");
      var index = parseInt(path.pop(), 10) + 1;
      var sortModel = this._getSortModel();
      var sortColumns = sortModel.getProperty("/");
      sortColumns.splice(index, 0, this._getNewSortColumnData());
      sortModel.setProperty("/", sortColumns);
    },
    handleAddSortColumnButtonPressed: function(event){
      var row = this._getSortModelRowForEvent(event);
      this._handleAddSortColumnButtonPressed(row);
    },
    _handleRemoveSortColumnButtonPressed: function(row){
      var rowContext = this._getSortRowBindingContext(row);
      var path = rowContext.getPath().split("/");
      var index = parseInt(path.pop(), 10);
      var sortModel = this._getSortModel();
      var sortColumns = sortModel.getProperty("/");
      if (sortColumns.length > 1) {
        sortColumns.splice(index, 1);
      }
      else {
        delete sortColumns[0].field;
      }
      sortModel.setProperty("/", sortColumns);
    },
    handleRemoveSortColumnButtonPressed: function(event){
      var row = this._getSortModelRowForEvent(event);
      this._handleRemoveSortColumnButtonPressed(row);
    },
    getSorters: function(){
      var sorters = [];
      var sortModel = this._getSortModel();
      var sortColumns = sortModel.getProperty("/");
      if (sortColumns && sortColumns.length) {
        sortColumns.forEach(function(sortColumn){
          var sortClause;
          if (!sortColumn.field) {
            return;
          }
          sorters.push(new Sorter(sortColumn.field, sortColumn.descending));
        }.bind(this));
      }
      return sorters;
    },
    _clearSorting: function(){
      this._initSortModelData();
    },
    handleClearAllSortColumns: function(event){
      this._clearSorting();
    }
  });
  return VisualisationSortAreaManager;
});