/**
 * Created by brand_000 on 9/14/2014.
 */

Construct.UserFunctions = {
    sf: function(val) { return Construct.ScalarFieldNodeTypes.Constant.makeField({value: val}); },
    vf: function(x, y) { return Construct.VectorFieldNodeTypes.Constant.makeField({x: x, y:y}); },
    mf: function(a, b, c, d) { return Construct.VectorFieldNodeTypes.Constant.makeField({m11: a, m12: b, m21: c, m22: d}); },

    add: function(left, right) { return Construct.ScalarFieldNodeTypes.AddScalar.makeField({left: left.node, right: right.node}); },
    subtract: function(left, right) { return Construct.ScalarFieldNodeTypes.SubtractScalar.makeField({left: left.node, right: right.node}); },
    multiply: function(left, right) { return Construct.ScalarFieldNodeTypes.MultiplyScalar.makeField({left: left.node, right: right.node}); },
    divide: function(left, right) { return Construct.ScalarFieldNodeTypes.DivideScalar.makeField({left: left.node, right: right.node}); },
    sqrt: function(child) { return Construct.ScalarFieldNodeTypes.SquareRoot.makeField({child: child.node}); },
    dot: function(left, right) { return Construct.ScalarFieldNodeTypes.DotProduct.makeField({left: left.node, right: right.node}); }
};