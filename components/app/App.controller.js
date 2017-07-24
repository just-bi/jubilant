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
        "jubilant/components/basecontroller/BaseController",
        "sap/ui/model/odata/v2/ODataModel",
        "sap/ui/model/odata/CountMode",
        "sap/ui/model/BindingMode",
        "sap/ui/model/odata/OperationMode",
        "sap/ui/model/json/JSONModel",
        "sap/m/TabContainerItem",
        "sap/m/MessageToast",
        "jubilant/components/jubilantmetamodel/JubilantMetaModel"
    ],
    function(
        BaseController,
        ODataModel,
        CountMode,
        BindingMode,
        OperationMode,
        JSONModel,
        TabContainerItem,
        MessageToast,
        JubilantMetaModel
    ) {
        "use strict";
        var controller = BaseController.extend("jubilant.components.app.App", {
            _dataModelName: "data",
            _jubilantMetaModelName: "jubilantMetaModel",
            _getDataModel: function() {
                var model = this.getModel(this._dataModelName);
                return model;
            },
            onInit: function() {
                BaseController.prototype.onInit.call(this);
                this.setApplicationStateProperty("/sidebarExpanded", true);
            },
            _getJubilantMetaModel: function() {
                var jubilantMetaModel = this.getModel(this._jubilantMetaModelName);
                return jubilantMetaModel;
            },
            _getNavigationList: function() {
                return this.byId("navigationList");
            },
            _clearNavigationList: function() {
                this._getNavigationList().removeAllItems();
            },
            _setJubilantMetaModel: function(jubilantMetaModel) {
                this.setModel(jubilantMetaModel.getODataModel(), this._dataModelName);
                this.setModel(jubilantMetaModel, this._jubilantMetaModelName);
                this._displayVisualisationButtons();
                var app = this.byId("app");
                app.setBusy(false);
            },
            _handleChangeServiceUri: function(serviceObject, errorHandler) {
                this._setSelectedEntitySetName(null);
                var app = this.byId("app");
                app.setBusy(true);
                var jubilantMetaModel;
                if (serviceObject.jubilantMetaModel) {
                    jubilantMetaModel = serviceObject.jubilantMetaModel;
                    this._setJubilantMetaModel(jubilantMetaModel);
                } else {
                    var serviceUri = serviceObject.SERVICE_URI;
                    var modelOptions = serviceObject["sap.ui.model.odata.v2.ODataModel.options"];
                    jubilantMetaModel = new JubilantMetaModel(serviceUri, {
                        success: function() {
                            this._setJubilantMetaModel(jubilantMetaModel);
                            serviceObject.jubilantMetaModel = jubilantMetaModel;
                            serviceObject.oDataModel = jubilantMetaModel.getODataModel();
                        }.bind(this),
                        error: function() {
                            app.setBusy(false);
                            MessageToast.show(this.getTextFromI18n("metadataFailed.message"));
                        }.bind(this)
                    }, modelOptions, serviceObject);
                }
            },
            onLoadODataUriPressed: function(event) {
                var input = this.byId("url");
                var uri = input.getValue();
                this._handleChangeServiceUri(uri);
            },
            onChangeServiceUri: function(comboboxEvent) {
                var comboBox = comboboxEvent.getSource();
                var me = this;
                var selectedItem = comboboxEvent.getParameter("selectedItem");
                if (!selectedItem) {
                    return;
                }
                var bindingInfo = comboBox.getBindingInfo("items");
                var context = selectedItem.getBindingContext(bindingInfo.model);
                this._handleChangeServiceUri(context.getObject(), function(modelEvent) {
                    var previousModel = me.getModel(this._dataModelName);
                    comboBox.setSelectedKey(previousModel ? previousModel.sServiceUrl : null);
                }.bind(this));
            },
            _getTabContainer: function() {
                return this.byId("tabContainer");
            },
            _getVisualisationPluginDescriptor: function(visualisationName) {
                var visualisationPluginModel = this.getModel("visualisationPlugins");
                var pluginDescriptors = visualisationPluginModel.getProperty("/plugins");
                pluginDescriptors = pluginDescriptors.filter(function(pluginDescriptor) {
                    return pluginDescriptor.name === visualisationName;
                });
                if (!pluginDescriptors.length) {
                    throw new Error("");
                }
                return pluginDescriptors[0];
            },
            onVisualisationButtonPressed: function(event) {
                var button = event.getSource();
                var visualisationName = button.data("visualisationname");
                this._createVisualisation(visualisationName);
            },
            _getButtonForVisualisation: function(visualisationPluginDescriptor) {
                var name;
                switch (typeof(visualisationPluginDescriptor)) {
                    case "object":
                        name = visualisationPluginDescriptor.name;
                        break;
                    case "string":
                        name = visualisationPluginDescriptor;
                        break;
                    default:
                }
                var toolbar = this.byId("visualisationPluginToolbar");
                var buttons = toolbar.getContent().filter(function(button) {
                    return name === button.data("visualisationname");
                })[0];
                if (buttons && buttons.length) {
                    buttons = buttons[0];
                }
                return buttons;
            },
            _getSelectedEntitySetName: function() {
                return this.getApplicationStateProperty("/selectedEntitySetName");
            },
            _setSelectedEntitySetName: function(entitySetName) {
                return this.setApplicationStateProperty("/selectedEntitySetName", entitySetName);
            },
            _getVisualisationFactory: function(visualisationPluginDescriptor) {
                try {
                    var factoryObject = visualisationPluginDescriptor.factoryObject;
                    var factoryClassName = visualisationPluginDescriptor.factory;
                    var factoryClass = this._getClass(factoryClassName);
                    factoryObject = new factoryClass();
                    factoryObject.init(visualisationPluginDescriptor);
                    visualisationPluginDescriptor.factoryObject = factoryObject;
                } catch (e) {
                    console.log(e.stack);
                    return factoryObject;
                }
                return factoryObject;
            },
            _displayVisualisationButtons: function(entitySetDescriptor) {
                var model = this._getDataModel();
                var visualisationPluginModel = this.getModel("visualisationPlugins");
                var visualisationPlugins = visualisationPluginModel.getData();
                visualisationPlugins.plugins.forEach(function(visualisationPluginDescriptor) {
                    var enabled, button;
                    enabled = false;
                    button = this._getButtonForVisualisation(visualisationPluginDescriptor);
                    var factory = this._getVisualisationFactory(visualisationPluginDescriptor);
                    if (factory) {
                        switch (factory.getScope()) {
                            case "service":
                                enabled = factory.canVisualiseModel(model);
                                break;
                            case "entityset":
                                enabled = Boolean(entitySetDescriptor) && factory.canVisualiseEntitySet(entitySetDescriptor, model);
                                break;
                        }
                    }
                    if (button) {
                        button.setEnabled(Boolean(enabled));
                        button.setVisible(enabled);
                    }
                }.bind(this));
            },
            onEntitySelected: function(event) {
                var item = event.getParameter("item");
                var entitySetName = item.getKey();
                this._setSelectedEntitySetName(entitySetName);
                var jubilantMetaModel = this._getJubilantMetaModel();
                var entitySetDescriptor = jubilantMetaModel.getEntitySetDescriptor(entitySetName);
                this._displayVisualisationButtons(entitySetDescriptor);
            },
            _createVisualisation: function(visualisationName) {
                var visualisationPluginDescriptor = this._getVisualisationPluginDescriptor(visualisationName);
                visualisationPluginDescriptor.factoryObject.createNew(function(view) {
                    var entitySetName = this._getSelectedEntitySetName();
                    var entitySetDescriptor;
                    if (entitySetName) {
                        var jubilantMetaModel = this._getJubilantMetaModel();
                        entitySetDescriptor = jubilantMetaModel.getEntitySetDescriptor(entitySetName);
                    }

                    var tabContainerItem = this._createTabContainerItem(visualisationPluginDescriptor, entitySetDescriptor);
                    tabContainerItem.addContent(view);

                    var controller = view.getController();
                    controller.setDataFoundation({
                        model: this._getDataModel(),
                        entitySetDescriptor: entitySetDescriptor,
                        jubilantMetaModel: this._getJubilantMetaModel()
                    });
                }.bind(this));
            },
            _createTabContainerItem: function(visualisationPluginDescriptor, entitySetDescriptor) {
                var name, tooltip;
                if (visualisationPluginDescriptor) {
                    tooltip = visualisationPluginDescriptor.tooltip;
                }
                if (entitySetDescriptor) {
                    if (tooltip) {
                        tooltip += ": ";
                    }
                    tooltip += entitySetDescriptor.oDataEntitySet.name;
                }
                var tabContainerItem = new TabContainerItem({
                    name: tooltip,
                    modified: false,
                    tooltip: tooltip
                });
                var tabContainer = this._getTabContainer();
                tabContainer.addItem(tabContainerItem);
                tabContainer.setSelectedItem(tabContainerItem);
                return tabContainerItem;
            },
            initTreeModel: function() {
                var data = {};
            }
        });
        return controller;
    })