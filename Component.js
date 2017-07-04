sap.ui.define([
  "sap/ui/core/UIComponent"
], 
function (UIComponent) {
  "use strict";
  var component = UIComponent.extend("jubilant.Component", {
    metadata : {
      manifest: "json"
    },	   
    init : function () {
      UIComponent.prototype.init.apply(this, arguments);
    }		
  });
  return component;
});