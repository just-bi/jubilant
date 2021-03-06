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