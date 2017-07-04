sap.ui.define([
  "jubilant/components/visualisation/BaseVisualisationFactory",
], 
function(
  BaseVisualisationFactory
){
  var object = BaseVisualisationFactory.extend("jubilant.components.visualisation.odatametadatagraph.ODataMetadataGraphFactory", {
    canVisualiseModel: function(model){
      return Boolean(model);
    },
    canVisualiseEntitySet: function(entitySetDescriptor, model){
      return this.canVisualiseModel(model) && Boolean(entitySetDescriptor) && Boolean(entitySetDescriptor.oDataEntitySet);
    }
  });
  return object;
});