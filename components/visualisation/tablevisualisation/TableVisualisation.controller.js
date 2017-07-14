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
  "sap/ui/table/Column",
  "sap/ui/core/HorizontalAlign",
  "sap/ui/model/odata/CountMode"
], 
function(
  BaseVisualisationController,
  Column,
  HorizontalAlign,
  CountMode
){
  "use strict";
  var controller = BaseVisualisationController.extend("jubilant.components.visualisation.tablevisualisation.TableVisualisation", {
    _columnAxisId: "columns",
    _clearVisualization: function(){
      var visualisation = this._getVisualisation();
      visualisation.unbindRows();
      visualisation.destroyColumns();
    },
    _checkCanExecuteQuery: function(){
      var visualisationAxesAreaManager = this._getVisualisationEditorComponentManager("VisualisationAxesAreaManager");
      var selectedItems = visualisationAxesAreaManager.getSelectedAxisItems(this._columnAxisId);
      return selectedItems.length > 0;
    },    
    _createColumn: function(propertyName, dataModelName){
      if (!dataModelName) {
        dataModelName = this._getDataModelName();
      }
      var controlFactory = this._getControlFactory();
      var propertyDescriptor = this._getPropertyDescriptor(propertyName);
      var dataTypeDescriptor = this._getODataTypeDescriptor(propertyDescriptor);
      var column = new Column({
        tooltip: controlFactory.getLabelTextForOdataPropertyDescriptor(
          propertyDescriptor
        ), 
        name: propertyName,
        filterProperty: propertyName,
        showFilterMenuEntry: true,
        sortProperty: propertyName,
        showSortMenuEntry: true,
        label: controlFactory.createLabelForODataPropertyDescriptor(
          propertyDescriptor
        ),
        template: controlFactory.createTemplateForPropertyDescriptor(
          propertyDescriptor, 
          dataTypeDescriptor, 
          dataModelName
        ),
        autoResizable: true,
        hAlign: dataTypeDescriptor.numeric ? HorizontalAlign.End :  HorizontalAlign.Begin,
        showFilterMenuEntry: true,
        showSortMenuEntry: true
      });      
      return column;
    },
    _createColumns: function(fieldUsageRegistry, dataModelName){
      if (!dataModelName) {
        dataModelName = this._getDataModelName();
      }
      var visualisation = this._getVisualisation();
      var columnMap = {};
      visualisation.getColumns().forEach(function(column){
        columnMap[column.getName()] = column;
      });

      var select = [];
      var visualisationAxesAreaManager = this._getVisualisationEditorComponentManager("VisualisationAxesAreaManager");
      var selectedItems = visualisationAxesAreaManager.getSelectedAxisItems(this._columnAxisId);     
      selectedItems.forEach(function(selectedItem){
        var key = selectedItem.getKey();
        this.registerFieldUsage(fieldUsageRegistry, key, visualisationAxesAreaManager);
        if (columnMap[key]) {
          delete columnMap[key];
        }
        else {
          visualisation.addColumn(this._createColumn(key, dataModelName));
        }
        select.push(key);
      }.bind(this));

      for (var column in columnMap){
        column = columnMap[column];
        visualisation.removeColumn(column);
      }
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
      var visualisation = this._getVisualisation();
      
      var fieldUsageRegistry = {};
      
      var select = this._createColumns(fieldUsageRegistry);
      var path;
      path = this._getEntitySetPath();
      path = this._dataModelName + ">" + path;
      
      var filters = this._getFilter(fieldUsageRegistry);
      if (filters) {
        filters = [filters];
      }
      var sorters = this._getSorters(fieldUsageRegistry);
      
      var expandList = this._getExpandList(fieldUsageRegistry);
      var parameters = {
        select: select.join(","),
        countMode: CountMode.Request          
      };
      if (expandList.length) {
        parameters.expand = expandList.join(","); 
      };
      
      visualisation.bindRows({
        path: path,
        filters: filters,
        sorter: sorters,
        parameters: parameters
      });
      
      var binding = visualisation.getBinding("rows");
      binding.attachDataReceived(callback);
    }
  });
  return controller;
});