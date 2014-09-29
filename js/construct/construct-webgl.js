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

(function() {
    // Create a name for a node
    function node_namer(node) { return 'node_' + node.code_generation_numbering; }
    Construct.WebGL.node_namer = node_namer;

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
            Warp:           'return #left( #right( x ) );',
            Grid:           ['vec2 y = (x - vec2($gridMin.x, $gridMin.y)) / vec2($gridMax.x - $gridMin.x, $gridMax.y - $gridMin.y);',
                             'return texture2D( $uniformName, y ).r;'].join('\n')
        },
        VectorFieldNodeTypes: {
            Constant:       'return vec2( float($x), float($y) );',
            AddVector:      'return #left(x) + #right(x);',
            SubtractVector: 'return #left(x) - #right(x);',
            MultiplyScalar: 'return #left(x) * #right(x);',
            DivideScalar:   'return #left(x) / #right(x);',
            CrossProduct:   'return cross( #left(x), #right(x) );',
            Warp:           'return #left( #right( x ) );',
            Identity:       'return x;',
            Grid:           ['vec2 y = (x - vec2($gridMin.x, $gridMin.y)) / vec2($gridMax.x - $gridMin.x, $gridMax.y - $gridMin.y);',
                             'return texture2D( $uniformName, y ).rg;'].join('\n')
        },
        MatrixFieldNodeTypes: {
            Constant:       'return mat2( float($m11), float($m12), float($m21), float($m22) );',
            FromScalars:    'return mat2( #child1(x), #child2(x), #child3(x), #child4(x) );',
            AddMatrix:      'return #left(x) + #right(x);',
            SubtractMatrix: 'return #left(x) - #right(x);',
            MultiplyMatrix: 'return #left(x) * #right(x);',
            MultiplyVector: 'return #left(x) * #right(x);',
            MultiplyScalar: 'return #left(x) * #right(x);',
            Inverse:        'mat2 m = #child(x); float d = m[0][0]*m[1][1] - m[1][0]*m[0][1]; return d * mat2( m[1][1], -m[0][1], -m[1][0], m[0][0]);',
            Rotation:       'float y = #child(x); float c=cos(y), s=sin(y); return mat2(c,s,-s,c);',

            // Taylor series expansion for matrix exponential.. Could be made faster O(log(iter)) if we use more memory.
            Exponential:    'mat2 X = #child(x), Y = mat2(1,0,0,1); float kf = 1; for(int k=1; k<10; ++k) { kf *= float(k); Y = Y * X / kf; } return Y;',
            Log:            'TODO',
            Grid:           ['vec2 y = (x - vec2($gridMin.x, $gridMin.y)) / vec2($gridMax.x - $gridMin.x, $gridMax.y - $gridMin.y);',
                             'return mat2(texture2D( $uniformName, y ).rgba);'].join('\n')
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
    
    // Data around uniforms needed for nodes.
    // propertyName : The name of a node property (node.properties[propertyName]) which is the actual name to
    // be bound for that uniform
    // type: Type information for the uniform (Texture == 't')
    var NodeUniforms = {
      ScalarFieldNodeTypes: {
        Grid: { propertyName: 'textureUniformName', propertyValue: 'texture', type: 't'}
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
    };

    // Node Parameters -- \$[a-zA-z]*(\.[a-zA-z]*)*
    // Note, this also enables accessing parameters nested in objects $parameter.field.moreDeeplyNested
    function replace_node_property_patterns(str, node) {
        var matches = str.match( /\$[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-z0-9]*)*/g );
        var result = str;
        if (matches) {
            matches.forEach(function (match) {
                // Slice off the dollar sign
                var property_name = match.substr(1);

                // Walk through each of the parameters until we reach the end
                var property = node.properties;
                property_name.split('.').forEach( function(subPropertyName){
                    property = property[subPropertyName];
                });

                result = result.replace(match, property);
            });
        }
        return result;
    }

    // Child nodes -- #[a-zA-z]*
    function replace_node_child_patterns(str, node) {
        var matches = str.match( /#[a-zA-Z][a-zA-Z0-9]*/g );
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

            Construct[fieldNodeType][fieldNodeName].prototype.WebGLCodeGenerator = (function(_fieldNodeType, _fieldNodeName){
                return function() {

                    // TODO: Recognize when a child node would be calculated twice and reuse the value.
                    // e.g.: x + x -> node_37(x) + node_37(x) -> temp = node_37; temp + temp

                    // From a general template, fill in...
                    var result = '%return_type %func_name(const vec2 x) { %function_body }';

                    //  * the return type
                    result = result.replace('%return_type', FieldNodeReturnTypes[_fieldNodeType]);

                    //  * the function body
                    result = result.replace('%function_body', NodeCodes[_fieldNodeType][_fieldNodeName]);

                    //  * function name for this node
                    result = result.replace('%func_name', node_namer(this));

                    //  * All of the properties and child node function names for this node
                    result = replace_node_property_patterns(result, this);
                    result = replace_node_child_patterns(result, this);

                    return result;
                }
            })(fieldNodeType, fieldNodeName);
        }
    }

    // Without explicitly requiring users to 'tell' us when a texture is released, we have no
    // way to tell when something holding a texture goes out of scope. This is important because
    // otherwise we currently forced to naively create textures very frequently (perhaps several
    // times a frame). Because allocating these resources is very expensive, until a better
    // solution is found, this factory keeps a 'large' ring of textures and pre-allocates those
    // textures. The ring is assumed large enough so that it can store the maximum number of targets
    // that will simultaneous exist during the execution of a user's code at any given point.
    //
    // This is a big TODO: Find a way to not have a static allocation of textures cycling.
    //
    // Let me say that again: This is _terrible_. With that said, I don't know another way to do this
    // without compromising on the dev experience.
    //
    Construct.WebGL.RenderTargetFactory = (function() {
        var _texturePointer = {};
        var _maxTextures = 20;
        var _textures = {};
        
        var getKey = function(width, height) {
            return width + 'x' + height;  
        };

        var initializeTargetsForResolution = function(width, height) {
            var resultingTextures = [];

            for(var i = 0; i < _maxTextures; ++i) {
                resultingTextures.push( new THREE.WebGLRenderTarget(
                    width, height,
                    {
                        minFilter: THREE.LinearFilter,
                        magFilter: THREE.LinearFilter,
                        stencilBuffer:false,
                        depthBuffer:false,
                        format: THREE.RGBAFormat,
                        type: THREE.FloatType
                    })
                );
            }

            return resultingTextures;
        };

        var texturesForResolution = function(width, height) {
            var key = getKey(width, height);
            if ( !_textures.hasOwnProperty(key) ) {
              _textures[key] = initializeTargetsForResolution(width, height);
            }
            return _textures[key];
        };

        return {
            get: function(width, height) {
                var textures = texturesForResolution(width, height);
                
                var key = getKey(width, height);
                
                if (!_texturePointer.hasOwnProperty(key)) {
                    _texturePointer[key] = 0;
                }
                
                var currentTarget = textures[_texturePointer[key]];
                _texturePointer[key] = (1 + _texturePointer[key]) % _maxTextures;
                return currentTarget;
            }
        };
    })();

})();

Construct.WebGL.generateGLSL = function(root_node) {

    // Before generating code we need to prepare extra data in the nodes of the tree.
    Construct.CodeGeneratorUtilities.numberExpressionTree(root_node);

    // Get all of the uniforms [{type:'sampler2D', name:'tex_000'}, ...]
    var uniforms = {};
    Construct.CodeGeneratorUtilities.postOrderTraversal(root_node, function(_node) {
        if( _node.properties && _node.properties.uniformData ) {
            var newUniform = {};

            // Determine the GLSL uniform type
            if ( _node.properties.uniformData.type == 't' ) { newUniform.glslType = 'sampler2D'; }
            if ( _node.properties.uniformData.type == 'f' ) { newUniform.glslType = 'float'; }

            // The actual name of the GLSL uniform
            newUniform.name = 'uniform_' + _node.code_generation_numbering;
            
            // Data used in actually binding the uniform to the context
            newUniform.type = _node.properties.uniformData.type;
            newUniform.value = _node.properties.uniformData.value;

            _node.properties['uniformName'] = newUniform.name;
            
            uniforms[newUniform.name] = newUniform;
        }
    });

    // Get code for all nodes in the tree
    var node_function_code = [];
  
    // Note: It's possible a single node appears multiple times in the expression tree. In order to 
    // avoid emitting that code twice, keep track of what's already been generated.
    var already_generated_nodes = {};
  
    Construct.CodeGeneratorUtilities.postOrderTraversal(root_node, function(_node) {
        if ( already_generated_nodes.hasOwnProperty(_node.code_generation_numbering) ) { return; }
        
        node_function_code.push(_node.WebGLCodeGenerator());
        already_generated_nodes[_node.code_generation_numbering] = true;
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
        rendering_code.push('  gl_FragColor = vec4(root, 0, 1);');
    }
    else if (root_node instanceof Construct.MatrixFieldNode) {
        rendering_code.push('  mat2 root = ROOT_FUNC(x);'.replace('ROOT_FUNC', root_node_function_name) );
        rendering_code.push('  gl_FragColor = vec4(root[0], root[1]);');
    }
    rendering_code.push('}');

    // Combine these sections into the final shader code
    var complete_glsl = [];
    (function(){
        for(var uniformName in uniforms) {
           complete_glsl.push('uniform ' + uniforms[uniformName].glslType + ' ' + uniformName + ';');
        }
    })();

    // THREE.js also automatically gives us the (0,0)-(1,1) UV coordinates of the pixel
    complete_glsl.push('varying vec2 vUv;');

    node_function_code.forEach(function(node_code) { complete_glsl.push(node_code); });
    rendering_code.forEach(function(rendering_code_line) { complete_glsl.push(rendering_code_line); });

    return {
        code: complete_glsl.join('\n'),
        uniforms: uniforms
    };
};

Construct.WebGL.render = function(field, parameters) {
    if (!parameters) { console.error("No parameters passed to WebGL Renderer for ConstructJS."); }

    // Generate GLSL for the field's root node
    var code_generation = Construct.WebGL.generateGLSL(field.node);

    var shaderMaterial =
        new THREE.ShaderMaterial({
            vertexShader:   Construct.WebGL.VertexShader,
            fragmentShader: code_generation.code,
            uniforms: code_generation.uniforms
        });

    Construct.WebGL._Mesh.material = shaderMaterial;

    var renderer = parameters.renderer;
    var scene = Construct.WebGL._Scene;
    var camera = Construct.WebGL._Camera;
    
    // If no render target provided, render to the screen
    if (parameters.renderTarget) {
        renderer.setRenderTarget(parameters.renderTarget);
        renderer.clear();
        renderer.render( scene, camera, parameters.renderTarget, true );
    } else {
        renderer.setRenderTarget( null );
        renderer.clear();
        renderer.render( scene, camera );
    }
};

