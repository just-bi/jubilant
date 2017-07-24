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
        "jubilant/components/visualisation/BaseVisualisationController"
    ],
    function(
        BaseVisualisationController
    ) {
        "use strict";
        var controller = BaseVisualisationController.extend("jubilant.components.visualisation.examplevisualisation.ExampleVisualisation", {
            _exampleItemAxisId: "examplesItems",
            _oDataResponseExampleTextAreaId: "oDataResponseExampleTextArea",
            _getODataResponseExampleTextArea: function() {
                return this.byId(this._oDataResponseExampleTextAreaId);
            },
            _clearODataResponseExampleTextArea: function() {
                var oDataResponseExampleTextArea = this._getODataResponseExampleTextArea();
                oDataResponseExampleTextArea.setValue("This is an example.. cleaning text area right now");
            },
            _renderODataResponse: function(data, response) {
                var oDataResponseExampleTextArea = this._getODataResponseExampleTextArea();
                oDataResponseExampleTextArea.setGrowing(false);
                var text = JSON.stringify(response);
                oDataResponseExampleTextArea.setValue(text);
                oDataResponseExampleTextArea.setGrowing(true);
            },
            //Common private function used to  get the columns specified in the Axes Area (select)
            _getSelect: function(fieldUsageRegistry) {
                var visualisationAxesAreaManager = this._getVisualisationEditorComponentManager("VisualisationAxesAreaManager");
                var selectedItems = visualisationAxesAreaManager.getSelectedAxisItems(this._exampleItemAxisId);
                var select = selectedItems.map(function(item) {
                    var key = item.getKey();
                    this.registerFieldUsage(fieldUsageRegistry, key, visualisationAxesAreaManager);
                    return key;
                }.bind(this));
                return select;
            },
            //Common private function used to get the filter specified in the Filter Area (where)
            _getFilter: function(fieldUsageRegistry) {
                var visualisationFilterAreaManager = this._getVisualisationEditorComponentManager("VisualisationFilterAreaManager");
                var filter = visualisationFilterAreaManager.getFilter(fieldUsageRegistry);
                return filter;
            },
            //Common private function used to get the order specified in the Sort Area (order by)
            _getSorters: function(fieldUsageRegistry) {
                var visualisationSortAreaManager = this._getVisualisationEditorComponentManager("VisualisationSortAreaManager");
                var sorters = visualisationSortAreaManager.getSorters(fieldUsageRegistry);
                return sorters;
            },
            //Common private function used to clear the visualisation in the current view
            _clearVisualization: function() {
                this._clearODataResponseExampleTextArea();
            },
            //Common private function used to check if it is allowed or not  to execute a query
            _checkCanExecuteQuery: function() {
                var visualisationAxesAreaManager = this._getVisualisationEditorComponentManager("VisualisationAxesAreaManager");
                var selectedItems = visualisationAxesAreaManager.getSelectedAxisItems(this._exampleItemAxisId);
                return selectedItems.length > 0;
            },
            //Common private function used to execute a query
            _executeQuery: function(callback) {
                debugger;
                //it is an array of objects with the columns used 
                var fieldUsageRegistry = {};

                //Array with the filter columns specified in the Filter Area
                var filters = this._getFilter(fieldUsageRegistry);
                if (filters) {
                    filters = [filters];
                }
                //Array with the column's labels specified in the Axes Area
                var select = this._getSelect(fieldUsageRegistry);
                //Array with the sorter columns specified in the Sort Area
                var sorters = this._getSorters(fieldUsageRegistry);
                var expandList = this._getExpandList(fieldUsageRegistry);
                var urlParameters = {
                    "$select": select.join(", ")
                };
                if (expandList.length) {
                    urlParameters["$expand"] = expandList.join(",");
                }
                debugger;
                var dataModel = this.getDataModel();
                dataModel.read(this._getEntitySetPath(), {
                    filters: filters,
                    sorters: sorters,
                    urlParameters: urlParameters,
                    success: function(oData, response) {
                        this._renderODataResponse(oData, response);
                        callback();
                    }.bind(this),
                    error: function(error) {
                        callback();
                        this._showMessageToast(this.getTextFromI18n("errorLoading"));
                    }.bind(this)
                });
            }
        });
        return controller;
    });