sap.ui.define([
  "sap/ui/core/Control"
], function(
  Control
) {
  var control = Control.extend("jubilant.components.visualisation.odatametadatagraph.ODataMetadataGraphControl",{
    metadata: {
      properties: {
        width: {
          type: "sap.ui.core.CSSSize", //this is optional, but it helps prevent errors in your code by enforcing a type
          defaultValue: "100%" //this is also optional, but recommended, as it prevents your properties being null
        },
        height: {
          type: "sap.ui.core.CSSSize",
          defaultValue: "100%" //this is also optional, but recommended, as it prevents your properties being null
        },
        keyGlyph: {
          type: "string",
          defaultValue: "⚿"
        },
        entityTypeColor: {
          type: "string",
          defaultValue: "lightSkyBlue"
        },
        complexTypeColor: {
          type: "string",
          defaultValue: "lightgreen"
        },
        baseTypeColor: {
          type: "string",
          defaultValue: "purple"
        },
        relationshipColor: {
          type: "string",
          defaultValue: "orange"
        }
      },
      aggregations: {}
    },
    renderer: function(oRm, oControl){
      oRm.write("<div");
      oRm.write(" style=\"position: relative; width: " + oControl.getWidth() + "; height: " + oControl.getHeight() + ";\"");
      oRm.writeControlData(oControl);
      oRm.write("></div>");
    },
    _getNetworkContainer: function(){
      return this.getDomRef();
    },
    setMetaModel: function(metamodel, entitySetDescriptor){
      this._metamodel = metamodel;
      this._entitySetDescriptor = entitySetDescriptor;
      if (metamodel && this._getNetworkContainer()) {
        this._renderODataMetaModelGraph();
      }
    },
    _makeODataEntitTypeLabel: function(oDataEntityType){
      var label = oDataEntityType.name;
      var keyNames;
      if (oDataEntityType.key) {
        keyNames = oDataEntityType.key.propertyRef.map(function(propertyRef){
          return propertyRef.name;
        });
      }
      else {
        keyNames = [];
      }

      if (!oDataEntityType.property || !oDataEntityType.property.length) {
        return label;
      }
      var keys = [], names = [], nullabilities = [], types = [];
      var maxNameLength = 0;
      oDataEntityType.property.forEach(function(property){
        var name = property.name;
        names.push(name);
        if (name.length > maxNameLength) {
          maxNameLength = name.length;
        }

        if (keyNames.indexOf(name) === -1) {
          keys.push("  ");
        }
        else {
          keys.push(this.getKeyGlyph());
        }

        if (property.nullable === "false") {
          nullabilities.push("    ");
        }
        else {
          nullabilities.push("null");
        }

        types.push(property.type);
      }.bind(this));

      label += "\n";
      names.forEach(function(name, index){
        while(name.length < maxNameLength) {
          name += " ";
        }
        label += "\n" + keys[index] + " " + name + "  " + nullabilities[index] + "  " + types[index];
      });
      return label;
    },
    _renderODataMetaModelGraph: function(){
      var metamodel = this._metamodel;
      if (!metamodel) {
        return;
      }
      var container = this._getNetworkContainer();
      if (!container) {
        return;
      }

      var nodeMap = {};
      var edgeMap = {};
      var nodes = [];
      var edges = [];

      if (this._entitySetDescriptor) {
        this._getShallowODataMetaModelGraph(nodeMap, edgeMap);
      }
      else {
        this._getFullODataMetaModelGraph(nodeMap, edgeMap);
      }

      var item;
      var nodes = [];
      for (item in nodeMap) {
        nodes.push(nodeMap[item]);
      }
      var edges = [];
      for (item in edgeMap) {
        edges.push(edgeMap[item]);
      }

      var networkData = {
        nodes: new vis.DataSet(nodes),
        edges: new vis.DataSet(edges)
      };

      var networkOptions = {
        edges: {
          smooth: false
        },
        physics:{
          barnesHut:{gravitationalConstant:-30000},
          stabilization: {iterations:2500}
        },
        layout: {/*
          hierarchical: {
            direction: "UD" ,
            levelSeparation: 200
          }*/
        },
        physics: {
          enabled: false /*,
          hierarchicalRepulsion: {
            nodeDistance: 300
          }*/
        }
      };
      var visNetwork = new vis.Network(container, networkData, networkOptions);
      return visNetwork;
    },
    _getTypeId: function(oDataEntityType, type){
      var id = type + ":" + oDataEntityType.namespace + "." + oDataEntityType.name;
      return id;
    },
    _createEntityTypeNode: function(oDataEntityType, nodeMap, type){
      var id = this._getTypeId(oDataEntityType, type);
      var node = nodeMap[id];
      if (node) {
        return node;
      }
      var color;
      switch (type) {
        case "entityType":
          color = this.getEntityTypeColor();
          break;
        case "complexType":
          color = this.getComplexTypeColor();
          break;
        default:
      }
      nodeMap[id] = node = {
        id: id,
        label: this._makeODataEntitTypeLabel(oDataEntityType),
        shape: "box",
        physics: true,
        font: {"face": "monospace", "align": "left"},
        color: color
      };
      return node;      
    },
    _createRelationshipNode: function(navigationProperty, nodeMap){
      var relationshipName = navigationProperty.relationship;
      var id = "relationship:" + relationshipName;
      var node = nodeMap[id];
      if (node) {
        return node;
      }
      nodeMap[id] = node = {
        id: id,
        label: relationshipName,
        shape: "box",
        physics: true,
        font: {"face": "monospace", "align": "left"},
        color: this.getRelationshipColor()
      };
      return node;
    },
    _getEntityTypeBaseTypeGraph: function(oDataEntityType, nodeMap, edgeMap){
      if (!oDataEntityType.baseType) {
        return;
      }
      var typeId = this._getTypeId(oDataEntityType, "entityType");
      var metamodel = this._metamodel;
      var baseODataType = metamodel.getODataEntityType(oDataEntityType.baseType);
      var baseTypeId = this._getTypeId(baseODataType, "entityType");
      if (!nodeMap[baseTypeId]) {
        this._createEntityTypeNode(baseODataType, nodeMap, "entityType");
      }
      var relationshipName = typeId + ".baseType";
      var edgeKey = "baseType:" + relationshipName;
      var edge = edgeMap[edgeKey];
      if (edge) {
        return;
      }
      var from, to, dashes;
      edge = edgeMap[edgeKey] = {
        label: "baseType",
        from: typeId,
        to: baseTypeId,
        arrows: "to",
        //smooth: "cubicBezier",
        type: "complexType",
        color: this.getBaseTypeColor(),
        font: {align: "horizontal"}
      };
    },
    _getEntityTypeStructuredTypesGraph: function(oDataEntityType, nodeMap, edgeMap){
      var properties = oDataEntityType.property;
      if (!properties || !properties.length){
        return;
      }
      var typeId = this._getTypeId(oDataEntityType, "entityType");
      var metamodel = this._metamodel;
      properties.forEach(function(property){
        var propertyTypeName = property.type;
        if (propertyTypeName.indexOf("Edm.") !== -1){
          return;
        }
        var complexODataType = metamodel.getODataComplexType(propertyTypeName);
        var complexTypeId = this._getTypeId(complexODataType, "complexType");
        if (!nodeMap[complexTypeId]) {
          this._createEntityTypeNode(complexODataType, nodeMap, "complexType");
        }
        var relationshipName = typeId + "." + property.name;
        var edgeKey = "complexType:" + relationshipName;
        var edge = edgeMap[edgeKey];
        if (edge) {
          return;
        }
        var from, to, dashes;
        edge = edgeMap[edgeKey] = {
          label: property.name,
          from: typeId,
          to: complexTypeId,
          arrows: "to",
          //smooth: "cubicBezier",
          type: "complexType",
          color: this.getComplexTypeColor(),
          font: {align: "horizontal"}
        };
      }.bind(this));
    },
    _getEntityTypeNavigationPropertiesGraph: function(oDataEntityType, nodeMap, edgeMap){
      if (!oDataEntityType.navigationProperty || !oDataEntityType.navigationProperty.length) {
        return;
      }
      var entityTypeId = this._getTypeId(oDataEntityType, "entityType");
      var metamodel = this._metamodel;
      oDataEntityType.navigationProperty.forEach(function(navigationProperty){
        var relationshipNode = this._createRelationshipNode(navigationProperty, nodeMap);
        
        var navigationPropertyName = navigationProperty.name;
        var assocationEnd = metamodel.getODataAssociationEnd(oDataEntityType, navigationPropertyName);

        var associationType = assocationEnd.type;
        var associationODataEntityType = metamodel.getODataEntityType(associationType);
        //get a shallow entity graph.
        this._getEntityTypeGraph(associationODataEntityType, nodeMap, null);
        
        var associationId = "navigation:" + entityTypeId + "." + navigationPropertyName;
        var edge = edgeMap[associationId];
        var from, to, align;
        if (navigationProperty.fromRole === assocationEnd.role) {
          from = relationshipNode.id;
          to = entityTypeId;
        }
        else
        if (navigationProperty.toRole === assocationEnd.role) {
          from = entityTypeId;
          to = relationshipNode.id;
        }
        edge = edgeMap[associationId] = {
          label: navigationPropertyName + " " + assocationEnd.multiplicity,
          from: from,
          to: to,
          arrows: "middle",
          type: "association",
          color: this.getRelationshipColor()
        };
        
        //see if the associated entity also has a navigation property - 
        //if there is one, then we create an edge for that right away now
        //in order to make the shallow graphs work.
        if (!associationODataEntityType.navigationProperty) {
          return;
        }
        associationODataEntityType.navigationProperty.some(function(reverseNavigationProperty){
          if (navigationProperty.relationship !== reverseNavigationProperty.relationship) {
            return false;
          } 
          if (navigationProperty.fromRole !== reverseNavigationProperty.toRole) {
            return false;
          }
          if (navigationProperty.toRole !== reverseNavigationProperty.fromRole) {
            return false;
          }
          var entityTypeId = this._getTypeId(associationODataEntityType, "entityType");
          var navigationPropertyName = reverseNavigationProperty.name;
          var associationId = "navigation:" + entityTypeId + "." + navigationPropertyName;
          edge = edgeMap[associationId];
          if (edge) {
            return true;
          }
          var assocationEnd = metamodel.getODataAssociationEnd(associationODataEntityType, navigationPropertyName);
          edge = edgeMap[associationId] = {
            label: navigationPropertyName + " " + assocationEnd.multiplicity,
            from: entityTypeId,
            to: relationshipNode.id,
            arrows: "middle",
            type: "association",
            color: this.getRelationshipColor()
          };        
          return true;
        }.bind(this));
      }.bind(this));
    },
    _getEntityTypeGraph: function(oDataEntityType, nodeMap, edgeMap){
      var typeId = this._getTypeId(oDataEntityType, "entityType");
      var entityTypeNode = nodeMap[typeId];
      if (entityTypeNode) {
        return entityTypeNode;
      }
      entityTypeNode = this._createEntityTypeNode(oDataEntityType, nodeMap, "entityType");
      if (!edgeMap) {
        return entityTypeNode;
      }
            
      //evaluate base type
      this._getEntityTypeBaseTypeGraph(oDataEntityType, nodeMap, edgeMap);
      //evaluate complex types
      this._getEntityTypeStructuredTypesGraph(oDataEntityType, nodeMap, edgeMap);
      //evaluate navigation properties (relationships)
      this._getEntityTypeNavigationPropertiesGraph(oDataEntityType, nodeMap, edgeMap);
        
      return entityTypeNode;
    },
    _getShallowODataMetaModelGraph: function(nodeMap, edgeMap){
      var entitySetDescriptor = this._entitySetDescriptor;
      var typeName = entitySetDescriptor.oDataEntitySet.entityType;
      var metamodel = this._metamodel;
      var oDataEntityType = metamodel.getODataEntityType(typeName);
      this._getEntityTypeGraph(oDataEntityType, nodeMap, edgeMap);
      var edge, fromType, toType;
      for (edge in edgeMap) {
        edge = edgeMap[edge];
        switch (edge.type) {
          case "association":
            fromType = metamodel.getODataEntityType(edge.from.substr("entityType:".length));
            toType = null;
            break;
          case "complexType":
            fromType = typeName;
            toType = metamodel.getODataComplexType(edge.to.substr("entityType:".length));
            break;
        }
        if (fromType) {
          this._getEntityTypeGraph(fromType, nodeMap);
        }
        if (toType) {
          this._getEntityTypeGraph(toType, nodeMap);
        }
      }
    },
    _getFullODataMetaModelGraph: function(nodeMap, edgeMap){
      var metamodel = this._metamodel;
      metamodel.getODataEntityContainer().entitySet.forEach(function(entitySet){
        var entitySetName = entitySet.name;
        var oDataEntitySet = metamodel.getODataEntitySet(entitySetName);
        var typeName = oDataEntitySet.entityType;
        var oDataEntityType = metamodel.getODataEntityType(typeName);
        this._getEntityTypeGraph(oDataEntityType, nodeMap, edgeMap);
      }.bind(this));
    },
    onAfterRendering: function(arguments) {
      if(Control.prototype.onAfterRendering) {
        Control.prototype.onAfterRendering.apply(this,arguments);
      }
      this._renderODataMetaModelGraph();
      this._graphRendered = true;
    },
  });
  return control;
});