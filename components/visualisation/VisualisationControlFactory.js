sap.ui.define([
  "sap/ui/base/Object",
  "sap/m/Label",
  "sap/m/Text",
  "sap/ui/core/TextAlign"
], 
function(
  Object,
  Label,
  Text,
  TextAlign
){
  var factory = Object.extend("jubilant.components.visualisation.VisualisationControlFactory", {
    constructor: function(){
    },
    _sapExtensionsNamespace: "http://www.sap.com/Protocols/SAPData",
    _sapExtensionsNamespaceBase64: btoa("http://www.sap.com/Protocols/SAPData"),
    setODataTypesModel: function(oDataTypesModel){
      this._oDataTypesModel = oDataTypesModel;
    },
    getLabelTextForODataObjectDescriptor: function(oDataObjectDescriptor){
      var text, extensions, sapNamespace, label;
      if ((extensions = oDataObjectDescriptor.extensions) && 
          (sapNamespace = extensions[this._sapExtensionsNamespaceBase64]) && 
          (label = sapNamespace.label)
      ){
        text = label;
      }
      else {
        text = oDataObjectDescriptor.name;
      }
      return text;
    },
    getLabelTextForOdataPropertyDescriptor: function(oDataPropertyDescriptor){
      var labelText = this.getLabelTextForODataObjectDescriptor(oDataPropertyDescriptor);
      if (!labelText) {
        labelText = oDataPropertyDescriptor.oDataProperty.name;
      }
      return labelText;
    },
    createLabelForODataPropertyDescriptor: function(oDataPropertyDescriptor){
      var label = new Label({
        text: this.getLabelTextForOdataPropertyDescriptor(oDataPropertyDescriptor)
      });
      return label;
    },
    createTemplateForPropertyDescriptor: function(propertyDescriptor, dataTypeDescriptor, modelName){
      var text = new Text({
        wrapping: false,
        textAlign: dataTypeDescriptor.numeric ? TextAlign.End : TextAlign.Begin
      });
      var path = propertyDescriptor.oDataProperty.name;
      if (modelName) {
        path = modelName + ">" + path;
      }
      text.bindText({
        path: path,
        type: dataTypeDescriptor.sapUi5Type
      });
      return text;
    }    
  });
  return factory;
});
