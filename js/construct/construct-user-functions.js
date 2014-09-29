/**
 * Created by brand_000 on 9/14/2014.
 */

// TODO: Wrap up more nicely into a module

Construct.asScalar = function(value) {
  if ( (typeof(value)).toLowerCase() === 'number' ) {
    return Construct.ScalarFieldNodeTypes.Constant.makeField({value: value});
  }
  else {
    return value;
  }
}

Construct.ScalarField.prototype.plus = function(right) { 
  return Construct.ScalarFieldNodeTypes.AddScalar.makeField({left: this.node, right: Construct.asScalar(right).node});
}
Construct.ScalarField.prototype.minus = function(right) { 
  return Construct.ScalarFieldNodeTypes.SubtractScalar.makeField({left: this.node, right: Construct.asScalar(right).node});
}
Construct.ScalarField.prototype.times = function(right) { 
  return Construct.ScalarFieldNodeTypes.MultiplyScalar.makeField({left: this.node, right: Construct.asScalar(right).node});
}
Construct.ScalarField.prototype.dividedBy = function(right) { 
  return Construct.ScalarFieldNodeTypes.DivideScalar.makeField({left: this.node, right: Construct.asScalar(right).node});
}
Construct.ScalarField.prototype.warp = function(displacement) { 
  return Construct.ScalarFieldNodeTypes.Warp.makeField({left: this.node, right: displacement.node});
}
Construct.ScalarField.prototype.translate = function(displacement) { 
  return this.warp( Construct.VectorFieldNodeTypes.Identity.makeField().minus( displacement ) );
}
Construct.ScalarField.prototype.sqrt = function() { 
  return Construct.ScalarFieldNodeTypes.DivideScalar.makeField({child: this.node});
}
Construct.ScalarField.prototype.cos = function() { 
  return Construct.ScalarFieldNodeTypes.Cosine.makeField({child: this.node});
}
Construct.ScalarField.prototype.sin = function() { 
  return Construct.ScalarFieldNodeTypes.Sine.makeField({child: this.node});
}
Construct.ScalarField.prototype.log = function() { 
  return Construct.ScalarFieldNodeTypes.Log.makeField({child: this.node});
}
Construct.ScalarField.prototype.abs = function() { 
  return Construct.ScalarFieldNodeTypes.AbsoluteValue.makeField({child: this.node});
}
Construct.ScalarField.prototype.mask = function() { 
  return Construct.ScalarFieldNodeTypes.Mask.makeField({child: this.node});
}
Construct.ScalarField.prototype.exp = function() { 
  return Construct.ScalarFieldNodeTypes.Exponential.makeField({child: this.node});
}
Construct.ScalarField.prototype.rotationMatrix = function() { 
  return Construct.MatrixFieldNodeTypes.Rotation.makeField({child: this.node});
}

////// Vector Field Operations

Construct.VectorField.prototype.plus = function(right) { 
  return Construct.VectorFieldNodeTypes.AddVector.makeField({left: this.node, right: right.node});
}
Construct.VectorField.prototype.minus = function(right) { 
  return Construct.VectorFieldNodeTypes.SubtractVector.makeField({left: this.node, right: right.node});
}
Construct.VectorField.prototype.times = function(right) { 
  return Construct.VectorFieldNodeTypes.MultiplyScalar.makeField({left: this.node, right: Construct.asScalar(right).node});
}
Construct.VectorField.prototype.dividedBy = function(right) { 
  return Construct.VectorFieldNodeTypes.DivideScalar.makeField({left: this.node, right: Construct.asScalar(right).node});
}
Construct.VectorField.prototype.dot = function(right) { 
  return Construct.ScalarFieldNodeTypes.DotProduct.makeField({left: this.node, right: right.node});
}
Construct.VectorField.prototype.warp = function(right) { 
  return Construct.VectorFieldNodeTypes.Warp.makeField({left: this.node, right: right.node});
}
Construct.ScalarField.prototype.translate = function(displacement) { 
  return this.warp( Construct.VectorFieldNodeTypes.Identity.makeField().minus( displacement ) );
}
Construct.VectorField.prototype.length = function() { 
  return Construct.ScalarFieldNodeTypes.TwoNorm.makeField({child: this.node});
}

////// Matrix Field Operations
Construct.MatrixField.prototype.plus = function(right) { 
  return Construct.MatrixFieldNodeTypes.AddMatrix.makeField({left: this.node, right: right.node});
}
Construct.MatrixField.prototype.minus = function(right) { 
  return Construct.MatrixFieldNodeTypes.SubtractMatrix.makeField({left: this.node, right: right.node});
}
Construct.MatrixField.prototype.times = function(right) { 
  if (right instanceof Construct.MatrixField) {
    return Construct.MatrixFieldNodeTypes.MultiplyMatrix.makeField({left: this.node, right: right.node});
  } else if (right instanceof Construct.VectorField) {
    return Construct.MatrixFieldNodeTypes.MultiplyVector.makeField({left: this.node, right: right.node});
  } else {
    return Construct.MatrixFieldNodeTypes.MultiplyScalar.makeField({left: this.node, right: Construct.asScalar(right).node});
  }
}

// Helper functions

Construct.UserFunctions = {
    // Constant fields
    sf: function(val) { return Construct.ScalarFieldNodeTypes.Constant.makeField({value: val}); },
    vf: function(x, y) { return Construct.VectorFieldNodeTypes.Constant.makeField({x: x, y:y}); },
    mf: function(a, b, c, d) { return Construct.MatrixFieldNodeTypes.Constant.makeField({m11: a, m12: b, m21: c, m22: d}); },

    // Vector identity, i.e. f(x) = x
    identity: function() { return Construct.VectorFieldNodeTypes.Identity.makeField(); },
  
    matrixFromScalars: function(m11, m12, m21, m22) {
       return Construct.MatrixFieldNodeTypes.FromScalars.makeField({
         child1: Construct.asScalar(m11).node,
         child2: Construct.asScalar(m12).node,
         child3: Construct.asScalar(m21).node,
         child4: Construct.asScalar(m22).node,
       });
    },
    
    // Writing to a grid
    writeToGrid: function(field, renderer, settings) {
      var settings = settings || {};

      // What's the resolution of the grid we're writing to?
      var width = settings.width || 256;
      var height = settings.height || 256;

      // What is the domain that this grid should cover?
      var gridMin = settings.gridMin || {x: -1, y: -1};
      var gridMax = settings.gridMax || {x: 1, y: 1};
    
      // Get a hold of an actual render target to write to
      var renderTarget = Construct.WebGL.RenderTargetFactory.get(width, height);

      var properties = {
        uniformData: {
          type:  't',
          value: renderTarget
        },
        gridMin: gridMin,
        gridMax: gridMax,
        width: width,
        height: height
      };
    
      // Create the actual node with the properties we've set up
      var gridField;
      if (field instanceof Construct.ScalarField) {
        gridField = Construct.ScalarFieldNodeTypes.Grid.makeField(properties);
      }
      else if (field instanceof Construct.VectorField) {
        gridField = Construct.VectorFieldNodeTypes.Grid.makeField(properties);
      }

      // Now render to the grid
      Construct.WebGL.render(field, {renderer: renderer, renderTarget: renderTarget});
      
      return gridField;
    }
};
