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
    _getVisualisationStateModelPath: function(includeModelNamePrefix){
      var path = "/visualisationEditorComponents";
      var visualisationEditorComponentType = this.getMetadata().getName();
      path += "/" + visualisationEditorComponentType;
      if (includeModelNamePrefix) {
        var controller = this._visualisationController;
        var visualisationStateModelName = controller._getVisualisationStateModelName();
        path = visualisationStateModelName + ">" + path;
      }
      return path;
    },
    _getVisualisationStateModel: function(){
      var controller = this._visualisationController;
      var model = controller._getVisualisationStateModel();
      return model;
    },
    _initModels: function(){
      var visualisationStateModel = this._getVisualisationStateModel();
      var path = "/visualisationEditorComponents";
      if (!visualisationStateModel.getProperty(path)) {
        visualisationStateModel.setProperty(path, {});
      }
      var visualisationEditorComponentType = this.getMetadata().getName();
      path += "/" + visualisationEditorComponentType;
      if (!visualisationStateModel.getProperty(path)) {
        visualisationStateModel.setProperty(path, {});
      }
    }
  });
  return BaseVisualisationEditorComponentManager;
});