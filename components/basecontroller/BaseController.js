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
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/resource/ResourceModel"
], function(
  Controller, 
  ResourceModel
){
  "use strict";
  var i18n = "i18n";
  var controller = Controller.extend("jubilant.components.basecontroller.BaseController", {
    onInit: function(){
      var superOnInit = Controller.prototype.onInit;
      if (typeof(superOnInit) === "function") {
        superOnInit.call(this);
      }
      this._initModels();
      this._initEventBusSubscriptions();
    },
    _initEventBusSubscriptions: function(){
    },
    _initModels: function(){
    },
    _getClass: function(fullyQualifiedClassName){
      jQuery.sap.require(fullyQualifiedClassName);
      var nameParts = fullyQualifiedClassName.split(".");
      var object = window;
      for (var i = 0; i < nameParts.length; i++) {
        object = object[nameParts[i]];
        if (!object) {
          throw new Error(
            "Could not load class " + fullyQualifiedClassName + ". " +
            "Error resolving namepart " + i + " (\"" + nameParts[i] + "\")."
          );
        }
      }
      return object;
    },
    onBeforeRendering: function(){
      var superOnBeforeRendering = Controller.prototype.onBeforeRendering;
      if (typeof(superOnBeforeRendering) === "function") {
        superOnBeforeRendering.call(this);
      }
      this._initI18n();
    },
    onAfterRendering: function(){
      var superOnAfterRendering = Controller.prototype.onAfterRendering;
      if (typeof(superOnAfterRendering) === "function") {
        superOnAfterRendering.call(this);
      }
    },
    _initI18n: function(){
      //first, check if we already constructed the i18n model for this class
      if (this.constructor._i18Model) {
        //we did! Don't do all that work again, just use the existing one.
        this.setModel(this.constructor._i18Model, i18n);
        return;
      }
      var stack = [];
      var controllerClass = this.getMetadata();
      var viewName = this.getView().getViewName();
      if (controllerClass.getName() !== viewName) {
        //if the view name is different from controller name, 
        //then we assume the view may have its own i18n 
        //that overrides those of the controller 
        stack.push(viewName);
      }
      var className, rootControllerClassName = Controller.getMetadata().getName();
      while (true) {
        className = controllerClass.getName();
        if (className === rootControllerClassName) {
          break;
        }
        stack.unshift(className);
        controllerClass = controllerClass.getParent();
      }
      stack.forEach(function(className){
        var bundleData;
        if (window[className] && window[className]._i18Model) {
          bundleData = window[className]._i18Model.getResourceBundle();
        }
        else {
          className = className.split(".");
          //snip off the local classname to get the directory name
          className.pop();  
          //add i18n to make the i18n directory name 
          className.push(i18n);
          //add i18n to point to the i18n.properties file(s) 
          className.push(i18n);
          bundleData = {bundleName: className.join(".")};
        }
        
        var i18nModel = this.getModel(i18n);
        if (i18nModel) {
          i18nModel.enhance(bundleData);
        } 
        else {
          i18nModel = new ResourceModel(bundleData);
          this.setModel(i18nModel, i18n);
        }
      }.bind(this));        
      //cache the i18n model for new instances of this class.
      this.constructor._i18Model = this.getModel(i18n);
    },
    getTextFromI18n: function(){
      var bundle = this.getModel(i18n).getResourceBundle();
      var text = bundle.getText.apply(bundle, arguments);
      return text;
    },
    _getEventBus: function(global){
      var eventBus;
      if (global) {
        eventBus = sap.ui.getCore().getEventBus();
      }
      else {
        eventBus = this.getOwnerComponent().getEventBus();
      }
      return eventBus;
    },
    _getDefaultChannelId: function(){
      var view = this.getView();
      var id = view.getId();
      return id;
    },
    subscribeToEventBus: function(config){
      var eventBus = this._getEventBus(config.global);
      eventBus.subscribe(
        config.channel, 
        config.event, 
        config.handler,
        config.scope || this
      );
    },
    publishToEventBus: function(config){
      var eventBus = this._getEventBus(config.global);
      eventBus.publish(
        config.channel || this._getDefaultChannelId(), 
        config.event, 
        config.data
      );
    },
    getModel: function(modelname){
      var view = this.getView();
      var model = view.getModel.apply(view, arguments);
      if (!model) {
        var ownerComponent = this.getOwnerComponent();
        if (ownerComponent) {
          model = ownerComponent.getModel(modelname);
        }
      }
      return model;
    },
    setModel: function(model, modelName){
      if (arguments.length === 1 && typeof(model) === "string"){
        var ownerComponent = this.getOwnerComponent();
        modelName = model;
        model = ownerComponent.getModel(modelName);
      }
      var args = [model, modelName]
      var view = this.getView();
      view.setModel.apply(view, args);
    },
    getApplicationStateModel: function(){
      var applicationStateModel = this.getModel("applicationState");
      return applicationStateModel;
    },
    getApplicationStateProperty: function(path){
      var applicationStateModel = this.getApplicationStateModel();
      var propertyValue = applicationStateModel.getProperty(path);
      return propertyValue;
    },
    setApplicationStateProperty: function(path, value){
      var applicationStateModel = this.getApplicationStateModel();
      applicationStateModel.setProperty(path, value);
    },
    getApplicationStateObject: function(path){
      var applicationStateModel = this.getApplicationStateModel();
      var object = applicationStateModel.getObject(path);
      return object;
    },
    setApplicationStateObject: function(path, object){
      for (prop in object){
        if (!object.hasOwnProperty(prop)) {
          continue;
        }
        this.setApplicationStateProperty(path + "/" + prop, object[prop]);
      }
    }
  });
  return controller;  
});