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
  "sap/ui/core/mvc/ViewType"
], 
function(
  Object,
  ViewType
){
  var object = Object.extend("jubilant.components.visualisation.BaseVisualisationFactory", {
    init: function(visualisationPluginDescriptor){
      this._visualisationPluginDescriptor = visualisationPluginDescriptor;
    },
    _guessViewName: function(){
      var className = this.getMetadata().getName();
      className = className.split(".");
      className[className.length - 1] = className[className.length - 1].replace(/Factory$/, "");
      return className.join(".");
    },
    _getControllerName: function(){
      var visualisationPluginDescriptor = this._visualisationPluginDescriptor;
      return visualisationPluginDescriptor.controllerName || visualisationPluginDescriptor.viewName || this._guessViewName();
    },
    _createNewController: function(){
      var controllerName = this._getControllerName();
      var controller = sap.ui.controller(controllerName);
      controller.constructor._visualisationPluginDescriptor = this._visualisationPluginDescriptor; 
      return controller;
    },
    _getViewName: function(){
      var visualisationPluginDescriptor = this._visualisationPluginDescriptor;
      return visualisationPluginDescriptor.viewName || this._guessViewName();
    },
    _getViewType: function(){
      var visualisationPluginDescriptor = this._visualisationPluginDescriptor;
      return visualisationPluginDescriptor.viewType || ViewType.XML;
    },
    getScope: function(){
      var visualisationPluginDescriptor = this._visualisationPluginDescriptor;
      return visualisationPluginDescriptor.scope || "entityset";
    },
    _createNewView: function(controller){
      var viewName = this._getViewName();
      var viewType = this._getViewType();
      var view = sap.ui.view({
        viewName: viewName,
        type: viewType,
        controller: controller,
        async: false
      });
      return view;
    },
    _loadLibrary: function(libraryName, callback){
      var visualisationPluginDescriptor = this._visualisationPluginDescriptor;
      var libraries = visualisationPluginDescriptor.libraries;
      var library = libraries[libraryName];
      var path = library.path;
      var scripts = [];
      var stylesheets = [];
      var checkLoaded = function(){
        var scriptsLoaded = library.scripts ? false : true;
        if (!scriptsLoaded) {
          scriptsLoaded = scripts.length === library.scripts.length;
        }
        var stylesheetsLoaded = library.stylesheets ? false : true;
        if (!stylesheetsLoaded) {
          stylesheetsLoaded = stylesheets.length === library.stylesheets.length;
        }
        if (scriptsLoaded && stylesheetsLoaded) {
          callback(libraryName);
        }
      }
      if (library.scripts) {
        library.scripts.forEach(function(script){
          if (path) {
            script = path + script;
          }
          jQuery.sap.includeScript(script, script, function(){
            scripts.push(script);
            checkLoaded();
          });
        }.bind(this));
      }
      if (library.stylesheets) {
        library.stylesheets.forEach(function(stylesheet){
          if (stylesheet) {
            stylesheet = path + stylesheet;
          }
          jQuery.sap.includeStyleSheet(stylesheet, stylesheet, function(){
            stylesheets.push(stylesheet);
            checkLoaded();
          });
        }.bind(this));
      }
    },
    _loadLibraries: function(callback){
      var visualisationPluginDescriptor = this._visualisationPluginDescriptor;
      var libraries = visualisationPluginDescriptor.libraries;
      if (libraries) {
        var libraryName;
        var loadedLibraries = visualisationPluginDescriptor.loadedLibraries;

        var checkLoaded = function(libraryName){
          var libraryLoaded;
          if (loadedLibraries) {
            libraryLoaded = loadedLibraries[libraryName];
          }
          else {
            libraryLoaded = false;
          }
          return libraryLoaded;
        };

        var checkAllLoaded = function(){
          var libraryName;
          for (libraryName in libraries) {
            if (checkLoaded(libraryName)) {
              continue;
            }
            return false;
          }
          callback();
          return true;
        };
        
        if (!loadedLibraries) {
          loadedLibraries = visualisationPluginDescriptor.loadedLibraries = {};
        }
        
        if (!checkAllLoaded()) {
          for (libraryName in libraries){
            if (checkLoaded(libraryName)) {
              continue;
            }
            this._loadLibrary(libraryName, function(){
              loadedLibraries[libraryName] = true;
              checkAllLoaded();
            }.bind(this));
          }
        }
      }
      else {
        callback();
      }
    },
    createNew: function(callback){
      this._loadLibraries(function(){
        var controller = this._createNewController();
        var view = this._createNewView(controller);
        callback(view);
      }.bind(this))
    },
    canVisualiseModel: function(model){
      //TODO: override
      return false;
    },
    canVisualiseEntitySet: function(entitySetDescriptor){
      //TODO: override
      return false;
    }
  });
  return object;
});