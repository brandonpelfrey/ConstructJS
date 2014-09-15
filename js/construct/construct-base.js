/**
 * Created by Brandon Pelfrey on 9/12/2014.
 */

Construct = {};

// The three basic field types. These fields are internally represented by an expression which is the root
// of an abstract expression tree
Construct.ScalarField = function(node) {
    this.node = node;
};
Construct.VectorField = function(node) {
    this.node = node;
};
Construct.MatrixField = function(node) {
    this.node = node;
};

// The field node types corresponding to each of the basic field types
Construct.ScalarFieldNode = function(properties) { this.properties = properties; }
Construct.ScalarFieldNode.ContainingFieldType = Construct.ScalarField;

Construct.VectorFieldNode = function(properties) { this.properties = properties; }
Construct.VectorFieldNode.ContainingFieldType = Construct.VectorField;

Construct.MatrixFieldNode = function(properties) { this.properties = properties; }
Construct.MatrixFieldNode.ContainingFieldType = Construct.MatrixField;

// - Helper function for creating field node types -
// Programatically creates a new type inheriting from a given type. The constructor of the new generated type
// accepts a generic object.
function _create_field_node_type(field_node_type, child_node_types) {
    var generated_type = function(properties) { field_node_type.call(this, properties); };
    generated_type.prototype = Object.create(field_node_type.prototype);
    generated_type.prototype.constructor = generated_type;
    generated_type.prototype.child_node_types = child_node_types;

    // Set the child_names based on the number of children of the node
    if (child_node_types.length === 0)      { generated_type.prototype.children_names = []; }
    else if (child_node_types.length === 1) { generated_type.prototype.children_names = ['child']; }
    else if (child_node_types.length === 2) { generated_type.prototype.children_names = ['left', 'right']; }

    generated_type.makeField = function(params) {
        return new field_node_type.ContainingFieldType(new generated_type(params));
    }
    return generated_type;
}

Construct.OperatorTypes = {};

// Field Nodes types are generated here and are determined by their enclosing field type, as well as the arguments they take (if any)
// e.g. DotProduct results in a ScalarFieldNode and is a binary operation so it will take in two nodes, in this case both vector VectorFieldNodes

// Scalar Field Node Types
Construct.ScalarFieldNodeTypes = {};

Construct.ScalarFieldNodeTypes.Constant = _create_field_node_type(Construct.ScalarFieldNode, []);
Construct.ScalarFieldNodeTypes.AddScalar = _create_field_node_type(Construct.ScalarFieldNode, [Construct.ScalarFieldNode, Construct.ScalarFieldNode]);
Construct.ScalarFieldNodeTypes.SubtractScalar = _create_field_node_type(Construct.ScalarFieldNode, [Construct.ScalarFieldNode, Construct.ScalarFieldNode]);
Construct.ScalarFieldNodeTypes.MultiplyScalar = _create_field_node_type(Construct.ScalarFieldNode, [Construct.ScalarFieldNode, Construct.ScalarFieldNode]);
Construct.ScalarFieldNodeTypes.DivideScalar = _create_field_node_type(Construct.ScalarFieldNode, [Construct.ScalarFieldNode, Construct.ScalarFieldNode]);
Construct.ScalarFieldNodeTypes.AbsoluteValue = _create_field_node_type(Construct.ScalarFieldNode, [Construct.ScalarFieldNode]);
Construct.ScalarFieldNodeTypes.SquareRoot = _create_field_node_type(Construct.ScalarFieldNode, [Construct.ScalarFieldNode]);
Construct.ScalarFieldNodeTypes.Cosine = _create_field_node_type(Construct.ScalarFieldNode, [Construct.ScalarFieldNode]);
Construct.ScalarFieldNodeTypes.Sine = _create_field_node_type(Construct.ScalarFieldNode, [Construct.ScalarFieldNode]);
Construct.ScalarFieldNodeTypes.Log = _create_field_node_type(Construct.ScalarFieldNode, [Construct.ScalarFieldNode]);
Construct.ScalarFieldNodeTypes.Exponential = _create_field_node_type(Construct.ScalarFieldNode, [Construct.ScalarFieldNode]);
Construct.ScalarFieldNodeTypes.DotProduct = _create_field_node_type(Construct.ScalarFieldNode, [Construct.VectorFieldNode, Construct.VectorFieldNode]);

// Vector Field Node Types
Construct.VectorFieldNodeTypes = {};

Construct.VectorFieldNodeTypes.Constant = _create_field_node_type(Construct.VectorFieldNode, []);
Construct.VectorFieldNodeTypes.AddVector = _create_field_node_type(Construct.VectorFieldNode, [Construct.VectorFieldNode, Construct.VectorFieldNode]);
Construct.VectorFieldNodeTypes.SubtractVector = _create_field_node_type(Construct.VectorFieldNode, [Construct.VectorFieldNode, Construct.VectorFieldNode]);
Construct.VectorFieldNodeTypes.MultiplyScalar = _create_field_node_type(Construct.VectorFieldNode, [Construct.VectorFieldNode, Construct.ScalarFieldNode]);
Construct.VectorFieldNodeTypes.DivideScalar = _create_field_node_type(Construct.VectorFieldNode, [Construct.VectorFieldNode, Construct.ScalarFieldNode]);
Construct.VectorFieldNodeTypes.TwoNorm = _create_field_node_type(Construct.VectorFieldNode, [Construct.VectorFieldNode]);
Construct.VectorFieldNodeTypes.CrossProduct = _create_field_node_type(Construct.VectorFieldNode, [Construct.VectorFieldNode, Construct.VectorFieldNode]);
Construct.VectorFieldNodeTypes.Identity = _create_field_node_type(Construct.VectorFieldNode, []);

// Matrix Field Node Types
Construct.MatrixFieldNodeTypes = {};

Construct.MatrixFieldNodeTypes.Constant = _create_field_node_type(Construct.MatrixFieldNode, []);
Construct.MatrixFieldNodeTypes.AddMatrix = _create_field_node_type(Construct.MatrixFieldNode, [Construct.MatrixFieldNode, Construct.MatrixFieldNode]);
Construct.MatrixFieldNodeTypes.SubtractMatrix = _create_field_node_type(Construct.MatrixFieldNode, [Construct.MatrixFieldNode, Construct.MatrixFieldNode]);
Construct.MatrixFieldNodeTypes.MultiplyMatrix = _create_field_node_type(Construct.MatrixFieldNode, [Construct.MatrixFieldNode, Construct.MatrixFieldNode]);
Construct.MatrixFieldNodeTypes.MultiplyVector = _create_field_node_type(Construct.MatrixFieldNode, [Construct.MatrixFieldNode, Construct.VectorFieldNode]);
Construct.MatrixFieldNodeTypes.MultiplyScalar = _create_field_node_type(Construct.MatrixFieldNode, [Construct.MatrixFieldNode, Construct.ScalarFieldNode]);
Construct.MatrixFieldNodeTypes.Inverse = _create_field_node_type(Construct.MatrixFieldNode, [Construct.MatrixFieldNode]);
Construct.MatrixFieldNodeTypes.Rotation = _create_field_node_type(Construct.MatrixFieldNode, [Construct.ScalarFieldNode]);
Construct.MatrixFieldNodeTypes.Exponential = _create_field_node_type(Construct.MatrixFieldNode, [Construct.MatrixFieldNode]);
Construct.MatrixFieldNodeTypes.Log = _create_field_node_type(Construct.MatrixFieldNode, [Construct.MatrixFieldNode]);

// Context for simulations
Construct.Context = function() {

}

Construct.Context.compile = function(user_code, parameters) {
    // Get current code generator for this context
}

// Placeholder for code generators
Construct.CodeGenerators = {};

Construct.CodeGeneratorUtilities = {};

// Post-order traversal of an expression tree, calling the passed in function with each node
Construct.CodeGeneratorUtilities.postOrderTraversal = function(root_node, visiting_function) {
    var node_visitor = function(_node) {
        _node.children_names.forEach(function(child_name) {
            node_visitor(_node.properties[child_name]);
        });
        visiting_function(_node);
    };
    node_visitor(root_node);
}

// Post-order traversal of an expression tree, numbering nodes. This gives us a topological sorting/ordering of the nodes
// in the tree, so evaluating the nodes in this order will be all dependent nodes have already had values computed.
Construct.CodeGeneratorUtilities.numberExpressionTree = function(root_node) {
    // Number all nodes
    var current_number = 0;

    Construct.CodeGeneratorUtilities.postOrderTraversal(root_node, function(_node){
        // If it hasn't been numbered already, number this node
        if (!('code_generation_numbering' in _node)) {
            _node.code_generation_numbering = current_number++;
        }
    });
}

Construct.CodeGeneratorUtilities.MapSubstitute = function(template, substitutions) {
    var result = template;
    for(var sub_key in substitutions) {
        result = template.replace(sub_key, substitutions[sub_key]);
    }
    return result;
}




















































