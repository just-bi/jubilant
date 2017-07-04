sap.ui.define([
  "jubilant/components/basecontroller/BaseController",
  "jubilant/components/visualisation/VisualisationControlFactory",
  "sap/ui/base/Object",
  "sap/ui/model/json/JSONModel",
  "sap/m/ToggleButton",
  "sap/ui/base/Event",
  "sap/ui/core/Element",
  "sap/m/MessageToast"
], 
function(
  BaseController,
  VisualisationControlFactory,
  Object,
  JSONModel,
  ToggleButton,
  Event,
  Element,
  MessageToast
){
  "use strict";
  var controller = BaseController.extend("jubilant.components.visualisation.BaseVisualisationController", {
    _visualisationStateModelName: "visualisationState",
    _initialVisualisationState: {
      autoRun: false,
      autoRunDelay: 1000,
      queryChanged: false,
      queryValid: false,
      busy: false
    },
    _setQueryValid: function(){
      var model = this._getVisualisationStateModel();
      model.setProperty("/queryValid", this._checkCanExecuteQuery());
      this._checkAutoRunQuery();
    },
    _checkAutoRunQuery: function(){
      var model = this._getVisualisationStateModel();
      if (
        model.getProperty("/autoRun") === true && 
        model.getProperty("/busy") === false &&  
        model.getProperty("/queryValid") === true && 
        model.getProperty("/queryChanged") === true
      ) {
        if (this._autoRunDelayedQuery) {
          jQuery.sap.clearDelayedCall(this._autoRunDelayedQuery);
        }
        this._autoRunDelayedQuery = jQuery.sap.delayedCall(model.getProperty("/autoRunDelay"), this, this._doExecuteQuery);
      }
    },
    onAutoRunToggled: function(event){
      var button = event.getSource();
      if (button.getPressed()) {
        this._checkAutoRunQuery();
      }
    },
    _setQueryChanged: function(changed){
      var model = this._getVisualisationStateModel();
      model.setProperty("/queryChanged", changed);
      this._setQueryValid();
    },
    _getFilterChanged: function(){
      var model = this._getVisualisationStateModel();
      return model.getProperty("/filterChanged");
    },
    _setFilterChanged: function(changed){
      this._setQueryChanged(changed);
    },
    _getAxesChanged: function(){
      var model = this._getVisualisationStateModel();
      return model.getProperty("/axesChanged");
    },
    _setAxesChanged: function(changed){
      this._setQueryChanged(changed);
    },
    _getSortingChanged: function(){
      var model = this._getVisualisationStateModel();
      return model.getProperty("/sortingChanged");
    },
    _setSortingChanged: function(changed){
      this._setQueryChanged(changed);
    },
    _setBusy: function(busy){
      var model = this._getVisualisationStateModel();
      model.setProperty("/busy", busy);
      var visualisationAxesAreaManager = this._getVisualisationEditorComponentManager("VisualisationAxesAreaManager");
      if (visualisationAxesAreaManager) {
        visualisationAxesAreaManager.setBusy(busy);
      }
    },    
    _dataModelName: "data",
    _getDataModelName: function(){
      return this._dataModelName;
    },
    _entitySetDescriptorModel: "entitySetDescriptorModel",
    _getControlFactory: function(){
      var controlFactory = VisualisationControlFactory._instance;
      if (!controlFactory) {
        controlFactory = new VisualisationControlFactory();
        controlFactory.setODataTypesModel(this.getModel("oDataTypes"));
        VisualisationControlFactory._instance = controlFactory; 
      }
      return controlFactory;
    },
    getLabelTextForPropertyDescriptor: function(propertyDescriptor){
      var controlFactory = this._getControlFactory();
      var labelText = controlFactory.getLabelTextForOdataPropertyDescriptor(propertyDescriptor);
      return labelText;
    },
    _getVisualisationEditorComponents: function(id){
      var viewContent = this.getView().getContent();
      if (!viewContent || !viewContent.length || !viewContent[0].getItems) {
        return [];
      } 
      return viewContent[0].getItems().filter(function(control, index){
        var visualisationEditorComponent = control.data("visualisationEditorComponent");
        var result = false;
        if (visualisationEditorComponent !== null) {
          switch (typeof(id)) {
            case "undefined":
              result = true;
              break;
            case "object":
              if (id instanceof Object) {
                id = id.getMetadata().getName();
              }
              else {
                throw new Error();
              }
            case "string":
              result = (id === visualisationEditorComponent);
              break;
            case "number":
              result = (id === index);
              break;
            default:
              result = false;
          }
        }
        return result;
      });
    },
    _getVisualisationEditorComponent: function(id){
      var visualisationEditorComponent = this._getVisualisationEditorComponents(id);
      if (visualisationEditorComponent && visualisationEditorComponent.length) {
        visualisationEditorComponent = visualisationEditorComponent[0];
      }
      else {
        visualisationEditorComponent = null;
      }
      return visualisationEditorComponent;
    },
    _getComponentLocalId: function(control){
      var viewId = this.getView().getId() + "--";
      var controlId = control.getId();
      if (controlId.indexOf(viewId) === 0){
        controlId = controlId.substr(viewId.length);       
      }
      return controlId;
    },
    _getVisualisationEditorComponentManager: function(editorComponentManagerId){
      switch (typeof(editorComponentManagerId)){
        case "object":
          if (editorComponentManagerId instanceof Event) {
            editorComponentManagerId = editorComponentManagerId.getSource();
          }
          
          if (editorComponentManagerId instanceof Element) {
            var visualisationEditorComponent;
            do {
              visualisationEditorComponent = editorComponentManagerId.data("visualisationEditorComponent");
              if (visualisationEditorComponent) {
                editorComponentManagerId = visualisationEditorComponent;
                break;
              }
              editorComponentManagerId = editorComponentManagerId.getParent();
            } while (editorComponentManagerId);
            if (editorComponentManagerId) {
              editorComponentManagerId = editorComponentManagerId.split(".").pop();
            }
          }
          
          if (typeof(editorComponentManagerId) !== "string"){
            throw new Error();
          }
        case "string":
          break;
        default:
          throw new Error();
      }
      return this._visualisationEditorComponents[editorComponentManagerId];
    },
    _initVisualisationEditorComponents: function(){
      this._visualisationEditorComponents = {};
      var visualisationStateModel = this._getVisualisationStateModel();
      var visualisationToolbar = this._getVisualisationToolbar();
      this._getVisualisationEditorComponents().forEach(function(visualisationEditorComponent){
        var managerClassName = visualisationEditorComponent.data("visualisationEditorComponent");
        if (managerClassName && managerClassName.length) {
          var managerClass = this._getClass(managerClassName);
          var localName = managerClassName.split(".").pop();
          this._visualisationEditorComponents[localName] = new managerClass(this);
        }
        var defaultVisible = visualisationEditorComponent.data("visualisationEditorComponentDefaultVisible");
        switch (defaultVisible){
          case "false":
            defaultVisible = false;
            break;
          case "true":
          default:
            defaultVisible = true;
        }
        var visibilityPropertyPath = "/" + this._getComponentLocalId(visualisationEditorComponent) + "Visible";
        visualisationStateModel.setProperty(visibilityPropertyPath, defaultVisible);
        var icon = visualisationEditorComponent.data("visualisationEditorComponentIcon");
        var toggleButton = new ToggleButton({icon: icon});
        var visibilityBindingInfo = {
          path: this._visualisationStateModelName + ">" + visibilityPropertyPath
        };
        toggleButton.bindProperty("pressed", JSON.parse(JSON.stringify(visibilityBindingInfo)));
        visualisationEditorComponent.bindProperty("visible", JSON.parse(JSON.stringify(visibilityBindingInfo)));
        var tooltipBindingInfo = visualisationEditorComponent.getBindingInfo("tooltip");
        if (tooltipBindingInfo) {
          toggleButton.bindProperty("tooltip", tooltipBindingInfo);
        }
        visualisationToolbar.addContentRight(toggleButton);
      }.bind(this));
    },
    onInit: function(){
      BaseController.prototype.onInit.call(this);
      var visualisationPluginDescriptor = this.getVisualisationPluginDescriptor();

      this._initVisualisationEditorComponents();
      sap.ui.getCore().getMessageManager().registerObject(this.getView(), true);      
    },
    getVisualisationPluginDescriptor: function(){
      return this.constructor._visualisationPluginDescriptor;
    },
    onBeforeRendering: function(event){
      BaseController.prototype.onBeforeRendering.apply(this, arguments);
      var visualisationAxesAreaManager = this._getVisualisationEditorComponentManager("VisualisationAxesAreaManager");
      if (visualisationAxesAreaManager) {
        visualisationAxesAreaManager.initAxes();
      }
    },
    _createAxes: function(){
      var visualisationAxesAreaManager = this._getVisualisationEditorComponentManager("VisualisationAxesAreaManager");
      if (visualisationAxesAreaManager) {
        visualisationAxesAreaManager._createAxes();
      }
    },
    _getVisualisationToolbar: function(){
      return this.byId("visualisationToolbar");
    },
    _initVisualisationStateModel: function(){
      var visualisationStateModel = new JSONModel();
      var data = JSON.parse(JSON.stringify(this._initialVisualisationState));
      visualisationStateModel.setData(data);
      this.setModel(visualisationStateModel, this._visualisationStateModelName);
    },
    _initModels: function(){
      BaseController.prototype._initModels.apply(this, arguments);
      this._initVisualisationStateModel();
      var entitySetDescriptorModel = new JSONModel();
      this.setModel(entitySetDescriptorModel, this._entitySetDescriptorModel);
    },
    _getVisualisationStateModel: function(){
      return this.getModel(this._visualisationStateModelName);
    },
    onClearFilterButtonPressed: function(event){
      var visualisationFilterAreaManager = this._getVisualisationEditorComponentManager(event);
      if (visualisationFilterAreaManager) {
        visualisationFilterAreaManager.handleClearFilterButtonPressed(event);
        this._setFilterChanged(true);
      }
    },
    onFilterValueChanged: function(event) {
      this._setFilterChanged(true);
    },
    onAddFilterPressed: function(event){
      var visualisationFilterAreaManager = this._getVisualisationEditorComponentManager(event);
      if (visualisationFilterAreaManager) {
        visualisationFilterAreaManager.handleAddFilterPressed(event);
        this._setFilterChanged(true);
      }
    },    
    onRemoveFilterPressed: function(event){
      var visualisationFilterAreaManager = this._getVisualisationEditorComponentManager(event);
      if (visualisationFilterAreaManager) {
        visualisationFilterAreaManager.handleRemoveFilterPressed(event);
        this._setFilterChanged(true);
      }
    },
    onOutdentFilterPressed: function(event){
      var visualisationFilterAreaManager = this._getVisualisationEditorComponentManager(event);
      if (visualisationFilterAreaManager) {
        visualisationFilterAreaManager.handleOutdentFilterPressed(event);
        this._setFilterChanged(true);
      }
    },
    onIndentFilterPressed: function(event){
      var visualisationFilterAreaManager = this._getVisualisationEditorComponentManager(event);
      if (visualisationFilterAreaManager) {
        visualisationFilterAreaManager.handleIndentFilterPressed(event);
        this._setFilterChanged(true);
      }
    },
    onLogicalOperatorChanged: function(event) {
      var visualisationFilterAreaManager = this._getVisualisationEditorComponentManager(event);
      if (visualisationFilterAreaManager) {
        visualisationFilterAreaManager.handleLogicalOperatorChanged(event);
        this._setFilterChanged(true);
      }
    },
    onFilterFieldChanged: function(event){
      var visualisationFilterAreaManager = this._getVisualisationEditorComponentManager(event);
      if (visualisationFilterAreaManager) {
        visualisationFilterAreaManager.handleFilterFieldChanged(event);
        this._setFilterChanged(true);
      }
    },
    onRelationalOperatorChanged: function(event) {
      var visualisationFilterAreaManager = this._getVisualisationEditorComponentManager(event);
      if (visualisationFilterAreaManager) {
        visualisationFilterAreaManager.handleRelationalOperatorChanged(event);
        this._setFilterChanged(true);
      }
    },
    onAddAllToAxisPressed: function(event){
      var visualisationAxesAreaManager = this._getVisualisationEditorComponentManager(event);
      if (visualisationAxesAreaManager) {
        visualisationAxesAreaManager.handleAddAllToAxisPressed(event);
        this._setAxesChanged(true);
      }
    },
    onRemoveAllFromAxisPressed: function(event){
      var visualisationAxesAreaManager = this._getVisualisationEditorComponentManager(event);
      if (visualisationAxesAreaManager) {
        visualisationAxesAreaManager.handleRemoveAllFromAxisPressed(event);
        this._setAxesChanged(true);
      }
    },
    onAxisChanged: function(event){
      var visualisationAxesAreaManager = this._getVisualisationEditorComponentManager(event);
      if (visualisationAxesAreaManager) {
        visualisationAxesAreaManager.handleAxisChanged(event);
        this._setAxesChanged(true);
      }
    },
    onClearAllSortColumns: function(event){
      var visualisationSortAreaManager = this._getVisualisationEditorComponentManager(event);
      if (visualisationSortAreaManager) {
        visualisationSortAreaManager.handleClearAllSortColumns(event);
        this._setSortingChanged(true);
      }
    },
    onSortDirectionButtonPressed: function(event){
      var visualisationSortAreaManager = this._getVisualisationEditorComponentManager(event);
      if (visualisationSortAreaManager) {
        visualisationSortAreaManager.handleSortDirectionButtonPressed(event);
        this._setSortingChanged(true);
      }
    },
    onSortColumnUpButtonPressed: function(event){
      var visualisationSortAreaManager = this._getVisualisationEditorComponentManager(event);
      if (visualisationSortAreaManager) {
        visualisationSortAreaManager.handleSortColumnUpButtonPressed(event);
        this._setSortingChanged(true);
      }
    },
    onSortColumnDownButtonPressed: function(event){
      var visualisationSortAreaManager = this._getVisualisationEditorComponentManager(event);
      if (visualisationSortAreaManager) {
        visualisationSortAreaManager.handleSortColumnDownButtonPressed(event);
        this._setSortingChanged(true);
      }
    },
    onAddSortColumnButtonPressed: function(event){
      var visualisationSortAreaManager = this._getVisualisationEditorComponentManager(event);
      if (visualisationSortAreaManager) {
        visualisationSortAreaManager.handleAddSortColumnButtonPressed(event);
        this._setSortingChanged(true);
      }
    },
    onRemoveSortColumnButtonPressed: function(event){
      var visualisationSortAreaManager = this._getVisualisationEditorComponentManager(event);
      if (visualisationSortAreaManager) {
        visualisationSortAreaManager.handleRemoveSortColumnButtonPressed(event);
        this._setSortingChanged(true);
      }
    },
    _getQueryDataModel: function(){
      return this._dataFoundation.model;
    },
    _readDataFromQueryDataModel: function(parameters){
      var queryDataModel = this._getQueryDataModel();
      this._currentReadRequest = queryDataModel.read(this._getEntitySetPath(), parameters);
      return this._currentReadRequest;
    },
    _getEntitySetDescriptorModel: function(){
      return this.getModel(this._entitySetDescriptorModel);
    },
    _getEntitySetPath: function(){
      var entitySetDescriptorModel = this._getEntitySetDescriptorModel();
      var entitySetName = entitySetDescriptorModel.getProperty("/oDataEntitySet/name");
      return "/" + encodeURIComponent(entitySetName);
    },
    _getEntityTypeDescriptor: function(){
      var entityDescriptorModel = this._getEntitySetDescriptorModel();
      return entityDescriptorModel.getProperty("/type");
    },
    _getPropertyDescriptors: function(){
      var type = this._getEntityTypeDescriptor();
      return type.properties;
    },
    _getPropertyDescriptor: function(name){
      var properties = this._getPropertyDescriptors().filter(function(propertyDescriptor){
        return propertyDescriptor.oDataProperty.name === name;
      });
      if (!properties.length) {
        throw new Error();
      }
      return properties[0];
    },
    _getODataTypeDescriptor: function(name){
      switch (typeof(name)) {
        case "object":
          if (name && name.oDataProperty) {
            name = name.oDataProperty.type;
          }
          else {
            throw new Error();
          }
          break;
        case "string":
          break;
        default: 
          throw new Error();
      }
      var model = this.getModel("oDataTypes");
      var oDataTypeDescriptor = model.getProperty("/" + name);
      return oDataTypeDescriptor;
    },
    _escapeValueForOdataType: function(oDataType, value){
      switch (typeof(value)) {
        case "undefined":
        case "number":
        case "object":
          return value;
      }
      var typeDescriptor = this._getODataTypeDescriptor(oDataType);
      if (typeDescriptor.enclosures) {
        var enclosure = typeDescriptor.enclosures[0];
        if (enclosure.escapes) {
          enclosure.escapes.forEach(function(escape){
            value = value.replace(new RegExp(escape.find, "g"), escape.replace);
          });
        }
        if (enclosure.prefix) {
          value = enclosure.prefix + value;
        }
        if (enclosure.postfix) {
          value = value + enclosure.postfix;
        }
      }
      return value;
    },
    _getLogicalOperatorDescriptors: function(){
      var model = this.getModel("logicalOperators");
      var logicalOperatorDescriptors = model.getProperty("/logicalOperators");
      return logicalOperatorDescriptors;
    },
    _getLogicalOperatorDescriptor: function(id){
      var logicalOperatorDescriptor;
      this._getLogicalOperatorDescriptors().some(function(item){
        if (item.id === id) {
          logicalOperatorDescriptor = item;
          return true;
        }
      });
      return logicalOperatorDescriptor;
    },
    _getRelationalOperatorDescriptors: function(){
      var model = this.getModel("relationalOperators");
      var relationalOperatorDescriptors = model.getProperty("/relationalOperators");
      return relationalOperatorDescriptors;
    },
    _getRelationalOperatorDescriptor: function(id){
      var relationalOperatorDescriptor;
      this._getRelationalOperatorDescriptors().some(function(item){
        if (item.id === id) {
          relationalOperatorDescriptor = item;
          return true;
        }
      });
      return relationalOperatorDescriptor;
    },
    _getCancelButton: function(){
      var button = this.byId("btnCancel");
      return button;
    },
    _getRunButton: function(){
      var button = this.byId("btnRun");
      return button;
    },
    _getClearButton: function(){
      var button = this.byId("btnClear");
      return button;
    },
    _getVisualisation: function(){
      var visualisation = this.byId("visualisation");
      return visualisation;
    },
    onCancelPressed: function(){
      this._currentReadRequest.abort();
      this._currentReadRequest = null;
      this._setBusy(false);
    },
    onClearPressed: function(event){
      var visualisationAxesAreaManager = this._getVisualisationEditorComponentManager("VisualisationAxesAreaManager");
      if (visualisationAxesAreaManager) {
        visualisationAxesAreaManager._clearAxesUi();
        this._setAxesChanged(false);
      }

      var visualisationFilterAreaManager = this._getVisualisationEditorComponentManager("VisualisationFilterAreaManager");
      if (visualisationFilterAreaManager) {
        visualisationFilterAreaManager._clearFilter();
        this._setFilterChanged(false);
      }

      var visualisationSortAreaManager = this._getVisualisationEditorComponentManager("VisualisationSortAreaManager");
      if (visualisationSortAreaManager) {
        visualisationSortAreaManager._clearSorting();
        this._setSortingChanged(false);
      }
      
      this._clearVisualization();
    },    
    onRunPressed: function(){
      this._setBusy(true);
      this._doExecuteQuery();
    },
    _doExecuteQuery: function(){
      this._executeQuery(this._queryExecuted.bind(this));      
    },
    _queryExecuted: function(){
      this._setBusy(false);
      this._setAxesChanged(false);
      this._setFilterChanged(false);
    },
    setDataFoundation: function(dataFoundation){
      this._dataFoundation = dataFoundation;
      this._getEntitySetDescriptorModel().setData(dataFoundation.entitySetDescriptor);
      this.setModel(dataFoundation.model, this._dataModelName);
      this._dataFoundationSet(dataFoundation);
    },
    getDataModel: function(){
      return this.getModel(this._dataModelName);
    },
    _getMetaModel: function(){
      var model = this.getDataModel();
      var metamodel = model.getMetaModel();
      return metamodel;
    },
    _getExtensionProperty: function(oDataObject, extensionName){
      var extensions, value;
      if ((extensions = oDataObject.extensions)) {
        var namespace;
        if (namespace = extensions[this._sapExtensionsNamespaceBase64]) {
          value = namespace[extensionName];
        }
      }
      return value;
    },
    _testExtensionProperty: function(oDataObject, extensionName, value){
      return this._getExtensionProperty(oDataObject, extensionName) === value;
    },
    _isPropertyFilterable: function(property){
      return !this._testExtensionProperty(property, "filterable", "false");
    },
    _filterValueInputVisible: function(){
      var visible;
      var visualisationFilterAreaManager = this._getVisualisationEditorComponentManager("VisualisationFilterAreaManager");
      if (visualisationFilterAreaManager) {
        visible = visualisationFilterAreaManager._filterValueInputVisible.apply(
            visualisationFilterAreaManager, arguments      
        );
      }
      else {
        visible = false;
      }
      return visible;
    },
    _filterValueDatePickerVisible: function(){
      var visible;
      var visualisationFilterAreaManager = this._getVisualisationEditorComponentManager("VisualisationFilterAreaManager");
      if (visualisationFilterAreaManager) {
        visible = visualisationFilterAreaManager._filterValueDatePickerVisible.apply(
            visualisationFilterAreaManager, arguments      
        );
      }
      else {
        visible = false;
      }
      return visible;
    },
    _filterValueTimePickerVisible: function(){
      var visible;
      var visualisationFilterAreaManager = this._getVisualisationEditorComponentManager("VisualisationFilterAreaManager");
      if (visualisationFilterAreaManager) {
        visible = visualisationFilterAreaManager._filterValueTimePickerVisible.apply(
            visualisationFilterAreaManager, arguments      
        );
      }
      else {
        visible = false;
      }
      return visible;
    },
    _filterValueDateTimePickerVisible: function(){
      var visible;
      var visualisationFilterAreaManager = this._getVisualisationEditorComponentManager("VisualisationFilterAreaManager");
      if (visualisationFilterAreaManager) {
        visible = visualisationFilterAreaManager._filterValueDateTimePickerVisible.apply(
            visualisationFilterAreaManager, arguments      
        );
      }
      else {
        visible = false;
      }
      return visible;
    },
    _filterValueComboBoxVisible: function(){
      var visible;
      var visualisationFilterAreaManager = this._getVisualisationEditorComponentManager("VisualisationFilterAreaManager");
      if (visualisationFilterAreaManager) {
        visible = visualisationFilterAreaManager._filterValueComboBoxVisible.apply(
            visualisationFilterAreaManager, arguments      
        );
      }
      else {
        visible = false;
      }
      return visible;
    },
    _filterValueMultiComboBoxVisible: function(){
      var visible;
      var visualisationFilterAreaManager = this._getVisualisationEditorComponentManager("VisualisationFilterAreaManager");
      if (visualisationFilterAreaManager) {
        visible = visualisationFilterAreaManager._filterValueMultiComboBoxVisible.apply(
            visualisationFilterAreaManager, arguments      
        );
      }
      else {
        visible = false;
      }
      return visible;
    },
    _filterValueDateRangeSelectionVisible: function(){
      var visible;
      var visualisationFilterAreaManager = this._getVisualisationEditorComponentManager("VisualisationFilterAreaManager");
      if (visualisationFilterAreaManager) {
        visible = visualisationFilterAreaManager._filterValueDateRangeSelectionVisible.apply(
            visualisationFilterAreaManager, arguments      
        );
      }
      else {
        visible = false;
      }
      return visible;
    },
    _filterValueRangeSliderVisible: function(){
      var visible;
      var visualisationFilterAreaManager = this._getVisualisationEditorComponentManager("VisualisationFilterAreaManager");
      if (visualisationFilterAreaManager) {
        visible = visualisationFilterAreaManager._filterValueRangeSliderVisible.apply(
            visualisationFilterAreaManager, arguments      
        );
      }
      else {
        visible = false;
      }
      return visible;
    },
    _showMessageToast: function(){
      MessageToast.show.apply(MessageToast, arguments);
    },
    _clearVisualization: function(){
      //NOOP. Override.
      throw new Error("Please override method _clearVisualization() in " + this.getMetadata().getName());
    },
    _executeQuery: function(callback){
      //NOOP: Override
      callback.call();
      throw new Error("Please override method _executeQuery() in " + this.getMetadata().getName());
    },
    _checkCanExecuteQuery: function(){
      //NOOP: Override
      throw new Error("Please override method _checkCanExecuteQuery() in " + this.getMetadata().getName());
    },
    _dataFoundationSet: function(){
      //override in subclasses
      //called to notify the visualisation that it is all set up.
    }
  });
  return controller;
});