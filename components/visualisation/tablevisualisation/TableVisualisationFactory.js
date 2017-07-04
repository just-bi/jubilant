sap.ui.define([
  "jubilant/components/visualisation/BaseVisualisationFactory",
], 
function(
  BaseVisualisationFactory
){
  var object = BaseVisualisationFactory.extend("jubilant.components.visualisation.tablevisualisation.TableVisualisationFactory", {
    canVisualiseEntitySet: function(entitySetDescriptor){
      return Boolean(entitySetDescriptor) && Boolean(entitySetDescriptor.oDataEntitySet);
    }
  });
  return object;
});