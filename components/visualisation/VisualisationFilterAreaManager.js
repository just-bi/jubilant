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
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/core/Item",
  "sap/m/Button",
  "sap/m/ComboBox",
  "sap/m/DatePicker",
  "sap/m/DateRangeSelection",
  "sap/m/Input",
  "sap/m/MultiComboBox",
  "sap/m/MultiInput",
  "sap/m/RangeSlider",
  "sap/m/TimePicker",
  "sap/ui/table/Row"
], 
function(
   BaseVisualisationEditorComponentManager,
   JSONModel,
   Filter,
   FilterOperator,
   Item,
   Button,
   ComboBox,
   DatePicker,
   DateRangeSelection,
   Input,
   MultiComboBox,
   MultiInput,
   RangeSlider,
   TimePicker,
   Row
){
  var VisualisationFilterAreaManager = BaseVisualisationEditorComponentManager.extend("jubilant.components.visualisation.VisualisationFilterAreaManager", {
    _sapExtensionsNamespace: "http://www.sap.com/Protocols/SAPData",
    _sapExtensionsNamespaceBase64: btoa("http://www.sap.com/Protocols/SAPData"),
    _filterModelName: "filterModel", 
    _nodesPath: "nodes",
    _defaultRelationalOperatorId: "equals",
    _defaultLogicalOperatorId: "AND",
    constructor: function(visualisationController){
      BaseVisualisationEditorComponentManager.prototype.constructor.apply(this, arguments);
    },
    _getFilterModel: function(){
      var controller = this._visualisationController;
      return controller.getModel(this._filterModelName);
    },
    _clearFilter: function(){
      var filterModel = this._getFilterModel();
      var path = "/" + this._nodesPath + "/0";
      filterModel.setProperty(path + "/" + this._nodesPath, []);
      this._addRelationalFilterCondition(path);
    },
    _initModels: function(){
      var filterModel = new JSONModel({
        nodes: []
      });
      var controller = this._visualisationController;
      controller.setModel(filterModel, this._filterModelName);
      var path = this._addLogicalFilterCondition();
      this._expandRow(0);
      this._addRelationalFilterCondition(path);
    },
    _addFilterCondition: function(data, parentPath, index){
      var filterModel = this._getFilterModel();
      parentPath = (parentPath || "");
      var parent = filterModel.getProperty(parentPath) || {level: -1};
      data.level = parent.level + 1;
      var nodes = parent[this._nodesPath];
      parentPath = [parentPath, this._nodesPath].join("/");
      if (!nodes) {
        nodes = [];
        filterModel.setProperty(parentPath, nodes);
      }
      if (typeof(index) === "undefined") {
        parentPath = [parentPath, nodes.length].join("/");
        filterModel.setProperty(parentPath, data);
      }
      else {
        nodes.splice(index, 0, data);
        filterModel.setProperty(parentPath, nodes);
        parentPath = [parentPath, index].join("/");
      }
      return parentPath;
    },
    _addLogicalFilterCondition: function(parentPath, index){
      var path = this._addFilterCondition(
        {logicalOperator: this._defaultLogicalOperatorId}, 
        parentPath, index
      );
      //TODO: find the corresponding row, and expand it.
      return path;
    },
    _addRelationalFilterCondition: function(parentPath, index){
      var path = this._addFilterCondition(
        {relationalOperator: this._defaultRelationalOperatorId}, 
        parentPath, index
      );
      return path;
    },
    _getFilterModelRowForEvent: function(event){
      var control = event.getSource();
      var row;
      do {
        control = control.getParent();
      } while (control && !(control instanceof Row));
      return control;
    },
    _getFilterRowBindingContext: function(row){
      return row.getBindingContext(this._filterModelName);
    },
    _combineFilters: function(filters, and){
      var filter;
      switch (filters.length){
        case 0:
          filter = null;
          break;
        case 1: //if we have only one condition, then don't wrap it in a logical operator.
          filter = filters[0];
          break;
        default:
          filter = new Filter({
            filters: filters,
            and: and
          });
      }
      return filter;
    },
    _getFilterForLogicalOperatorNode: function(node){
      var nodes = node[this._nodesPath];
      var filters = nodes.map(function(node){
        return this._getFilterForNode(node);
      }.bind(this)).filter(function(filter){
        return Boolean(filter);
      });
      var operator = node.logicalOperator;
      var controller = this._visualisationController;
      var logicalOperatorDescriptor = controller._getLogicalOperatorDescriptor(operator);
      var filter = this._combineFilters(filters, logicalOperatorDescriptor["sap.ui.model.Filter.andFlag"]);
      return filter;
    },
    _getFilterForRelationalOperatorNode: function(node){
      var filter;
      var field = node.field;
      if (!field) {
        filter = null;
        return filter;
      }
      var controller = this._visualisationController;
      var propertyDescriptor = controller._getPropertyDescriptor(field);
      var type = propertyDescriptor.oDataProperty.type;

      var operator = node.relationalOperator;
      var relationalOperatorDescriptor = controller._getRelationalOperatorDescriptor(operator);

      if (relationalOperatorDescriptor.multiple && node.value1 && node.value1.length) {
        operator = FilterOperator[relationalOperatorDescriptor.multiple["sap.ui.model.FilterOperator"]];
        var filters = node.value1.map(function(value){
          var filter;
          filter = new Filter({
            path: node.field,
            operator: operator,
            //value1: controller._escapeValueForOdataType(type, value)
            value1: value
          });
          return filter;
        }.bind(this));
        filter = this._combineFilters(filters, relationalOperatorDescriptor.multiple.and);
      }
      else 
      if (typeof(node.value1) !== "undefined") {
        operator = FilterOperator[relationalOperatorDescriptor["sap.ui.model.FilterOperator"]];
        
        filter = new Filter({
          path: node.field,
          operator: operator,
          //value1: controller._escapeValueForOdataType(type, node.value1),
          value1: node.value1,
          //value2: controller._escapeValueForOdataType(type, node.value2)
          value2: node.value2
        });
      }
      return filter;
    },
    _getFilterForNode: function(node){
      var filter = null;
      if (node.logicalOperator) {
        filter = this._getFilterForLogicalOperatorNode(node);
      }
      else 
      if (node.relationalOperator) {
        filter = this._getFilterForRelationalOperatorNode(node);
      }
      return filter;
    },
    getFilter: function(){
      var filterModel = this._getFilterModel();
      var node = filterModel.getProperty("/" + this._nodesPath + "/0");
      return this._getFilterForNode(node);
    },
    _expandRow: function(row){
      var rowIndex, table = this._getEditorComponent();
      if (typeof(row) === "number") {
        rowIndex = row;
      }
      else {
        rowIndex = table.indexOfRow(row);
      }
      if (!table.isExpanded(rowIndex)) {
        table.expand(rowIndex);
      }
    },
    handleClearFilterButtonPressed: function(event){
      this._removeFilterByPath("/" + this._nodesPath + "/0");
    },
    handleAddFilterPressed: function(event){
      var row = this._getFilterModelRowForEvent(event);
      this._expandRow(row);
      var bindingContext = this._getFilterRowBindingContext(row);
      this._addRelationalFilterCondition(bindingContext.getPath());
    },
    _removeFilterByPath: function(path){
      var parentPath = path.split("/");
      var item = parseInt(parentPath.pop(), 10);
      parentPath = parentPath.join("/");

      var node, filterModel = this._getFilterModel();      
      if (parentPath === "/" + this._nodesPath) {
        //rootnode. Remove all its child nodes (= clear the entire filter)
        parentPath += "/0/" + this._nodesPath;
        nodes = [{relationalOperator: this._defaultRelationalOperatorId}];
      }
      else {
        //not a rootnode. Remove only this condition.
        nodes = filterModel.getProperty(parentPath);
        nodes.splice(item, 1);
      }
      filterModel.setProperty(parentPath, nodes);
    },
    _handleRemoveFilterPressed: function(row) {
      var bindingContext = this._getFilterRowBindingContext(row);
      var path = bindingContext.getPath();
      this._removeFilterByPath(path);
    },
    handleRemoveFilterPressed: function(event){
      var row = this._getFilterModelRowForEvent(event);
      this._handleRemoveFilterPressed(row);
    },
    handleOutdentFilterPressed: function(event){
      
    },
    handleIndentFilterPressed: function(event){
      var row = this._getFilterModelRowForEvent(event);
      var bindingContext = this._getFilterRowBindingContext(row);
      var path = bindingContext.getPath()
      //current relational operator condition, which is to be promoted to a logical operator condition
      var filterCondition = bindingContext.getObject();
      //copy the current filtercondition:
      var filterModel = this._getFilterModel();
      var relationalOperatorFilter = {};
      for (var p in filterCondition) {
        if (p === "level") {
          relationalOperatorFilter[p] = filterCondition[p] + 1;
        }
        else {
          relationalOperatorFilter[p] = filterCondition[p];
          filterModel.setProperty(path + "/" + p, undefined);
        }
      }
      filterModel.setProperty(path + "/" + "logicalOperator", "AND");
      filterModel.setProperty(path + "/" + this._nodesPath, []);
      filterModel.setProperty(path + "/" + this._nodesPath + "/" + 0, relationalOperatorFilter);
      this._expandRow(row);
    },
    _checkFieldAgainstFilter: function(propertyDescriptor, fieldFilter){
      var propertyName, p, f;
      for (propertyName in fieldFilter) {
        p = propertyDescriptor[propertyName];
        if (!p) {
          return false;
        }
        f = fieldFilter[propertyName];
        if (typeof(f) === "object") {
          if (!this._checkFieldAgainstFilter(p, f)) {
            return false;
          }
        }
        else 
        if (p !== f) {
          return false;
        }
      }
      return true;
    },
    _disableRelationalOperatorsUnsuitableForField: function(row){
      var fieldComboBox = this._getFieldComboBox(row);
      var selectedField = fieldComboBox.getSelectedKey();
      if (!selectedField) {
        return;
      }
      var controller = this._visualisationController;
      var propertyDescriptor = controller._getPropertyDescriptor(selectedField);
      var relationalOperatorDescriptors = controller._getRelationalOperatorDescriptors();

      //find all relationaloperators unsuitable for this field.
      relationalOperatorDescriptors = relationalOperatorDescriptors.filter(
        function(relationalOperatorDescriptor){
          //fields must match the includeFilter, otherwise this operator is not for them
          if (relationalOperatorDescriptor.includeFieldFilter) {
            var isIncluded = this._checkFieldAgainstFilter(
              propertyDescriptor, 
              relationalOperatorDescriptor.includeFieldFilter
            )
            if (!isIncluded){
              //field doesn't match, collect this operator to be disabled.
              return true;
            }
          }
          //fields must not match the excludeFilter
          if (relationalOperatorDescriptor.excludeFieldFilter) {
            var isExcluded = this._checkFieldAgainstFilter(
              propertyDescriptor, 
              relationalOperatorDescriptor.excludeFieldFilter
            )
            if (isExcluded){
              //field matches, collect the operator to be disabled
              return true;
            }
          }
          //otherwise, the operator is applicable to this field.
          return false;
        }.bind(this)
      );
      
      //disable the relationaloperators that are unsuitable for the current field.
      var relationalOperatorComboBox = this._getRelationalOperatorComboBox(row);      
      var selectedRelationalOperator = relationalOperatorComboBox.getSelectedKey();
      var relationOperatorComboBoxItems = relationalOperatorComboBox.getItems();

      relationOperatorComboBoxItems.forEach(function(item){
        var enabled = !relationalOperatorDescriptors.some(function(relationalOperatorDescriptor){
          return item.getKey() === relationalOperatorDescriptor.id
        });
        item.setEnabled(enabled);
        if (!enabled && selectedRelationalOperator === item.getKey()) {
          relationalOperatorComboBox.setSelectedKey(this._defaultRelationalOperatorId);
        }
      }.bind(this));
    },
    _updateFilterValueControlBindings: function(row) {
      var fieldComboBox = this._getFieldComboBox(row);
      var selectedField = fieldComboBox.getSelectedKey();
      if (!selectedField) {
        return;
      }
      var controller = this._visualisationController;
      var propertyDescriptor = controller._getPropertyDescriptor(selectedField);
      var dataTypeDescriptor = controller._getODataTypeDescriptor(propertyDescriptor);

      var filterValueControls = this._getFilterValueControls(row);
      filterValueControls.forEach(function(control){
        if (control instanceof MultiInput) {
          
        }
        else
        if (control instanceof Input) {
          control.unbindValue();
          control.bindValue({
            model: this._filterModelName,
            path: "value1",
            type: dataTypeDescriptor.sapUi5Type
          });
        }
      }.bind(this));
    },
    _handleLogicalOperatorChanged: function(row){
      
    },
    handleLogicalOperatorChanged: function(event) {
      var comboBox = event.getSource();
      this._handleLogicalOperatorChanged(comboBox.getParent().getParent());
    },
    _handleFilterFieldChanged: function(row){
      this._disableRelationalOperatorsUnsuitableForField(row);
      this._checkBindValuesToComboBox(row);
      this._updateFilterValueControlBindings(row);
    },
    handleFilterFieldChanged: function(event) {
      var comboBox = event.getSource();
      this._handleFilterFieldChanged(comboBox.getParent().getParent());
    },
    _setPredefinedValue1ForRelationalOperator: function(row){
      var relationalOperatorComboBox = this._getRelationalOperatorComboBox(row);
      var selectedRelationalOperator = relationalOperatorComboBox.getSelectedKey();
      var controller = this._visualisationController;
      var relationalOperatorDescriptor = controller._getRelationalOperatorDescriptor(selectedRelationalOperator);
      if (typeof(relationalOperatorDescriptor.value1) !== "undefined") {
        var bindingContext = this._getFilterRowBindingContext(row);
        this._getFilterModel().setProperty(bindingContext.getPath() + "/value1", relationalOperatorDescriptor.value1);
      }
    },
    _handleRelationalOperatorChanged: function(row){
      this._setPredefinedValue1ForRelationalOperator(row);
      this._checkBindValuesToComboBox(row);
    },
    handleRelationalOperatorChanged: function(event){
      var comboBox = event.getSource();
      this._handleRelationalOperatorChanged(comboBox.getParent());
    },
    _getValuesModelForComboBox: function(oDataTypeDescriptor, propertyDescriptor, propertyName, comboBox){
      var model = new JSONModel(), path = "/results";
      if (oDataTypeDescriptor.values) {
        //make model for the static values predefined for the data type (think Boolean: true/false)
        var values = oDataTypeDescriptor.values.map(function(value){
          var object = {};
          object[propertyName] = value
          return object;
        });
        model.setProperty(path, values);
        oDataTypeDescriptor.valuesModel = model;
      }
      else {
        comboBox.setBusy(true);
        var controller = this._visualisationController;
        var dataModel = controller.getDataModel();
        dataModel.read(controller._getEntitySetPath(), {
          urlParameters: {
            $select: propertyName,
            $orderby: propertyName
          },
          success: function(data, response){
            var uniques = []; 
            var results = data.results.filter(function(object){
              var test, value = object[propertyName];
              if (uniques.indexOf(value) === -1) {
                uniques.push(value);
                test = true;
              } 
              else {
                test = false;
              }
              return test;
            });
            model.setProperty(path, results);
            comboBox.setBusy(false);
          },
          error: function(error){
            debugger;
            comboBox.setBusy(false);
          }
        });
        propertyDescriptor.valuesModel = model;
      }
      return model;
    },
    _bindPropertyValuesToComboBox: function(oDataTypeDescriptor, propertyDescriptor, comboBox){
      var model;
      var propertyName = oDataTypeDescriptor.values ? "value" : propertyDescriptor.oDataProperty.name;
      
      if (oDataTypeDescriptor.valuesModel){
        model = oDataTypeDescriptor.valuesModel;
      } 
      else 
      if (propertyDescriptor.valuesModel){
        model = propertyDescriptor.valuesModel;
      }
      else {
        model = this._getValuesModelForComboBox(
          oDataTypeDescriptor, propertyDescriptor, propertyName, comboBox
        );
      }
      
      var modelName = "values";
      comboBox.setModel(model, modelName);
      comboBox.bindItems({
        path: modelName + ">/results",
        template: new Item({
          key: "{" + modelName + ">" + propertyName + "}",
          text: "{" + modelName + ">" + propertyName + "}"
        }),
        templateShareable: false
      });
    },
    _checkBindValuesToComboBox: function(row){
      var bindingContext = this._getFilterRowBindingContext(row);
      var filterRow = bindingContext.getObject();
      var relationalOperator = filterRow.relationalOperator;
      if (!relationalOperator) {
        return;
      }      
      var field = filterRow.field;
      if (!field) {
        return;
      }

      var controller = this._visualisationController;
      var relationalOperatorDescriptor = controller._getRelationalOperatorDescriptor(relationalOperator);
      var propertyDescriptor = controller._getPropertyDescriptor(field);
      var typeDescriptor = controller._getODataTypeDescriptor(propertyDescriptor);

      var multiple = relationalOperatorDescriptor.multiple;
      if (typeDescriptor.values || multiple){
        var comboBox;
        this._getFilterValueControls(row).some(function(control){
          if (
            multiple && control instanceof MultiComboBox || 
           !multiple && control instanceof ComboBox 
          ) {
            comboBox = control;
            return true;
          } 
          return false;
        });        
        this._bindPropertyValuesToComboBox(typeDescriptor, propertyDescriptor, comboBox);
      }
    },
    _getLogicalOperatorComboBox: function(row){
      var cell, cellItems, cells = row.getCells();
      cell = cells[0];
      cellItems = cell.getItems();
      return cellItems[0];
    },
    _getFieldComboBox: function(row){
      var cell, cellItems, cells = row.getCells();
      cell = cells[0];
      cellItems = cell.getItems();
      return cellItems[1];
    },
    _getRelationalOperatorComboBox: function(row){
      var cell, cellItems, cells = row.getCells();
      cell = cells[1];
      return cell;
    },
    _getFilterValueControls: function(row){
      var cell, cellItems, cells = row.getCells();
      cell = cells[2];
      cellItems = cell.getItems();
      return cellItems;
    },
    _getFilterValueControl: function(row, type){
      var filterValueControl;
      var filterValueControls = this._getFilterValueControls(row);
      filterValueControls.some(function(control){
        if (control instanceof type) {
          filterValueControl = control;
          return true;
        }
      });
      return filterValueControl;
    },
    _checkIsRelationalOperatorFilter: function(filterRow){
      return filterRow && filterRow.relationalOperator;
    },
    _checkHasField: function(filterRow){
      return filterRow && filterRow.field;
    },
    _checkPredefinedValue: function(filterRow){
      if (!filterRow) {
        return false;
      }
      var relationalOperator = filterRow.relationalOperator;
      var controller = this._visualisationController;
      var relationalOperatorDescriptor = controller._getRelationalOperatorDescriptor(relationalOperator);
      return typeof(relationalOperatorDescriptor.value1) !== "undefined";
    },
    _checkPredefinedValues: function(filterRow){
      if (!filterRow) {
        return false;
      }
      var field = filterRow.field;
      if (!field) {
        return false;
      }
      var controller = this._visualisationController;
      var propertyDescriptor = controller._getPropertyDescriptor(field);
      var dataTypeDescriptor = controller._getODataTypeDescriptor(propertyDescriptor);
      return Boolean(dataTypeDescriptor.values);
    },
    _checkMultiple: function(filterRow){
      if (!filterRow) {
        return false;
      }
      var controller = this._visualisationController;
      var relationalOperatorDescriptor = controller._getRelationalOperatorDescriptor(
        filterRow.relationalOperator
      );
      return relationalOperatorDescriptor.multiple;
    },
    _checkRange: function(filterRow){
      if (!filterRow) {
        return false;
      }
      var controller = this._visualisationController;
      var relationalOperatorDescriptor = controller._getRelationalOperatorDescriptor(
        filterRow.relationalOperator
      );
      return relationalOperatorDescriptor.range;
    },
    _checkIncludedField: function(filterRow) {
      if (!filterRow) {
        return false;
      }
      var controller = this._visualisationController;
      var relationalOperatorDescriptor = controller._getRelationalOperatorDescriptor(
        filterRow.relationalOperator
      );
      var propertyDescriptor = controller._getPropertyDescriptor(
        filterRow.field
      );
      if (relationalOperatorDescriptor.includeFieldFilter) {
        return this._checkFieldAgainstFilter(
          propertyDescriptor, 
          relationalOperatorDescriptor.includeFieldFilter
        );
      }
      return true;
    },
    _checkExcludedField: function(filterRow) {
      if (!filterRow) {
        return false;
      }
      var controller = this._visualisationController;
      var relationalOperatorDescriptor = controller._getRelationalOperatorDescriptor(
        filterRow.relationalOperator
      );
      var propertyDescriptor = controller._getPropertyDescriptor(
        filterRow.field
      );
      if (relationalOperatorDescriptor.excludeFieldFilter) {
        return !this._checkFieldAgainstFilter(
          propertyDescriptor, 
          relationalOperatorDescriptor.excludeFieldFilter
        );
      }
      return false;
    },
    _filterValueInputVisible: function(filterRow){
      if (
       !this._checkIsRelationalOperatorFilter(filterRow) ||
       !this._checkHasField(filterRow) || 
        this._checkPredefinedValue(filterRow) || 
        this._checkMultiple(filterRow) ||
        this._checkRange(filterRow) ||
        !this._checkIncludedField(filterRow) ||
        this._checkExcludedField(filterRow) ||
        this._checkPredefinedValues(filterRow)
      ){
        return false;
      }
      var visible;

      var controller = this._visualisationController;
      var propertyDescriptor = controller._getPropertyDescriptor(filterRow.field);
      var type = propertyDescriptor.oDataProperty.type;
      switch (type) {
        case "Edm.DateTime":
        case "Edm.Time":
          return false;
        default:
      }      
      return true;
    },
    _filterValueDatePickerVisible: function(filterRow){
      if (
       !this._checkIsRelationalOperatorFilter(filterRow) ||
       !this._checkHasField(filterRow) || 
        this._checkPredefinedValue(filterRow) || 
        this._checkMultiple(filterRow) ||
        this._checkRange(filterRow) ||
        !this._checkIncludedField(filterRow) ||
        this._checkExcludedField(filterRow) ||
        this._checkPredefinedValues(filterRow)
      ){
        return false;
      }
      var visible;
      var controller = this._visualisationController;
      var propertyDescriptor = controller._getPropertyDescriptor(filterRow.field);
      switch (propertyDescriptor.oDataProperty.type) {
        case "Edm.DateTime":
          visible = controller._testExtensionProperty(propertyDescriptor, "display-format", "Date")
          break;
        default:
          visible = false;
      }
      return visible;
    },
    _filterValueTimePickerVisible: function(filterRow){
      if (
       !this._checkIsRelationalOperatorFilter(filterRow) ||
       !this._checkHasField(filterRow) || 
        this._checkPredefinedValue(filterRow) || 
        this._checkMultiple(filterRow) ||
        this._checkRange(filterRow) ||
        !this._checkIncludedField(filterRow) ||
        this._checkExcludedField(filterRow) ||
        this._checkPredefinedValues(filterRow)
      ){
        return false;
      }
      var visible;
      var controller = this._visualisationController;
      var propertyDescriptor = controller._getPropertyDescriptor(filterRow.field);
      switch (propertyDescriptor.oDataProperty.type) {
        case "Edm.Time":
          visible = true
          break;
        default:
          visible = false;
      }
      return visible;
    },
    _filterValueDateTimePickerVisible: function(filterRow){
      if (
       !this._checkIsRelationalOperatorFilter(filterRow) ||
       !this._checkHasField(filterRow) || 
        this._checkPredefinedValue(filterRow) || 
        this._checkMultiple(filterRow) ||
        this._checkRange(filterRow) ||
        !this._checkIncludedField(filterRow) ||
        this._checkExcludedField(filterRow) ||
        this._checkPredefinedValues(filterRow)
      ){
        return false;
      }
      var visible;
      var controller = this._visualisationController;
      var propertyDescriptor = controller._getPropertyDescriptor(filterRow.field);
      switch (propertyDescriptor.oDataProperty.type) {
        case "Edm.DateTime":
          visible = !controller._testExtensionProperty(propertyDescriptor, "display-format", "Date")
          break;
        default:
          visible = false;
      }
      return visible;
    },
    _filterValueComboBoxVisible: function(filterRow){
      if (
       !this._checkIsRelationalOperatorFilter(filterRow) ||
       !this._checkHasField(filterRow) || 
        this._checkPredefinedValue(filterRow) || 
        this._checkMultiple(filterRow) ||
        this._checkRange(filterRow) ||
       !this._checkIncludedField(filterRow) ||
        this._checkExcludedField(filterRow) ||
       !this._checkPredefinedValues(filterRow)
      ){
        return false;
      }
      return true;
    },
    _filterValueMultiComboBoxVisible: function(filterRow){
      if (
       !this._checkIsRelationalOperatorFilter(filterRow) ||
       !this._checkHasField(filterRow) || 
        this._checkPredefinedValue(filterRow) || 
       !this._checkMultiple(filterRow) ||
        this._checkRange(filterRow) ||
       !this._checkIncludedField(filterRow) ||
        this._checkExcludedField(filterRow) ||
       !this._checkPredefinedValues(filterRow)
      ){
        return false;
      }
      return true;
    },
    _filterValueDateRangeSelectionVisible: function(filterRow){
      if (
       !this._checkIsRelationalOperatorFilter(filterRow) ||
       !this._checkHasField(filterRow) || 
        this._checkPredefinedValue(filterRow) || 
        this._checkMultiple(filterRow) ||
       !this._checkRange(filterRow) ||
       !this._checkIncludedField(filterRow) ||
        this._checkExcludedField(filterRow) ||
        this._checkPredefinedValues(filterRow)
      ){
        return false;
      }
      var visible;
      var controller = this._visualisationController;
      var propertyDescriptor = controller._getPropertyDescriptor(filterRow.field);
      switch (propertyDescriptor.oDataProperty.type) {
        case "Edm.DateTime":
          visible = true;
          break;
        default:
          visible = false;
      }
      return visible;
    },
    _filterValueRangeSliderVisible: function(filterRow){
      if (
       !this._checkIsRelationalOperatorFilter(filterRow) ||
       !this._checkHasField(filterRow) || 
        this._checkPredefinedValue(filterRow) || 
        this._checkMultiple(filterRow) ||
       !this._checkRange(filterRow) ||
       !this._checkIncludedField(filterRow) ||
        this._checkExcludedField(filterRow) ||
        this._checkPredefinedValues(filterRow)
      ){
        return false;
      }
      var visible;
      var controller = this._visualisationController;
      var propertyDescriptor = controller._getPropertyDescriptor(filterRow.field);
      var oDataTypeDescriptor = controller._getODataTypeDescriptor(propertyDescriptor);
      visible = oDataTypeDescriptor.numeric === true;
      return visible;
    }
  });
  return VisualisationFilterAreaManager;
});