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
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/odata/v2/ODataModel",
  "sap/ui/model/odata/ODataMetaModel",
  "sap/ui/model/BindingMode",
  "sap/ui/model/odata/CountMode",
  "sap/ui/model/odata/OperationMode",
], 
function(
   JSONModel,
   ODataModelv2,
   ODataMetaModel,
   BindingMode,
   CountMode,
   OperationMode
){
  var JulbilantMetaModel = JSONModel.extend("jubilant.components.jubilantmetamodel.JubilantMetaModel", {
    constructor: function(oDataModel, callbacks, modelOptions, serviceData){
      JSONModel.call(this, {});
      this.setODataModel(oDataModel, callbacks, modelOptions);
      this.setProperty("/" + this._serviceDataPath, {
        SERVICE_URI: serviceData.SERVICE_URI,
        LABEL: serviceData.LABEL,
        "sap.ui.model.odata.v2.ODataModel.options": serviceData["sap.ui.model.odata.v2.ODataModel.options"]
      });
    },
    _serviceDataPath: "serviceData",
    getServiceData: function(){
      var serviceData = this.getProperty("/" + this._serviceDataPath);
      return serviceData;
    },
    //see: https://sapui5.hana.ondemand.com/#docs/api/symbols/sap.ui.model.odata.v2.ODataModel.html#constructor
    _defaultODataModelOptions: {
      "json": true,
      "user": undefined,
      "password": undefined,
      "headers": undefined,
      "tokenHandling": false,
      "withCredentials": false,
      "maxDataServiceVersion": "2.0",
      "useBatch": false,
      "refreshAfterChange": false,
      "annotationURI": undefined,
      "loadAnnotationsJoined": undefined,
      "serviceUrlParams": undefined,
      "metadataUrlParams": undefined,
      "defaultBindingMode": BindingMode.OneWay,
      "defaultCountMode": CountMode.None,
      "defaultOperationMode": sap.ui.model.odata.OperationMode.Server,
      "defaultUpdateMethod": undefined,
      "metadataNamespaces": undefined,
      "skipMetadataAnnotationParsing": false,
      "disableHeadRequestForToken": true,
      "sequentializeRequests": true,
      "disableSoftStateHeader": true,
      "bindableResponseHeaders": undefined
    },
    _applyOptions: function(target, source){
      if (!target || !source) {
        return;
      }
      var option, value;
      for (option in source) {
        if (typeof(target[option]) !== "undefined") {
          continue;
        }
        value = source[option];
        if (typeof(value) === "undefined"){
          continue;
        }
        target[option] = value;
      }
    },
    setODataModel: function(oDataModel, callbacks, modelOptions){
      if (typeof(oDataModel) === "string") {
        var p, _options = {};
        this._applyOptions(_options, modelOptions);
        this._applyOptions(_options, this._defaultODataModelOptions);
        oDataModel = new ODataModelv2(oDataModel, _options);
      }
      if (!(oDataModel instanceof ODataModelv2)) {
        throw new Error();
      }
      this._oDataModel = oDataModel;
      oDataModel.attachMetadataFailed(function(modelEvent){
        if (!callbacks.error) {
          return;
        }
        callbacks.error.call(modelEvent);
      }.bind(this));
      this.getODataMetaModel().loaded().then(function(){
        this._oDataMetaModelLoaded(callbacks);
      }.bind(this));
    },
    getODataModel: function(){
      return this._oDataModel;
    },
    getODataMetaModel: function(){
      var oDataModel = this.getODataModel();
      var oDataMetaModel = oDataModel.getMetaModel();
      return oDataMetaModel;
    },
    _monkeyPatchOData: function(){
      if (!OData._jubilantMonkeyPatched) {
        var jsonHandler = OData.jsonHandler;
        var oldRead = jsonHandler.read;
        var newRead = function (response, context) {
          var contentType = response.headers["Content-Type"].split(";");
          if (contentType[0] !== jsonHandler.accept) {
            return false;
          }
          if (oldRead.call(jsonHandler, response, context)){
            return true;
          }
          if (contentType.join(";") === "application/json") {
            response.headers["Content-Type"] = "application/json;odata=nometadata"
          }
          if (oldRead.call(jsonHandler, response, context)){
            return true;
          }
          var data;
          try {
            data = JSON.parse(response.body);
          }
          catch (e){
            return false;
          }
          switch (typeof(data)){
            case "object":
              if (data !== null) {
                if (typeof(data.value) === "undefined") {
                  return false;
                }
                response.data = {
                  results: data.value
                };
                return true;
              }
          }
          return false;
        };
        jsonHandler.read = newRead;
        OData._jubilantMonkeyPatched = true;
      }
    },
    _monkeyPatchMetaModel: function(){
      var metaModel = this.getODataMetaModel();
      if (!metaModel._jubilantMonkeyPatched) {
        //https://github.com/SAP/openui5/issues/1569
        metaModel.getODataEntityContainer = function(bAsPath){
          var container = ODataMetaModel.prototype.getODataEntityContainer.apply(metaModel, arguments);
          if (container) {
            return container;
          }
          var aSchemas = this.oModel.getObject("/dataServices/schema");
          aSchemas.some(function(item){
            if (!item.entityContainer){
              return;
            }
            container = item.entityContainer[0];
          });
          return container;
        };
        metaModel._jubilantMonkeyPatched
      }
    },
    _oDataMetaModelLoaded: function(callbacks){

      this._monkeyPatchOData();
      this._monkeyPatchMetaModel();
      
      this._populateJubilantMetaModel();
      if (!callbacks || !callbacks.success){
        return;
      }
      callbacks.success.call(this);
    },
    _extractExtensions: function(wrapper, oDataItemPropertyName){
      var oDataItem = wrapper[oDataItemPropertyName];
      var oDataItemExtensions = oDataItem.extensions;
      if (!oDataItemExtensions) {
        return;
      }
      var extensions = wrapper.extensions;      
      if (!extensions) {
        extensions = wrapper.extensions = {};
      }
      oDataItemExtensions.forEach(function(oDataItemExtension){
        var oDataExtensionsNameSpace = oDataItemExtension.namespace || "";
        var namespaceContainer = extensions[oDataExtensionsNameSpace];
        if (!namespaceContainer) {
          namespaceContainer = extensions[btoa(oDataExtensionsNameSpace)] = {};
        }
        namespaceContainer[oDataItemExtension.name] = oDataItemExtension.value;
      }.bind(this));
    },
    _extractProperties: function(entityType){
      var oDataEntityType = entityType.oDataEntityType;
      var keyNames;
      if (oDataEntityType.key && oDataEntityType.key.propertyRef){
        keyNames = oDataEntityType.key.propertyRef.map(function(propertyRef){
          return propertyRef.name;
        });
      }
      if (!oDataEntityType.property) {
        return;
      }
      oDataEntityType.property.forEach(function(oDataProperty){
        var property = {
          oDataProperty: oDataProperty,
          keyOrdinal: keyNames? keyNames.indexOf(oDataProperty.name) : -1
        };
        this._extractExtensions(property, "oDataProperty");
        entityType.properties.push(property);
      }.bind(this));
    },
    _extractNavigationProperties: function(entityType){
      var oDataEntityType = entityType.oDataEntityType;
      if (!oDataEntityType.navigationProperty) {
        return;
      }
      var metaModel = this.getODataMetaModel();
      oDataEntityType.navigationProperty.forEach(function(navigationProperty){
        var associationEnd = metaModel.getODataAssociationEnd(oDataEntityType, navigationProperty.name);
        var navigationProperty = {
          associationEnd: associationEnd,
          oDataNavigationProperty: navigationProperty
        };
        this._extractExtensions(navigationProperty, "oDataNavigationProperty");
        entityType.navigationProperties.push(navigationProperty);
      }.bind(this));
    },
    _extractEntityType: function(typeName){
      var metaModel = this.getODataMetaModel();
      var oDataEntityType = metaModel.getODataEntityType(typeName);
      var entityType = {
        oDataEntityType: oDataEntityType,
        properties: [],
        navigationProperties: []
      };
      this._extractExtensions(entityType, "oDataEntityType");
      this._extractProperties(entityType);
      this._extractNavigationProperties(entityType);
      return entityType;
    },
    _populateJubilantMetaModel: function(){
      var metaModel = this.getODataMetaModel();
      var entitySetDescriptors = [];
      var entityTypeDescriptors = {};
      metaModel.getODataEntityContainer().entitySet.forEach(function(entitySet){
        var entitySetName = entitySet.name;
        var oDataEntitySet = metaModel.getODataEntitySet(entitySetName);
        var typeName = oDataEntitySet.entityType;
        var entityType = entityTypeDescriptors[typeName];
        if (!entityType) {
          entityType = entityTypeDescriptors[typeName] = this._extractEntityType(typeName);
        }
        var entitySet = {
          oDataEntitySet: oDataEntitySet,
          type: entityType
        };
        this._extractExtensions(entitySet, "oDataEntitySet");
        entitySetDescriptors.push(entitySet);
      }.bind(this));
      this.setProperty("/entitySets", entitySetDescriptors);
      this.setProperty("/entityTypes", entityTypeDescriptors);
    },
    _getEntitySetDescriptor: function(entitySetName){
      var entitySetDescriptors = this.getProperty("/entitySets");
      entitySetDescriptors = entitySetDescriptors.filter(function(entitySetDescriptor){
        return entitySetDescriptor.oDataEntitySet.name === entitySetName;
      });
      if (entitySetDescriptors.length === 0) {
        throw new Error();
      }
      return entitySetDescriptors[0];
    },
  });
  return JulbilantMetaModel;
});