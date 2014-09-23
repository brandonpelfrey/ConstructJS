/**
 * Created by brand_000 on 9/12/2014.
 */

Construct.WebGL = {};

Construct.WebGL.VertexShader = [
  'varying vec2 vUv;',
  'void main() {',
  '  vUv = uv;',
  '  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
  '}'
].join('\n');

Construct.WebGL._Scene = new THREE.Scene();
Construct.WebGL._Mesh = new THREE.Mesh( new THREE.PlaneGeometry( 2, 2 ) );
Construct.WebGL._Scene.add( Construct.WebGL._Mesh );
Construct.WebGL._Camera = new THREE.OrthographicCamera( -1, 1, 1, -1, -2, 2 );
Construct.WebGL._Camera.position.z = 1;

/*
Construct.WebGL.GridRenderingFragmentShader = [
  'varying vec2 vUv;',
  'uniform sampler2D tDiffuse;',
  'void main() {',
  '  gl_FragColor = texture2D( tDiffuse, vUv );',
  '}'
].join('\n');
*/

(function(ConstructRoot) {
    // Create a name for a node
    function node_namer(node) { return 'node_' + node.code_generation_numbering; }
    ConstructRoot.WebGL.node_namer = node_namer;

    // Templated function bodies for evaluating field nodes in GLSL.
    var NodeCodes = {
        ScalarFieldNodeTypes: {
            Constant:       'return float($value);',
            AddScalar:      'return #left(x) + #right(x);',
            SubtractScalar: 'return #left(x) - #right(x);',
            MultiplyScalar: 'return #left(x) * #right(x);',
            DivideScalar:   'return #left(x) / #right(x);',
            AbsoluteValue:  'return abs( #child(x) );',
            SquareRoot:     'return sqrt( #child(x) );',
            Cosine:         'return cos( #child(x) );',
            Sine:           'return sin( #child(x) );',
            Log:            'return log( #child(x) );',
            Exponential:    'return exp( #child(x) );',
            DotProduct:     'return dot( #left(x), #right(x) );',
            TwoNorm:        'return length( #child(x) );',
            Mask:           'return #child(x) > 0.0 ? 1.0 : 0.0;',
            Warp:           'return #left( #right( x ) );'
        },
        VectorFieldNodeTypes: {
            Constant:       'return vec2( float($x), float($y) );',
            AddVector:      'return #left(x) + #right(x);',
            SubtractVector: 'return #left(x) - #right(x);',
            MultiplyScalar: 'return #left(x) * #right(x);',
            DivideScalar:   'return #left(x) / #right(x);',
            CrossProduct:   'return cross( #left(x), #right(x) );',
            Warp:           'return #left( #right( x ) );',
            Identity:       'return x;'
        },
        MatrixFieldNodeTypes: {
            Constant:       'return mat2( float(m11), float(m21), float(m12), float(m22) );', //GLSL Column-major constructor.
            AddMatrix:      'return #left(x) + #right(x);',
            SubtractMatrix: 'return #left(x) - #right(x);',
            MultiplyMatrix: 'return #left(x) * #right(x);',
            MultiplyVector: 'return #left(x) * #right(x);',
            MultiplyScalar: 'return #left(x) * #right(x);',
            Inverse:        'const mat2 m = #child(x); float d = m[0][0]*m[1][1] - m[1][0]*m[0][1]; return d * mat2( m[1][1], -m[0][1], -m[1][0], m[0][0]);',
            Rotation:       'const float y = #child(x); const float c=cos(y), s=sin(y); return mat2(c,s,-s,c);',
            Exponential:    'mat2 X = #child(x), Y = mat2(1,0,0,1); float kf = 1; for(int k=1; k<10; ++k) { kf *= float(k); Y = Y * X / kf; } return Y;',
            Log:            'TODO'
        }
    };

    // Code for computing the gradient
    var NodeGradientCodes = {
      ScalarFieldNodeTypes: {
      },
      VectorFieldNodeTypes: {
      },
      MatrixFieldNodeTypes: {
        /* None. Gradients of matrix fields leads to 3rd-order tensors which aren't modeled in ConstructJS. */
      }
    };

    // Return types for synthesized WebGL functions
    var FieldNodeReturnTypes = {
        ScalarFieldNodeTypes: 'float',
        VectorFieldNodeTypes: 'vec2',
        MatrixFieldNodeTypes: 'mat2'
    }

    // Node Parameters -- \$[a-zA-z]*(\.[a-zA-z]*)*
    // TODO: Enable nested.parameter.values (recurse on match exploded on '.')
    function replace_node_property_patterns(str, node) {
        var matches = str.match( /\$[a-zA-z]*(\.[a-zA-z]*)*/g );
        var result = str;
        if (matches) {
            matches.forEach(function (match) {
                var property_name = match.substr(1);
                var property_value = node.properties[property_name];
                result = result.replace(match, property_value);
            });
        }
        return result;
    }

    // Child nodes -- #[a-zA-z]*
    function replace_node_child_patterns(str, node) {
        var matches = str.match( /#[a-zA-Z]*/g );
        var result = str;
        if (matches) {
            matches.forEach(function (match) {
                var child_name = match.substr(1);
                var child_function_name = node_namer(node.properties[child_name]);
                result = result.replace(match, child_function_name);
            });
        }
        return result;
    }

    // Go over each of the template codes and create code generating functions that accept a node and output webgl code
    for(var fieldNodeType in NodeCodes) {
        for(var fieldNodeName in NodeCodes[fieldNodeType]) {

            ConstructRoot[fieldNodeType][fieldNodeName].prototype.WebGLCodeGenerator = (function(_fieldNodeType, _fieldNodeName){
                return function() {

                    // TODO: Recognize when a child node would be calculated twice and reuse the value.
                    // e.g.: x + x -> node_37(x) + node_37(x) -> temp = node_37; temp + temp

                    // From a general template, fill in...
                    //  * the return type
                    //  * function name for this node
                    //  * the function body
                    //  * All of the properties and child node function names for this node
                    var result = '%return_type %func_name(const vec2 x) { %function_body }';

                    result = result.replace('%return_type', FieldNodeReturnTypes[_fieldNodeType]);
                    result = result.replace('%function_body', NodeCodes[_fieldNodeType][_fieldNodeName]);
                    result = result.replace('%func_name', node_namer(this));
                    result = replace_node_child_patterns(result, this);
                    result = replace_node_property_patterns(result, this);

                    return result;
                }
            })(fieldNodeType, fieldNodeName);
        }
    }

})(Construct);

Construct.WebGL.generateGLSL = function(root_node) {

    // Before generating code we need to prepare extra data in the nodes of the tree.
    Construct.CodeGeneratorUtilities.numberExpressionTree(root_node);

    // Get all of the uniforms [{type:'sampler2D', name:'tex_000'}, ...]
    var uniforms = [];
    Construct.CodeGeneratorUtilities.postOrderTraversal(root_node, function(_node){
        // TODO: Get uniforms from those nodes that expose them.
    });

    // Get code for all nodes in the tree
    var node_function_code = [];
    Construct.CodeGeneratorUtilities.postOrderTraversal(root_node, function(_node){
        node_function_code.push(_node.WebGLCodeGenerator());
    });

    // Generate code for outputting the root values
    var rendering_code = [];
    rendering_code.push('void main() {');
    rendering_code.push('  vec2 x = vUv * 2.0 - 1.0;');

    var root_node_function_name = Construct.WebGL.node_namer(root_node);
    if (root_node instanceof Construct.ScalarFieldNode) {
        rendering_code.push('  float root = ROOT_FUNC(x);'.replace('ROOT_FUNC', root_node_function_name) );
        rendering_code.push('  gl_FragColor = vec4(root,root,root,1);');
    }
    else if (root_node instanceof Construct.VectorFieldNode) {
        rendering_code.push('  vec2 root = ROOT_FUNC(x);'.replace('ROOT_FUNC', root_node_function_name) );
        rendering_code.push('  gl_FragColor = vec4(root, root)');
    }
    else if (root_node instanceof Construct.MatrixFieldNode) {
        rendering_code.push('  mat2 root = ROOT_FUNC(x);'.replace('ROOT_FUNC', root_node_function_name) );
        rendering_code.push('  gl_FragColor = vec4(root[0], root[1]);');
    }
    rendering_code.push('}');


    // Combine these sections into the final shader code
    var complete_glsl = [];
    uniforms.forEach(function(uniform) { complete_glsl.push('uniform ' + uniform.type + ' ' + uniform.name + ';'); });

    // THREE.js also automatically gives us the (0,0)-(1,1) UV coordinates of the pixel
    complete_glsl.push('varying vec2 vUv;');

    node_function_code.forEach(function(node_code) { complete_glsl.push(node_code); });
    rendering_code.forEach(function(rendering_code_line) { complete_glsl.push(rendering_code_line); });

    return {
        code: complete_glsl.join('\n'),
        uniforms: {}
    };
};

Construct.WebGL.render = function(field, parameters) {
    if (!parameters) { console.error("No parameters passed to WebGL Renderer for ConstructJS."); }

    // Generate GLSL for the field's root node
    var code_generation = Construct.WebGL.generateGLSL(field.node);

//    console.log("Generated GLSL code...");
//    console.log(code_generation.code);

    var shaderMaterial =
        new THREE.ShaderMaterial({
            vertexShader:   Construct.WebGL.VertexShader,
            fragmentShader: code_generation.code
        });

    Construct.WebGL._Mesh.material = shaderMaterial;

    var renderer = parameters.renderer;

    // If no render target provided, render to the screen
    if (parameters.renderTarget) {
        renderer.setRenderTarget(parameters.renderTarget);
        renderer.render( scene, cameraRTT, rtTexture, true );
    } else {
        var scene = Construct.WebGL._Scene;
        var camera = Construct.WebGL._Camera;

        renderer.setRenderTarget( null );
        renderer.clear();
        renderer.render( scene, camera );
    }
};






