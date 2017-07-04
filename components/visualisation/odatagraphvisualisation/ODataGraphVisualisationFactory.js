sap.ui.define([
  "jubilant/components/visualisation/BaseVisualisationFactory",
], 
function(
  BaseVisualisationFactory
){
  var object = BaseVisualisationFactory.extend("jubilant.components.visualisation.odatagraphvisualisation.ODataGraphVisualisationFactory", {
    canVisualiseEntitySet: function(entitySetDescriptor, model){
      var metaModel = model.getMetaModel();
      //TODO: modify the meta model so that info about navigation properties can be extracted from there.
      var entityType = metaModel.getODataEntityType(entitySetDescriptor.oDataEntitySet.entityType);
      return Boolean(entityType.navigationProperty) && Boolean(entityType.navigationProperty.length);
    }
  });
  return object;
});