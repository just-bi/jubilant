sap.ui.define([
  "sap/ui/base/Object"
], 
function(
   Object
){
  var BaseVisualisationEditorComponentManager = Object.extend("jubilant.components.visualisation.BaseVisualisationEditorComponentManager", {
    constructor: function(visualisationController){
      this._visualisationController = visualisationController;
      this._initModels();
      return this;
    },
    _getEditorComponent: function(){
      var visualisationController = this._visualisationController;
      var editorComponent = visualisationController._getVisualisationEditorComponent(this);
      return editorComponent;
    },
    _initModels: function(){
      //noop. Override.
    }
  });
  return BaseVisualisationEditorComponentManager;
});