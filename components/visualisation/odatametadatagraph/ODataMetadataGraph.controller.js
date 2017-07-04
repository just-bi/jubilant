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