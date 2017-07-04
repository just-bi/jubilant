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
    _createColumns: function(dataModelName){
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
        if (columnMap[key]) {
          delete columnMap[key];
        }
        else {
          visualisation.addColumn(this._createColumn(key, dataModelName));
        }
        select.push(key)
      }.bind(this));

      for (var column in columnMap){
        column = columnMap[column];
        visualisation.removeColumn(column);
      }
      return select;
    },
    _executeQuery: function(callback){
      var visualisation = this._getVisualisation();
      
      var select = this._createColumns();
      var path;
      path = this._getEntitySetPath();
      path = this._dataModelName + ">" + path;
      
      var filters;
      var visualisationFilterAreaManager = this._getVisualisationEditorComponentManager("VisualisationFilterAreaManager");
      var filter = visualisationFilterAreaManager.getFilter();
      if (filter){
        filters = [filter];
      }

      var sorters;
      var visualisationSortAreaManager = this._getVisualisationEditorComponentManager("VisualisationSortAreaManager");
      sorters = visualisationSortAreaManager.getSorters();
      
      visualisation.bindRows({
        path: path,
        filters: filters,
        sorter: sorters,
        parameters: {
          select: select.join(","),
          countMode: CountMode.Request
        }
      });
      
      var binding = visualisation.getBinding("rows");
      binding.attachDataReceived(callback);
    }
  });
  return controller;
});