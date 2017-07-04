sap.ui.define([
  "jubilant/components/visualisation/BaseVisualisationController",
], 
function(
  BaseVisualisationController
){
  "use strict";
  var controller = BaseVisualisationController.extend("jubilant.components.visualisation.odatametadatagraph.ODataMetadataGraph", {
    onInit: function(){
      BaseVisualisationController.prototype.onInit.call(this);      
    },
    _dataFoundationSet: function(){
      var metamodel = this._getMetaModel();
      metamodel.loaded().then(function(){
        this._renderODataMetamodelGraph();
      }.bind(this));
    },
    _renderODataMetamodelGraph: function(){
      var metamodel = this._getMetaModel();
      var oDataMetadataGraphControl = this.byId("oDataGraphControl");
      oDataMetadataGraphControl.setMetaModel(metamodel, this._dataFoundation.entitySetDescriptor);
    }
  });
  return controller;
})