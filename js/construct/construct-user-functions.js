/**
 * Created by brand_000 on 9/14/2014.
 */

Construct.UserFunctions = {
    // Constant fields
    sf: function(val) { return Construct.ScalarFieldNodeTypes.Constant.makeField({value: val}); },
    vf: function(x, y) { return Construct.VectorFieldNodeTypes.Constant.makeField({x: x, y:y}); },
    mf: function(a, b, c, d) { return Construct.VectorFieldNodeTypes.Constant.makeField({m11: a, m12: b, m21: c, m22: d}); },

    // Vector identity, i.e. f(x) = x
    identity: function() { return Construct.VectorFieldNodeTypes.Identity.makeField(); },

    // Addition
    add: function(left, right) {
      if (left instanceof Construct.ScalarField) {
        return Construct.ScalarFieldNodeTypes.AddScalar.makeField({left: left.node, right: right.node});
      }
      else if (left instanceof Construct.VectorField) {
        return Construct.VectorFieldNodeTypes.AddVector.makeField({left: left.node, right: right.node});
      }
      else {
        return Construct.MatrixFieldNodeTypes.AddMatrix.makeField({left: left.node, right: right.node});
      }
    },

    // Subtraction
    sub: function(left, right) {
      if (left instanceof Construct.ScalarField) {
        return Construct.ScalarFieldNodeTypes.SubtractScalar.makeField({left: left.node, right: right.node});
      }
      else if (left instanceof Construct.VectorField) {
        return Construct.VectorFieldNodeTypes.SubtractVector.makeField({left: left.node, right: right.node});
      }
      else {
        return Construct.MatrixFieldNodeTypes.SubtractMatrix.makeField({left: left.node, right: right.node});
      }
    },

    // Multiplication by scalar
    mul: function(left, right) { return Construct.ScalarFieldNodeTypes.MultiplyScalar.makeField({left: left.node, right: right.node}); },

    // Division by scalar
    div: function(left, right) { return Construct.ScalarFieldNodeTypes.DivideScalar.makeField({left: left.node, right: right.node}); },

    // Square Root
    sqrt: function(child) { return Construct.ScalarFieldNodeTypes.SquareRoot.makeField({child: child.node}); },

    // Length of a vector ("Euclidean" Norm)
    length: function(child) { return Construct.ScalarFieldNodeTypes.TwoNorm.makeField({child: child.node}); },

    // Return a scalar field which is 1 where the input is positive valued, and 0 elsewhere
    mask: function(child) { return Construct.ScalarFieldNodeTypes.Mask.makeField({child: child.node}); },

    // Inner product of two vector fields
    dot: function(left, right) { return Construct.ScalarFieldNodeTypes.DotProduct.makeField({left: left.node, right: right.node}); },

    // Function composition
    // g(x) = field( displacement( x ) )
    warp: function(field, displacement) {
      if (field instanceof Construct.ScalarField) {
        return Construct.ScalarFieldNodeTypes.Warp.makeField({left: field.node, right: displacement.node});
      }
      else if (field instanceof Construct.VectorField) {
        return Construct.VectorFieldNodeTypes.Warp.makeField({left: left.node, displacement: right.node});
      }

    }
};
