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
