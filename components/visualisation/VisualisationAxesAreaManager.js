sap.ui.define([
  "jubilant/components/visualisation/BaseVisualisationEditorComponentManager",
  "sap/ui/model/json/JSONModel",
  "sap/m/Button",
  "sap/m/MultiComboBox",
], 
function(
   BaseVisualisationEditorComponentManager,
   JSONModel,
   Button,
   MultiComboBox
){
  var visualisationAxesAreaManager = BaseVisualisationEditorComponentManager.extend("jubilant.components.visualisation.VisualisationAxesAreaManager", {
    _axesModelName: "axesModel", 
    constructor: function(visualisationController){
      BaseVisualisationEditorComponentManager.prototype.constructor.apply(this, arguments);
    },
    _getAxesModel: function(){
      var controller = this._visualisationController;
      return controller.getModel(this._axesModelName);
    },    
    _initModels: function(){
      var axesModel;
      var controller = this._visualisationController;
      var visualisationPluginDescriptor = controller.getVisualisationPluginDescriptor();
      if (visualisationPluginDescriptor.isAxisModelDynamic === true || !visualisationPluginDescriptor.axesModel) {
        axesModel = new JSONModel([]);
      }
      else {
        axesModel = visualisationPluginDescriptor.axesModel;
      }
      controller.setModel(axesModel, this._axesModelName);
    },
    _getAxes: function(){
      var axesModel = this._getAxesModel();
      var axes = axesModel.getProperty("/");
      return axes;
    },
    _getAxisIdFromUiComponent: function(component){
      var axisId = component.data("axisId");
      if (!axisId) {
        axisId = this._getAxisIdFromUiComponent(component.getParent());
      }
      if (!axisId) {
        throw new Error();
      }
      return axisId;
    },
    _getAxisUi: function(axisId){
      if (typeof(axisId) === "object" && axisId.id) {
        axisId = axisId.id;
      }
      var controller = this._visualisationController;
      var axesUi = this._getEditorComponent().getItems()[1];
      var items = axesUi.getItems().filter(function(axisUi){
        return this._getAxisIdFromUiComponent(axisUi) === axisId;
      }.bind(this));
      if (!items.length) {
        throw new Error();
      }
      return items[0];
    },
    _getAxisUiComboBox: function(axisId){
      var axisUi = this._getAxisUi(axisId);
      var items = axisUi.getItems().filter(function(item){
        return item instanceof MultiComboBox
      });
      if (items.length) {
        return items[0];
      }
    },
    _clearAxisUi: function(axisId){
      var comboBox = this._getAxisUiComboBox(axisId); 
      comboBox.setSelectedKeys(null);
      this._handleAxisComboBoxChanged(comboBox);
    },
    _clearAxesUi: function(){
      this._getAxes().forEach(function(axisDescriptor){
        this._clearAxisUi(axisDescriptor);
      }.bind(this));      
    },
    setBusy: function(busy) {
      this._getAxes().forEach(function(axisDescriptor){
        var comboBox = this._getAxisUiComboBox(axisDescriptor);
        comboBox.setEnabled(!busy);
        if (busy) {
          this._disbleAxisUiButtons(axisDescriptor);
        }
        else {
          this._enableAxisUiButtons(comboBox);
        }
      }.bind(this));
    },
    _getAxisUiButtons: function(axisId){
      var axisUi = this._getAxisUi(axisId);
      return axisUi.getItems()[0].getItems().filter(function(control){
        return control instanceof Button;
      });
    },
    _disbleAxisUiButtons: function(axisId){
      this._getAxisUiButtons(axisId).forEach(function(button){
        button.setEnabled(false);
      });
    },
    _enableAxisUiButtons: function(comboBox){
      var selectedItems = comboBox.getSelectedItems();
      var axisId = this._getAxisIdFromUiComponent(comboBox);
      this._getAxisUiButtons(axisId).forEach(function(button){
        var enabled;
        switch (button.data("buttonId")) {
          case "addAll":
            enabled = comboBox.getEnabledItems().some(function(enabledItem){
              return selectedItems.indexOf(enabledItem) === -1;
            });
            break;
          case "clearAxis":
            enabled = selectedItems.length > 0; 
            break;
        }
        button.setEnabled(enabled);
      });
    },
    _enableAxisItems: function(source, target){
      var sourceSelectedItems = source.getSelectedItems();
      target.getItems().forEach(function(targetItem){
        targetItem.setEnabled(!sourceSelectedItems.some(function(sourceItem){
          return sourceItem.getKey() === targetItem.getKey()
        }));
      });
    },
    _syncAvailableAttributes: function(source){
      var axisId = this._getAxisIdFromUiComponent(source);
      this._getAxes().forEach(function(axisDescriptor){
        if (axisDescriptor.id === axisId) {
          return;
        }
        this._enableAxisItems(source, this._getAxisUiComboBox(axisDescriptor));
      }.bind(this));
    },
    _handleAxisComboBoxChanged: function(comboBox){
      this._syncAvailableAttributes(comboBox);
      this._enableAxisUiButtons(comboBox)
      var controller = this._visualisationController;
    },
    getSelectedAxisItems: function(axisSpec){
      var comboBox = this._getAxisUiComboBox(axisSpec);
      var selectedItems = comboBox.getSelectedItems();
      return selectedItems;
    },
    _axisPopulated: function(axisSpec){
      return this._getSelectedAxisItems(axisSpec).length > 0;
    },
    _someAxesPopulated: function(){
      return this.getAxes().some(function(axisDescriptor){
        return this._axisPopulated(axisDescriptor);
      }.bind(this));
    },
    _allAxesPopulated: function(){
      return !this.getAxes().some(function(axisDescriptor){
        return !this._axisPopulated(axisDescriptor);
      }.bind(this));
    },
    createAxis: function(axisSpec){
      var axesModel = this._getAxesModel();
      var axes = axesModel.getProperty("/");
      var path = "/" + axes.length, axis = {
        "id": axisSpec.id, 
        "label": axisSpec.label || axisSpec.id
      };
      axesModel.setProperty(path, axis);
      return path;
    },
    initAxes: function(){
      var controller = this._visualisationController;
      var visualisationPluginDescriptor = controller.getVisualisationPluginDescriptor();
      if (visualisationPluginDescriptor.isAxisModelDynamic === true) {
        if (this._axesCreated) {
          return;
        }
        controller._createAxes();
        this._axesCreated = true;
      }
      else 
      if (!visualisationPluginDescriptor.axesModel) {
        controller._createAxes();
        visualisationPluginDescriptor.axesModel = this._getAxesModel();
      }
    },
    _createAxes: function(){
      var controller = this._visualisationController;
      var visualisationPluginDescriptor = controller.getVisualisationPluginDescriptor();
      if (!visualisationPluginDescriptor.axes) {
        return;
      }
      var axesModel = this._getAxesModel();
      var axes = axesModel.setProperty("/", visualisationPluginDescriptor.axes);
    },
    handleAxisChanged: function(event){
      var comboBox = event.getSource();
      this._handleAxisComboBoxChanged(comboBox);
    },
    handleAddAllToAxisPressed: function(event){
      var comboBox = this._getAxisUiComboBox(this._getAxisIdFromUiComponent(event.getSource()));
      var selectedItems = comboBox.getSelectedItems();
      //add enabled items one by one, but not if they were already selected
      //so we preserve the order for items that were already added.
      comboBox.getEnabledItems().forEach(function(enabledItem){
        if (selectedItems.indexOf(enabledItem) === -1){
          comboBox.addSelectedItem(enabledItem);
        }
      });
      this._handleAxisComboBoxChanged(comboBox);
    },
    handleRemoveAllFromAxisPressed: function(event){
      this._clearAxisUi(this._getAxisIdFromUiComponent(event.getSource()));
    }
  });
  return visualisationAxesAreaManager;
});