//=============================================================================
//=============================================================================
function VBObox0() {
  //=============================================================================
  //=============================================================================
  // CONSTRUCTOR for one re-usable 'VBObox0' object that holds all data and fcns
  // needed to render vertices from one Vertex Buffer Object (VBO) using one 
  // separate shader program (a vertex-shader & fragment-shader pair) and one
  // set of 'uniform' variables.
  
  // Constructor goal: 
  // Create and set member vars that will ELIMINATE ALL LITERALS (numerical values 
  // written into code) in all other VBObox functions. Keeping all these (initial)
  // values here, in this one coonstrutor function, ensures we can change them 
  // easily WITHOUT disrupting any other code, ever!
    
    this.VERT_SRC =	//--------------------- VERTEX SHADER source code 
    'precision highp float;\n' +				// req'd in OpenGL ES if we use 'float'
    //
    'uniform mat4 u_ModelMat0;\n' +
    'attribute vec4 a_Pos0;\n' +
    'attribute vec3 a_Colr0;\n'+
    'varying vec3 v_Colr0;\n' +
    //
    'void main() {\n' +
    '  gl_Position = u_ModelMat0 * a_Pos0;\n' +
    '	 v_Colr0 = a_Colr0;\n' +
    ' }\n';
  
    this.FRAG_SRC = //---------------------- FRAGMENT SHADER source code 
    'precision mediump float;\n' +
    'varying vec3 v_Colr0;\n' +
    'void main() {\n' +
    '  gl_FragColor = vec4(v_Colr0, 1.0);\n' + 
    '}\n';
  
  
    origVerts =
    new Float32Array ([						// Array of vertex attribute values we will
                                  // transfer to GPU's vertex buffer object (VBO)
    // 1st triangle:
       0.0,	 0.0,	0.0, 1.0,		1.0, 1.0, 1.0, //1 vertex:pos x,y,z,w; color: r,g,b  X AXIS
       10.0,  0.0, 0.0, 1.0,		1.0, 0.0, 0.0,
       
       0.0,	 0.0,	0.0, 1.0,		1.0, 1.0, 1.0, // Y AXIS
       0.0,  10.0, 0.0, 1.0,		0.0, 1.0, 0.0,
       
       0.0,	 0.0,	0.0, 1.0,		1.0, 1.0, 1.0, // Z AXIS
       0.0,  0.0, 10.0, 1.0,		0.0, 0.2, 1.0,
       
       // 2 long lines of the ground grid:
       -100.0,   0.2,	0.0, 1.0,		1.0, 0.2, 0.0, // horiz line
        100.0,   0.2, 0.0, 1.0,		0.0, 0.2, 1.0,
        0.2,	-100.0,	0.0, 1.0,		0.0, 1.0, 0.0, // vert line
        0.2,   100.0, 0.0, 1.0,		1.0, 0.0, 1.0,
       ]);
  
    makeGroundGrid();	
  
    var mySize = (origVerts.length + gndVerts.length);
    var nn = mySize / 7;
  
    this.vboContents = new Float32Array(mySize);
    origVertsStart = 0;
    for(i = 0, j=0; j< origVerts.length; i++, j++) {
      this.vboContents[i] = origVerts[j];
      }
    gndStart = i;
    for(j=0; j< gndVerts.length; i++, j++) {
      this.vboContents[i] = gndVerts[j];
      }
  
    this.vboVerts = nn;						// # of vertices held in 'vboContents' array
    this.FSIZE = this.vboContents.BYTES_PER_ELEMENT;
                                  // bytes req'd by 1 vboContents array element;
                                  // (why? used to compute stride and offset 
                                  // in bytes for vertexAttribPointer() calls)
    this.vboBytes = this.vboContents.length * this.FSIZE;               
                                  // total number of bytes stored in vboContents
                                  // (#  of floats in vboContents array) * 
                                  // (# of bytes/float).
    this.vboStride = this.vboBytes / this.vboVerts; 
                                  // (== # of bytes to store one complete vertex).
                                  // From any attrib in a given vertex in the VBO, 
                                  // move forward by 'vboStride' bytes to arrive 
                                  // at the same attrib for the next vertex. 
  
                //----------------------Attribute sizes
    this.vboFcount_a_Pos0 =  4;    // # of floats in the VBO needed to store the
                                  // attribute named a_Pos0. (4: x,y,z,w values)
    this.vboFcount_a_Colr0 = 3;   // # of floats for this attrib (r,g,b values) 
    console.assert((this.vboFcount_a_Pos0 +     // check the size of each and
                    this.vboFcount_a_Colr0) *   // every attribute in our VBO
                    this.FSIZE == this.vboStride, // for agreeement with'stride'
                    "Uh oh! VBObox0.vboStride disagrees with attribute-size values!");
  
                //----------------------Attribute offsets  
    this.vboOffset_a_Pos0 = 0;    // # of bytes from START of vbo to the START
                                  // of 1st a_Pos0 attrib value in vboContents[]
    this.vboOffset_a_Colr0 = this.vboFcount_a_Pos0 * this.FSIZE;    
                                  // (4 floats * bytes/float) 
                                  // # of bytes from START of vbo to the START
                                  // of 1st a_Colr0 attrib value in vboContents[]
                //-----------------------GPU memory locations:
    this.vboLoc;									// GPU Location for Vertex Buffer Object, 
                                  // returned by gl.createBuffer() function call
    this.shaderLoc;								// GPU Location for compiled Shader-program  
                                  // set by compile/link of VERT_SRC and FRAG_SRC.
                            //------Attribute locations in our shaders:
    this.a_PosLoc;								// GPU location for 'a_Pos0' attribute
    this.a_ColrLoc;								// GPU location for 'a_Colr0' attribute
  
                //---------------------- Uniform locations &values in our shaders
    this.ModelMat = new Matrix4();	// Transforms CVV axes to model axes.
    this.u_ModelMatLoc;							// GPU location for u_ModelMat uniform
  }
  
  VBObox0.prototype.init = function() {
  //=============================================================================
  // Prepare the GPU to use all vertices, GLSL shaders, attributes, & uniforms 
  // kept in this VBObox. (This function usually called only once, within main()).
  // Specifically:
  // a) Create, compile, link our GLSL vertex- and fragment-shaders to form an 
  //  executable 'program' stored and ready to use inside the GPU.  
  // b) create a new VBO object in GPU memory and fill it by transferring in all
  //  the vertex data held in our Float32array member 'VBOcontents'. 
  // c) Find & save the GPU location of all our shaders' attribute-variables and 
  //  uniform-variables (needed by switchToMe(), adjust(), draw(), reload(), etc.)
  // -------------------
  // CAREFUL!  before you can draw pictures using this VBObox contents, 
  //  you must call this VBObox object's switchToMe() function too!
  //--------------------
  // a) Compile,link,upload shaders-----------------------------------------------
    this.shaderLoc = createProgram(gl, this.VERT_SRC, this.FRAG_SRC);
    if (!this.shaderLoc) {
      console.log(this.constructor.name + 
                  '.init() failed to create executable Shaders on the GPU. Bye!');
      return;
    }
  // CUTE TRICK: let's print the NAME of this VBObox object: tells us which one!
  //  else{console.log('You called: '+ this.constructor.name + '.init() fcn!');}
  
    gl.program = this.shaderLoc;		// (to match cuon-utils.js -- initShaders())
  
  // b) Create VBO on GPU, fill it------------------------------------------------
    this.vboLoc = gl.createBuffer();	
    if (!this.vboLoc) {
      console.log(this.constructor.name + 
                  '.init() failed to create VBO in GPU. Bye!'); 
      return;
    }
    // Specify the purpose of our newly-created VBO on the GPU.  Your choices are:
    //	== "gl.ARRAY_BUFFER" : the VBO holds vertices, each made of attributes 
    // (positions, colors, normals, etc), or 
    //	== "gl.ELEMENT_ARRAY_BUFFER" : the VBO holds indices only; integer values 
    // that each select one vertex from a vertex array stored in another VBO.
    gl.bindBuffer(gl.ARRAY_BUFFER,	      // GLenum 'target' for this GPU buffer 
                    this.vboLoc);				  // the ID# the GPU uses for this buffer.
  
    // Fill the GPU's newly-created VBO object with the vertex data we stored in
    //  our 'vboContents' member (JavaScript Float32Array object).
    //  (Recall gl.bufferData() will evoke GPU's memory allocation & management: 
    //    use gl.bufferSubData() to modify VBO contents without changing VBO size)
    gl.bufferData(gl.ARRAY_BUFFER, 			  // GLenum target(same as 'bindBuffer()')
                      this.vboContents, 		// JavaScript Float32Array
                     gl.STATIC_DRAW);			// Usage hint.
    //	The 'hint' helps GPU allocate its shared memory for best speed & efficiency
    //	(see OpenGL ES specification for more info).  Your choices are:
    //		--STATIC_DRAW is for vertex buffers rendered many times, but whose 
    //				contents rarely or never change.
    //		--DYNAMIC_DRAW is for vertex buffers rendered many times, but whose 
    //				contents may change often as our program runs.
    //		--STREAM_DRAW is for vertex buffers that are rendered a small number of 
    // 			times and then discarded; for rapidly supplied & consumed VBOs.
  
    // c1) Find All Attributes:---------------------------------------------------
    //  Find & save the GPU location of all our shaders' attribute-variables and 
    //  uniform-variables (for switchToMe(), adjust(), draw(), reload(),etc.)
    this.a_PosLoc = gl.getAttribLocation(this.shaderLoc, 'a_Pos0');
    if(this.a_PosLoc < 0) {
      console.log(this.constructor.name + 
                  '.init() Failed to get GPU location of attribute a_Pos0');
      return -1;	// error exit.
    }
     this.a_ColrLoc = gl.getAttribLocation(this.shaderLoc, 'a_Colr0');
    if(this.a_ColrLoc < 0) {
      console.log(this.constructor.name + 
                  '.init() failed to get the GPU location of attribute a_Colr0');
      return -1;	// error exit.
    }
    
    // c2) Find All Uniforms:-----------------------------------------------------
    //Get GPU storage location for each uniform var used in our shader programs: 
    this.u_ModelMatLoc = gl.getUniformLocation(this.shaderLoc, 'u_ModelMat0');
    if (!this.u_ModelMatLoc) { 
      console.log(this.constructor.name + 
                  '.init() failed to get GPU location for u_ModelMat1 uniform');
      return;
    }  
  }
  
  VBObox0.prototype.switchToMe = function() {
  //==============================================================================
  // Set GPU to use this VBObox's contents (VBO, shader, attributes, uniforms...)
  //
  // We only do this AFTER we called the init() function, which does the one-time-
  // only setup tasks to put our VBObox contents into GPU memory.  !SURPRISE!
  // even then, you are STILL not ready to draw our VBObox's contents onscreen!
  // We must also first complete these steps:
  //  a) tell the GPU to use our VBObox's shader program (already in GPU memory),
  //  b) tell the GPU to use our VBObox's VBO  (already in GPU memory),
  //  c) tell the GPU to connect the shader program's attributes to that VBO.
  
  // a) select our shader program:
    gl.useProgram(this.shaderLoc);	
  //		Each call to useProgram() selects a shader program from the GPU memory,
  // but that's all -- it does nothing else!  Any previously used shader program's 
  // connections to attributes and uniforms are now invalid, and thus we must now
  // establish new connections between our shader program's attributes and the VBO
  // we wish to use.  
    
  // b) call bindBuffer to disconnect the GPU from its currently-bound VBO and
  //  instead connect to our own already-created-&-filled VBO.  This new VBO can 
  //    supply values to use as attributes in our newly-selected shader program:
    gl.bindBuffer(gl.ARRAY_BUFFER,	        // GLenum 'target' for this GPU buffer 
                      this.vboLoc);			    // the ID# the GPU uses for our VBO.
  
  // c) connect our newly-bound VBO to supply attribute variable values for each
  // vertex to our SIMD shader program, using 'vertexAttribPointer()' function.
  // this sets up data paths from VBO to our shader units:
    // 	Here's how to use the almost-identical OpenGL version of this function:
    //		http://www.opengl.org/sdk/docs/man/xhtml/glVertexAttribPointer.xml )
    gl.vertexAttribPointer(
      this.a_PosLoc,//index == ID# for the attribute var in your GLSL shader pgm;
      this.vboFcount_a_Pos0,// # of floats used by this attribute: 1,2,3 or 4?
      gl.FLOAT,			// type == what data type did we use for those numbers?
      false,				// isNormalized == are these fixed-point values that we need
                    //									normalize before use? true or false
      this.vboStride,// Stride == #bytes we must skip in the VBO to move from the
                    // stored attrib for this vertex to the same stored attrib
                    //  for the next vertex in our VBO.  This is usually the 
                    // number of bytes used to store one complete vertex.  If set 
                    // to zero, the GPU gets attribute values sequentially from 
                    // VBO, starting at 'Offset'.	
                    // (Our vertex size in bytes: 4 floats for pos + 3 for color)
      this.vboOffset_a_Pos0);						
                    // Offset == how many bytes from START of buffer to the first
                    // value we will actually use?  (We start with position).
    gl.vertexAttribPointer(this.a_ColrLoc, this.vboFcount_a_Colr0, 
                          gl.FLOAT, false, 
                          this.vboStride, this.vboOffset_a_Colr0);
                  
  // --Enable this assignment of each of these attributes to its' VBO source:
    gl.enableVertexAttribArray(this.a_PosLoc);
    gl.enableVertexAttribArray(this.a_ColrLoc);
  }
  
  VBObox0.prototype.isReady = function() {
  //==============================================================================
  // Returns 'true' if our WebGL rendering context ('gl') is ready to render using
  // this objects VBO and shader program; else return false.
  // see: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter
  
  var isOK = true;
  
    if(gl.getParameter(gl.CURRENT_PROGRAM) != this.shaderLoc)  {
      console.log(this.constructor.name + 
                  '.isReady() false: shader program at this.shaderLoc not in use!');
      isOK = false;
    }
    if(gl.getParameter(gl.ARRAY_BUFFER_BINDING) != this.vboLoc) {
        console.log(this.constructor.name + 
                '.isReady() false: vbo at this.vboLoc not in use!');
      isOK = false;
    }
    return isOK;
  }
  
  VBObox0.prototype.adjust = function() {
  //==============================================================================
  // Update the GPU to newer, current values we now store for 'uniform' vars on 
  // the GPU; and (if needed) update each attribute's stride and offset in VBO.
  
    // check: was WebGL context set to use our VBO & shader program?
    if(this.isReady()==false) {
          console.log('ERROR! before' + this.constructor.name + 
                '.adjust() call you needed to call this.switchToMe()!!');
    }  
    // Adjust values for our uniforms,
    gl.viewport(0,  														// Viewport lower-left corner
    0,															// (x,y) location(in pixels)
    g_canvasID.width, 				// viewport width, height.
    g_canvasID.height* 2);
  
      this.ModelMat.setIdentity();
  // THIS DOESN'T WORK!!  this.ModelMatrix = g_worldMat;
    this.ModelMat.set(g_worldMat);	// use our global, shared camera.
  // READY to draw in 'world' coord axes.
    
  //  this.ModelMat.rotate(g_angleNow0, 0, 0, 1);	  // rotate drawing axes,
  //  this.ModelMat.translate(0.35, 0, 0);							// then translate them.
    //  Transfer new uniforms' values to the GPU:-------------
    // Send  new 'ModelMat' values to the GPU's 'u_ModelMat1' uniform: 
    gl.uniformMatrix4fv(this.u_ModelMatLoc,	// GPU location of the uniform
                        false, 				// use matrix transpose instead?
                        this.ModelMat.elements);	// send data from Javascript.
    // Adjust the attributes' stride and offset (if necessary)
    // (use gl.vertexAttribPointer() calls and gl.enableVertexAttribArray() calls)
  }
  
  VBObox0.prototype.draw = function() {
  //=============================================================================
  // Render current VBObox contents.
  
    // check: was WebGL context set to use our VBO & shader program?
    if(this.isReady()==false) {
          console.log('ERROR! before' + this.constructor.name + 
                '.draw() call you needed to call this.switchToMe()!!');
    }  
    // ----------------------------Draw the contents of the currently-bound VBO:
    gl.drawArrays(gl.LINES, 	    // select the drawing primitive to draw,
                    // choices: gl.POINTS, gl.LINES, gl.LINE_STRIP, gl.LINE_LOOP, 
                    //          gl.TRIANGLES, gl.TRIANGLE_STRIP, ...
                    0, 								// location of 1st vertex to draw;
                    this.vboVerts);		// number of vertices to draw on-screen.
  }
  
  VBObox0.prototype.reload = function() {
  //=============================================================================
  // Over-write current values in the GPU inside our already-created VBO: use 
  // gl.bufferSubData() call to re-transfer some or all of our Float32Array 
  // contents to our VBO without changing any GPU memory allocations.
  
   gl.bufferSubData(gl.ARRAY_BUFFER, 	// GLenum target(same as 'bindBuffer()')
                    0,                  // byte offset to where data replacement
                                        // begins in the VBO.
                      this.vboContents);   // the JS source-data array used to fill VBO
  
  }
  
  function makeGroundGrid() {
    //==============================================================================
    // Create a list of vertices that create a large grid of lines in the x,y plane
    // centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.
    
      var xcount = 100;			// # of lines to draw in x,y to make the grid.
      var ycount = 100;		
      var xymax	= 50.0;			// grid size; extends to cover +/-xymax in x and y.
       var xColr = new Float32Array([1.0, 1.0, 0.3]);	// bright yellow
       var yColr = new Float32Array([0.5, 1.0, 0.5]);	// bright green.
       
      // Create an (global) array to hold this ground-plane's vertices:
      gndVerts = new Float32Array(7*2*(xcount+ycount));
                // draw a grid made of xcount+ycount lines; 2 vertices per line.
                
      var xgap = xymax/(xcount-1);		// HALF-spacing between lines in x,y;
      var ygap = xymax/(ycount-1);		// (why half? because v==(0line number/2))
      
      // First, step thru x values as we make vertical lines of constant-x:
      for(v=0, j=0; v<2*xcount; v++, j+= 7) {
        if(v%2==0) {	// put even-numbered vertices at (xnow, -xymax, 0)
          gndVerts[j  ] = -xymax + (v  )*xgap;	// x
          gndVerts[j+1] = -xymax;								// y
          gndVerts[j+2] = 0.0;									// z
          gndVerts[j+3] = 1.0;									// w.
        }
        else {				// put odd-numbered vertices at (xnow, +xymax, 0).
          gndVerts[j  ] = -xymax + (v-1)*xgap;	// x
          gndVerts[j+1] = xymax;								// y
          gndVerts[j+2] = 0.0;									// z
          gndVerts[j+3] = 1.0;									// w.
        }
        gndVerts[j+4] = xColr[0];			// red
        gndVerts[j+5] = xColr[1];			// grn
        gndVerts[j+6] = xColr[2];			// blu
      }
      // Second, step thru y values as wqe make horizontal lines of constant-y:
      // (don't re-initialize j--we're adding more vertices to the array)
      for(v=0; v<2*ycount; v++, j+= 7) {
        if(v%2==0) {		// put even-numbered vertices at (-xymax, ynow, 0)
          gndVerts[j  ] = -xymax;								// x
          gndVerts[j+1] = -xymax + (v  )*ygap;	// y
          gndVerts[j+2] = 0.0;									// z
          gndVerts[j+3] = 1.0;									// w.
        }
        else {					// put odd-numbered vertices at (+xymax, ynow, 0).
          gndVerts[j  ] = xymax;								// x
          gndVerts[j+1] = -xymax + (v-1)*ygap;	// y
          gndVerts[j+2] = 0.0;									// z
          gndVerts[j+3] = 1.0;									// w.
        }
        gndVerts[j+4] = yColr[0];			// red
        gndVerts[j+5] = yColr[1];			// grn
        gndVerts[j+6] = yColr[2];			// blu
      }
    }
    
   //=============================================================================
  //=============================================================================
  function VBObox1() {
    //=============================================================================
    //=============================================================================
    // CONSTRUCTOR for one re-usable 'VBObox2' object that holds all data and fcns
    // needed to render vertices from one Vertex Buffer Object (VBO) using one 
    // separate shader program (a vertex-shader & fragment-shader pair) and one
    // set of 'uniform' variables.
    
    // Constructor goal: 
    // Create and set member vars that will ELIMINATE ALL LITERALS (numerical values 
    // written into code) in all other VBObox functions. Keeping all these (initial)
    // values here, in this one coonstrutor function, ensures we can change them 
    // easily WITHOUT disrupting any other code, ever!
      
      this.VERT_SRC =	//--------------------- VERTEX SHADER source code       
     'attribute vec4 a_Position;\n' +
     'attribute vec4 a_Normal;\n' +
     'uniform mat4 u_ModelMatrix;\n' +    // Model matrix
     'uniform mat4 u_MvpMatrix;\n' +    // Model matrix
     'uniform mat4 u_NormalMatrix;\n' +   // Transformation matrix of the normal
     'uniform vec3 u_LightColor;\n' +     // Light color
     'uniform vec3 u_LightPosition;\n' +  // Position of the light source
     'uniform vec3 u_AmbientLight;\n' +   // Ambient light color
     'uniform vec3 u_DifLight;\n' +   // Diffuse light color
     'uniform vec3 u_SpecLight;\n' +   // Specular light color
     'uniform float blinn;\n' +
     'uniform float not_blinn;\n' +
     'varying vec4 v_Color;\n' +
     'uniform vec4 u_eyePosWorld; \n' + 	// Camera/eye location in world coords.
     'void main() {\n' +
     '  gl_Position = u_MvpMatrix * a_Position;\n' +
     '  vec4 v_Position = u_ModelMatrix * a_Position;\n' +
        // Calculate a normal to be fit with a model matrix, and make it 1.0 in length
     '  vec3 normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
     '  vec3 lightDirection = normalize(u_LightPosition.xyz);\n' +
    '  float nDotL = max(dot(lightDirection, normal), 0.0); \n' +
    '  vec3 eyeDirection = normalize(u_eyePosWorld.xyz - v_Position.xyz); \n' +
    '  vec3 C = normal * (dot(lightDirection, normal)); \n' +
    '  vec3 R = (C + C) - lightDirection;\n;' +
    '  vec3 H = normalize(lightDirection + eyeDirection); \n' +
    '  float nDotH = max(dot(reflect(-H, normal), eyeDirection), 0.0); \n' +
    '  float rDotv = max(dot(R, eyeDirection), 0.0); \n' +

    '  float e02 = nDotH*nDotH; \n' +
    '  float e04 = e02*e02; \n' +
    '  float e08 = e04*e04; \n' +
    '	 float e16 = e08*e08; \n' +
    '	 float e32 = e16*e16; \n' + 
    '	 float e64 = e32*e32;	\n' +

    '  float r02 = rDotv*rDotv; \n' +
    '  float r04 = r02*r02; \n' +
    '  float r08 = r04*r04; \n' +
    '	 float r16 = r08*r08; \n' +
    '	 float r32 = r16*r16; \n' + 
    '	 float r64 = r32*r32;	\n' +

    '  float blin_var = (blinn * e64) + (not_blinn * r64);\n' + 
    
     '  vec3 diffuse = u_LightColor * vec3(1, 0.829, 0.829) * nDotL;\n' +
        // Calculate the color due to ambient reflection
    //  '  vec3 ambient = u_AmbientLight;\n' +
    '  vec3 ambient = u_AmbientLight * vec3(30.25, 0.20725, 0.20725);\n' +
    '	 vec3 speculr = u_SpecLight * vec3(0.296648, 0.296648,	0.296648) * blin_var;\n' +
        // Add the surface colors due to diffuse reflection and ambient reflection
     '  v_Color = vec4(diffuse + ambient + speculr, 1.0);\n' + 
     '}\n';


    
      this.FRAG_SRC = //---------------------- FRAGMENT SHADER source code 
      '#ifdef GL_ES\n' +
      'precision mediump float;\n' +
      '#endif\n' +
      'varying vec4 v_Color;\n' +
      'void main() {\n' +
      '  gl_FragColor = v_Color;\n' +
      '}\n';
    
      this.vboContents = new Float32Array([
        0.0,-1.0,0.0,1.0,-1.306012939612e-06,-0.9999999999991471,7.024692550196524e-18,
  0.20318100000000006,-0.96795,0.14761800000000003,1.0,0.21095266289464853,-0.9654061618992498,0.15326420516420788,
  -0.07760699999999998,-0.96795,0.23885299999999998,1.0,-0.08057675620781352,-0.9654060832357604,0.2479888723519962,
  0.7236069999999999,-0.44721999999999995,0.525725,1.0,0.7236067216830413,-0.4472196513214831,0.5257260653677089,
  0.6095470000000001,-0.657519,0.4428559999999999,1.0,0.6042310408008547,-0.6649722006723842,0.43899524105124693,
  0.812729,-0.502301,0.2952379999999999,1.0,0.8151848055269568,-0.503817229437447,0.2857305236756347,
  0.0,-1.0,0.0,1.0,-1.306012939612e-06,-0.9999999999991471,7.024692550196524e-18,
  -0.07760699999999998,-0.96795,0.23885299999999998,1.0,-0.08057675620781352,-0.9654060832357604,0.2479888723519962,
  -0.251147,-0.967949,0.0,1.0,-0.26075247981128585,-0.965405688957526,8.4223782992918e-07,
  0.0,-1.0,0.0,1.0,-1.306012939612e-06,-0.9999999999991471,7.024692550196524e-18,
  -0.251147,-0.967949,0.0,1.0,-0.26075247981128585,-0.965405688957526,8.4223782992918e-07,
  -0.07760699999999998,-0.96795,-0.23885299999999998,1.0,-0.08057588379380852,-0.9654061724258667,-0.24798880860410688,
  0.0,-1.0,0.0,1.0,-1.306012939612e-06,-0.9999999999991471,7.024692550196524e-18,
  -0.07760699999999998,-0.96795,-0.23885299999999998,1.0,-0.08057588379380852,-0.9654061724258667,-0.24798880860410688,
  0.20318100000000006,-0.96795,-0.14761800000000003,1.0,0.21095286907952562,-0.9654060533326492,-0.15326460522832558,
  0.7236069999999999,-0.44721999999999995,0.525725,1.0,0.7236067216830413,-0.4472196513214831,0.5257260653677089,
  0.812729,-0.502301,0.2952379999999999,1.0,0.8151848055269568,-0.503817229437447,0.2857305236756347,
  0.860698,-0.251151,0.442858,1.0,0.864986890060841,-0.24306353018273283,0.4389963557001157,
  -0.2763880000000001,-0.44721999999999995,0.850649,1.0,-0.27638775259514803,-0.44721995820039745,0.8506492339399584,
  -0.02963899999999997,-0.502302,0.8641839999999998,1.0,-0.019838689717257413,-0.5038192559913451,0.8635812548235572,
  -0.155215,-0.25115200000000004,0.955422,1.0,-0.15021677729008256,-0.24306351370824936,0.9583084305819194,
  -0.894426,-0.44721600000000006,0.0,1.0,-0.8944264388330798,-0.44721509983046726,3.5123469383576465e-18,
  -0.831051,-0.502299,0.23885299999999998,1.0,-0.8274488479658778,-0.5038149789897272,0.24798965894876002,
  -0.956626,-0.25114900000000007,0.14761800000000003,1.0,-0.9578262170326509,-0.24306111405524763,0.1532652367601444,
  -0.2763880000000001,-0.44721999999999995,-0.850649,1.0,-0.2763877525951483,-0.44721995820039734,-0.8506492339399583,
  -0.48397099999999993,-0.502302,-0.716565,1.0,-0.4915461091474215,-0.5038186497816622,-0.7103162610515219,
  -0.43600700000000003,-0.25115200000000004,-0.864188,1.0,-0.4417472320955005,-0.24306420283334987,-0.8635850718006606,
  0.7236069999999999,-0.44721999999999995,-0.525725,1.0,0.7236067216830413,-0.4472196513214831,-0.525726065367709,
  0.531941,-0.502302,-0.681712,1.0,0.5236579140350146,-0.503818798851909,-0.6869854488938736,
  0.6871589999999999,-0.25115200000000004,-0.681715,1.0,0.6848117102472356,-0.2430639714860927,-0.6869882293559796,
  0.7236069999999999,-0.44721999999999995,0.525725,1.0,0.7236067216830413,-0.4472196513214831,0.5257260653677089,
  0.860698,-0.251151,0.442858,1.0,0.864986890060841,-0.24306353018273283,0.4389963557001157,
  0.6871589999999999,-0.25115200000000004,0.6817150000000001,1.0,0.6848111757491196,-0.24306484466307332,0.6869884532203029,
  -0.2763880000000001,-0.44721999999999995,0.850649,1.0,-0.27638775259514803,-0.44721995820039745,0.8506492339399584,
  -0.155215,-0.25115200000000004,0.955422,1.0,-0.15021677729008256,-0.24306351370824936,0.9583084305819194,
  -0.43600700000000003,-0.25115200000000004,0.864188,1.0,-0.4417470436660011,-0.2430638114471244,0.8635852783466985,
  -0.894426,-0.44721600000000006,0.0,1.0,-0.8944264388330798,-0.44721509983046726,3.5123469383576465e-18,
  -0.956626,-0.25114900000000007,0.14761800000000003,1.0,-0.9578262170326509,-0.24306111405524763,0.1532652367601444,
  -0.956626,-0.25114900000000007,-0.14761800000000003,1.0,-0.9578262170326509,-0.24306111405524766,-0.15326523676014436,
  -0.2763880000000001,-0.44721999999999995,-0.850649,1.0,-0.2763877525951483,-0.44721995820039734,-0.8506492339399583,
  -0.43600700000000003,-0.25115200000000004,-0.864188,1.0,-0.4417472320955005,-0.24306420283334987,-0.8635850718006606,
  -0.155215,-0.25115200000000004,-0.955422,1.0,-0.1502164527684422,-0.24306415178722385,-0.9583083196099383,
  0.7236069999999999,-0.44721999999999995,-0.525725,1.0,0.7236067216830413,-0.4472196513214831,-0.525726065367709,
  0.6871589999999999,-0.25115200000000004,-0.681715,1.0,0.6848117102472356,-0.2430639714860927,-0.6869882293559796,
  0.860698,-0.251151,-0.442858,1.0,0.8649868190167103,-0.2430628154105527,-0.4389968914377966,
  0.2763880000000001,0.44721999999999995,0.850649,1.0,0.27638775259514803,0.44721995820039745,0.8506492339399583,
  0.48397099999999993,0.502302,0.7165650000000001,1.0,0.4915465997259058,0.5038185159472155,0.7103160164931138,
  0.23282200000000008,0.657519,0.7165629999999998,1.0,0.2307912277766018,0.6649729391400707,0.7103142962047043,
  -0.723607,0.44721999999999995,0.525725,1.0,-0.7236067216830413,0.4472196513214834,0.5257260653677087,
  -0.531941,0.502302,0.6817120000000001,1.0,-0.5236576234680893,0.50381866852951,0.6869857659550921,
  -0.609547,0.657519,0.4428559999999999,1.0,-0.6042309075875276,0.6649723338191165,0.4389952227201456,
  -0.723607,0.44721999999999995,-0.525725,1.0,-0.7236067216830412,0.44721965132148317,-0.5257260653677089,
  -0.812729,0.5023010000000001,-0.295238,1.0,-0.8151846510833863,0.503817580270061,-0.2857303456913146,
  -0.609547,0.657519,-0.442856,1.0,-0.6042309075875275,0.6649723338191165,-0.43899522272014574,
  0.2763880000000001,0.44721999999999995,-0.850649,1.0,0.27638775259514836,0.44721995820039734,-0.8506492339399583,
  0.02963899999999997,0.502302,-0.864184,1.0,0.019838395348954305,0.5038189457553266,-0.8635814425796619,
  0.23282200000000008,0.657519,-0.716563,1.0,0.230791227776602,0.6649729391400707,-0.7103142962047043,
  0.8944260000000002,0.44721600000000006,0.0,1.0,0.8944264388330799,0.4472150998304671,-7.024693876715296e-18,
  0.831051,0.502299,-0.23885299999999998,1.0,0.8274486846864867,0.5038152762710822,-0.24798959979502425,
  0.753442,0.6575150000000001,0.0,1.0,0.746871320486886,0.6649685937201661,-3.519020267383579e-18,
  0.251147,0.967949,0.0,1.0,0.26075244445654044,0.9654056985070778,0.0,
  0.07760699999999998,0.9679500000000001,-0.23885299999999998,1.0,0.0805764015653053,0.9654061629757468,-0.24798867715932643,
  0.0,1.0,0.0,1.0,1.3060129397770804e-06,0.9999999999991471,0.0,
  0.52573,0.850652,0.0,1.0,0.5257289266852015,0.8506521590206104,-1.057645314374342e-17,
  0.3618000000000001,0.8944290000000001,-0.26286300000000007,1.0,0.36820620295749656,0.8904258595923642,-0.2675181875552053,
  0.251147,0.967949,0.0,1.0,0.26075244445654044,0.9654056985070778,0.0,
  0.753442,0.6575150000000001,0.0,1.0,0.746871320486886,0.6649685937201661,-3.519020267383579e-18,
  0.6381939999999999,0.7236099999999999,-0.262864,1.0,0.6317479702095651,0.7275492343102217,-0.2675193708700447,
  0.52573,0.850652,0.0,1.0,0.5257289266852015,0.8506521590206104,-1.057645314374342e-17,
  0.251147,0.967949,0.0,1.0,0.26075244445654044,0.9654056985070778,0.0,
  0.3618000000000001,0.8944290000000001,-0.26286300000000007,1.0,0.36820620295749656,0.8904258595923642,-0.2675181875552053,
  0.07760699999999998,0.9679500000000001,-0.23885299999999998,1.0,0.0805764015653053,0.9654061629757468,-0.24798867715932643,
  0.3618000000000001,0.8944290000000001,-0.26286300000000007,1.0,0.36820620295749656,0.8904258595923642,-0.2675181875552053,
  0.16245599999999993,0.850654,-0.49999499999999997,1.0,0.16245637815790648,0.8506538865776185,-0.49999589042931863,
  0.07760699999999998,0.9679500000000001,-0.23885299999999998,1.0,0.0805764015653053,0.9654061629757468,-0.24798867715932643,
  0.52573,0.850652,0.0,1.0,0.5257289266852015,0.8506521590206104,-1.057645314374342e-17,
  0.6381939999999999,0.7236099999999999,-0.262864,1.0,0.6317479702095651,0.7275492343102217,-0.2675193708700447,
  0.3618000000000001,0.8944290000000001,-0.26286300000000007,1.0,0.36820620295749656,0.8904258595923642,-0.2675181875552053,
  0.6381939999999999,0.7236099999999999,-0.262864,1.0,0.6317479702095651,0.7275492343102217,-0.2675193708700447,
  0.44720899999999997,0.7236120000000001,-0.525728,1.0,0.44964377423881924,0.7275512992269764,-0.5181598047720494,
  0.3618000000000001,0.8944290000000001,-0.26286300000000007,1.0,0.36820620295749656,0.8904258595923642,-0.2675181875552053,
  0.3618000000000001,0.8944290000000001,-0.26286300000000007,1.0,0.36820620295749656,0.8904258595923642,-0.2675181875552053,
  0.44720899999999997,0.7236120000000001,-0.525728,1.0,0.44964377423881924,0.7275512992269764,-0.5181598047720494,
  0.16245599999999993,0.850654,-0.49999499999999997,1.0,0.16245637815790648,0.8506538865776185,-0.49999589042931863,
  0.44720899999999997,0.7236120000000001,-0.525728,1.0,0.44964377423881924,0.7275512992269764,-0.5181598047720494,
  0.23282200000000008,0.657519,-0.716563,1.0,0.230791227776602,0.6649729391400707,-0.7103142962047043,
  0.16245599999999993,0.850654,-0.49999499999999997,1.0,0.16245637815790648,0.8506538865776185,-0.49999589042931863,
  0.753442,0.6575150000000001,0.0,1.0,0.746871320486886,0.6649685937201661,-3.519020267383579e-18,
  0.831051,0.502299,-0.23885299999999998,1.0,0.8274486846864867,0.5038152762710822,-0.24798959979502425,
  0.6381939999999999,0.7236099999999999,-0.262864,1.0,0.6317479702095651,0.7275492343102217,-0.2675193708700447,
  0.831051,0.502299,-0.23885299999999998,1.0,0.8274486846864867,0.5038152762710822,-0.24798959979502425,
  0.6881889999999999,0.525736,-0.499997,1.0,0.688189315323338,0.5257353070007666,-0.49999785324299634,
  0.6381939999999999,0.7236099999999999,-0.262864,1.0,0.6317479702095651,0.7275492343102217,-0.2675193708700447,
  0.6381939999999999,0.7236099999999999,-0.262864,1.0,0.6317479702095651,0.7275492343102217,-0.2675193708700447,
  0.6881889999999999,0.525736,-0.499997,1.0,0.688189315323338,0.5257353070007666,-0.49999785324299634,
  0.44720899999999997,0.7236120000000001,-0.525728,1.0,0.44964377423881924,0.7275512992269764,-0.5181598047720494,
  0.6881889999999999,0.525736,-0.499997,1.0,0.688189315323338,0.5257353070007666,-0.49999785324299634,
  0.48397099999999993,0.502302,-0.716565,1.0,0.4915463260698537,0.5038187053981455,-0.7103160714908299,
  0.44720899999999997,0.7236120000000001,-0.525728,1.0,0.44964377423881924,0.7275512992269764,-0.5181598047720494,
  0.44720899999999997,0.7236120000000001,-0.525728,1.0,0.44964377423881924,0.7275512992269764,-0.5181598047720494,
  0.48397099999999993,0.502302,-0.716565,1.0,0.4915463260698537,0.5038187053981455,-0.7103160714908299,
  0.23282200000000008,0.657519,-0.716563,1.0,0.230791227776602,0.6649729391400707,-0.7103142962047043,
  0.48397099999999993,0.502302,-0.716565,1.0,0.4915463260698537,0.5038187053981455,-0.7103160714908299,
  0.2763880000000001,0.44721999999999995,-0.850649,1.0,0.27638775259514836,0.44721995820039734,-0.8506492339399583,
  0.23282200000000008,0.657519,-0.716563,1.0,0.230791227776602,0.6649729391400707,-0.7103142962047043,
  0.07760699999999998,0.9679500000000001,-0.23885299999999998,1.0,0.0805764015653053,0.9654061629757468,-0.24798867715932643,
  -0.20318100000000006,0.9679500000000001,-0.14761800000000003,1.0,-0.21095224816685468,0.9654061955752871,-0.15326456386980095,
  0.0,1.0,0.0,1.0,1.3060129397770804e-06,0.9999999999991471,0.0,
  0.16245599999999993,0.850654,-0.49999499999999997,1.0,0.16245637815790648,0.8506538865776185,-0.49999589042931863,
  -0.13819700000000001,0.8944299999999998,-0.425319,1.0,-0.14064429309391377,0.8904261866643726,-0.4328514628858925,
  0.07760699999999998,0.9679500000000001,-0.23885299999999998,1.0,0.0805764015653053,0.9654061629757468,-0.24798867715932643,
  0.23282200000000008,0.657519,-0.716563,1.0,0.230791227776602,0.6649729391400707,-0.7103142962047043,
  -0.052790000000000004,0.7236120000000001,-0.688185,1.0,-0.059207598386989156,0.7275518109725035,-0.6834931035817958,
  0.16245599999999993,0.850654,-0.49999499999999997,1.0,0.16245637815790648,0.8506538865776185,-0.49999589042931863,
  0.07760699999999998,0.9679500000000001,-0.23885299999999998,1.0,0.0805764015653053,0.9654061629757468,-0.24798867715932643,
  -0.13819700000000001,0.8944299999999998,-0.425319,1.0,-0.14064429309391377,0.8904261866643726,-0.4328514628858925,
  -0.20318100000000006,0.9679500000000001,-0.14761800000000003,1.0,-0.21095224816685468,0.9654061955752871,-0.15326456386980095,
  -0.13819700000000001,0.8944299999999998,-0.425319,1.0,-0.14064429309391377,0.8904261866643726,-0.4328514628858925,
  -0.425323,0.850654,-0.3090109999999999,1.0,-0.4253228822840165,0.8506537460570991,-0.3090123785945165,
  -0.20318100000000006,0.9679500000000001,-0.14761800000000003,1.0,-0.21095224816685468,0.9654061955752871,-0.15326456386980095,
  0.16245599999999993,0.850654,-0.49999499999999997,1.0,0.16245637815790648,0.8506538865776185,-0.49999589042931863,
  -0.052790000000000004,0.7236120000000001,-0.688185,1.0,-0.059207598386989156,0.7275518109725035,-0.6834931035817958,
  -0.13819700000000001,0.8944299999999998,-0.425319,1.0,-0.14064429309391377,0.8904261866643726,-0.4328514628858925,
  -0.052790000000000004,0.7236120000000001,-0.688185,1.0,-0.059207598386989156,0.7275518109725035,-0.6834931035817958,
  -0.361804,0.7236120000000001,-0.587778,1.0,-0.3538539217412299,0.7275517393882928,-0.5877549392233308,
  -0.13819700000000001,0.8944299999999998,-0.425319,1.0,-0.14064429309391377,0.8904261866643726,-0.4328514628858925,
  -0.13819700000000001,0.8944299999999998,-0.425319,1.0,-0.14064429309391377,0.8904261866643726,-0.4328514628858925,
  -0.361804,0.7236120000000001,-0.587778,1.0,-0.3538539217412299,0.7275517393882928,-0.5877549392233308,
  -0.425323,0.850654,-0.3090109999999999,1.0,-0.4253228822840165,0.8506537460570991,-0.3090123785945165,
  -0.361804,0.7236120000000001,-0.587778,1.0,-0.3538539217412299,0.7275517393882928,-0.5877549392233308,
  -0.609547,0.657519,-0.442856,1.0,-0.6042309075875275,0.6649723338191165,-0.43899522272014574,
  -0.425323,0.850654,-0.3090109999999999,1.0,-0.4253228822840165,0.8506537460570991,-0.3090123785945165,
  0.23282200000000008,0.657519,-0.716563,1.0,0.230791227776602,0.6649729391400707,-0.7103142962047043,
  0.02963899999999997,0.502302,-0.864184,1.0,0.019838395348954305,0.5038189457553266,-0.8635814425796619,
  -0.052790000000000004,0.7236120000000001,-0.688185,1.0,-0.059207598386989156,0.7275518109725035,-0.6834931035817958,
  0.02963899999999997,0.502302,-0.864184,1.0,0.019838395348954305,0.5038189457553266,-0.8635814425796619,
  -0.262869,0.525738,-0.809012,1.0,-0.2628688830438233,0.5257372869737825,-0.8090119006619986,
  -0.052790000000000004,0.7236120000000001,-0.688185,1.0,-0.059207598386989156,0.7275518109725035,-0.6834931035817958,
  -0.052790000000000004,0.7236120000000001,-0.688185,1.0,-0.059207598386989156,0.7275518109725035,-0.6834931035817958,
  -0.262869,0.525738,-0.809012,1.0,-0.2628688830438233,0.5257372869737825,-0.8090119006619986,
  -0.361804,0.7236120000000001,-0.587778,1.0,-0.3538539217412299,0.7275517393882928,-0.5877549392233308,
  -0.262869,0.525738,-0.809012,1.0,-0.2628688830438233,0.5257372869737825,-0.8090119006619986,
  -0.531941,0.502302,-0.681712,1.0,-0.5236577408730431,0.5038188776590388,-0.6869855230921009,
  -0.361804,0.7236120000000001,-0.587778,1.0,-0.3538539217412299,0.7275517393882928,-0.5877549392233308,
  -0.361804,0.7236120000000001,-0.587778,1.0,-0.3538539217412299,0.7275517393882928,-0.5877549392233308,
  -0.531941,0.502302,-0.681712,1.0,-0.5236577408730431,0.5038188776590388,-0.6869855230921009,
  -0.609547,0.657519,-0.442856,1.0,-0.6042309075875275,0.6649723338191165,-0.43899522272014574,
  -0.531941,0.502302,-0.681712,1.0,-0.5236577408730431,0.5038188776590388,-0.6869855230921009,
  -0.723607,0.44721999999999995,-0.525725,1.0,-0.7236067216830412,0.44721965132148317,-0.5257260653677089,
  -0.609547,0.657519,-0.442856,1.0,-0.6042309075875275,0.6649723338191165,-0.43899522272014574,
  -0.20318100000000006,0.9679500000000001,-0.14761800000000003,1.0,-0.21095224816685468,0.9654061955752871,-0.15326456386980095,
  -0.20318100000000006,0.9679500000000001,0.14761800000000003,1.0,-0.21095224816685468,0.9654061955752871,0.15326456386980092,
  0.0,1.0,0.0,1.0,1.3060129397770804e-06,0.9999999999991471,0.0,
  -0.425323,0.850654,-0.3090109999999999,1.0,-0.4253228822840165,0.8506537460570991,-0.3090123785945165,
  -0.44721,0.8944290000000001,0.0,1.0,-0.4551286493768027,0.8904256917432513,3.526214980202345e-18,
  -0.20318100000000006,0.9679500000000001,-0.14761800000000003,1.0,-0.21095224816685468,0.9654061955752871,-0.15326456386980095,
  -0.609547,0.657519,-0.442856,1.0,-0.6042309075875275,0.6649723338191165,-0.43899522272014574,
  -0.670817,0.723611,-0.16245699999999996,1.0,-0.6683380216406349,0.7275501061976027,-0.15490362100783547,
  -0.425323,0.850654,-0.3090109999999999,1.0,-0.4253228822840165,0.8506537460570991,-0.3090123785945165,
  -0.20318100000000006,0.9679500000000001,-0.14761800000000003,1.0,-0.21095224816685468,0.9654061955752871,-0.15326456386980095,
  -0.44721,0.8944290000000001,0.0,1.0,-0.4551286493768027,0.8904256917432513,3.526214980202345e-18,
  -0.20318100000000006,0.9679500000000001,0.14761800000000003,1.0,-0.21095224816685468,0.9654061955752871,0.15326456386980092,
  -0.44721,0.8944290000000001,0.0,1.0,-0.4551286493768027,0.8904256917432513,3.526214980202345e-18,
  -0.425323,0.850654,0.3090109999999999,1.0,-0.4253228822840165,0.8506537460570992,0.3090123785945165,
  -0.20318100000000006,0.9679500000000001,0.14761800000000003,1.0,-0.21095224816685468,0.9654061955752871,0.15326456386980092,
  -0.425323,0.850654,-0.3090109999999999,1.0,-0.4253228822840165,0.8506537460570991,-0.3090123785945165,
  -0.670817,0.723611,-0.16245699999999996,1.0,-0.6683380216406349,0.7275501061976027,-0.15490362100783547,
  -0.44721,0.8944290000000001,0.0,1.0,-0.4551286493768027,0.8904256917432513,3.526214980202345e-18,
  -0.670817,0.723611,-0.16245699999999996,1.0,-0.6683380216406349,0.7275501061976027,-0.15490362100783547,
  -0.670817,0.723611,0.16245700000000007,1.0,-0.6683380216406349,0.7275501061976029,0.15490362100783564,
  -0.44721,0.8944290000000001,0.0,1.0,-0.4551286493768027,0.8904256917432513,3.526214980202345e-18,
  -0.44721,0.8944290000000001,0.0,1.0,-0.4551286493768027,0.8904256917432513,3.526214980202345e-18,
  -0.670817,0.723611,0.16245700000000007,1.0,-0.6683380216406349,0.7275501061976029,0.15490362100783564,
  -0.425323,0.850654,0.3090109999999999,1.0,-0.4253228822840165,0.8506537460570992,0.3090123785945165,
  -0.670817,0.723611,0.16245700000000007,1.0,-0.6683380216406349,0.7275501061976029,0.15490362100783564,
  -0.609547,0.657519,0.4428559999999999,1.0,-0.6042309075875276,0.6649723338191165,0.4389952227201456,
  -0.425323,0.850654,0.3090109999999999,1.0,-0.4253228822840165,0.8506537460570992,0.3090123785945165,
  -0.609547,0.657519,-0.442856,1.0,-0.6042309075875275,0.6649723338191165,-0.43899522272014574,
  -0.812729,0.5023010000000001,-0.295238,1.0,-0.8151846510833863,0.503817580270061,-0.2857303456913146,
  -0.670817,0.723611,-0.16245699999999996,1.0,-0.6683380216406349,0.7275501061976027,-0.15490362100783547,
  -0.812729,0.5023010000000001,-0.295238,1.0,-0.8151846510833863,0.503817580270061,-0.2857303456913146,
  -0.850648,0.525736,0.0,1.0,-0.850648504669507,0.5257348395374611,-2.2739670286765194e-07,
  -0.670817,0.723611,-0.16245699999999996,1.0,-0.6683380216406349,0.7275501061976027,-0.15490362100783547,
  -0.670817,0.723611,-0.16245699999999996,1.0,-0.6683380216406349,0.7275501061976027,-0.15490362100783547,
  -0.850648,0.525736,0.0,1.0,-0.850648504669507,0.5257348395374611,-2.2739670286765194e-07,
  -0.670817,0.723611,0.16245700000000007,1.0,-0.6683380216406349,0.7275501061976029,0.15490362100783564,
  -0.850648,0.525736,0.0,1.0,-0.850648504669507,0.5257348395374611,-2.2739670286765194e-07,
  -0.812729,0.5023010000000001,0.2952379999999999,1.0,-0.8151843815554107,0.5038178905016056,0.28573056763082694,
  -0.670817,0.723611,0.16245700000000007,1.0,-0.6683380216406349,0.7275501061976029,0.15490362100783564,
  -0.670817,0.723611,0.16245700000000007,1.0,-0.6683380216406349,0.7275501061976029,0.15490362100783564,
  -0.812729,0.5023010000000001,0.2952379999999999,1.0,-0.8151843815554107,0.5038178905016056,0.28573056763082694,
  -0.609547,0.657519,0.4428559999999999,1.0,-0.6042309075875276,0.6649723338191165,0.4389952227201456,
  -0.812729,0.5023010000000001,0.2952379999999999,1.0,-0.8151843815554107,0.5038178905016056,0.28573056763082694,
  -0.723607,0.44721999999999995,0.525725,1.0,-0.7236067216830413,0.4472196513214834,0.5257260653677087,
  -0.609547,0.657519,0.4428559999999999,1.0,-0.6042309075875276,0.6649723338191165,0.4389952227201456,
  -0.20318100000000006,0.9679500000000001,0.14761800000000003,1.0,-0.21095224816685468,0.9654061955752871,0.15326456386980092,
  0.07760699999999998,0.9679500000000001,0.23885299999999998,1.0,0.08057640156530528,0.9654061629757468,0.24798867715932643,
  0.0,1.0,0.0,1.0,1.3060129397770804e-06,0.9999999999991471,0.0,
  -0.425323,0.850654,0.3090109999999999,1.0,-0.4253228822840165,0.8506537460570992,0.3090123785945165,
  -0.13819700000000001,0.8944299999999998,0.425319,1.0,-0.1406442930939137,0.8904261866643726,0.4328514628858925,
  -0.20318100000000006,0.9679500000000001,0.14761800000000003,1.0,-0.21095224816685468,0.9654061955752871,0.15326456386980092,
  -0.609547,0.657519,0.4428559999999999,1.0,-0.6042309075875276,0.6649723338191165,0.4389952227201456,
  -0.361804,0.7236120000000001,0.5877780000000001,1.0,-0.35385392174123004,0.7275517393882929,0.5877549392233307,
  -0.425323,0.850654,0.3090109999999999,1.0,-0.4253228822840165,0.8506537460570992,0.3090123785945165,
  -0.20318100000000006,0.9679500000000001,0.14761800000000003,1.0,-0.21095224816685468,0.9654061955752871,0.15326456386980092,
  -0.13819700000000001,0.8944299999999998,0.425319,1.0,-0.1406442930939137,0.8904261866643726,0.4328514628858925,
  0.07760699999999998,0.9679500000000001,0.23885299999999998,1.0,0.08057640156530528,0.9654061629757468,0.24798867715932643,
  -0.13819700000000001,0.8944299999999998,0.425319,1.0,-0.1406442930939137,0.8904261866643726,0.4328514628858925,
  0.16245599999999993,0.850654,0.49999499999999997,1.0,0.16245637815790648,0.8506538865776185,0.49999589042931875,
  0.07760699999999998,0.9679500000000001,0.23885299999999998,1.0,0.08057640156530528,0.9654061629757468,0.24798867715932643,
  -0.425323,0.850654,0.3090109999999999,1.0,-0.4253228822840165,0.8506537460570992,0.3090123785945165,
  -0.361804,0.7236120000000001,0.5877780000000001,1.0,-0.35385392174123004,0.7275517393882929,0.5877549392233307,
  -0.13819700000000001,0.8944299999999998,0.425319,1.0,-0.1406442930939137,0.8904261866643726,0.4328514628858925,
  -0.361804,0.7236120000000001,0.5877780000000001,1.0,-0.35385392174123004,0.7275517393882929,0.5877549392233307,
  -0.052790000000000004,0.7236120000000001,0.688185,1.0,-0.0592075983869889,0.7275518109725035,0.6834931035817959,
  -0.13819700000000001,0.8944299999999998,0.425319,1.0,-0.1406442930939137,0.8904261866643726,0.4328514628858925,
  -0.13819700000000001,0.8944299999999998,0.425319,1.0,-0.1406442930939137,0.8904261866643726,0.4328514628858925,
  -0.052790000000000004,0.7236120000000001,0.688185,1.0,-0.0592075983869889,0.7275518109725035,0.6834931035817959,
  0.16245599999999993,0.850654,0.49999499999999997,1.0,0.16245637815790648,0.8506538865776185,0.49999589042931875,
  -0.052790000000000004,0.7236120000000001,0.688185,1.0,-0.0592075983869889,0.7275518109725035,0.6834931035817959,
  0.23282200000000008,0.657519,0.7165629999999998,1.0,0.2307912277766018,0.6649729391400707,0.7103142962047043,
  0.16245599999999993,0.850654,0.49999499999999997,1.0,0.16245637815790648,0.8506538865776185,0.49999589042931875,
  -0.609547,0.657519,0.4428559999999999,1.0,-0.6042309075875276,0.6649723338191165,0.4389952227201456,
  -0.531941,0.502302,0.6817120000000001,1.0,-0.5236576234680893,0.50381866852951,0.6869857659550921,
  -0.361804,0.7236120000000001,0.5877780000000001,1.0,-0.35385392174123004,0.7275517393882929,0.5877549392233307,
  -0.531941,0.502302,0.6817120000000001,1.0,-0.5236576234680893,0.50381866852951,0.6869857659550921,
  -0.262869,0.525738,0.8090120000000001,1.0,-0.26286917763817624,0.5257368727147139,0.8090120741472168,
  -0.361804,0.7236120000000001,0.5877780000000001,1.0,-0.35385392174123004,0.7275517393882929,0.5877549392233307,
  -0.361804,0.7236120000000001,0.5877780000000001,1.0,-0.35385392174123004,0.7275517393882929,0.5877549392233307,
  -0.262869,0.525738,0.8090120000000001,1.0,-0.26286917763817624,0.5257368727147139,0.8090120741472168,
  -0.052790000000000004,0.7236120000000001,0.688185,1.0,-0.0592075983869889,0.7275518109725035,0.6834931035817959,
  -0.262869,0.525738,0.8090120000000001,1.0,-0.26286917763817624,0.5257368727147139,0.8090120741472168,
  0.02963899999999997,0.502302,0.8641839999999998,1.0,0.01983839534895446,0.5038189457553266,0.8635814425796619,
  -0.052790000000000004,0.7236120000000001,0.688185,1.0,-0.0592075983869889,0.7275518109725035,0.6834931035817959,
  -0.052790000000000004,0.7236120000000001,0.688185,1.0,-0.0592075983869889,0.7275518109725035,0.6834931035817959,
  0.02963899999999997,0.502302,0.8641839999999998,1.0,0.01983839534895446,0.5038189457553266,0.8635814425796619,
  0.23282200000000008,0.657519,0.7165629999999998,1.0,0.2307912277766018,0.6649729391400707,0.7103142962047043,
  0.02963899999999997,0.502302,0.8641839999999998,1.0,0.01983839534895446,0.5038189457553266,0.8635814425796619,
  0.2763880000000001,0.44721999999999995,0.850649,1.0,0.27638775259514803,0.44721995820039745,0.8506492339399583,
  0.23282200000000008,0.657519,0.7165629999999998,1.0,0.2307912277766018,0.6649729391400707,0.7103142962047043,
  0.07760699999999998,0.9679500000000001,0.23885299999999998,1.0,0.08057640156530528,0.9654061629757468,0.24798867715932643,
  0.251147,0.967949,0.0,1.0,0.26075244445654044,0.9654056985070778,0.0,
  0.0,1.0,0.0,1.0,1.3060129397770804e-06,0.9999999999991471,0.0,
  0.16245599999999993,0.850654,0.49999499999999997,1.0,0.16245637815790648,0.8506538865776185,0.49999589042931875,
  0.3618000000000001,0.8944290000000001,0.26286300000000007,1.0,0.36820620295749656,0.8904258595923642,0.26751818755520523,
  0.07760699999999998,0.9679500000000001,0.23885299999999998,1.0,0.08057640156530528,0.9654061629757468,0.24798867715932643,
  0.23282200000000008,0.657519,0.7165629999999998,1.0,0.2307912277766018,0.6649729391400707,0.7103142962047043,
  0.44720899999999997,0.7236120000000001,0.525728,1.0,0.4496437742388191,0.7275512992269764,0.5181598047720494,
  0.16245599999999993,0.850654,0.49999499999999997,1.0,0.16245637815790648,0.8506538865776185,0.49999589042931875,
  0.07760699999999998,0.9679500000000001,0.23885299999999998,1.0,0.08057640156530528,0.9654061629757468,0.24798867715932643,
  0.3618000000000001,0.8944290000000001,0.26286300000000007,1.0,0.36820620295749656,0.8904258595923642,0.26751818755520523,
  0.251147,0.967949,0.0,1.0,0.26075244445654044,0.9654056985070778,0.0,
  0.3618000000000001,0.8944290000000001,0.26286300000000007,1.0,0.36820620295749656,0.8904258595923642,0.26751818755520523,
  0.52573,0.850652,0.0,1.0,0.5257289266852015,0.8506521590206104,-1.057645314374342e-17,
  0.251147,0.967949,0.0,1.0,0.26075244445654044,0.9654056985070778,0.0,
  0.16245599999999993,0.850654,0.49999499999999997,1.0,0.16245637815790648,0.8506538865776185,0.49999589042931875,
  0.44720899999999997,0.7236120000000001,0.525728,1.0,0.4496437742388191,0.7275512992269764,0.5181598047720494,
  0.3618000000000001,0.8944290000000001,0.26286300000000007,1.0,0.36820620295749656,0.8904258595923642,0.26751818755520523,
  0.44720899999999997,0.7236120000000001,0.525728,1.0,0.4496437742388191,0.7275512992269764,0.5181598047720494,
  0.6381939999999999,0.7236099999999999,0.262864,1.0,0.6317479702095651,0.7275492343102217,0.2675193708700447,
  0.3618000000000001,0.8944290000000001,0.26286300000000007,1.0,0.36820620295749656,0.8904258595923642,0.26751818755520523,
  0.3618000000000001,0.8944290000000001,0.26286300000000007,1.0,0.36820620295749656,0.8904258595923642,0.26751818755520523,
  0.6381939999999999,0.7236099999999999,0.262864,1.0,0.6317479702095651,0.7275492343102217,0.2675193708700447,
  0.52573,0.850652,0.0,1.0,0.5257289266852015,0.8506521590206104,-1.057645314374342e-17,
  0.6381939999999999,0.7236099999999999,0.262864,1.0,0.6317479702095651,0.7275492343102217,0.2675193708700447,
  0.753442,0.6575150000000001,0.0,1.0,0.746871320486886,0.6649685937201661,-3.519020267383579e-18,
  0.52573,0.850652,0.0,1.0,0.5257289266852015,0.8506521590206104,-1.057645314374342e-17,
  0.23282200000000008,0.657519,0.7165629999999998,1.0,0.2307912277766018,0.6649729391400707,0.7103142962047043,
  0.48397099999999993,0.502302,0.7165650000000001,1.0,0.4915465997259058,0.5038185159472155,0.7103160164931138,
  0.44720899999999997,0.7236120000000001,0.525728,1.0,0.4496437742388191,0.7275512992269764,0.5181598047720494,
  0.48397099999999993,0.502302,0.7165650000000001,1.0,0.4915465997259058,0.5038185159472155,0.7103160164931138,
  0.6881889999999999,0.525736,0.499997,1.0,0.6881896241859202,0.5257346676673482,0.49999810037193615,
  0.44720899999999997,0.7236120000000001,0.525728,1.0,0.4496437742388191,0.7275512992269764,0.5181598047720494,
  0.44720899999999997,0.7236120000000001,0.525728,1.0,0.4496437742388191,0.7275512992269764,0.5181598047720494,
  0.6881889999999999,0.525736,0.499997,1.0,0.6881896241859202,0.5257346676673482,0.49999810037193615,
  0.6381939999999999,0.7236099999999999,0.262864,1.0,0.6317479702095651,0.7275492343102217,0.2675193708700447,
  0.6881889999999999,0.525736,0.499997,1.0,0.6881896241859202,0.5257346676673482,0.49999810037193615,
  0.831051,0.502299,0.23885299999999998,1.0,0.8274487904509396,0.5038149163054394,0.24798997820359664,
  0.6381939999999999,0.7236099999999999,0.262864,1.0,0.6317479702095651,0.7275492343102217,0.2675193708700447,
  0.6381939999999999,0.7236099999999999,0.262864,1.0,0.6317479702095651,0.7275492343102217,0.2675193708700447,
  0.831051,0.502299,0.23885299999999998,1.0,0.8274487904509396,0.5038149163054394,0.24798997820359664,
  0.753442,0.6575150000000001,0.0,1.0,0.746871320486886,0.6649685937201661,-3.519020267383579e-18,
  0.831051,0.502299,0.23885299999999998,1.0,0.8274487904509396,0.5038149163054394,0.24798997820359664,
  0.8944260000000002,0.44721600000000006,0.0,1.0,0.8944264388330799,0.4472150998304671,-7.024693876715296e-18,
  0.753442,0.6575150000000001,0.0,1.0,0.746871320486886,0.6649685937201661,-3.519020267383579e-18,
  0.956626,0.25114900000000007,-0.14761800000000003,1.0,0.9578262483355788,0.24306118218022527,-0.15326493309476094,
  0.831051,0.502299,-0.23885299999999998,1.0,0.8274486846864867,0.5038152762710822,-0.24798959979502425,
  0.8944260000000002,0.44721600000000006,0.0,1.0,0.8944264388330799,0.4472150998304671,-7.024693876715296e-18,
  0.951058,0.0,-0.309013,1.0,0.9510575012112954,5.074933413732154e-07,-0.30901396309789836,
  0.861804,0.2763960000000001,-0.425322,1.0,0.8593175031254149,0.27241679196618035,-0.43285392487207186,
  0.956626,0.25114900000000007,-0.14761800000000003,1.0,0.9578262483355788,0.24306118218022527,-0.15326493309476094,
  0.860698,-0.251151,-0.442858,1.0,0.8649868190167103,-0.2430628154105527,-0.4389968914377966,
  0.8090190000000002,0.0,-0.587782,1.0,0.8089870842176278,0.008873212629478702,-0.5877594437069411,
  0.951058,0.0,-0.309013,1.0,0.9510575012112954,5.074933413732154e-07,-0.30901396309789836,
  0.956626,0.25114900000000007,-0.14761800000000003,1.0,0.9578262483355788,0.24306118218022527,-0.15326493309476094,
  0.861804,0.2763960000000001,-0.425322,1.0,0.8593175031254149,0.27241679196618035,-0.43285392487207186,
  0.831051,0.502299,-0.23885299999999998,1.0,0.8274486846864867,0.5038152762710822,-0.24798959979502425,
  0.861804,0.2763960000000001,-0.425322,1.0,0.8593175031254149,0.27241679196618035,-0.43285392487207186,
  0.6881889999999999,0.525736,-0.499997,1.0,0.688189315323338,0.5257353070007666,-0.49999785324299634,
  0.831051,0.502299,-0.23885299999999998,1.0,0.8274486846864867,0.5038152762710822,-0.24798959979502425,
  0.951058,0.0,-0.309013,1.0,0.9510575012112954,5.074933413732154e-07,-0.30901396309789836,
  0.8090190000000002,0.0,-0.587782,1.0,0.8089870842176278,0.008873212629478702,-0.5877594437069411,
  0.861804,0.2763960000000001,-0.425322,1.0,0.8593175031254149,0.27241679196618035,-0.43285392487207186,
  0.8090190000000002,0.0,-0.587782,1.0,0.8089870842176278,0.008873212629478702,-0.5877594437069411,
  0.6708210000000001,0.276397,-0.688189,1.0,0.6772151552047805,0.272417935232739,-0.6834969657024793,
  0.861804,0.2763960000000001,-0.425322,1.0,0.8593175031254149,0.27241679196618035,-0.43285392487207186,
  0.861804,0.2763960000000001,-0.425322,1.0,0.8593175031254149,0.27241679196618035,-0.43285392487207186,
  0.6708210000000001,0.276397,-0.688189,1.0,0.6772151552047805,0.272417935232739,-0.6834969657024793,
  0.6881889999999999,0.525736,-0.499997,1.0,0.688189315323338,0.5257353070007666,-0.49999785324299634,
  0.6708210000000001,0.276397,-0.688189,1.0,0.6772151552047805,0.272417935232739,-0.6834969657024793,
  0.48397099999999993,0.502302,-0.716565,1.0,0.4915463260698537,0.5038187053981455,-0.7103160714908299,
  0.6881889999999999,0.525736,-0.499997,1.0,0.688189315323338,0.5257353070007666,-0.49999785324299634,
  0.860698,-0.251151,-0.442858,1.0,0.8649868190167103,-0.2430628154105527,-0.4389968914377966,
  0.6871589999999999,-0.25115200000000004,-0.681715,1.0,0.6848117102472356,-0.2430639714860927,-0.6869882293559796,
  0.8090190000000002,0.0,-0.587782,1.0,0.8089870842176278,0.008873212629478702,-0.5877594437069411,
  0.6871589999999999,-0.25115200000000004,-0.681715,1.0,0.6848117102472356,-0.2430639714860927,-0.6869882293559796,
  0.5877859999999999,0.0,-0.809017,1.0,0.5877858829948915,-2.554691144635855e-08,-0.809016536142442,
  0.8090190000000002,0.0,-0.587782,1.0,0.8089870842176278,0.008873212629478702,-0.5877594437069411,
  0.8090190000000002,0.0,-0.587782,1.0,0.8089870842176278,0.008873212629478702,-0.5877594437069411,
  0.5877859999999999,0.0,-0.809017,1.0,0.5877858829948915,-2.554691144635855e-08,-0.809016536142442,
  0.6708210000000001,0.276397,-0.688189,1.0,0.6772151552047805,0.272417935232739,-0.6834969657024793,
  0.5877859999999999,0.0,-0.809017,1.0,0.5877858829948915,-2.554691144635855e-08,-0.809016536142442,
  0.43600700000000003,0.25115200000000004,-0.864188,1.0,0.44174743584464,0.2430637566759591,-0.8635850931525253,
  0.6708210000000001,0.276397,-0.688189,1.0,0.6772151552047805,0.272417935232739,-0.6834969657024793,
  0.6708210000000001,0.276397,-0.688189,1.0,0.6772151552047805,0.272417935232739,-0.6834969657024793,
  0.43600700000000003,0.25115200000000004,-0.864188,1.0,0.44174743584464,0.2430637566759591,-0.8635850931525253,
  0.48397099999999993,0.502302,-0.716565,1.0,0.4915463260698537,0.5038187053981455,-0.7103160714908299,
  0.43600700000000003,0.25115200000000004,-0.864188,1.0,0.44174743584464,0.2430637566759591,-0.8635850931525253,
  0.2763880000000001,0.44721999999999995,-0.850649,1.0,0.27638775259514836,0.44721995820039734,-0.8506492339399583,
  0.48397099999999993,0.502302,-0.716565,1.0,0.4915463260698537,0.5038187053981455,-0.7103160714908299,
  0.1552150000000001,0.25115200000000004,-0.955422,1.0,0.15021657377136222,0.24306347133980513,-0.9583084732301164,
  0.02963899999999997,0.502302,-0.864184,1.0,0.019838395348954305,0.5038189457553266,-0.8635814425796619,
  0.2763880000000001,0.44721999999999995,-0.850649,1.0,0.27638775259514836,0.44721995820039734,-0.8506492339399583,
  0.0,0.0,-1.0,1.0,8.386527000463054e-07,1.0350315843348408e-07,-0.999999999999643,
  -0.13819899999999996,0.276397,-0.951055,1.0,-0.14612907117205193,0.2724178643965829,-0.9510177715037708,
  0.1552150000000001,0.25115200000000004,-0.955422,1.0,0.15021657377136222,0.24306347133980513,-0.9583084732301164,
  -0.155215,-0.25115200000000004,-0.955422,1.0,-0.1502164527684422,-0.24306415178722385,-0.9583083196099383,
  -0.30901599999999996,0.0,-0.951057,1.0,-0.30900375318742496,0.00887256725174435,-0.9510194309615595,
  0.0,0.0,-1.0,1.0,8.386527000463054e-07,1.0350315843348408e-07,-0.999999999999643,
  0.1552150000000001,0.25115200000000004,-0.955422,1.0,0.15021657377136222,0.24306347133980513,-0.9583084732301164,
  -0.13819899999999996,0.276397,-0.951055,1.0,-0.14612907117205193,0.2724178643965829,-0.9510177715037708,
  0.02963899999999997,0.502302,-0.864184,1.0,0.019838395348954305,0.5038189457553266,-0.8635814425796619,
  -0.13819899999999996,0.276397,-0.951055,1.0,-0.14612907117205193,0.2724178643965829,-0.9510177715037708,
  -0.262869,0.525738,-0.809012,1.0,-0.2628688830438233,0.5257372869737825,-0.8090119006619986,
  0.02963899999999997,0.502302,-0.864184,1.0,0.019838395348954305,0.5038189457553266,-0.8635814425796619,
  0.0,0.0,-1.0,1.0,8.386527000463054e-07,1.0350315843348408e-07,-0.999999999999643,
  -0.30901599999999996,0.0,-0.951057,1.0,-0.30900375318742496,0.00887256725174435,-0.9510194309615595,
  -0.13819899999999996,0.276397,-0.951055,1.0,-0.14612907117205193,0.2724178643965829,-0.9510177715037708,
  -0.30901599999999996,0.0,-0.951057,1.0,-0.30900375318742496,0.00887256725174435,-0.9510194309615595,
  -0.4472149999999999,0.276397,-0.850649,1.0,-0.440777418602302,0.2724181414021976,-0.8552798509758447,
  -0.13819899999999996,0.276397,-0.951055,1.0,-0.14612907117205193,0.2724178643965829,-0.9510177715037708,
  -0.13819899999999996,0.276397,-0.951055,1.0,-0.14612907117205193,0.2724178643965829,-0.9510177715037708,
  -0.4472149999999999,0.276397,-0.850649,1.0,-0.440777418602302,0.2724181414021976,-0.8552798509758447,
  -0.262869,0.525738,-0.809012,1.0,-0.2628688830438233,0.5257372869737825,-0.8090119006619986,
  -0.4472149999999999,0.276397,-0.850649,1.0,-0.440777418602302,0.2724181414021976,-0.8552798509758447,
  -0.531941,0.502302,-0.681712,1.0,-0.5236577408730431,0.5038188776590388,-0.6869855230921009,
  -0.262869,0.525738,-0.809012,1.0,-0.2628688830438233,0.5257372869737825,-0.8090119006619986,
  -0.155215,-0.25115200000000004,-0.955422,1.0,-0.1502164527684422,-0.24306415178722385,-0.9583083196099383,
  -0.43600700000000003,-0.25115200000000004,-0.864188,1.0,-0.4417472320955005,-0.24306420283334987,-0.8635850718006606,
  -0.30901599999999996,0.0,-0.951057,1.0,-0.30900375318742496,0.00887256725174435,-0.9510194309615595,
  -0.43600700000000003,-0.25115200000000004,-0.864188,1.0,-0.4417472320955005,-0.24306420283334987,-0.8635850718006606,
  -0.587786,0.0,-0.809017,1.0,-0.5877863671165282,8.898111888585574e-08,-0.8090161844066818,
  -0.30901599999999996,0.0,-0.951057,1.0,-0.30900375318742496,0.00887256725174435,-0.9510194309615595,
  -0.30901599999999996,0.0,-0.951057,1.0,-0.30900375318742496,0.00887256725174435,-0.9510194309615595,
  -0.587786,0.0,-0.809017,1.0,-0.5877863671165282,8.898111888585574e-08,-0.8090161844066818,
  -0.4472149999999999,0.276397,-0.850649,1.0,-0.440777418602302,0.2724181414021976,-0.8552798509758447,
  -0.587786,0.0,-0.809017,1.0,-0.5877863671165282,8.898111888585574e-08,-0.8090161844066818,
  -0.687159,0.25115200000000004,-0.681715,1.0,-0.6848117463759701,0.2430639454016199,-0.6869882025706792,
  -0.4472149999999999,0.276397,-0.850649,1.0,-0.440777418602302,0.2724181414021976,-0.8552798509758447,
  -0.4472149999999999,0.276397,-0.850649,1.0,-0.440777418602302,0.2724181414021976,-0.8552798509758447,
  -0.687159,0.25115200000000004,-0.681715,1.0,-0.6848117463759701,0.2430639454016199,-0.6869882025706792,
  -0.531941,0.502302,-0.681712,1.0,-0.5236577408730431,0.5038188776590388,-0.6869855230921009,
  -0.687159,0.25115200000000004,-0.681715,1.0,-0.6848117463759701,0.2430639454016199,-0.6869882025706792,
  -0.723607,0.44721999999999995,-0.525725,1.0,-0.7236067216830412,0.44721965132148317,-0.5257260653677089,
  -0.531941,0.502302,-0.681712,1.0,-0.5236577408730431,0.5038188776590388,-0.6869855230921009,
  -0.860698,0.2511510000000001,-0.442858,1.0,-0.8649868290678857,0.2430624631623782,-0.43899706666505395,
  -0.812729,0.5023010000000001,-0.295238,1.0,-0.8151846510833863,0.503817580270061,-0.2857303456913146,
  -0.723607,0.44721999999999995,-0.525725,1.0,-0.7236067216830412,0.44721965132148317,-0.5257260653677089,
  -0.951058,0.0,-0.309013,1.0,-0.9510573479382253,-7.330831644240639e-07,-0.30901443482816815,
  -0.947213,0.2763960000000001,-0.162458,1.0,-0.9496281766536325,0.27241723641349325,-0.15490376176946866,
  -0.860698,0.2511510000000001,-0.442858,1.0,-0.8649868290678857,0.2430624631623782,-0.43899706666505395,
  -0.956626,-0.25114900000000007,-0.14761800000000003,1.0,-0.9578262170326509,-0.24306111405524766,-0.15326523676014436,
  -1.0,9.999999999177334e-07,0.0,1.0,-0.999960625461639,0.008873980299981307,-5.7641038767457417e-08,
  -0.951058,0.0,-0.309013,1.0,-0.9510573479382253,-7.330831644240639e-07,-0.30901443482816815,
  -0.860698,0.2511510000000001,-0.442858,1.0,-0.8649868290678857,0.2430624631623782,-0.43899706666505395,
  -0.947213,0.2763960000000001,-0.162458,1.0,-0.9496281766536325,0.27241723641349325,-0.15490376176946866,
  -0.812729,0.5023010000000001,-0.295238,1.0,-0.8151846510833863,0.503817580270061,-0.2857303456913146,
  -0.947213,0.2763960000000001,-0.162458,1.0,-0.9496281766536325,0.27241723641349325,-0.15490376176946866,
  -0.850648,0.525736,0.0,1.0,-0.850648504669507,0.5257348395374611,-2.2739670286765194e-07,
  -0.812729,0.5023010000000001,-0.295238,1.0,-0.8151846510833863,0.503817580270061,-0.2857303456913146,
  -0.951058,0.0,-0.309013,1.0,-0.9510573479382253,-7.330831644240639e-07,-0.30901443482816815,
  -1.0,9.999999999177334e-07,0.0,1.0,-0.999960625461639,0.008873980299981307,-5.7641038767457417e-08,
  -0.947213,0.2763960000000001,-0.162458,1.0,-0.9496281766536325,0.27241723641349325,-0.15490376176946866,
  -1.0,9.999999999177334e-07,0.0,1.0,-0.999960625461639,0.008873980299981307,-5.7641038767457417e-08,
  -0.947213,0.276397,0.162458,1.0,-0.9496280396827057,0.2724178616838374,0.1549035018454631,
  -0.947213,0.2763960000000001,-0.162458,1.0,-0.9496281766536325,0.27241723641349325,-0.15490376176946866,
  -0.947213,0.2763960000000001,-0.162458,1.0,-0.9496281766536325,0.27241723641349325,-0.15490376176946866,
  -0.947213,0.276397,0.162458,1.0,-0.9496280396827057,0.2724178616838374,0.1549035018454631,
  -0.850648,0.525736,0.0,1.0,-0.850648504669507,0.5257348395374611,-2.2739670286765194e-07,
  -0.947213,0.276397,0.162458,1.0,-0.9496280396827057,0.2724178616838374,0.1549035018454631,
  -0.812729,0.5023010000000001,0.2952379999999999,1.0,-0.8151843815554107,0.5038178905016056,0.28573056763082694,
  -0.850648,0.525736,0.0,1.0,-0.850648504669507,0.5257348395374611,-2.2739670286765194e-07,
  -0.956626,-0.25114900000000007,-0.14761800000000003,1.0,-0.9578262170326509,-0.24306111405524766,-0.15326523676014436,
  -0.956626,-0.25114900000000007,0.14761800000000003,1.0,-0.9578262170326509,-0.24306111405524763,0.1532652367601444,
  -1.0,9.999999999177334e-07,0.0,1.0,-0.999960625461639,0.008873980299981307,-5.7641038767457417e-08,
  -0.956626,-0.25114900000000007,0.14761800000000003,1.0,-0.9578262170326509,-0.24306111405524763,0.1532652367601444,
  -0.951058,0.0,0.309013,1.0,-0.951057331086145,-8.671557238488273e-07,0.3090144866936615,
  -1.0,9.999999999177334e-07,0.0,1.0,-0.999960625461639,0.008873980299981307,-5.7641038767457417e-08,
  -1.0,9.999999999177334e-07,0.0,1.0,-0.999960625461639,0.008873980299981307,-5.7641038767457417e-08,
  -0.951058,0.0,0.309013,1.0,-0.951057331086145,-8.671557238488273e-07,0.3090144866936615,
  -0.947213,0.276397,0.162458,1.0,-0.9496280396827057,0.2724178616838374,0.1549035018454631,
  -0.951058,0.0,0.309013,1.0,-0.951057331086145,-8.671557238488273e-07,0.3090144866936615,
  -0.860698,0.2511510000000001,0.442858,1.0,-0.8649867092922593,0.24306239483169045,0.43899734050040895,
  -0.947213,0.276397,0.162458,1.0,-0.9496280396827057,0.2724178616838374,0.1549035018454631,
  -0.947213,0.276397,0.162458,1.0,-0.9496280396827057,0.2724178616838374,0.1549035018454631,
  -0.860698,0.2511510000000001,0.442858,1.0,-0.8649867092922593,0.24306239483169045,0.43899734050040895,
  -0.812729,0.5023010000000001,0.2952379999999999,1.0,-0.8151843815554107,0.5038178905016056,0.28573056763082694,
  -0.860698,0.2511510000000001,0.442858,1.0,-0.8649867092922593,0.24306239483169045,0.43899734050040895,
  -0.723607,0.44721999999999995,0.525725,1.0,-0.7236067216830413,0.4472196513214834,0.5257260653677087,
  -0.812729,0.5023010000000001,0.2952379999999999,1.0,-0.8151843815554107,0.5038178905016056,0.28573056763082694,
  -0.687159,0.25115200000000004,0.6817150000000001,1.0,-0.6848115755465203,0.24306396103886968,0.6869883673262506,
  -0.531941,0.502302,0.6817120000000001,1.0,-0.5236576234680893,0.50381866852951,0.6869857659550921,
  -0.723607,0.44721999999999995,0.525725,1.0,-0.7236067216830413,0.4472196513214834,0.5257260653677087,
  -0.587786,0.0,0.8090169999999999,1.0,-0.5877858058415312,4.349631417008017e-07,0.8090165921976091,
  -0.44721600000000006,0.276397,0.8506480000000001,1.0,-0.440777780043386,0.2724176399428321,0.8552798244247329,
  -0.687159,0.25115200000000004,0.6817150000000001,1.0,-0.6848115755465203,0.24306396103886968,0.6869883673262506,
  -0.43600700000000003,-0.25115200000000004,0.864188,1.0,-0.4417470436660011,-0.2430638114471244,0.8635852783466985,
  -0.309017,-1.0000000000287557e-06,0.9510559999999999,1.0,-0.30900470758363174,0.008872576054985893,0.9510191207779699,
  -0.587786,0.0,0.8090169999999999,1.0,-0.5877858058415312,4.349631417008017e-07,0.8090165921976091,
  -0.687159,0.25115200000000004,0.6817150000000001,1.0,-0.6848115755465203,0.24306396103886968,0.6869883673262506,
  -0.44721600000000006,0.276397,0.8506480000000001,1.0,-0.440777780043386,0.2724176399428321,0.8552798244247329,
  -0.531941,0.502302,0.6817120000000001,1.0,-0.5236576234680893,0.50381866852951,0.6869857659550921,
  -0.44721600000000006,0.276397,0.8506480000000001,1.0,-0.440777780043386,0.2724176399428321,0.8552798244247329,
  -0.262869,0.525738,0.8090120000000001,1.0,-0.26286917763817624,0.5257368727147139,0.8090120741472168,
  -0.531941,0.502302,0.6817120000000001,1.0,-0.5236576234680893,0.50381866852951,0.6869857659550921,
  -0.587786,0.0,0.8090169999999999,1.0,-0.5877858058415312,4.349631417008017e-07,0.8090165921976091,
  -0.309017,-1.0000000000287557e-06,0.9510559999999999,1.0,-0.30900470758363174,0.008872576054985893,0.9510191207779699,
  -0.44721600000000006,0.276397,0.8506480000000001,1.0,-0.440777780043386,0.2724176399428321,0.8552798244247329,
  -0.309017,-1.0000000000287557e-06,0.9510559999999999,1.0,-0.30900470758363174,0.008872576054985893,0.9510191207779699,
  -0.13819899999999996,0.276397,0.951055,1.0,-0.14613018086329244,0.2724171419127992,0.9510178079473188,
  -0.44721600000000006,0.276397,0.8506480000000001,1.0,-0.440777780043386,0.2724176399428321,0.8552798244247329,
  -0.44721600000000006,0.276397,0.8506480000000001,1.0,-0.440777780043386,0.2724176399428321,0.8552798244247329,
  -0.13819899999999996,0.276397,0.951055,1.0,-0.14613018086329244,0.2724171419127992,0.9510178079473188,
  -0.262869,0.525738,0.8090120000000001,1.0,-0.26286917763817624,0.5257368727147139,0.8090120741472168,
  -0.13819899999999996,0.276397,0.951055,1.0,-0.14613018086329244,0.2724171419127992,0.9510178079473188,
  0.02963899999999997,0.502302,0.8641839999999998,1.0,0.01983839534895446,0.5038189457553266,0.8635814425796619,
  -0.262869,0.525738,0.8090120000000001,1.0,-0.26286917763817624,0.5257368727147139,0.8090120741472168,
  -0.43600700000000003,-0.25115200000000004,0.864188,1.0,-0.4417470436660011,-0.2430638114471244,0.8635852783466985,
  -0.155215,-0.25115200000000004,0.955422,1.0,-0.15021677729008256,-0.24306351370824936,0.9583084305819194,
  -0.309017,-1.0000000000287557e-06,0.9510559999999999,1.0,-0.30900470758363174,0.008872576054985893,0.9510191207779699,
  -0.155215,-0.25115200000000004,0.955422,1.0,-0.15021677729008256,-0.24306351370824936,0.9583084305819194,
  0.0,0.0,1.0,1.0,-6.802996438484687e-08,1.7058485892572035e-07,0.9999999999999832,
  -0.309017,-1.0000000000287557e-06,0.9510559999999999,1.0,-0.30900470758363174,0.008872576054985893,0.9510191207779699,
  -0.309017,-1.0000000000287557e-06,0.9510559999999999,1.0,-0.30900470758363174,0.008872576054985893,0.9510191207779699,
  0.0,0.0,1.0,1.0,-6.802996438484687e-08,1.7058485892572035e-07,0.9999999999999832,
  -0.13819899999999996,0.276397,0.951055,1.0,-0.14613018086329244,0.2724171419127992,0.9510178079473188,
  0.0,0.0,1.0,1.0,-6.802996438484687e-08,1.7058485892572035e-07,0.9999999999999832,
  0.1552150000000001,0.25115200000000004,0.955422,1.0,0.15021657377136222,0.24306347133980513,0.9583084732301164,
  -0.13819899999999996,0.276397,0.951055,1.0,-0.14613018086329244,0.2724171419127992,0.9510178079473188,
  -0.13819899999999996,0.276397,0.951055,1.0,-0.14613018086329244,0.2724171419127992,0.9510178079473188,
  0.1552150000000001,0.25115200000000004,0.955422,1.0,0.15021657377136222,0.24306347133980513,0.9583084732301164,
  0.02963899999999997,0.502302,0.8641839999999998,1.0,0.01983839534895446,0.5038189457553266,0.8635814425796619,
  0.1552150000000001,0.25115200000000004,0.955422,1.0,0.15021657377136222,0.24306347133980513,0.9583084732301164,
  0.2763880000000001,0.44721999999999995,0.850649,1.0,0.27638775259514803,0.44721995820039745,0.8506492339399583,
  0.02963899999999997,0.502302,0.8641839999999998,1.0,0.01983839534895446,0.5038189457553266,0.8635814425796619,
  0.43600700000000003,0.25115200000000004,0.864188,1.0,0.4417474635405354,0.24306379703966605,0.8635850676245875,
  0.48397099999999993,0.502302,0.7165650000000001,1.0,0.4915465997259058,0.5038185159472155,0.7103160164931138,
  0.2763880000000001,0.44721999999999995,0.850649,1.0,0.27638775259514803,0.44721995820039745,0.8506492339399583,
  0.5877859999999999,0.0,0.8090169999999999,1.0,0.5877853232201069,3.613410911975069e-08,0.8090169428429995,
  0.67082,0.2763960000000001,0.6881900000000001,1.0,0.6772144971664549,0.27241774977147326,0.6834976916106101,
  0.43600700000000003,0.25115200000000004,0.864188,1.0,0.4417474635405354,0.24306379703966605,0.8635850676245875,
  0.6871589999999999,-0.25115200000000004,0.6817150000000001,1.0,0.6848111757491196,-0.24306484466307332,0.6869884532203029,
  0.8090190000000002,-1.999999999946489e-06,0.5877829999999999,1.0,0.8089866848506967,0.008871945415033243,0.5877600125211242,
  0.5877859999999999,0.0,0.8090169999999999,1.0,0.5877853232201069,3.613410911975069e-08,0.8090169428429995,
  0.43600700000000003,0.25115200000000004,0.864188,1.0,0.4417474635405354,0.24306379703966605,0.8635850676245875,
  0.67082,0.2763960000000001,0.6881900000000001,1.0,0.6772144971664549,0.27241774977147326,0.6834976916106101,
  0.48397099999999993,0.502302,0.7165650000000001,1.0,0.4915465997259058,0.5038185159472155,0.7103160164931138,
  0.67082,0.2763960000000001,0.6881900000000001,1.0,0.6772144971664549,0.27241774977147326,0.6834976916106101,
  0.6881889999999999,0.525736,0.499997,1.0,0.6881896241859202,0.5257346676673482,0.49999810037193615,
  0.48397099999999993,0.502302,0.7165650000000001,1.0,0.4915465997259058,0.5038185159472155,0.7103160164931138,
  0.5877859999999999,0.0,0.8090169999999999,1.0,0.5877853232201069,3.613410911975069e-08,0.8090169428429995,
  0.8090190000000002,-1.999999999946489e-06,0.5877829999999999,1.0,0.8089866848506967,0.008871945415033243,0.5877600125211242,
  0.67082,0.2763960000000001,0.6881900000000001,1.0,0.6772144971664549,0.27241774977147326,0.6834976916106101,
  0.8090190000000002,-1.999999999946489e-06,0.5877829999999999,1.0,0.8089866848506967,0.008871945415033243,0.5877600125211242,
  0.861804,0.27639400000000003,0.4253230000000001,1.0,0.8593173212717677,0.2724158342746917,0.43285488861596255,
  0.67082,0.2763960000000001,0.6881900000000001,1.0,0.6772144971664549,0.27241774977147326,0.6834976916106101,
  0.67082,0.2763960000000001,0.6881900000000001,1.0,0.6772144971664549,0.27241774977147326,0.6834976916106101,
  0.861804,0.27639400000000003,0.4253230000000001,1.0,0.8593173212717677,0.2724158342746917,0.43285488861596255,
  0.6881889999999999,0.525736,0.499997,1.0,0.6881896241859202,0.5257346676673482,0.49999810037193615,
  0.861804,0.27639400000000003,0.4253230000000001,1.0,0.8593173212717677,0.2724158342746917,0.43285488861596255,
  0.831051,0.502299,0.23885299999999998,1.0,0.8274487904509396,0.5038149163054394,0.24798997820359664,
  0.6881889999999999,0.525736,0.499997,1.0,0.6881896241859202,0.5257346676673482,0.49999810037193615,
  0.6871589999999999,-0.25115200000000004,0.6817150000000001,1.0,0.6848111757491196,-0.24306484466307332,0.6869884532203029,
  0.860698,-0.251151,0.442858,1.0,0.864986890060841,-0.24306353018273283,0.4389963557001157,
  0.8090190000000002,-1.999999999946489e-06,0.5877829999999999,1.0,0.8089866848506967,0.008871945415033243,0.5877600125211242,
  0.860698,-0.251151,0.442858,1.0,0.864986890060841,-0.24306353018273283,0.4389963557001157,
  0.951058,0.0,0.309013,1.0,0.9510576790560566,4.844418859218338e-07,0.30901341574156965,
  0.8090190000000002,-1.999999999946489e-06,0.5877829999999999,1.0,0.8089866848506967,0.008871945415033243,0.5877600125211242,
  0.8090190000000002,-1.999999999946489e-06,0.5877829999999999,1.0,0.8089866848506967,0.008871945415033243,0.5877600125211242,
  0.951058,0.0,0.309013,1.0,0.9510576790560566,4.844418859218338e-07,0.30901341574156965,
  0.861804,0.27639400000000003,0.4253230000000001,1.0,0.8593173212717677,0.2724158342746917,0.43285488861596255,
  0.951058,0.0,0.309013,1.0,0.9510576790560566,4.844418859218338e-07,0.30901341574156965,
  0.956626,0.25114900000000007,0.14761800000000003,1.0,0.9578261805030606,0.24306129258052184,0.15326518192989683,
  0.861804,0.27639400000000003,0.4253230000000001,1.0,0.8593173212717677,0.2724158342746917,0.43285488861596255,
  0.861804,0.27639400000000003,0.4253230000000001,1.0,0.8593173212717677,0.2724158342746917,0.43285488861596255,
  0.956626,0.25114900000000007,0.14761800000000003,1.0,0.9578261805030606,0.24306129258052184,0.15326518192989683,
  0.831051,0.502299,0.23885299999999998,1.0,0.8274487904509396,0.5038149163054394,0.24798997820359664,
  0.956626,0.25114900000000007,0.14761800000000003,1.0,0.9578261805030606,0.24306129258052184,0.15326518192989683,
  0.8944260000000002,0.44721600000000006,0.0,1.0,0.8944264388330799,0.4472150998304671,-7.024693876715296e-18,
  0.831051,0.502299,0.23885299999999998,1.0,0.8274487904509396,0.5038149163054394,0.24798997820359664,
  0.43600700000000003,0.25115200000000004,-0.864188,1.0,0.44174743584464,0.2430637566759591,-0.8635850931525253,
  0.1552150000000001,0.25115200000000004,-0.955422,1.0,0.15021657377136222,0.24306347133980513,-0.9583084732301164,
  0.2763880000000001,0.44721999999999995,-0.850649,1.0,0.27638775259514836,0.44721995820039734,-0.8506492339399583,
  0.5877859999999999,0.0,-0.809017,1.0,0.5877858829948915,-2.554691144635855e-08,-0.809016536142442,
  0.3090169999999999,0.0,-0.951056,1.0,0.3090047066659712,-0.008872910630520342,-0.9510191179546391,
  0.43600700000000003,0.25115200000000004,-0.864188,1.0,0.44174743584464,0.2430637566759591,-0.8635850931525253,
  0.6871589999999999,-0.25115200000000004,-0.681715,1.0,0.6848117102472356,-0.2430639714860927,-0.6869882293559796,
  0.44721600000000006,-0.2763979999999999,-0.850648,1.0,0.4407780664296207,-0.27241829131158907,-0.8552794693627569,
  0.5877859999999999,0.0,-0.809017,1.0,0.5877858829948915,-2.554691144635855e-08,-0.809016536142442,
  0.43600700000000003,0.25115200000000004,-0.864188,1.0,0.44174743584464,0.2430637566759591,-0.8635850931525253,
  0.3090169999999999,0.0,-0.951056,1.0,0.3090047066659712,-0.008872910630520342,-0.9510191179546391,
  0.1552150000000001,0.25115200000000004,-0.955422,1.0,0.15021657377136222,0.24306347133980513,-0.9583084732301164,
  0.3090169999999999,0.0,-0.951056,1.0,0.3090047066659712,-0.008872910630520342,-0.9510191179546391,
  0.0,0.0,-1.0,1.0,8.386527000463054e-07,1.0350315843348408e-07,-0.999999999999643,
  0.1552150000000001,0.25115200000000004,-0.955422,1.0,0.15021657377136222,0.24306347133980513,-0.9583084732301164,
  0.5877859999999999,0.0,-0.809017,1.0,0.5877858829948915,-2.554691144635855e-08,-0.809016536142442,
  0.44721600000000006,-0.2763979999999999,-0.850648,1.0,0.4407780664296207,-0.27241829131158907,-0.8552794693627569,
  0.3090169999999999,0.0,-0.951056,1.0,0.3090047066659712,-0.008872910630520342,-0.9510191179546391,
  0.44721600000000006,-0.2763979999999999,-0.850648,1.0,0.4407780664296207,-0.27241829131158907,-0.8552794693627569,
  0.13819899999999996,-0.2763979999999999,-0.951055,1.0,0.14612974047217775,-0.27241779329109583,-0.9510176890299905,
  0.3090169999999999,0.0,-0.951056,1.0,0.3090047066659712,-0.008872910630520342,-0.9510191179546391,
  0.3090169999999999,0.0,-0.951056,1.0,0.3090047066659712,-0.008872910630520342,-0.9510191179546391,
  0.13819899999999996,-0.2763979999999999,-0.951055,1.0,0.14612974047217775,-0.27241779329109583,-0.9510176890299905,
  0.0,0.0,-1.0,1.0,8.386527000463054e-07,1.0350315843348408e-07,-0.999999999999643,
  0.13819899999999996,-0.2763979999999999,-0.951055,1.0,0.14612974047217775,-0.27241779329109583,-0.9510176890299905,
  -0.155215,-0.25115200000000004,-0.955422,1.0,-0.1502164527684422,-0.24306415178722385,-0.9583083196099383,
  0.0,0.0,-1.0,1.0,8.386527000463054e-07,1.0350315843348408e-07,-0.999999999999643,
  0.6871589999999999,-0.25115200000000004,-0.681715,1.0,0.6848117102472356,-0.2430639714860927,-0.6869882293559796,
  0.531941,-0.502302,-0.681712,1.0,0.5236579140350146,-0.503818798851909,-0.6869854488938736,
  0.44721600000000006,-0.2763979999999999,-0.850648,1.0,0.4407780664296207,-0.27241829131158907,-0.8552794693627569,
  0.531941,-0.502302,-0.681712,1.0,0.5236579140350146,-0.503818798851909,-0.6869854488938736,
  0.262869,-0.525738,-0.809012,1.0,0.26286895228372437,-0.5257372320187721,-0.8090119138767345,
  0.44721600000000006,-0.2763979999999999,-0.850648,1.0,0.4407780664296207,-0.27241829131158907,-0.8552794693627569,
  0.44721600000000006,-0.2763979999999999,-0.850648,1.0,0.4407780664296207,-0.27241829131158907,-0.8552794693627569,
  0.262869,-0.525738,-0.809012,1.0,0.26286895228372437,-0.5257372320187721,-0.8090119138767345,
  0.13819899999999996,-0.2763979999999999,-0.951055,1.0,0.14612974047217775,-0.27241779329109583,-0.9510176890299905,
  0.262869,-0.525738,-0.809012,1.0,0.26286895228372437,-0.5257372320187721,-0.8090119138767345,
  -0.02963899999999997,-0.502302,-0.864184,1.0,-0.019838720158978862,-0.5038191057760348,-0.8635813417608618,
  0.13819899999999996,-0.2763979999999999,-0.951055,1.0,0.14612974047217775,-0.27241779329109583,-0.9510176890299905,
  0.13819899999999996,-0.2763979999999999,-0.951055,1.0,0.14612974047217775,-0.27241779329109583,-0.9510176890299905,
  -0.02963899999999997,-0.502302,-0.864184,1.0,-0.019838720158978862,-0.5038191057760348,-0.8635813417608618,
  -0.155215,-0.25115200000000004,-0.955422,1.0,-0.1502164527684422,-0.24306415178722385,-0.9583083196099383,
  -0.02963899999999997,-0.502302,-0.864184,1.0,-0.019838720158978862,-0.5038191057760348,-0.8635813417608618,
  -0.2763880000000001,-0.44721999999999995,-0.850649,1.0,-0.2763877525951483,-0.44721995820039734,-0.8506492339399583,
  -0.155215,-0.25115200000000004,-0.955422,1.0,-0.1502164527684422,-0.24306415178722385,-0.9583083196099383,
  -0.687159,0.25115200000000004,-0.681715,1.0,-0.6848117463759701,0.2430639454016199,-0.6869882025706792,
  -0.860698,0.2511510000000001,-0.442858,1.0,-0.8649868290678857,0.2430624631623782,-0.43899706666505395,
  -0.723607,0.44721999999999995,-0.525725,1.0,-0.7236067216830412,0.44721965132148317,-0.5257260653677089,
  -0.587786,0.0,-0.809017,1.0,-0.5877863671165282,8.898111888585574e-08,-0.8090161844066818,
  -0.809018,0.0,-0.587783,1.0,-0.8089865397400394,-0.008873289185182267,-0.587760191964779,
  -0.687159,0.25115200000000004,-0.681715,1.0,-0.6848117463759701,0.2430639454016199,-0.6869882025706792,
  -0.43600700000000003,-0.25115200000000004,-0.864188,1.0,-0.4417472320955005,-0.24306420283334987,-0.8635850718006606,
  -0.670819,-0.276397,-0.688191,1.0,-0.6772137611074175,-0.2724178575158659,-0.6834983779594587,
  -0.587786,0.0,-0.809017,1.0,-0.5877863671165282,8.898111888585574e-08,-0.8090161844066818,
  -0.687159,0.25115200000000004,-0.681715,1.0,-0.6848117463759701,0.2430639454016199,-0.6869882025706792,
  -0.809018,0.0,-0.587783,1.0,-0.8089865397400394,-0.008873289185182267,-0.587760191964779,
  -0.860698,0.2511510000000001,-0.442858,1.0,-0.8649868290678857,0.2430624631623782,-0.43899706666505395,
  -0.809018,0.0,-0.587783,1.0,-0.8089865397400394,-0.008873289185182267,-0.587760191964779,
  -0.951058,0.0,-0.309013,1.0,-0.9510573479382253,-7.330831644240639e-07,-0.30901443482816815,
  -0.860698,0.2511510000000001,-0.442858,1.0,-0.8649868290678857,0.2430624631623782,-0.43899706666505395,
  -0.587786,0.0,-0.809017,1.0,-0.5877863671165282,8.898111888585574e-08,-0.8090161844066818,
  -0.670819,-0.276397,-0.688191,1.0,-0.6772137611074175,-0.2724178575158659,-0.6834983779594587,
  -0.809018,0.0,-0.587783,1.0,-0.8089865397400394,-0.008873289185182267,-0.587760191964779,
  -0.670819,-0.276397,-0.688191,1.0,-0.6772137611074175,-0.2724178575158659,-0.6834983779594587,
  -0.861803,-0.276396,-0.42532400000000004,1.0,-0.8593167049440582,-0.2724165069227901,-0.43285568883875336,
  -0.809018,0.0,-0.587783,1.0,-0.8089865397400394,-0.008873289185182267,-0.587760191964779,
  -0.809018,0.0,-0.587783,1.0,-0.8089865397400394,-0.008873289185182267,-0.587760191964779,
  -0.861803,-0.276396,-0.42532400000000004,1.0,-0.8593167049440582,-0.2724165069227901,-0.43285568883875336,
  -0.951058,0.0,-0.309013,1.0,-0.9510573479382253,-7.330831644240639e-07,-0.30901443482816815,
  -0.861803,-0.276396,-0.42532400000000004,1.0,-0.8593167049440582,-0.2724165069227901,-0.43285568883875336,
  -0.956626,-0.25114900000000007,-0.14761800000000003,1.0,-0.9578262170326509,-0.24306111405524766,-0.15326523676014436,
  -0.951058,0.0,-0.309013,1.0,-0.9510573479382253,-7.330831644240639e-07,-0.30901443482816815,
  -0.43600700000000003,-0.25115200000000004,-0.864188,1.0,-0.4417472320955005,-0.24306420283334987,-0.8635850718006606,
  -0.48397099999999993,-0.502302,-0.716565,1.0,-0.4915461091474215,-0.5038186497816622,-0.7103162610515219,
  -0.670819,-0.276397,-0.688191,1.0,-0.6772137611074175,-0.2724178575158659,-0.6834983779594587,
  -0.48397099999999993,-0.502302,-0.716565,1.0,-0.4915461091474215,-0.5038186497816622,-0.7103162610515219,
  -0.688189,-0.525736,-0.499997,1.0,-0.6881896629138985,-0.5257350598001616,-0.4999976347497809,
  -0.670819,-0.276397,-0.688191,1.0,-0.6772137611074175,-0.2724178575158659,-0.6834983779594587,
  -0.670819,-0.276397,-0.688191,1.0,-0.6772137611074175,-0.2724178575158659,-0.6834983779594587,
  -0.688189,-0.525736,-0.499997,1.0,-0.6881896629138985,-0.5257350598001616,-0.4999976347497809,
  -0.861803,-0.276396,-0.42532400000000004,1.0,-0.8593167049440582,-0.2724165069227901,-0.43285568883875336,
  -0.688189,-0.525736,-0.499997,1.0,-0.6881896629138985,-0.5257350598001616,-0.4999976347497809,
  -0.831051,-0.502299,-0.23885299999999998,1.0,-0.827448675299351,-0.503815221812631,-0.24798974175404667,
  -0.861803,-0.276396,-0.42532400000000004,1.0,-0.8593167049440582,-0.2724165069227901,-0.43285568883875336,
  -0.861803,-0.276396,-0.42532400000000004,1.0,-0.8593167049440582,-0.2724165069227901,-0.43285568883875336,
  -0.831051,-0.502299,-0.23885299999999998,1.0,-0.827448675299351,-0.503815221812631,-0.24798974175404667,
  -0.956626,-0.25114900000000007,-0.14761800000000003,1.0,-0.9578262170326509,-0.24306111405524766,-0.15326523676014436,
  -0.831051,-0.502299,-0.23885299999999998,1.0,-0.827448675299351,-0.503815221812631,-0.24798974175404667,
  -0.894426,-0.44721600000000006,0.0,1.0,-0.8944264388330798,-0.44721509983046726,3.5123469383576465e-18,
  -0.956626,-0.25114900000000007,-0.14761800000000003,1.0,-0.9578262170326509,-0.24306111405524766,-0.15326523676014436,
  -0.860698,0.2511510000000001,0.442858,1.0,-0.8649867092922593,0.24306239483169045,0.43899734050040895,
  -0.687159,0.25115200000000004,0.6817150000000001,1.0,-0.6848115755465203,0.24306396103886968,0.6869883673262506,
  -0.723607,0.44721999999999995,0.525725,1.0,-0.7236067216830413,0.4472196513214834,0.5257260653677087,
  -0.951058,0.0,0.309013,1.0,-0.951057331086145,-8.671557238488273e-07,0.3090144866936615,
  -0.809018,0.0,0.5877829999999999,1.0,-0.8089865397400394,-0.008873289185182359,0.5877601919647789,
  -0.860698,0.2511510000000001,0.442858,1.0,-0.8649867092922593,0.24306239483169045,0.43899734050040895,
  -0.956626,-0.25114900000000007,0.14761800000000003,1.0,-0.9578262170326509,-0.24306111405524763,0.1532652367601444,
  -0.861803,-0.276396,0.42532400000000004,1.0,-0.8593167049440582,-0.2724165069227901,0.43285568883875347,
  -0.951058,0.0,0.309013,1.0,-0.951057331086145,-8.671557238488273e-07,0.3090144866936615,
  -0.860698,0.2511510000000001,0.442858,1.0,-0.8649867092922593,0.24306239483169045,0.43899734050040895,
  -0.809018,0.0,0.5877829999999999,1.0,-0.8089865397400394,-0.008873289185182359,0.5877601919647789,
  -0.687159,0.25115200000000004,0.6817150000000001,1.0,-0.6848115755465203,0.24306396103886968,0.6869883673262506,
  -0.809018,0.0,0.5877829999999999,1.0,-0.8089865397400394,-0.008873289185182359,0.5877601919647789,
  -0.587786,0.0,0.8090169999999999,1.0,-0.5877858058415312,4.349631417008017e-07,0.8090165921976091,
  -0.687159,0.25115200000000004,0.6817150000000001,1.0,-0.6848115755465203,0.24306396103886968,0.6869883673262506,
  -0.951058,0.0,0.309013,1.0,-0.951057331086145,-8.671557238488273e-07,0.3090144866936615,
  -0.861803,-0.276396,0.42532400000000004,1.0,-0.8593167049440582,-0.2724165069227901,0.43285568883875347,
  -0.809018,0.0,0.5877829999999999,1.0,-0.8089865397400394,-0.008873289185182359,0.5877601919647789,
  -0.861803,-0.276396,0.42532400000000004,1.0,-0.8593167049440582,-0.2724165069227901,0.43285568883875347,
  -0.670819,-0.276397,0.688191,1.0,-0.6772137611074175,-0.2724178575158658,0.6834983779594588,
  -0.809018,0.0,0.5877829999999999,1.0,-0.8089865397400394,-0.008873289185182359,0.5877601919647789,
  -0.809018,0.0,0.5877829999999999,1.0,-0.8089865397400394,-0.008873289185182359,0.5877601919647789,
  -0.670819,-0.276397,0.688191,1.0,-0.6772137611074175,-0.2724178575158658,0.6834983779594588,
  -0.587786,0.0,0.8090169999999999,1.0,-0.5877858058415312,4.349631417008017e-07,0.8090165921976091,
  -0.670819,-0.276397,0.688191,1.0,-0.6772137611074175,-0.2724178575158658,0.6834983779594588,
  -0.43600700000000003,-0.25115200000000004,0.864188,1.0,-0.4417470436660011,-0.2430638114471244,0.8635852783466985,
  -0.587786,0.0,0.8090169999999999,1.0,-0.5877858058415312,4.349631417008017e-07,0.8090165921976091,
  -0.956626,-0.25114900000000007,0.14761800000000003,1.0,-0.9578262170326509,-0.24306111405524763,0.1532652367601444,
  -0.831051,-0.502299,0.23885299999999998,1.0,-0.8274488479658778,-0.5038149789897272,0.24798965894876002,
  -0.861803,-0.276396,0.42532400000000004,1.0,-0.8593167049440582,-0.2724165069227901,0.43285568883875347,
  -0.831051,-0.502299,0.23885299999999998,1.0,-0.8274488479658778,-0.5038149789897272,0.24798965894876002,
  -0.688189,-0.525736,0.499997,1.0,-0.6881895511641616,-0.5257349869564159,0.49999786515384953,
  -0.861803,-0.276396,0.42532400000000004,1.0,-0.8593167049440582,-0.2724165069227901,0.43285568883875347,
  -0.861803,-0.276396,0.42532400000000004,1.0,-0.8593167049440582,-0.2724165069227901,0.43285568883875347,
  -0.688189,-0.525736,0.499997,1.0,-0.6881895511641616,-0.5257349869564159,0.49999786515384953,
  -0.670819,-0.276397,0.688191,1.0,-0.6772137611074175,-0.2724178575158658,0.6834983779594588,
  -0.688189,-0.525736,0.499997,1.0,-0.6881895511641616,-0.5257349869564159,0.49999786515384953,
  -0.48397099999999993,-0.502302,0.7165650000000001,1.0,-0.49154612462755637,-0.503818632525199,0.7103162625789089,
  -0.670819,-0.276397,0.688191,1.0,-0.6772137611074175,-0.2724178575158658,0.6834983779594588,
  -0.670819,-0.276397,0.688191,1.0,-0.6772137611074175,-0.2724178575158658,0.6834983779594588,
  -0.48397099999999993,-0.502302,0.7165650000000001,1.0,-0.49154612462755637,-0.503818632525199,0.7103162625789089,
  -0.43600700000000003,-0.25115200000000004,0.864188,1.0,-0.4417470436660011,-0.2430638114471244,0.8635852783466985,
  -0.48397099999999993,-0.502302,0.7165650000000001,1.0,-0.49154612462755637,-0.503818632525199,0.7103162625789089,
  -0.2763880000000001,-0.44721999999999995,0.850649,1.0,-0.27638775259514803,-0.44721995820039745,0.8506492339399584,
  -0.43600700000000003,-0.25115200000000004,0.864188,1.0,-0.4417470436660011,-0.2430638114471244,0.8635852783466985,
  0.1552150000000001,0.25115200000000004,0.955422,1.0,0.15021657377136222,0.24306347133980513,0.9583084732301164,
  0.43600700000000003,0.25115200000000004,0.864188,1.0,0.4417474635405354,0.24306379703966605,0.8635850676245875,
  0.2763880000000001,0.44721999999999995,0.850649,1.0,0.27638775259514803,0.44721995820039745,0.8506492339399583,
  0.0,0.0,1.0,1.0,-6.802996438484687e-08,1.7058485892572035e-07,0.9999999999999832,
  0.3090169999999999,0.0,0.9510559999999999,1.0,0.30900470666597124,-0.008872910630520276,0.9510191179546391,
  0.1552150000000001,0.25115200000000004,0.955422,1.0,0.15021657377136222,0.24306347133980513,0.9583084732301164,
  -0.155215,-0.25115200000000004,0.955422,1.0,-0.15021677729008256,-0.24306351370824936,0.9583084305819194,
  0.13819899999999996,-0.2763979999999999,0.951055,1.0,0.14612974047217758,-0.2724177932910958,0.9510176890299905,
  0.0,0.0,1.0,1.0,-6.802996438484687e-08,1.7058485892572035e-07,0.9999999999999832,
  0.1552150000000001,0.25115200000000004,0.955422,1.0,0.15021657377136222,0.24306347133980513,0.9583084732301164,
  0.3090169999999999,0.0,0.9510559999999999,1.0,0.30900470666597124,-0.008872910630520276,0.9510191179546391,
  0.43600700000000003,0.25115200000000004,0.864188,1.0,0.4417474635405354,0.24306379703966605,0.8635850676245875,
  0.3090169999999999,0.0,0.9510559999999999,1.0,0.30900470666597124,-0.008872910630520276,0.9510191179546391,
  0.5877859999999999,0.0,0.8090169999999999,1.0,0.5877853232201069,3.613410911975069e-08,0.8090169428429995,
  0.43600700000000003,0.25115200000000004,0.864188,1.0,0.4417474635405354,0.24306379703966605,0.8635850676245875,
  0.0,0.0,1.0,1.0,-6.802996438484687e-08,1.7058485892572035e-07,0.9999999999999832,
  0.13819899999999996,-0.2763979999999999,0.951055,1.0,0.14612974047217758,-0.2724177932910958,0.9510176890299905,
  0.3090169999999999,0.0,0.9510559999999999,1.0,0.30900470666597124,-0.008872910630520276,0.9510191179546391,
  0.13819899999999996,-0.2763979999999999,0.951055,1.0,0.14612974047217758,-0.2724177932910958,0.9510176890299905,
  0.44721600000000006,-0.2763979999999999,0.8506480000000001,1.0,0.44077806642962053,-0.27241829131158873,0.8552794693627571,
  0.3090169999999999,0.0,0.9510559999999999,1.0,0.30900470666597124,-0.008872910630520276,0.9510191179546391,
  0.3090169999999999,0.0,0.9510559999999999,1.0,0.30900470666597124,-0.008872910630520276,0.9510191179546391,
  0.44721600000000006,-0.2763979999999999,0.8506480000000001,1.0,0.44077806642962053,-0.27241829131158873,0.8552794693627571,
  0.5877859999999999,0.0,0.8090169999999999,1.0,0.5877853232201069,3.613410911975069e-08,0.8090169428429995,
  0.44721600000000006,-0.2763979999999999,0.8506480000000001,1.0,0.44077806642962053,-0.27241829131158873,0.8552794693627571,
  0.6871589999999999,-0.25115200000000004,0.6817150000000001,1.0,0.6848111757491196,-0.24306484466307332,0.6869884532203029,
  0.5877859999999999,0.0,0.8090169999999999,1.0,0.5877853232201069,3.613410911975069e-08,0.8090169428429995,
  -0.155215,-0.25115200000000004,0.955422,1.0,-0.15021677729008256,-0.24306351370824936,0.9583084305819194,
  -0.02963899999999997,-0.502302,0.8641839999999998,1.0,-0.019838689717257413,-0.5038192559913451,0.8635812548235572,
  0.13819899999999996,-0.2763979999999999,0.951055,1.0,0.14612974047217758,-0.2724177932910958,0.9510176890299905,
  -0.02963899999999997,-0.502302,0.8641839999999998,1.0,-0.019838689717257413,-0.5038192559913451,0.8635812548235572,
  0.262869,-0.525738,0.8090120000000001,1.0,0.26286888259023233,-0.5257372188438393,0.8090119450836976,
  0.13819899999999996,-0.2763979999999999,0.951055,1.0,0.14612974047217758,-0.2724177932910958,0.9510176890299905,
  0.13819899999999996,-0.2763979999999999,0.951055,1.0,0.14612974047217758,-0.2724177932910958,0.9510176890299905,
  0.262869,-0.525738,0.8090120000000001,1.0,0.26286888259023233,-0.5257372188438393,0.8090119450836976,
  0.44721600000000006,-0.2763979999999999,0.8506480000000001,1.0,0.44077806642962053,-0.27241829131158873,0.8552794693627571,
  0.262869,-0.525738,0.8090120000000001,1.0,0.26286888259023233,-0.5257372188438393,0.8090119450836976,
  0.531941,-0.502302,0.6817120000000001,1.0,0.5236580515960895,-0.5038185204865161,0.6869855481837774,
  0.44721600000000006,-0.2763979999999999,0.8506480000000001,1.0,0.44077806642962053,-0.27241829131158873,0.8552794693627571,
  0.44721600000000006,-0.2763979999999999,0.8506480000000001,1.0,0.44077806642962053,-0.27241829131158873,0.8552794693627571,
  0.531941,-0.502302,0.6817120000000001,1.0,0.5236580515960895,-0.5038185204865161,0.6869855481837774,
  0.6871589999999999,-0.25115200000000004,0.6817150000000001,1.0,0.6848111757491196,-0.24306484466307332,0.6869884532203029,
  0.531941,-0.502302,0.6817120000000001,1.0,0.5236580515960895,-0.5038185204865161,0.6869855481837774,
  0.7236069999999999,-0.44721999999999995,0.525725,1.0,0.7236067216830413,-0.4472196513214831,0.5257260653677089,
  0.6871589999999999,-0.25115200000000004,0.6817150000000001,1.0,0.6848111757491196,-0.24306484466307332,0.6869884532203029,
  0.956626,0.25114900000000007,0.14761800000000003,1.0,0.9578261805030606,0.24306129258052184,0.15326518192989683,
  0.956626,0.25114900000000007,-0.14761800000000003,1.0,0.9578262483355788,0.24306118218022527,-0.15326493309476094,
  0.8944260000000002,0.44721600000000006,0.0,1.0,0.8944264388330799,0.4472150998304671,-7.024693876715296e-18,
  0.951058,0.0,0.309013,1.0,0.9510576790560566,4.844418859218338e-07,0.30901341574156965,
  1.0,0.0,0.0,1.0,0.9999606296359095,-0.00887350991183931,0.0,
  0.956626,0.25114900000000007,0.14761800000000003,1.0,0.9578261805030606,0.24306129258052184,0.15326518192989683,
  0.860698,-0.251151,0.442858,1.0,0.864986890060841,-0.24306353018273283,0.4389963557001157,
  0.9472130000000001,-0.276396,0.162458,1.0,0.9496282556409833,-0.27241716831043955,0.15490339730937155,
  0.951058,0.0,0.309013,1.0,0.9510576790560566,4.844418859218338e-07,0.30901341574156965,
  0.956626,0.25114900000000007,0.14761800000000003,1.0,0.9578261805030606,0.24306129258052184,0.15326518192989683,
  1.0,0.0,0.0,1.0,0.9999606296359095,-0.00887350991183931,0.0,
  0.956626,0.25114900000000007,-0.14761800000000003,1.0,0.9578262483355788,0.24306118218022527,-0.15326493309476094,
  1.0,0.0,0.0,1.0,0.9999606296359095,-0.00887350991183931,0.0,
  0.951058,0.0,-0.309013,1.0,0.9510575012112954,5.074933413732154e-07,-0.30901396309789836,
  0.956626,0.25114900000000007,-0.14761800000000003,1.0,0.9578262483355788,0.24306118218022527,-0.15326493309476094,
  0.951058,0.0,0.309013,1.0,0.9510576790560566,4.844418859218338e-07,0.30901341574156965,
  0.9472130000000001,-0.276396,0.162458,1.0,0.9496282556409833,-0.27241716831043955,0.15490339730937155,
  1.0,0.0,0.0,1.0,0.9999606296359095,-0.00887350991183931,0.0,
  0.9472130000000001,-0.276396,0.162458,1.0,0.9496282556409833,-0.27241716831043955,0.15490339730937155,
  0.9472130000000001,-0.276396,-0.162458,1.0,0.9496282556409833,-0.27241716831043955,-0.15490339730937153,
  1.0,0.0,0.0,1.0,0.9999606296359095,-0.00887350991183931,0.0,
  1.0,0.0,0.0,1.0,0.9999606296359095,-0.00887350991183931,0.0,
  0.9472130000000001,-0.276396,-0.162458,1.0,0.9496282556409833,-0.27241716831043955,-0.15490339730937153,
  0.951058,0.0,-0.309013,1.0,0.9510575012112954,5.074933413732154e-07,-0.30901396309789836,
  0.9472130000000001,-0.276396,-0.162458,1.0,0.9496282556409833,-0.27241716831043955,-0.15490339730937153,
  0.860698,-0.251151,-0.442858,1.0,0.8649868190167103,-0.2430628154105527,-0.4389968914377966,
  0.951058,0.0,-0.309013,1.0,0.9510575012112954,5.074933413732154e-07,-0.30901396309789836,
  0.860698,-0.251151,0.442858,1.0,0.864986890060841,-0.24306353018273283,0.4389963557001157,
  0.812729,-0.502301,0.2952379999999999,1.0,0.8151848055269568,-0.503817229437447,0.2857305236756347,
  0.9472130000000001,-0.276396,0.162458,1.0,0.9496282556409833,-0.27241716831043955,0.15490339730937155,
  0.812729,-0.502301,0.2952379999999999,1.0,0.8151848055269568,-0.503817229437447,0.2857305236756347,
  0.8506480000000001,-0.525736,0.0,1.0,0.8506487792762305,-0.5257343952185694,-1.551196823478276e-07,
  0.9472130000000001,-0.276396,0.162458,1.0,0.9496282556409833,-0.27241716831043955,0.15490339730937155,
  0.9472130000000001,-0.276396,0.162458,1.0,0.9496282556409833,-0.27241716831043955,0.15490339730937155,
  0.8506480000000001,-0.525736,0.0,1.0,0.8506487792762305,-0.5257343952185694,-1.551196823478276e-07,
  0.9472130000000001,-0.276396,-0.162458,1.0,0.9496282556409833,-0.27241716831043955,-0.15490339730937153,
  0.8506480000000001,-0.525736,0.0,1.0,0.8506487792762305,-0.5257343952185694,-1.551196823478276e-07,
  0.812729,-0.502301,-0.295238,1.0,0.8151846510833864,-0.5038175802700607,-0.2857303456913148,
  0.9472130000000001,-0.276396,-0.162458,1.0,0.9496282556409833,-0.27241716831043955,-0.15490339730937153,
  0.9472130000000001,-0.276396,-0.162458,1.0,0.9496282556409833,-0.27241716831043955,-0.15490339730937153,
  0.812729,-0.502301,-0.295238,1.0,0.8151846510833864,-0.5038175802700607,-0.2857303456913148,
  0.860698,-0.251151,-0.442858,1.0,0.8649868190167103,-0.2430628154105527,-0.4389968914377966,
  0.812729,-0.502301,-0.295238,1.0,0.8151846510833864,-0.5038175802700607,-0.2857303456913148,
  0.7236069999999999,-0.44721999999999995,-0.525725,1.0,0.7236067216830413,-0.4472196513214831,-0.525726065367709,
  0.860698,-0.251151,-0.442858,1.0,0.8649868190167103,-0.2430628154105527,-0.4389968914377966,
  0.6095470000000001,-0.657519,-0.442856,1.0,0.60423092704266,-0.6649723365238669,-0.4389951918451463,
  0.531941,-0.502302,-0.681712,1.0,0.5236579140350146,-0.503818798851909,-0.6869854488938736,
  0.7236069999999999,-0.44721999999999995,-0.525725,1.0,0.7236067216830413,-0.4472196513214831,-0.525726065367709,
  0.4253230000000001,-0.850654,-0.3090109999999999,1.0,0.42532286056333185,-0.8506540013904963,-0.3090117056044348,
  0.3618030000000001,-0.723612,-0.587779,1.0,0.3538531927575634,-0.727551553663659,-0.5877556080012123,
  0.6095470000000001,-0.657519,-0.442856,1.0,0.60423092704266,-0.6649723365238669,-0.4389951918451463,
  0.20318100000000006,-0.96795,-0.14761800000000003,1.0,0.21095286907952562,-0.9654060533326492,-0.15326460522832558,
  0.1381969999999999,-0.894429,-0.42532100000000006,1.0,0.14064406863988954,-0.890425561238057,-0.4328528223892147,
  0.4253230000000001,-0.850654,-0.3090109999999999,1.0,0.42532286056333185,-0.8506540013904963,-0.3090117056044348,
  0.6095470000000001,-0.657519,-0.442856,1.0,0.60423092704266,-0.6649723365238669,-0.4389951918451463,
  0.3618030000000001,-0.723612,-0.587779,1.0,0.3538531927575634,-0.727551553663659,-0.5877556080012123,
  0.531941,-0.502302,-0.681712,1.0,0.5236579140350146,-0.503818798851909,-0.6869854488938736,
  0.3618030000000001,-0.723612,-0.587779,1.0,0.3538531927575634,-0.727551553663659,-0.5877556080012123,
  0.262869,-0.525738,-0.809012,1.0,0.26286895228372437,-0.5257372320187721,-0.8090119138767345,
  0.531941,-0.502302,-0.681712,1.0,0.5236579140350146,-0.503818798851909,-0.6869854488938736,
  0.4253230000000001,-0.850654,-0.3090109999999999,1.0,0.42532286056333185,-0.8506540013904963,-0.3090117056044348,
  0.1381969999999999,-0.894429,-0.42532100000000006,1.0,0.14064406863988954,-0.890425561238057,-0.4328528223892147,
  0.3618030000000001,-0.723612,-0.587779,1.0,0.3538531927575634,-0.727551553663659,-0.5877556080012123,
  0.1381969999999999,-0.894429,-0.42532100000000006,1.0,0.14064406863988954,-0.890425561238057,-0.4328528223892147,
  0.052788999999999975,-0.723611,-0.688186,1.0,0.05920646379214723,-0.7275510143742654,-0.683494049811852,
  0.3618030000000001,-0.723612,-0.587779,1.0,0.3538531927575634,-0.727551553663659,-0.5877556080012123,
  0.3618030000000001,-0.723612,-0.587779,1.0,0.3538531927575634,-0.727551553663659,-0.5877556080012123,
  0.052788999999999975,-0.723611,-0.688186,1.0,0.05920646379214723,-0.7275510143742654,-0.683494049811852,
  0.262869,-0.525738,-0.809012,1.0,0.26286895228372437,-0.5257372320187721,-0.8090119138767345,
  0.052788999999999975,-0.723611,-0.688186,1.0,0.05920646379214723,-0.7275510143742654,-0.683494049811852,
  -0.02963899999999997,-0.502302,-0.864184,1.0,-0.019838720158978862,-0.5038191057760348,-0.8635813417608618,
  0.262869,-0.525738,-0.809012,1.0,0.26286895228372437,-0.5257372320187721,-0.8090119138767345,
  0.20318100000000006,-0.96795,-0.14761800000000003,1.0,0.21095286907952562,-0.9654060533326492,-0.15326460522832558,
  -0.07760699999999998,-0.96795,-0.23885299999999998,1.0,-0.08057588379380852,-0.9654061724258667,-0.24798880860410688,
  0.1381969999999999,-0.894429,-0.42532100000000006,1.0,0.14064406863988954,-0.890425561238057,-0.4328528223892147,
  -0.07760699999999998,-0.96795,-0.23885299999999998,1.0,-0.08057588379380852,-0.9654061724258667,-0.24798880860410688,
  -0.16245599999999993,-0.850654,-0.49999499999999997,1.0,-0.1624559605874681,-0.8506538252498717,-0.4999961304423903,
  0.1381969999999999,-0.894429,-0.42532100000000006,1.0,0.14064406863988954,-0.890425561238057,-0.4328528223892147,
  0.1381969999999999,-0.894429,-0.42532100000000006,1.0,0.14064406863988954,-0.890425561238057,-0.4328528223892147,
  -0.16245599999999993,-0.850654,-0.49999499999999997,1.0,-0.1624559605874681,-0.8506538252498717,-0.4999961304423903,
  0.052788999999999975,-0.723611,-0.688186,1.0,0.05920646379214723,-0.7275510143742654,-0.683494049811852,
  -0.16245599999999993,-0.850654,-0.49999499999999997,1.0,-0.1624559605874681,-0.8506538252498717,-0.4999961304423903,
  -0.23282199999999997,-0.657519,-0.716563,1.0,-0.23079127648765035,-0.664972933661906,-0.7103142855062675,
  0.052788999999999975,-0.723611,-0.688186,1.0,0.05920646379214723,-0.7275510143742654,-0.683494049811852,
  0.052788999999999975,-0.723611,-0.688186,1.0,0.05920646379214723,-0.7275510143742654,-0.683494049811852,
  -0.23282199999999997,-0.657519,-0.716563,1.0,-0.23079127648765035,-0.664972933661906,-0.7103142855062675,
  -0.02963899999999997,-0.502302,-0.864184,1.0,-0.019838720158978862,-0.5038191057760348,-0.8635813417608618,
  -0.23282199999999997,-0.657519,-0.716563,1.0,-0.23079127648765035,-0.664972933661906,-0.7103142855062675,
  -0.2763880000000001,-0.44721999999999995,-0.850649,1.0,-0.2763877525951483,-0.44721995820039734,-0.8506492339399583,
  -0.02963899999999997,-0.502302,-0.864184,1.0,-0.019838720158978862,-0.5038191057760348,-0.8635813417608618,
  -0.23282199999999997,-0.657519,-0.716563,1.0,-0.23079127648765035,-0.664972933661906,-0.7103142855062675,
  -0.48397099999999993,-0.502302,-0.716565,1.0,-0.4915461091474215,-0.5038186497816622,-0.7103162610515219,
  -0.2763880000000001,-0.44721999999999995,-0.850649,1.0,-0.2763877525951483,-0.44721995820039734,-0.8506492339399583,
  -0.16245599999999993,-0.850654,-0.49999499999999997,1.0,-0.1624559605874681,-0.8506538252498717,-0.4999961304423903,
  -0.447211,-0.723612,-0.525727,1.0,-0.4496452961078909,-0.7275509278708348,-0.5181590055594274,
  -0.23282199999999997,-0.657519,-0.716563,1.0,-0.23079127648765035,-0.664972933661906,-0.7103142855062675,
  -0.07760699999999998,-0.96795,-0.23885299999999998,1.0,-0.08057588379380852,-0.9654061724258667,-0.24798880860410688,
  -0.36180100000000004,-0.894429,-0.26286300000000007,1.0,-0.36820701052687826,-0.8904256400317344,-0.2675178068333686,
  -0.16245599999999993,-0.850654,-0.49999499999999997,1.0,-0.1624559605874681,-0.8506538252498717,-0.4999961304423903,
  -0.23282199999999997,-0.657519,-0.716563,1.0,-0.23079127648765035,-0.664972933661906,-0.7103142855062675,
  -0.447211,-0.723612,-0.525727,1.0,-0.4496452961078909,-0.7275509278708348,-0.5181590055594274,
  -0.48397099999999993,-0.502302,-0.716565,1.0,-0.4915461091474215,-0.5038186497816622,-0.7103162610515219,
  -0.447211,-0.723612,-0.525727,1.0,-0.4496452961078909,-0.7275509278708348,-0.5181590055594274,
  -0.688189,-0.525736,-0.499997,1.0,-0.6881896629138985,-0.5257350598001616,-0.4999976347497809,
  -0.48397099999999993,-0.502302,-0.716565,1.0,-0.4915461091474215,-0.5038186497816622,-0.7103162610515219,
  -0.16245599999999993,-0.850654,-0.49999499999999997,1.0,-0.1624559605874681,-0.8506538252498717,-0.4999961304423903,
  -0.36180100000000004,-0.894429,-0.26286300000000007,1.0,-0.36820701052687826,-0.8904256400317344,-0.2675178068333686,
  -0.447211,-0.723612,-0.525727,1.0,-0.4496452961078909,-0.7275509278708348,-0.5181590055594274,
  -0.36180100000000004,-0.894429,-0.26286300000000007,1.0,-0.36820701052687826,-0.8904256400317344,-0.2675178068333686,
  -0.638195,-0.723609,-0.26286300000000007,1.0,-0.6317494048790507,-0.7275484141008814,-0.2675182135374292,
  -0.447211,-0.723612,-0.525727,1.0,-0.4496452961078909,-0.7275509278708348,-0.5181590055594274,
  -0.447211,-0.723612,-0.525727,1.0,-0.4496452961078909,-0.7275509278708348,-0.5181590055594274,
  -0.638195,-0.723609,-0.26286300000000007,1.0,-0.6317494048790507,-0.7275484141008814,-0.2675182135374292,
  -0.688189,-0.525736,-0.499997,1.0,-0.6881896629138985,-0.5257350598001616,-0.4999976347497809,
  -0.638195,-0.723609,-0.26286300000000007,1.0,-0.6317494048790507,-0.7275484141008814,-0.2675182135374292,
  -0.831051,-0.502299,-0.23885299999999998,1.0,-0.827448675299351,-0.503815221812631,-0.24798974175404667,
  -0.688189,-0.525736,-0.499997,1.0,-0.6881896629138985,-0.5257350598001616,-0.4999976347497809,
  -0.07760699999999998,-0.96795,-0.23885299999999998,1.0,-0.08057588379380852,-0.9654061724258667,-0.24798880860410688,
  -0.251147,-0.967949,0.0,1.0,-0.26075247981128585,-0.965405688957526,8.4223782992918e-07,
  -0.36180100000000004,-0.894429,-0.26286300000000007,1.0,-0.36820701052687826,-0.8904256400317344,-0.2675178068333686,
  -0.251147,-0.967949,0.0,1.0,-0.26075247981128585,-0.965405688957526,8.4223782992918e-07,
  -0.52573,-0.850652,0.0,1.0,-0.5257291351746985,-0.8506520301675546,5.30161602573815e-07,
  -0.36180100000000004,-0.894429,-0.26286300000000007,1.0,-0.36820701052687826,-0.8904256400317344,-0.2675178068333686,
  -0.36180100000000004,-0.894429,-0.26286300000000007,1.0,-0.36820701052687826,-0.8904256400317344,-0.2675178068333686,
  -0.52573,-0.850652,0.0,1.0,-0.5257291351746985,-0.8506520301675546,5.30161602573815e-07,
  -0.638195,-0.723609,-0.26286300000000007,1.0,-0.6317494048790507,-0.7275484141008814,-0.2675182135374292,
  -0.52573,-0.850652,0.0,1.0,-0.5257291351746985,-0.8506520301675546,5.30161602573815e-07,
  -0.753442,-0.657515,0.0,1.0,-0.7468712183386028,-0.6649687084497966,-1.4345962018813593e-07,
  -0.638195,-0.723609,-0.26286300000000007,1.0,-0.6317494048790507,-0.7275484141008814,-0.2675182135374292,
  -0.638195,-0.723609,-0.26286300000000007,1.0,-0.6317494048790507,-0.7275484141008814,-0.2675182135374292,
  -0.753442,-0.657515,0.0,1.0,-0.7468712183386028,-0.6649687084497966,-1.4345962018813593e-07,
  -0.831051,-0.502299,-0.23885299999999998,1.0,-0.827448675299351,-0.503815221812631,-0.24798974175404667,
  -0.753442,-0.657515,0.0,1.0,-0.7468712183386028,-0.6649687084497966,-1.4345962018813593e-07,
  -0.894426,-0.44721600000000006,0.0,1.0,-0.8944264388330798,-0.44721509983046726,3.5123469383576465e-18,
  -0.831051,-0.502299,-0.23885299999999998,1.0,-0.827448675299351,-0.503815221812631,-0.24798974175404667,
  -0.753442,-0.657515,0.0,1.0,-0.7468712183386028,-0.6649687084497966,-1.4345962018813593e-07,
  -0.831051,-0.502299,0.23885299999999998,1.0,-0.8274488479658778,-0.5038149789897272,0.24798965894876002,
  -0.894426,-0.44721600000000006,0.0,1.0,-0.8944264388330798,-0.44721509983046726,3.5123469383576465e-18,
  -0.52573,-0.850652,0.0,1.0,-0.5257291351746985,-0.8506520301675546,5.30161602573815e-07,
  -0.638195,-0.723609,0.262864,1.0,-0.6317485209773642,-0.7275487814839495,0.2675193017412632,
  -0.753442,-0.657515,0.0,1.0,-0.7468712183386028,-0.6649687084497966,-1.4345962018813593e-07,
  -0.251147,-0.967949,0.0,1.0,-0.26075247981128585,-0.965405688957526,8.4223782992918e-07,
  -0.36180100000000004,-0.894428,0.262864,1.0,-0.3682072805368218,-0.8904250916957412,0.26751926031280254,
  -0.52573,-0.850652,0.0,1.0,-0.5257291351746985,-0.8506520301675546,5.30161602573815e-07,
  -0.753442,-0.657515,0.0,1.0,-0.7468712183386028,-0.6649687084497966,-1.4345962018813593e-07,
  -0.638195,-0.723609,0.262864,1.0,-0.6317485209773642,-0.7275487814839495,0.2675193017412632,
  -0.831051,-0.502299,0.23885299999999998,1.0,-0.8274488479658778,-0.5038149789897272,0.24798965894876002,
  -0.638195,-0.723609,0.262864,1.0,-0.6317485209773642,-0.7275487814839495,0.2675193017412632,
  -0.688189,-0.525736,0.499997,1.0,-0.6881895511641616,-0.5257349869564159,0.49999786515384953,
  -0.831051,-0.502299,0.23885299999999998,1.0,-0.8274488479658778,-0.5038149789897272,0.24798965894876002,
  -0.52573,-0.850652,0.0,1.0,-0.5257291351746985,-0.8506520301675546,5.30161602573815e-07,
  -0.36180100000000004,-0.894428,0.262864,1.0,-0.3682072805368218,-0.8904250916957412,0.26751926031280254,
  -0.638195,-0.723609,0.262864,1.0,-0.6317485209773642,-0.7275487814839495,0.2675193017412632,
  -0.36180100000000004,-0.894428,0.262864,1.0,-0.3682072805368218,-0.8904250916957412,0.26751926031280254,
  -0.447211,-0.72361,0.5257290000000001,1.0,-0.44964507698926237,-0.7275501699756488,0.5181602598692076,
  -0.638195,-0.723609,0.262864,1.0,-0.6317485209773642,-0.7275487814839495,0.2675193017412632,
  -0.638195,-0.723609,0.262864,1.0,-0.6317485209773642,-0.7275487814839495,0.2675193017412632,
  -0.447211,-0.72361,0.5257290000000001,1.0,-0.44964507698926237,-0.7275501699756488,0.5181602598692076,
  -0.688189,-0.525736,0.499997,1.0,-0.6881895511641616,-0.5257349869564159,0.49999786515384953,
  -0.447211,-0.72361,0.5257290000000001,1.0,-0.44964507698926237,-0.7275501699756488,0.5181602598692076,
  -0.48397099999999993,-0.502302,0.7165650000000001,1.0,-0.49154612462755637,-0.503818632525199,0.7103162625789089,
  -0.688189,-0.525736,0.499997,1.0,-0.6881895511641616,-0.5257349869564159,0.49999786515384953,
  -0.251147,-0.967949,0.0,1.0,-0.26075247981128585,-0.965405688957526,8.4223782992918e-07,
  -0.07760699999999998,-0.96795,0.23885299999999998,1.0,-0.08057675620781352,-0.9654060832357604,0.2479888723519962,
  -0.36180100000000004,-0.894428,0.262864,1.0,-0.3682072805368218,-0.8904250916957412,0.26751926031280254,
  -0.07760699999999998,-0.96795,0.23885299999999998,1.0,-0.08057675620781352,-0.9654060832357604,0.2479888723519962,
  -0.16245599999999993,-0.850654,0.49999499999999997,1.0,-0.16245708015289456,-0.8506538856343064,0.4999956639446509,
  -0.36180100000000004,-0.894428,0.262864,1.0,-0.3682072805368218,-0.8904250916957412,0.26751926031280254,
  -0.36180100000000004,-0.894428,0.262864,1.0,-0.3682072805368218,-0.8904250916957412,0.26751926031280254,
  -0.16245599999999993,-0.850654,0.49999499999999997,1.0,-0.16245708015289456,-0.8506538856343064,0.4999956639446509,
  -0.447211,-0.72361,0.5257290000000001,1.0,-0.44964507698926237,-0.7275501699756488,0.5181602598692076,
  -0.16245599999999993,-0.850654,0.49999499999999997,1.0,-0.16245708015289456,-0.8506538856343064,0.4999956639446509,
  -0.23282199999999997,-0.657519,0.7165629999999998,1.0,-0.23079124291012987,-0.6649730641972427,0.7103141742131627,
  -0.447211,-0.72361,0.5257290000000001,1.0,-0.44964507698926237,-0.7275501699756488,0.5181602598692076,
  -0.447211,-0.72361,0.5257290000000001,1.0,-0.44964507698926237,-0.7275501699756488,0.5181602598692076,
  -0.23282199999999997,-0.657519,0.7165629999999998,1.0,-0.23079124291012987,-0.6649730641972427,0.7103141742131627,
  -0.48397099999999993,-0.502302,0.7165650000000001,1.0,-0.49154612462755637,-0.503818632525199,0.7103162625789089,
  -0.23282199999999997,-0.657519,0.7165629999999998,1.0,-0.23079124291012987,-0.6649730641972427,0.7103141742131627,
  -0.2763880000000001,-0.44721999999999995,0.850649,1.0,-0.27638775259514803,-0.44721995820039745,0.8506492339399584,
  -0.48397099999999993,-0.502302,0.7165650000000001,1.0,-0.49154612462755637,-0.503818632525199,0.7103162625789089,
  0.812729,-0.502301,-0.295238,1.0,0.8151846510833864,-0.5038175802700607,-0.2857303456913148,
  0.6095470000000001,-0.657519,-0.442856,1.0,0.60423092704266,-0.6649723365238669,-0.4389951918451463,
  0.7236069999999999,-0.44721999999999995,-0.525725,1.0,0.7236067216830413,-0.4472196513214831,-0.525726065367709,
  0.8506480000000001,-0.525736,0.0,1.0,0.8506487792762305,-0.5257343952185694,-1.551196823478276e-07,
  0.670817,-0.723611,-0.16245699999999996,1.0,0.6683377704518599,-0.7275503751292589,-0.15490344165547704,
  0.812729,-0.502301,-0.295238,1.0,0.8151846510833864,-0.5038175802700607,-0.2857303456913148,
  0.812729,-0.502301,0.2952379999999999,1.0,0.8151848055269568,-0.503817229437447,0.2857305236756347,
  0.6708180000000001,-0.72361,0.162458,1.0,0.6683384936921797,-0.727549561234357,0.1549041438986152,
  0.8506480000000001,-0.525736,0.0,1.0,0.8506487792762305,-0.5257343952185694,-1.551196823478276e-07,
  0.812729,-0.502301,-0.295238,1.0,0.8151846510833864,-0.5038175802700607,-0.2857303456913148,
  0.670817,-0.723611,-0.16245699999999996,1.0,0.6683377704518599,-0.7275503751292589,-0.15490344165547704,
  0.6095470000000001,-0.657519,-0.442856,1.0,0.60423092704266,-0.6649723365238669,-0.4389951918451463,
  0.670817,-0.723611,-0.16245699999999996,1.0,0.6683377704518599,-0.7275503751292589,-0.15490344165547704,
  0.4253230000000001,-0.850654,-0.3090109999999999,1.0,0.42532286056333185,-0.8506540013904963,-0.3090117056044348,
  0.6095470000000001,-0.657519,-0.442856,1.0,0.60423092704266,-0.6649723365238669,-0.4389951918451463,
  0.8506480000000001,-0.525736,0.0,1.0,0.8506487792762305,-0.5257343952185694,-1.551196823478276e-07,
  0.6708180000000001,-0.72361,0.162458,1.0,0.6683384936921797,-0.727549561234357,0.1549041438986152,
  0.670817,-0.723611,-0.16245699999999996,1.0,0.6683377704518599,-0.7275503751292589,-0.15490344165547704,
  0.6708180000000001,-0.72361,0.162458,1.0,0.6683384936921797,-0.727549561234357,0.1549041438986152,
  0.447211,-0.894428,9.999999999177334e-07,1.0,0.4551295869979919,-0.8904252124903946,6.877146626628624e-07,
  0.670817,-0.723611,-0.16245699999999996,1.0,0.6683377704518599,-0.7275503751292589,-0.15490344165547704,
  0.670817,-0.723611,-0.16245699999999996,1.0,0.6683377704518599,-0.7275503751292589,-0.15490344165547704,
  0.447211,-0.894428,9.999999999177334e-07,1.0,0.4551295869979919,-0.8904252124903946,6.877146626628624e-07,
  0.4253230000000001,-0.850654,-0.3090109999999999,1.0,0.42532286056333185,-0.8506540013904963,-0.3090117056044348,
  0.447211,-0.894428,9.999999999177334e-07,1.0,0.4551295869979919,-0.8904252124903946,6.877146626628624e-07,
  0.20318100000000006,-0.96795,-0.14761800000000003,1.0,0.21095286907952562,-0.9654060533326492,-0.15326460522832558,
  0.4253230000000001,-0.850654,-0.3090109999999999,1.0,0.42532286056333185,-0.8506540013904963,-0.3090117056044348,
  0.812729,-0.502301,0.2952379999999999,1.0,0.8151848055269568,-0.503817229437447,0.2857305236756347,
  0.6095470000000001,-0.657519,0.4428559999999999,1.0,0.6042310408008547,-0.6649722006723842,0.43899524105124693,
  0.6708180000000001,-0.72361,0.162458,1.0,0.6683384936921797,-0.727549561234357,0.1549041438986152,
  0.6095470000000001,-0.657519,0.4428559999999999,1.0,0.6042310408008547,-0.6649722006723842,0.43899524105124693,
  0.4253230000000001,-0.850654,0.3090109999999999,1.0,0.42532325551188366,-0.8506538075846909,0.30901169551076946,
  0.6708180000000001,-0.72361,0.162458,1.0,0.6683384936921797,-0.727549561234357,0.1549041438986152,
  0.6708180000000001,-0.72361,0.162458,1.0,0.6683384936921797,-0.727549561234357,0.1549041438986152,
  0.4253230000000001,-0.850654,0.3090109999999999,1.0,0.42532325551188366,-0.8506538075846909,0.30901169551076946,
  0.447211,-0.894428,9.999999999177334e-07,1.0,0.4551295869979919,-0.8904252124903946,6.877146626628624e-07,
  0.4253230000000001,-0.850654,0.3090109999999999,1.0,0.42532325551188366,-0.8506538075846909,0.30901169551076946,
  0.20318100000000006,-0.96795,0.14761800000000003,1.0,0.21095266289464853,-0.9654061618992498,0.15326420516420788,
  0.447211,-0.894428,9.999999999177334e-07,1.0,0.4551295869979919,-0.8904252124903946,6.877146626628624e-07,
  0.447211,-0.894428,9.999999999177334e-07,1.0,0.4551295869979919,-0.8904252124903946,6.877146626628624e-07,
  0.20318100000000006,-0.96795,0.14761800000000003,1.0,0.21095266289464853,-0.9654061618992498,0.15326420516420788,
  0.20318100000000006,-0.96795,-0.14761800000000003,1.0,0.21095286907952562,-0.9654060533326492,-0.15326460522832558,
  0.20318100000000006,-0.96795,0.14761800000000003,1.0,0.21095266289464853,-0.9654061618992498,0.15326420516420788,
  0.0,-1.0,0.0,1.0,-1.306012939612e-06,-0.9999999999991471,7.024692550196524e-18,
  0.20318100000000006,-0.96795,-0.14761800000000003,1.0,0.21095286907952562,-0.9654060533326492,-0.15326460522832558,
  -0.23282199999999997,-0.657519,0.7165629999999998,1.0,-0.23079124291012987,-0.6649730641972427,0.7103141742131627,
  -0.02963899999999997,-0.502302,0.8641839999999998,1.0,-0.019838689717257413,-0.5038192559913451,0.8635812548235572,
  -0.2763880000000001,-0.44721999999999995,0.850649,1.0,-0.27638775259514803,-0.44721995820039745,0.8506492339399584,
  -0.16245599999999993,-0.850654,0.49999499999999997,1.0,-0.16245708015289456,-0.8506538856343064,0.4999956639446509,
  0.05278999999999989,-0.723612,0.688185,1.0,0.05920723925994218,-0.7275515145351986,0.6834934502369095,
  -0.23282199999999997,-0.657519,0.7165629999999998,1.0,-0.23079124291012987,-0.6649730641972427,0.7103141742131627,
  -0.07760699999999998,-0.96795,0.23885299999999998,1.0,-0.08057675620781352,-0.9654060832357604,0.2479888723519962,
  0.13819899999999996,-0.894429,0.42532100000000006,1.0,0.1406455146287707,-0.8904254422627637,0.4328525972960891,
  -0.16245599999999993,-0.850654,0.49999499999999997,1.0,-0.16245708015289456,-0.8506538856343064,0.4999956639446509,
  -0.23282199999999997,-0.657519,0.7165629999999998,1.0,-0.23079124291012987,-0.6649730641972427,0.7103141742131627,
  0.05278999999999989,-0.723612,0.688185,1.0,0.05920723925994218,-0.7275515145351986,0.6834934502369095,
  -0.02963899999999997,-0.502302,0.8641839999999998,1.0,-0.019838689717257413,-0.5038192559913451,0.8635812548235572,
  0.05278999999999989,-0.723612,0.688185,1.0,0.05920723925994218,-0.7275515145351986,0.6834934502369095,
  0.262869,-0.525738,0.8090120000000001,1.0,0.26286888259023233,-0.5257372188438393,0.8090119450836976,
  -0.02963899999999997,-0.502302,0.8641839999999998,1.0,-0.019838689717257413,-0.5038192559913451,0.8635812548235572,
  -0.16245599999999993,-0.850654,0.49999499999999997,1.0,-0.16245708015289456,-0.8506538856343064,0.4999956639446509,
  0.13819899999999996,-0.894429,0.42532100000000006,1.0,0.1406455146287707,-0.8904254422627637,0.4328525972960891,
  0.05278999999999989,-0.723612,0.688185,1.0,0.05920723925994218,-0.7275515145351986,0.6834934502369095,
  0.13819899999999996,-0.894429,0.42532100000000006,1.0,0.1406455146287707,-0.8904254422627637,0.4328525972960891,
  0.36180499999999993,-0.723611,0.587779,1.0,0.3538549988818572,-0.7275505518078368,0.5877557607803032,
  0.05278999999999989,-0.723612,0.688185,1.0,0.05920723925994218,-0.7275515145351986,0.6834934502369095,
  0.05278999999999989,-0.723612,0.688185,1.0,0.05920723925994218,-0.7275515145351986,0.6834934502369095,
  0.36180499999999993,-0.723611,0.587779,1.0,0.3538549988818572,-0.7275505518078368,0.5877557607803032,
  0.262869,-0.525738,0.8090120000000001,1.0,0.26286888259023233,-0.5257372188438393,0.8090119450836976,
  0.36180499999999993,-0.723611,0.587779,1.0,0.3538549988818572,-0.7275505518078368,0.5877557607803032,
  0.531941,-0.502302,0.6817120000000001,1.0,0.5236580515960895,-0.5038185204865161,0.6869855481837774,
  0.262869,-0.525738,0.8090120000000001,1.0,0.26286888259023233,-0.5257372188438393,0.8090119450836976,
  -0.07760699999999998,-0.96795,0.23885299999999998,1.0,-0.08057675620781352,-0.9654060832357604,0.2479888723519962,
  0.20318100000000006,-0.96795,0.14761800000000003,1.0,0.21095266289464853,-0.9654061618992498,0.15326420516420788,
  0.13819899999999996,-0.894429,0.42532100000000006,1.0,0.1406455146287707,-0.8904254422627637,0.4328525972960891,
  0.20318100000000006,-0.96795,0.14761800000000003,1.0,0.21095266289464853,-0.9654061618992498,0.15326420516420788,
  0.4253230000000001,-0.850654,0.3090109999999999,1.0,0.42532325551188366,-0.8506538075846909,0.30901169551076946,
  0.13819899999999996,-0.894429,0.42532100000000006,1.0,0.1406455146287707,-0.8904254422627637,0.4328525972960891,
  0.13819899999999996,-0.894429,0.42532100000000006,1.0,0.1406455146287707,-0.8904254422627637,0.4328525972960891,
  0.4253230000000001,-0.850654,0.3090109999999999,1.0,0.42532325551188366,-0.8506538075846909,0.30901169551076946,
  0.36180499999999993,-0.723611,0.587779,1.0,0.3538549988818572,-0.7275505518078368,0.5877557607803032,
  0.4253230000000001,-0.850654,0.3090109999999999,1.0,0.42532325551188366,-0.8506538075846909,0.30901169551076946,
  0.6095470000000001,-0.657519,0.4428559999999999,1.0,0.6042310408008547,-0.6649722006723842,0.43899524105124693,
  0.36180499999999993,-0.723611,0.587779,1.0,0.3538549988818572,-0.7275505518078368,0.5877557607803032,
  0.36180499999999993,-0.723611,0.587779,1.0,0.3538549988818572,-0.7275505518078368,0.5877557607803032,
  0.6095470000000001,-0.657519,0.4428559999999999,1.0,0.6042310408008547,-0.6649722006723842,0.43899524105124693,
  0.531941,-0.502302,0.6817120000000001,1.0,0.5236580515960895,-0.5038185204865161,0.6869855481837774,
  0.6095470000000001,-0.657519,0.4428559999999999,1.0,0.6042310408008547,-0.6649722006723842,0.43899524105124693,
  0.7236069999999999,-0.44721999999999995,0.525725,1.0,0.7236067216830413,-0.4472196513214831,0.5257260653677089,
  0.531941,-0.502302,0.6817120000000001,1.0,0.5236580515960895,-0.5038185204865161,0.6869855481837774
      ]);
  
      this.vboVerts = 960;							// # of vertices held in 'vboContents' array;
      this.FSIZE = this.vboContents.BYTES_PER_ELEMENT;
                                    // bytes req'd by 1 vboContents array element;
                                    // (why? used to compute stride and offset 
                                    // in bytes for vertexAttribPointer() calls)
      this.vboBytes = this.vboContents.length * this.FSIZE;               
                                    // (#  of floats in vboContents array) * 
                                    // (# of bytes/float).
      this.vboStride = this.vboBytes / this.vboVerts;     
                                    // From any attrib in a given vertex, 
                                    // move forward by 'vboStride' bytes to arrive 
                                    // at the same attrib for the next vertex. 
                                    // (== # of bytes used to store one vertex) 
                                    
                  //----------------------Attribute sizes
      this.vboFcount_a_Position = 4;  // # of floats in the VBO needed to store the
                                    // attribute named a_Position (4: x,y,z,w values)
      this.vboFcount_a_Normal = 3;   // # of floats for this attrib (r,g,b values)
      // this.vboFcount_a_PtSize = 1;  // # of floats for this attrib (just one!)
                   //----------------------Attribute offsets
      this.vboOffset_a_Position = 0;   
                                    //# of bytes from START of vbo to the START
                                    // of 1st a_Position attrib value in vboContents[]
      this.vboOffset_a_Normal = (this.vboFcount_a_Position) * this.FSIZE;  
                                    // == 4 floats * bytes/float
                                    //# of bytes from START of vbo to the START
                                    // of 1st a_Color attrib value in vboContents[]
                                    
                  //-----------------------GPU memory locations:
      this.vboLoc;									// GPU Location for Vertex Buffer Object, 
                                    // returned by gl.createBuffer() function call
      this.shaderLoc;								// GPU Location for compiled Shader-program  
                                    // set by compile/link of VERT_SRC and FRAG_SRC.
                              //------Attribute locations in our shaders:
      this.a_PositionLoc;							// GPU location: shader 'a_Position' attribute
      this.a_NormalLoc;								// GPU location: shader 'a_Color' attribute
      // this.a_PtSizeLoc;								// GPU location: shader 'a_PtSize' attribute
      
                  //---------------------- Uniform locations &values in our shaders
      this.ModelMatrix = new Matrix4();	// Transforms CVV axes to model axes.
      this.MvpMatrix = new Matrix4();	// Transforms CVV axes to model axes.
      this.NormalMatrix = new Matrix4();	// Transforms CVV axes to model axes.
      this.u_ModelMatrixLoc;						// GPU location for u_ModelMat uniform
    };
    
    
    VBObox1.prototype.init = function() {
    //=============================================================================
    // Prepare the GPU to use all vertices, GLSL shaders, attributes, & uniforms 
    // kept in this VBObox. (This function usually called only once, within main()).
    // Specifically:
    // a) Create, compile, link our GLSL vertex- and fragment-shaders to form an 
    //  executable 'program' stored and ready to use inside the GPU.  
    // b) create a new VBO object in GPU memory and fill it by transferring in all
    //  the vertex data held in our Float32array member 'VBOcontents'. 
    // c) Find & save the GPU location of all our shaders' attribute-variables and 
    //  uniform-variables (needed by switchToMe(), adjust(), draw(), reload(), etc.)
    // 
    // CAREFUL!  before you can draw pictures using this VBObox contents, 
    //  you must call this VBObox object's switchToMe() function too!
    
      // a) Compile,link,upload shaders---------------------------------------------
      this.shaderLoc = createProgram(gl, this.VERT_SRC, this.FRAG_SRC);
      if (!this.shaderLoc) {
        console.log(this.constructor.name + 
                    '.init() failed to create executable Shaders on the GPU. Bye!');
        return;
      }
      // CUTE TRICK: let's print the NAME of this VBObox object: tells us which one!
      //  else{console.log('You called: '+ this.constructor.name + '.init() fcn!');}
    
      gl.program = this.shaderLoc;		// (to match cuon-utils.js -- initShaders())
    
      // b) Create VBO on GPU, fill it----------------------------------------------
      this.vboLoc = gl.createBuffer();	
      if (!this.vboLoc) {
        console.log(this.constructor.name + 
                    '.init() failed to create VBO in GPU. Bye!'); 
        return;
      }
      // Specify the purpose of our newly-created VBO.  Your choices are:
      //	== "gl.ARRAY_BUFFER" : the VBO holds vertices, each made of attributes 
      // (positions, colors, normals, etc), or 
      //	== "gl.ELEMENT_ARRAY_BUFFER" : the VBO holds indices only; integer values 
      // that each select one vertex from a vertex array stored in another VBO.
      gl.bindBuffer(gl.ARRAY_BUFFER,	    // GLenum 'target' for this GPU buffer 
                      this.vboLoc);				// the ID# the GPU uses for this buffer.
    
      // Fill the GPU's newly-created VBO object with the vertex data we stored in
      //  our 'vboContents' member (JavaScript Float32Array object).
      //  (Recall gl.bufferData() will evoke GPU's memory allocation & managemt: use 
      //		gl.bufferSubData() to modify VBO contents without changing VBO size)
      gl.bufferData(gl.ARRAY_BUFFER, 			  // GLenum target(same as 'bindBuffer()')
                        this.vboContents, 		// JavaScript Float32Array
                       gl.STATIC_DRAW);			// Usage hint.
      //	The 'hint' helps GPU allocate its shared memory for best speed & efficiency
      //	(see OpenGL ES specification for more info).  Your choices are:
      //		--STATIC_DRAW is for vertex buffers rendered many times, but whose 
      //				contents rarely or never change.
      //		--DYNAMIC_DRAW is for vertex buffers rendered many times, but whose 
      //				contents may change often as our program runs.
      //		--STREAM_DRAW is for vertex buffers that are rendered a small number of 
      // 			times and then discarded; for rapidly supplied & consumed VBOs.
    
      // c1) Find All Attributes:---------------------------------------------------
      //  Find & save the GPU location of all our shaders' attribute-variables and 
      //  uniform-variables (for switchToMe(), adjust(), draw(), reload(),etc.)
      this.a_PositionLoc = gl.getAttribLocation(this.shaderLoc, 'a_Position');
      if(this.a_PositionLoc < 0) {
        console.log(this.constructor.name + 
                    '.init() Failed to get GPU location of attribute a_Position');
        return -1;	// error exit.
      }
      this.a_NormalLoc = gl.getAttribLocation(this.shaderLoc, 'a_Normal');
      if(this.a_NormalLoc < 0) {
        console.log(this.constructor.name + 
                    '.init() Failed to get GPU location of attribute a_Normal');
        return -1;	// error exit.
      }

      this.u_eyePosWorld = gl.getUniformLocation(gl.program, 'u_eyePosWorld');
  
      // c2) Find All Uniforms:-----------------------------------------------------
      //Get GPU storage location for each uniform var used in our shader programs: 
     this.u_ModelMatrixLoc = gl.getUniformLocation(this.shaderLoc, 'u_ModelMatrix');
      if (!this.u_ModelMatrixLoc) { 
        console.log(this.constructor.name + 
                    '.init() failed to get GPU location for u_ModelMatrix uniform');
        return;
      }
  
      this.u_NormalMatrixLoc = gl.getUniformLocation(this.shaderLoc, 'u_NormalMatrix');
      if (!this.u_ModelMatrixLoc) { 
        console.log(this.constructor.name + 
                    '.init() failed to get GPU location for u_NormalMatrix uniform');
        return;
    }
    this.u_MvpMatrixLoc = gl.getUniformLocation(gl.program, 	'u_MvpMatrix');
  
    this.u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
    this.u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
    this.u_AmbientLight = gl.getUniformLocation(gl.program, 'u_AmbientLight');
    this.u_DifLight = gl.getUniformLocation(gl.program, 'u_DifLight');
    this.u_SpecLight = gl.getUniformLocation(gl.program, 'u_SpecLight');
    this.u_blinn = gl.getUniformLocation(gl.program, 'blinn');
    this.u_not_blinn = gl.getUniformLocation(gl.program, 'not_blinn');
  
    if (!this.u_LightColor || !this.u_LightPosition　|| !this.u_AmbientLight) { 
      console.log('Failed to get the storage location');
      return;
    }
    }
    
    VBObox1.prototype.switchToMe = function() {
    //==============================================================================
    // Set GPU to use this VBObox's contents (VBO, shader, attributes, uniforms...)
    //
    // We only do this AFTER we called the init() function, which does the one-time-
    // only setup tasks to put our VBObox contents into GPU memory.  !SURPRISE!
    // even then, you are STILL not ready to draw our VBObox's contents onscreen!
    // We must also first complete these steps:
    //  a) tell the GPU to use our VBObox's shader program (already in GPU memory),
    //  b) tell the GPU to use our VBObox's VBO  (already in GPU memory),
    //  c) tell the GPU to connect the shader program's attributes to that VBO.
    
    // a) select our shader program:
      gl.useProgram(this.shaderLoc);
    //		Each call to useProgram() selects a shader program from the GPU memory,
    // but that's all -- it does nothing else!  Any previously used shader program's 
    // connections to attributes and uniforms are now invalid, and thus we must now
    // establish new connections between our shader program's attributes and the VBO
    // we wish to use.  
      
    // b) call bindBuffer to disconnect the GPU from its currently-bound VBO and
    //  instead connect to our own already-created-&-filled VBO.  This new VBO can 
    //    supply values to use as attributes in our newly-selected shader program:
      gl.bindBuffer(gl.ARRAY_BUFFER,	    // GLenum 'target' for this GPU buffer 
                        this.vboLoc);			// the ID# the GPU uses for our VBO.
    
    // c) connect our newly-bound VBO to supply attribute variable values for each
    // vertex to our SIMD shader program, using 'vertexAttribPointer()' function.
    // this sets up data paths from VBO to our shader units:
      // 	Here's how to use the almost-identical OpenGL version of this function:
      //		http://www.opengl.org/sdk/docs/man/xhtml/glVertexAttribPointer.xml )
      gl.vertexAttribPointer(
        this.a_PositionLoc,//index == ID# for the attribute var in GLSL shader pgm;
        this.vboFcount_a_Position, // # of floats used by this attribute: 1,2,3 or 4?
        gl.FLOAT,		  // type == what data type did we use for those numbers?
        false,				// isNormalized == are these fixed-point values that we need
                      //									normalize before use? true or false
        this.vboStride,// Stride == #bytes we must skip in the VBO to move from the
                      // stored attrib for this vertex to the same stored attrib
                      //  for the next vertex in our VBO.  This is usually the 
                      // number of bytes used to store one complete vertex.  If set 
                      // to zero, the GPU gets attribute values sequentially from 
                      // VBO, starting at 'Offset'.	 (Our vertex size in bytes: 
                      // 4 floats for Position + 3 for Color + 1 for PtSize = 8).
        this.vboOffset_a_Position);	
                      // Offset == how many bytes from START of buffer to the first
                      // value we will actually use?  (We start with a_Position).
      gl.vertexAttribPointer(this.a_NormalLoc, this.vboFcount_a_Normal, 
                  gl.FLOAT, false, 
                  this.vboStride, this.vboOffset_a_Normal);
  
    // --Enable this assignment of each of these attributes to its' VBO source:
      gl.enableVertexAttribArray(this.a_PositionLoc);
      gl.enableVertexAttribArray(this.a_NormalLoc);
  
    }
    
    VBObox1.prototype.isReady = function() {
    //==============================================================================
    // Returns 'true' if our WebGL rendering context ('gl') is ready to render using
    // this objects VBO and shader program; else return false.
    // see: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter
    
    var isOK = true;
      if(gl.getParameter(gl.CURRENT_PROGRAM) != this.shaderLoc)  {
        console.log(this.constructor.name + 
                    '.isReady() false: shader program at this.shaderLoc not in use!');
        isOK = false;
      }
      if(gl.getParameter(gl.ARRAY_BUFFER_BINDING) != this.vboLoc) {
          console.log(this.constructor.name + 
                  '.isReady() false: vbo at this.vboLoc not in use!');
        isOK = false;
      }
      return isOK;
    }
    
    VBObox1.prototype.adjust = function() {
    //=============================================================================
    // Update the GPU to newer, current values we now store for 'uniform' vars on 
    // the GPU; and (if needed) update the VBO's contents, and (if needed) each 
    // attribute's stride and offset in VBO.
    
      // check: was WebGL context set to use our VBO & shader program?
      if(this.isReady()==false) {
            console.log('ERROR! before' + this.constructor.name + 
                  '.adjust() call you needed to call this.switchToMe()!!');
      }
    
    //   // Adjust values for our uniforms;-------------------------------------------
    // // THIS DOESN'T WORK!!  this.ModelMatrix = g_worldMat;
    //   this.ModelMatrix.set(g_worldMat);
    //   // Ready to draw in World coord axes.
    //   this.NormalMatrix = new Matrix4();
    //   this.ModelMatrix.rotate(currentAngle, 0, 0, 1);

    //   // this.NormalMatrix.setInverseOf(this.ModelMatrix);
    //   // this.NormalMatrix.transpose();
    
    //   // this.ModelMatrix.translate(1.0, -2.0, 1.0);						// then translate them.
    //   // this.ModelMatrix.rotate(g_angleNow2, 0, 0, 1);	// -spin drawing axes,
    //   //  Transfer new uniforms' values to the GPU:--------------------------------
    //   // Send  new 'ModelMat' values to the GPU's 'u_ModelMat1' uniform: 
    //   gl.uniformMatrix4fv(this.u_ModelMatrixLoc,	  // GPU location of the uniform
    //                       false, 										// use matrix transpose instead?
    //                       this.ModelMatrix.elements);	// send data from Javascript.

    this.MvpMatrix.set(g_worldMat);
    // Ready to draw in World coord axes.
    // this.ModelMatrix = new Matrix4();
    // this.MvpMatrix = new Matrix4();    // Model view projection matrix
    // this.NormalMatrix = new Matrix4();
  
    this.ModelMatrix.translate(0.0, 0.0, 0.0);						// then translate them.

    this.ModelMatrix.rotate(currentAngle, 0, 0, 1);

    this.MvpMatrix.multiply(this.ModelMatrix);

    this.NormalMatrix.setInverseOf(this.ModelMatrix);
    this.NormalMatrix.transpose();
    // this.ModelMatrix.rotate(g_angleNow2, 0, 0, 1);	// -spin drawing axes,
    //  Transfer new uniforms' values to the GPU:--------------------------------
    // Send  new 'ModelMat' values to the GPU's 'u_ModelMat1' uniform: 
    gl.uniformMatrix4fv(this.u_ModelMatrixLoc,	  // GPU location of the uniform
                        false, 										// use matrix transpose instead?
                        this.ModelMatrix.elements);	// send data from Javascript.
    
    
    gl.uniformMatrix4fv(this.u_MvpMatrixLoc,	  // GPU location of the uniform
    false, 										// use matrix transpose instead?
    this.MvpMatrix.elements);	// send data from Javascript.
  
      gl.uniformMatrix4fv(this.u_NormalMatrixLoc,	  // GPU location of the uniform
      false, 										// use matrix transpose instead?
      this.NormalMatrix.elements);	// send data from Javascript.
      // Adjust values in VBOcontents array-----------------------------------------
      // Make one dot-size grow/shrink;
      // this.vboContents[15] = 15.0*(1.0 + Math.cos(Math.PI * 3.0 * g_angleNow1 / 180.0)); // radians
      // // change y-axis value of 1st vertex
      // this.vboContents[1] = g_posNow0;
      // Transfer new VBOcontents to GPU-------------------------------------------- 
      this.reload();
    }
    
    VBObox1.prototype.draw = function() {
    //=============================================================================
    // Render current VBObox contents.
      // check: was WebGL context set to use our VBO & shader program?
      if(this.isReady()==false) {
            console.log('ERROR! before' + this.constructor.name + 
                  '.draw() call you needed to call this.switchToMe()!!');
      }
      var light_pos_x = document.getElementById("pos_x").value;
      var light_pos_y = document.getElementById("pos_y").value;
      var light_pos_z = document.getElementById("pos_z").value;

      
      var amb_r = document.getElementById("amb_r").value;
      var amb_g = document.getElementById("amb_g").value;
      var amb_b = document.getElementById("amb_b").value;

      var dif_r = document.getElementById("dif_r").value;
      var dif_g = document.getElementById("dif_g").value;
      var dif_b = document.getElementById("dif_b").value;
  
      var spec_r = document.getElementById("spec_r").value;
      var spec_g = document.getElementById("spec_g").value;
      var spec_b = document.getElementById("spec_b").value;

      if (on_light == 1){
        gl.uniform3f(this.u_LightPosition, light_pos_x / 30, light_pos_y / 30, light_pos_z / 30);
      } else {
        gl.uniform3f(this.u_LightPosition, 0, 0, 0);
      }
  
      // Set the light color (white)
      gl.uniform3f(this.u_LightColor, 0.8, 0.8, 0.8);
      // Set the light direction (in the world coordinate)
      // gl.uniform3f(this.u_LightPosition, light_pos_x / 30, light_pos_y / 30, light_pos_z / 30);
      // Set the ambient light

      gl.uniform4f(this.u_eyePosWorld, 6,0,0, 1);

      gl.uniform3f(this.u_AmbientLight, amb_r, amb_g, amb_b);
      gl.uniform3f(this.u_DifLight, dif_r, dif_g, dif_b);
      gl.uniform3f(this.u_SpecLight, spec_r, spec_g, spec_b);

      gl.uniform1f(this.u_blinn, blinn);
      gl.uniform1f(this.u_not_blinn, !blinn);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.vboVerts);
    }
    
    VBObox1.prototype.reload = function() {
    //=============================================================================
    // Over-write current values in the GPU for our already-created VBO: use 
    // gl.bufferSubData() call to re-transfer some or all of our Float32Array 
    // 'vboContents' to our VBO, but without changing any GPU memory allocations.
                            
     gl.bufferSubData(gl.ARRAY_BUFFER, 	// GLenum target(same as 'bindBuffer()')
                      0,                  // byte offset to where data replacement
                                          // begins in the VBO.
                        this.vboContents);   // the JS source-data array used to fill VBO
    }
  








  //=============================================================================
  //=============================================================================
  function VBObox2() {
  //=============================================================================
  //=============================================================================
  // CONSTRUCTOR for one re-usable 'VBObox2' object that holds all data and fcns
  // needed to render vertices from one Vertex Buffer Object (VBO) using one 
  // separate shader program (a vertex-shader & fragment-shader pair) and one
  // set of 'uniform' variables.
  
  // Constructor goal: 
  // Create and set member vars that will ELIMINATE ALL LITERALS (numerical values 
  // written into code) in all other VBObox functions. Keeping all these (initial)
  // values here, in this one coonstrutor function, ensures we can change them 
  // easily WITHOUT disrupting any other code, ever!
    
    this.VERT_SRC =	//--------------------- VERTEX SHADER source code 

  //-------------ATTRIBUTES: of each vertex, read from our Vertex Buffer Object
  'attribute vec4 a_Position; \n' +		// vertex position (model coord sys)
  'attribute vec4 a_Normal; \n' +			// vertex normal vector (model coord sys)
//  'attribute vec4 a_color;\n' + 		// What would 'per-vertex colors' mean in
										//	in Phong lighting implementation?  disable!
										// (LATER: replace with attrib. for diffuse reflectance?)
	//-------------UNIFORMS: values set from JavaScript before a drawing command.
 	'uniform vec3 u_Kd; \n' +						//	Instead, we'll use this 'uniform' 
													// Phong diffuse reflectance for the entire shape
  'uniform mat4 u_ModelMatrix; \n' + 		// Model matrix
  'uniform mat4 u_MvpMatrix; \n' +
  'uniform mat4 u_NormalMatrix; \n' +  	// Inverse Transpose of ModelMatrix;
  																			// (doesn't distort normal directions)
  
	//-------------VARYING:Vertex Shader values sent per-pixel to Fragment shader:
	'varying vec3 v_Kd; \n' +							// Phong Lighting: diffuse reflectance
																				// (I didn't make per-pixel Ke,Ka,Ks;
																				// we use 'uniform' values instead)
  'varying vec4 v_Position; \n' +				
  'varying vec3 v_Normal; \n' +					// Why Vec3? its not a point, hence w==0
//---------------
  'void main() { \n' +
		// Compute CVV coordinate values from our given vertex. This 'built-in'
		// per-vertex value gets interpolated to set screen position for each pixel.
    '  gl_Position = u_MvpMatrix * a_Position;\n' +
     // Calculate the vertex position & normal vec in the WORLD coordinate system
     // for use as a 'varying' variable: fragment shaders get per-pixel values
     // (interpolated between vertices for our drawing primitive (TRIANGLE)).
  '  v_Position = u_ModelMatrix * a_Position; \n' +
		// 3D surface normal of our vertex, in world coords.  ('varying'--its value
		// gets interpolated (in world coords) for each pixel's fragment shader.
  '  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));\n' +
	'	 v_Kd = u_Kd; \n' +		// find per-pixel diffuse reflectance from per-vertex
													// (no per-pixel Ke,Ka, or Ks, but you can do it...)
//	'  v_Kd = vec3(1.0, 1.0, 0.0); \n'	+ // TEST ONLY; fixed at green
  '}\n';
  
    this.FRAG_SRC = //---------------------- FRAGMENT SHADER source code 
    // '#ifdef GL_ES\n' +
    // 'precision mediump float;\n' +
    // '#endif\n' +
    // 'varying vec4 v_Color;\n' +
    // 'void main() {\n' +
    // '  gl_FragColor = v_Color;\n' +
    // '}\n';
    '#ifdef GL_ES\n' +
    'precision mediump float;\n' +
    '#endif\n' +
    
    // first light source: (YOU write a second one...)
    'uniform vec4 u_Lamp0Pos;\n' + 			// Phong Illum: position
    'uniform vec3 u_Lamp0Amb;\n' +   		// Phong Illum: ambient
    'uniform vec3 u_Lamp0Diff;\n' +     // Phong Illum: diffuse
    'uniform vec3 u_Lamp0Spec;\n' +			// Phong Illum: specular
    
    // first material definition: you write 2nd, 3rd, etc.
    'uniform vec3 u_Ke;\n' +						// Phong Reflectance: emissive
    'uniform vec3 u_Ka;\n' +						// Phong Reflectance: ambient
    // Phong Reflectance: diffuse? -- use v_Kd instead for per-pixel value
    'uniform vec3 u_Ks;\n' +						// Phong Reflectance: specular
  //  'uniform int u_Kshiny;\n' +				// Phong Reflectance: 1 < shiny < 200
  //	
    'uniform vec4 u_eyePosWorld; \n' + 	// Camera/eye location in world coords.

    'uniform float blinn;\n' +
    'uniform float not_blinn;\n' +
    
    'varying vec3 v_Normal;\n' +				// Find 3D surface normal at each pix
    'varying vec4 v_Position;\n' +			// pixel's 3D pos too -- in 'world' coords
    'varying vec3 v_Kd;	\n' +						// Find diffuse reflectance K_d per pix
                              // Ambient? Emissive? Specular? almost
                              // NEVER change per-vertex: I use'uniform'
  
    'void main() { \n' +
         // Normalize! !!IMPORTANT!! TROUBLE if you don't! 
         // normals interpolated for each pixel aren't 1.0 in length any more!
    '  vec3 normal = normalize(v_Normal); \n' +
  //	'  vec3 normal = v_Normal; \n' +
         // Calculate the light direction vector, make it unit-length (1.0).
    '  vec3 lightDirection = normalize(u_Lamp0Pos.xyz - v_Position.xyz);\n' +
         // The dot product of the light direction and the normal
         // (use max() to discard any negatives from lights below the surface)
         // (look in GLSL manual: what other functions would help?)
    '  float nDotL = max(dot(lightDirection, normal), 0.0); \n' +
         // The Blinn-Phong lighting model computes the specular term faster 
         // because it replaces the (V*R)^shiny weighting with (H*N)^shiny,
         // where 'halfway' vector H has a direction half-way between L and V"
         // H = norm(norm(V) + norm(L)) 
         // (see http://en.wikipedia.org/wiki/Blinn-Phong_shading_model)
    '  vec3 eyeDirection = normalize(u_eyePosWorld.xyz - v_Position.xyz); \n' +
    '  vec3 H = normalize(lightDirection + eyeDirection); \n' +
    '  vec3 C = normal * (dot(lightDirection, normal)); \n' +
    '  vec3 R = (C + C) - lightDirection;\n;' +
    '  float rDotv = max(dot(R, eyeDirection), 0.0); \n' +

    // '  vec3 H = normalize(lightDirection +  normalize(v_Position.xyz)); \n' +
    '  float nDotH = max(dot(H, normal), 0.0); \n' +
        // (use max() to discard any negatives from lights below the surface)
        // Apply the 'shininess' exponent K_e:
    '  float e02 = nDotH*nDotH; \n' +
    '  float e04 = e02*e02; \n' +
    '  float e08 = e04*e04; \n' +
    '	 float e16 = e08*e08; \n' +
    '	 float e32 = e16*e16; \n' + 
    '	 float e64 = e32*e32;	\n' +

    '  float r02 = rDotv*rDotv; \n' +
    '  float r04 = r02*r02; \n' +
    '  float r08 = r04*r04; \n' +
    '	 float r16 = r08*r08; \n' +
    '	 float r32 = r16*r16; \n' + 
    '	 float r64 = r32*r32;	\n' +

    '  float blin_var = (blinn * e64) + (not_blinn * r64);\n' + 
      // Can you find a better way to do this? SEE GLSL 'pow()'.
         // Calculate the final color from diffuse reflection and ambient reflection
    '	 vec3 emissive = u_Ke;' +
    '  vec3 ambient = u_Lamp0Amb * u_Ka;\n' +
    '  vec3 diffuse = u_Lamp0Diff * v_Kd * nDotL;\n' +
    '	 vec3 speculr = u_Lamp0Spec * u_Ks * blin_var;\n' +
    '  gl_FragColor = vec4(emissive + ambient + diffuse + speculr , 1.0);\n' +
  //  '  gl_FragColor = vec4(emissive, 1.0);\n' +
  //  '  gl_FragColor = vec4(emissive + ambient, 1.0);\n' +
  // '  gl_FragColor = vec4(emissive + ambient + diffuse, 1.0);\n' +
  //  '  gl_FragColor = vec4(ambient + speculr , 1.0);\n' +
  
    '}\n';
  
    this.vboContents = new Float32Array([
      0.0,-1.0,0.0,1.0,-1.306012939612e-06,-0.9999999999991471,7.024692550196524e-18,
0.20318100000000006,-0.96795,0.14761800000000003,1.0,0.21095266289464853,-0.9654061618992498,0.15326420516420788,
-0.07760699999999998,-0.96795,0.23885299999999998,1.0,-0.08057675620781352,-0.9654060832357604,0.2479888723519962,
0.7236069999999999,-0.44721999999999995,0.525725,1.0,0.7236067216830413,-0.4472196513214831,0.5257260653677089,
0.6095470000000001,-0.657519,0.4428559999999999,1.0,0.6042310408008547,-0.6649722006723842,0.43899524105124693,
0.812729,-0.502301,0.2952379999999999,1.0,0.8151848055269568,-0.503817229437447,0.2857305236756347,
0.0,-1.0,0.0,1.0,-1.306012939612e-06,-0.9999999999991471,7.024692550196524e-18,
-0.07760699999999998,-0.96795,0.23885299999999998,1.0,-0.08057675620781352,-0.9654060832357604,0.2479888723519962,
-0.251147,-0.967949,0.0,1.0,-0.26075247981128585,-0.965405688957526,8.4223782992918e-07,
0.0,-1.0,0.0,1.0,-1.306012939612e-06,-0.9999999999991471,7.024692550196524e-18,
-0.251147,-0.967949,0.0,1.0,-0.26075247981128585,-0.965405688957526,8.4223782992918e-07,
-0.07760699999999998,-0.96795,-0.23885299999999998,1.0,-0.08057588379380852,-0.9654061724258667,-0.24798880860410688,
0.0,-1.0,0.0,1.0,-1.306012939612e-06,-0.9999999999991471,7.024692550196524e-18,
-0.07760699999999998,-0.96795,-0.23885299999999998,1.0,-0.08057588379380852,-0.9654061724258667,-0.24798880860410688,
0.20318100000000006,-0.96795,-0.14761800000000003,1.0,0.21095286907952562,-0.9654060533326492,-0.15326460522832558,
0.7236069999999999,-0.44721999999999995,0.525725,1.0,0.7236067216830413,-0.4472196513214831,0.5257260653677089,
0.812729,-0.502301,0.2952379999999999,1.0,0.8151848055269568,-0.503817229437447,0.2857305236756347,
0.860698,-0.251151,0.442858,1.0,0.864986890060841,-0.24306353018273283,0.4389963557001157,
-0.2763880000000001,-0.44721999999999995,0.850649,1.0,-0.27638775259514803,-0.44721995820039745,0.8506492339399584,
-0.02963899999999997,-0.502302,0.8641839999999998,1.0,-0.019838689717257413,-0.5038192559913451,0.8635812548235572,
-0.155215,-0.25115200000000004,0.955422,1.0,-0.15021677729008256,-0.24306351370824936,0.9583084305819194,
-0.894426,-0.44721600000000006,0.0,1.0,-0.8944264388330798,-0.44721509983046726,3.5123469383576465e-18,
-0.831051,-0.502299,0.23885299999999998,1.0,-0.8274488479658778,-0.5038149789897272,0.24798965894876002,
-0.956626,-0.25114900000000007,0.14761800000000003,1.0,-0.9578262170326509,-0.24306111405524763,0.1532652367601444,
-0.2763880000000001,-0.44721999999999995,-0.850649,1.0,-0.2763877525951483,-0.44721995820039734,-0.8506492339399583,
-0.48397099999999993,-0.502302,-0.716565,1.0,-0.4915461091474215,-0.5038186497816622,-0.7103162610515219,
-0.43600700000000003,-0.25115200000000004,-0.864188,1.0,-0.4417472320955005,-0.24306420283334987,-0.8635850718006606,
0.7236069999999999,-0.44721999999999995,-0.525725,1.0,0.7236067216830413,-0.4472196513214831,-0.525726065367709,
0.531941,-0.502302,-0.681712,1.0,0.5236579140350146,-0.503818798851909,-0.6869854488938736,
0.6871589999999999,-0.25115200000000004,-0.681715,1.0,0.6848117102472356,-0.2430639714860927,-0.6869882293559796,
0.7236069999999999,-0.44721999999999995,0.525725,1.0,0.7236067216830413,-0.4472196513214831,0.5257260653677089,
0.860698,-0.251151,0.442858,1.0,0.864986890060841,-0.24306353018273283,0.4389963557001157,
0.6871589999999999,-0.25115200000000004,0.6817150000000001,1.0,0.6848111757491196,-0.24306484466307332,0.6869884532203029,
-0.2763880000000001,-0.44721999999999995,0.850649,1.0,-0.27638775259514803,-0.44721995820039745,0.8506492339399584,
-0.155215,-0.25115200000000004,0.955422,1.0,-0.15021677729008256,-0.24306351370824936,0.9583084305819194,
-0.43600700000000003,-0.25115200000000004,0.864188,1.0,-0.4417470436660011,-0.2430638114471244,0.8635852783466985,
-0.894426,-0.44721600000000006,0.0,1.0,-0.8944264388330798,-0.44721509983046726,3.5123469383576465e-18,
-0.956626,-0.25114900000000007,0.14761800000000003,1.0,-0.9578262170326509,-0.24306111405524763,0.1532652367601444,
-0.956626,-0.25114900000000007,-0.14761800000000003,1.0,-0.9578262170326509,-0.24306111405524766,-0.15326523676014436,
-0.2763880000000001,-0.44721999999999995,-0.850649,1.0,-0.2763877525951483,-0.44721995820039734,-0.8506492339399583,
-0.43600700000000003,-0.25115200000000004,-0.864188,1.0,-0.4417472320955005,-0.24306420283334987,-0.8635850718006606,
-0.155215,-0.25115200000000004,-0.955422,1.0,-0.1502164527684422,-0.24306415178722385,-0.9583083196099383,
0.7236069999999999,-0.44721999999999995,-0.525725,1.0,0.7236067216830413,-0.4472196513214831,-0.525726065367709,
0.6871589999999999,-0.25115200000000004,-0.681715,1.0,0.6848117102472356,-0.2430639714860927,-0.6869882293559796,
0.860698,-0.251151,-0.442858,1.0,0.8649868190167103,-0.2430628154105527,-0.4389968914377966,
0.2763880000000001,0.44721999999999995,0.850649,1.0,0.27638775259514803,0.44721995820039745,0.8506492339399583,
0.48397099999999993,0.502302,0.7165650000000001,1.0,0.4915465997259058,0.5038185159472155,0.7103160164931138,
0.23282200000000008,0.657519,0.7165629999999998,1.0,0.2307912277766018,0.6649729391400707,0.7103142962047043,
-0.723607,0.44721999999999995,0.525725,1.0,-0.7236067216830413,0.4472196513214834,0.5257260653677087,
-0.531941,0.502302,0.6817120000000001,1.0,-0.5236576234680893,0.50381866852951,0.6869857659550921,
-0.609547,0.657519,0.4428559999999999,1.0,-0.6042309075875276,0.6649723338191165,0.4389952227201456,
-0.723607,0.44721999999999995,-0.525725,1.0,-0.7236067216830412,0.44721965132148317,-0.5257260653677089,
-0.812729,0.5023010000000001,-0.295238,1.0,-0.8151846510833863,0.503817580270061,-0.2857303456913146,
-0.609547,0.657519,-0.442856,1.0,-0.6042309075875275,0.6649723338191165,-0.43899522272014574,
0.2763880000000001,0.44721999999999995,-0.850649,1.0,0.27638775259514836,0.44721995820039734,-0.8506492339399583,
0.02963899999999997,0.502302,-0.864184,1.0,0.019838395348954305,0.5038189457553266,-0.8635814425796619,
0.23282200000000008,0.657519,-0.716563,1.0,0.230791227776602,0.6649729391400707,-0.7103142962047043,
0.8944260000000002,0.44721600000000006,0.0,1.0,0.8944264388330799,0.4472150998304671,-7.024693876715296e-18,
0.831051,0.502299,-0.23885299999999998,1.0,0.8274486846864867,0.5038152762710822,-0.24798959979502425,
0.753442,0.6575150000000001,0.0,1.0,0.746871320486886,0.6649685937201661,-3.519020267383579e-18,
0.251147,0.967949,0.0,1.0,0.26075244445654044,0.9654056985070778,0.0,
0.07760699999999998,0.9679500000000001,-0.23885299999999998,1.0,0.0805764015653053,0.9654061629757468,-0.24798867715932643,
0.0,1.0,0.0,1.0,1.3060129397770804e-06,0.9999999999991471,0.0,
0.52573,0.850652,0.0,1.0,0.5257289266852015,0.8506521590206104,-1.057645314374342e-17,
0.3618000000000001,0.8944290000000001,-0.26286300000000007,1.0,0.36820620295749656,0.8904258595923642,-0.2675181875552053,
0.251147,0.967949,0.0,1.0,0.26075244445654044,0.9654056985070778,0.0,
0.753442,0.6575150000000001,0.0,1.0,0.746871320486886,0.6649685937201661,-3.519020267383579e-18,
0.6381939999999999,0.7236099999999999,-0.262864,1.0,0.6317479702095651,0.7275492343102217,-0.2675193708700447,
0.52573,0.850652,0.0,1.0,0.5257289266852015,0.8506521590206104,-1.057645314374342e-17,
0.251147,0.967949,0.0,1.0,0.26075244445654044,0.9654056985070778,0.0,
0.3618000000000001,0.8944290000000001,-0.26286300000000007,1.0,0.36820620295749656,0.8904258595923642,-0.2675181875552053,
0.07760699999999998,0.9679500000000001,-0.23885299999999998,1.0,0.0805764015653053,0.9654061629757468,-0.24798867715932643,
0.3618000000000001,0.8944290000000001,-0.26286300000000007,1.0,0.36820620295749656,0.8904258595923642,-0.2675181875552053,
0.16245599999999993,0.850654,-0.49999499999999997,1.0,0.16245637815790648,0.8506538865776185,-0.49999589042931863,
0.07760699999999998,0.9679500000000001,-0.23885299999999998,1.0,0.0805764015653053,0.9654061629757468,-0.24798867715932643,
0.52573,0.850652,0.0,1.0,0.5257289266852015,0.8506521590206104,-1.057645314374342e-17,
0.6381939999999999,0.7236099999999999,-0.262864,1.0,0.6317479702095651,0.7275492343102217,-0.2675193708700447,
0.3618000000000001,0.8944290000000001,-0.26286300000000007,1.0,0.36820620295749656,0.8904258595923642,-0.2675181875552053,
0.6381939999999999,0.7236099999999999,-0.262864,1.0,0.6317479702095651,0.7275492343102217,-0.2675193708700447,
0.44720899999999997,0.7236120000000001,-0.525728,1.0,0.44964377423881924,0.7275512992269764,-0.5181598047720494,
0.3618000000000001,0.8944290000000001,-0.26286300000000007,1.0,0.36820620295749656,0.8904258595923642,-0.2675181875552053,
0.3618000000000001,0.8944290000000001,-0.26286300000000007,1.0,0.36820620295749656,0.8904258595923642,-0.2675181875552053,
0.44720899999999997,0.7236120000000001,-0.525728,1.0,0.44964377423881924,0.7275512992269764,-0.5181598047720494,
0.16245599999999993,0.850654,-0.49999499999999997,1.0,0.16245637815790648,0.8506538865776185,-0.49999589042931863,
0.44720899999999997,0.7236120000000001,-0.525728,1.0,0.44964377423881924,0.7275512992269764,-0.5181598047720494,
0.23282200000000008,0.657519,-0.716563,1.0,0.230791227776602,0.6649729391400707,-0.7103142962047043,
0.16245599999999993,0.850654,-0.49999499999999997,1.0,0.16245637815790648,0.8506538865776185,-0.49999589042931863,
0.753442,0.6575150000000001,0.0,1.0,0.746871320486886,0.6649685937201661,-3.519020267383579e-18,
0.831051,0.502299,-0.23885299999999998,1.0,0.8274486846864867,0.5038152762710822,-0.24798959979502425,
0.6381939999999999,0.7236099999999999,-0.262864,1.0,0.6317479702095651,0.7275492343102217,-0.2675193708700447,
0.831051,0.502299,-0.23885299999999998,1.0,0.8274486846864867,0.5038152762710822,-0.24798959979502425,
0.6881889999999999,0.525736,-0.499997,1.0,0.688189315323338,0.5257353070007666,-0.49999785324299634,
0.6381939999999999,0.7236099999999999,-0.262864,1.0,0.6317479702095651,0.7275492343102217,-0.2675193708700447,
0.6381939999999999,0.7236099999999999,-0.262864,1.0,0.6317479702095651,0.7275492343102217,-0.2675193708700447,
0.6881889999999999,0.525736,-0.499997,1.0,0.688189315323338,0.5257353070007666,-0.49999785324299634,
0.44720899999999997,0.7236120000000001,-0.525728,1.0,0.44964377423881924,0.7275512992269764,-0.5181598047720494,
0.6881889999999999,0.525736,-0.499997,1.0,0.688189315323338,0.5257353070007666,-0.49999785324299634,
0.48397099999999993,0.502302,-0.716565,1.0,0.4915463260698537,0.5038187053981455,-0.7103160714908299,
0.44720899999999997,0.7236120000000001,-0.525728,1.0,0.44964377423881924,0.7275512992269764,-0.5181598047720494,
0.44720899999999997,0.7236120000000001,-0.525728,1.0,0.44964377423881924,0.7275512992269764,-0.5181598047720494,
0.48397099999999993,0.502302,-0.716565,1.0,0.4915463260698537,0.5038187053981455,-0.7103160714908299,
0.23282200000000008,0.657519,-0.716563,1.0,0.230791227776602,0.6649729391400707,-0.7103142962047043,
0.48397099999999993,0.502302,-0.716565,1.0,0.4915463260698537,0.5038187053981455,-0.7103160714908299,
0.2763880000000001,0.44721999999999995,-0.850649,1.0,0.27638775259514836,0.44721995820039734,-0.8506492339399583,
0.23282200000000008,0.657519,-0.716563,1.0,0.230791227776602,0.6649729391400707,-0.7103142962047043,
0.07760699999999998,0.9679500000000001,-0.23885299999999998,1.0,0.0805764015653053,0.9654061629757468,-0.24798867715932643,
-0.20318100000000006,0.9679500000000001,-0.14761800000000003,1.0,-0.21095224816685468,0.9654061955752871,-0.15326456386980095,
0.0,1.0,0.0,1.0,1.3060129397770804e-06,0.9999999999991471,0.0,
0.16245599999999993,0.850654,-0.49999499999999997,1.0,0.16245637815790648,0.8506538865776185,-0.49999589042931863,
-0.13819700000000001,0.8944299999999998,-0.425319,1.0,-0.14064429309391377,0.8904261866643726,-0.4328514628858925,
0.07760699999999998,0.9679500000000001,-0.23885299999999998,1.0,0.0805764015653053,0.9654061629757468,-0.24798867715932643,
0.23282200000000008,0.657519,-0.716563,1.0,0.230791227776602,0.6649729391400707,-0.7103142962047043,
-0.052790000000000004,0.7236120000000001,-0.688185,1.0,-0.059207598386989156,0.7275518109725035,-0.6834931035817958,
0.16245599999999993,0.850654,-0.49999499999999997,1.0,0.16245637815790648,0.8506538865776185,-0.49999589042931863,
0.07760699999999998,0.9679500000000001,-0.23885299999999998,1.0,0.0805764015653053,0.9654061629757468,-0.24798867715932643,
-0.13819700000000001,0.8944299999999998,-0.425319,1.0,-0.14064429309391377,0.8904261866643726,-0.4328514628858925,
-0.20318100000000006,0.9679500000000001,-0.14761800000000003,1.0,-0.21095224816685468,0.9654061955752871,-0.15326456386980095,
-0.13819700000000001,0.8944299999999998,-0.425319,1.0,-0.14064429309391377,0.8904261866643726,-0.4328514628858925,
-0.425323,0.850654,-0.3090109999999999,1.0,-0.4253228822840165,0.8506537460570991,-0.3090123785945165,
-0.20318100000000006,0.9679500000000001,-0.14761800000000003,1.0,-0.21095224816685468,0.9654061955752871,-0.15326456386980095,
0.16245599999999993,0.850654,-0.49999499999999997,1.0,0.16245637815790648,0.8506538865776185,-0.49999589042931863,
-0.052790000000000004,0.7236120000000001,-0.688185,1.0,-0.059207598386989156,0.7275518109725035,-0.6834931035817958,
-0.13819700000000001,0.8944299999999998,-0.425319,1.0,-0.14064429309391377,0.8904261866643726,-0.4328514628858925,
-0.052790000000000004,0.7236120000000001,-0.688185,1.0,-0.059207598386989156,0.7275518109725035,-0.6834931035817958,
-0.361804,0.7236120000000001,-0.587778,1.0,-0.3538539217412299,0.7275517393882928,-0.5877549392233308,
-0.13819700000000001,0.8944299999999998,-0.425319,1.0,-0.14064429309391377,0.8904261866643726,-0.4328514628858925,
-0.13819700000000001,0.8944299999999998,-0.425319,1.0,-0.14064429309391377,0.8904261866643726,-0.4328514628858925,
-0.361804,0.7236120000000001,-0.587778,1.0,-0.3538539217412299,0.7275517393882928,-0.5877549392233308,
-0.425323,0.850654,-0.3090109999999999,1.0,-0.4253228822840165,0.8506537460570991,-0.3090123785945165,
-0.361804,0.7236120000000001,-0.587778,1.0,-0.3538539217412299,0.7275517393882928,-0.5877549392233308,
-0.609547,0.657519,-0.442856,1.0,-0.6042309075875275,0.6649723338191165,-0.43899522272014574,
-0.425323,0.850654,-0.3090109999999999,1.0,-0.4253228822840165,0.8506537460570991,-0.3090123785945165,
0.23282200000000008,0.657519,-0.716563,1.0,0.230791227776602,0.6649729391400707,-0.7103142962047043,
0.02963899999999997,0.502302,-0.864184,1.0,0.019838395348954305,0.5038189457553266,-0.8635814425796619,
-0.052790000000000004,0.7236120000000001,-0.688185,1.0,-0.059207598386989156,0.7275518109725035,-0.6834931035817958,
0.02963899999999997,0.502302,-0.864184,1.0,0.019838395348954305,0.5038189457553266,-0.8635814425796619,
-0.262869,0.525738,-0.809012,1.0,-0.2628688830438233,0.5257372869737825,-0.8090119006619986,
-0.052790000000000004,0.7236120000000001,-0.688185,1.0,-0.059207598386989156,0.7275518109725035,-0.6834931035817958,
-0.052790000000000004,0.7236120000000001,-0.688185,1.0,-0.059207598386989156,0.7275518109725035,-0.6834931035817958,
-0.262869,0.525738,-0.809012,1.0,-0.2628688830438233,0.5257372869737825,-0.8090119006619986,
-0.361804,0.7236120000000001,-0.587778,1.0,-0.3538539217412299,0.7275517393882928,-0.5877549392233308,
-0.262869,0.525738,-0.809012,1.0,-0.2628688830438233,0.5257372869737825,-0.8090119006619986,
-0.531941,0.502302,-0.681712,1.0,-0.5236577408730431,0.5038188776590388,-0.6869855230921009,
-0.361804,0.7236120000000001,-0.587778,1.0,-0.3538539217412299,0.7275517393882928,-0.5877549392233308,
-0.361804,0.7236120000000001,-0.587778,1.0,-0.3538539217412299,0.7275517393882928,-0.5877549392233308,
-0.531941,0.502302,-0.681712,1.0,-0.5236577408730431,0.5038188776590388,-0.6869855230921009,
-0.609547,0.657519,-0.442856,1.0,-0.6042309075875275,0.6649723338191165,-0.43899522272014574,
-0.531941,0.502302,-0.681712,1.0,-0.5236577408730431,0.5038188776590388,-0.6869855230921009,
-0.723607,0.44721999999999995,-0.525725,1.0,-0.7236067216830412,0.44721965132148317,-0.5257260653677089,
-0.609547,0.657519,-0.442856,1.0,-0.6042309075875275,0.6649723338191165,-0.43899522272014574,
-0.20318100000000006,0.9679500000000001,-0.14761800000000003,1.0,-0.21095224816685468,0.9654061955752871,-0.15326456386980095,
-0.20318100000000006,0.9679500000000001,0.14761800000000003,1.0,-0.21095224816685468,0.9654061955752871,0.15326456386980092,
0.0,1.0,0.0,1.0,1.3060129397770804e-06,0.9999999999991471,0.0,
-0.425323,0.850654,-0.3090109999999999,1.0,-0.4253228822840165,0.8506537460570991,-0.3090123785945165,
-0.44721,0.8944290000000001,0.0,1.0,-0.4551286493768027,0.8904256917432513,3.526214980202345e-18,
-0.20318100000000006,0.9679500000000001,-0.14761800000000003,1.0,-0.21095224816685468,0.9654061955752871,-0.15326456386980095,
-0.609547,0.657519,-0.442856,1.0,-0.6042309075875275,0.6649723338191165,-0.43899522272014574,
-0.670817,0.723611,-0.16245699999999996,1.0,-0.6683380216406349,0.7275501061976027,-0.15490362100783547,
-0.425323,0.850654,-0.3090109999999999,1.0,-0.4253228822840165,0.8506537460570991,-0.3090123785945165,
-0.20318100000000006,0.9679500000000001,-0.14761800000000003,1.0,-0.21095224816685468,0.9654061955752871,-0.15326456386980095,
-0.44721,0.8944290000000001,0.0,1.0,-0.4551286493768027,0.8904256917432513,3.526214980202345e-18,
-0.20318100000000006,0.9679500000000001,0.14761800000000003,1.0,-0.21095224816685468,0.9654061955752871,0.15326456386980092,
-0.44721,0.8944290000000001,0.0,1.0,-0.4551286493768027,0.8904256917432513,3.526214980202345e-18,
-0.425323,0.850654,0.3090109999999999,1.0,-0.4253228822840165,0.8506537460570992,0.3090123785945165,
-0.20318100000000006,0.9679500000000001,0.14761800000000003,1.0,-0.21095224816685468,0.9654061955752871,0.15326456386980092,
-0.425323,0.850654,-0.3090109999999999,1.0,-0.4253228822840165,0.8506537460570991,-0.3090123785945165,
-0.670817,0.723611,-0.16245699999999996,1.0,-0.6683380216406349,0.7275501061976027,-0.15490362100783547,
-0.44721,0.8944290000000001,0.0,1.0,-0.4551286493768027,0.8904256917432513,3.526214980202345e-18,
-0.670817,0.723611,-0.16245699999999996,1.0,-0.6683380216406349,0.7275501061976027,-0.15490362100783547,
-0.670817,0.723611,0.16245700000000007,1.0,-0.6683380216406349,0.7275501061976029,0.15490362100783564,
-0.44721,0.8944290000000001,0.0,1.0,-0.4551286493768027,0.8904256917432513,3.526214980202345e-18,
-0.44721,0.8944290000000001,0.0,1.0,-0.4551286493768027,0.8904256917432513,3.526214980202345e-18,
-0.670817,0.723611,0.16245700000000007,1.0,-0.6683380216406349,0.7275501061976029,0.15490362100783564,
-0.425323,0.850654,0.3090109999999999,1.0,-0.4253228822840165,0.8506537460570992,0.3090123785945165,
-0.670817,0.723611,0.16245700000000007,1.0,-0.6683380216406349,0.7275501061976029,0.15490362100783564,
-0.609547,0.657519,0.4428559999999999,1.0,-0.6042309075875276,0.6649723338191165,0.4389952227201456,
-0.425323,0.850654,0.3090109999999999,1.0,-0.4253228822840165,0.8506537460570992,0.3090123785945165,
-0.609547,0.657519,-0.442856,1.0,-0.6042309075875275,0.6649723338191165,-0.43899522272014574,
-0.812729,0.5023010000000001,-0.295238,1.0,-0.8151846510833863,0.503817580270061,-0.2857303456913146,
-0.670817,0.723611,-0.16245699999999996,1.0,-0.6683380216406349,0.7275501061976027,-0.15490362100783547,
-0.812729,0.5023010000000001,-0.295238,1.0,-0.8151846510833863,0.503817580270061,-0.2857303456913146,
-0.850648,0.525736,0.0,1.0,-0.850648504669507,0.5257348395374611,-2.2739670286765194e-07,
-0.670817,0.723611,-0.16245699999999996,1.0,-0.6683380216406349,0.7275501061976027,-0.15490362100783547,
-0.670817,0.723611,-0.16245699999999996,1.0,-0.6683380216406349,0.7275501061976027,-0.15490362100783547,
-0.850648,0.525736,0.0,1.0,-0.850648504669507,0.5257348395374611,-2.2739670286765194e-07,
-0.670817,0.723611,0.16245700000000007,1.0,-0.6683380216406349,0.7275501061976029,0.15490362100783564,
-0.850648,0.525736,0.0,1.0,-0.850648504669507,0.5257348395374611,-2.2739670286765194e-07,
-0.812729,0.5023010000000001,0.2952379999999999,1.0,-0.8151843815554107,0.5038178905016056,0.28573056763082694,
-0.670817,0.723611,0.16245700000000007,1.0,-0.6683380216406349,0.7275501061976029,0.15490362100783564,
-0.670817,0.723611,0.16245700000000007,1.0,-0.6683380216406349,0.7275501061976029,0.15490362100783564,
-0.812729,0.5023010000000001,0.2952379999999999,1.0,-0.8151843815554107,0.5038178905016056,0.28573056763082694,
-0.609547,0.657519,0.4428559999999999,1.0,-0.6042309075875276,0.6649723338191165,0.4389952227201456,
-0.812729,0.5023010000000001,0.2952379999999999,1.0,-0.8151843815554107,0.5038178905016056,0.28573056763082694,
-0.723607,0.44721999999999995,0.525725,1.0,-0.7236067216830413,0.4472196513214834,0.5257260653677087,
-0.609547,0.657519,0.4428559999999999,1.0,-0.6042309075875276,0.6649723338191165,0.4389952227201456,
-0.20318100000000006,0.9679500000000001,0.14761800000000003,1.0,-0.21095224816685468,0.9654061955752871,0.15326456386980092,
0.07760699999999998,0.9679500000000001,0.23885299999999998,1.0,0.08057640156530528,0.9654061629757468,0.24798867715932643,
0.0,1.0,0.0,1.0,1.3060129397770804e-06,0.9999999999991471,0.0,
-0.425323,0.850654,0.3090109999999999,1.0,-0.4253228822840165,0.8506537460570992,0.3090123785945165,
-0.13819700000000001,0.8944299999999998,0.425319,1.0,-0.1406442930939137,0.8904261866643726,0.4328514628858925,
-0.20318100000000006,0.9679500000000001,0.14761800000000003,1.0,-0.21095224816685468,0.9654061955752871,0.15326456386980092,
-0.609547,0.657519,0.4428559999999999,1.0,-0.6042309075875276,0.6649723338191165,0.4389952227201456,
-0.361804,0.7236120000000001,0.5877780000000001,1.0,-0.35385392174123004,0.7275517393882929,0.5877549392233307,
-0.425323,0.850654,0.3090109999999999,1.0,-0.4253228822840165,0.8506537460570992,0.3090123785945165,
-0.20318100000000006,0.9679500000000001,0.14761800000000003,1.0,-0.21095224816685468,0.9654061955752871,0.15326456386980092,
-0.13819700000000001,0.8944299999999998,0.425319,1.0,-0.1406442930939137,0.8904261866643726,0.4328514628858925,
0.07760699999999998,0.9679500000000001,0.23885299999999998,1.0,0.08057640156530528,0.9654061629757468,0.24798867715932643,
-0.13819700000000001,0.8944299999999998,0.425319,1.0,-0.1406442930939137,0.8904261866643726,0.4328514628858925,
0.16245599999999993,0.850654,0.49999499999999997,1.0,0.16245637815790648,0.8506538865776185,0.49999589042931875,
0.07760699999999998,0.9679500000000001,0.23885299999999998,1.0,0.08057640156530528,0.9654061629757468,0.24798867715932643,
-0.425323,0.850654,0.3090109999999999,1.0,-0.4253228822840165,0.8506537460570992,0.3090123785945165,
-0.361804,0.7236120000000001,0.5877780000000001,1.0,-0.35385392174123004,0.7275517393882929,0.5877549392233307,
-0.13819700000000001,0.8944299999999998,0.425319,1.0,-0.1406442930939137,0.8904261866643726,0.4328514628858925,
-0.361804,0.7236120000000001,0.5877780000000001,1.0,-0.35385392174123004,0.7275517393882929,0.5877549392233307,
-0.052790000000000004,0.7236120000000001,0.688185,1.0,-0.0592075983869889,0.7275518109725035,0.6834931035817959,
-0.13819700000000001,0.8944299999999998,0.425319,1.0,-0.1406442930939137,0.8904261866643726,0.4328514628858925,
-0.13819700000000001,0.8944299999999998,0.425319,1.0,-0.1406442930939137,0.8904261866643726,0.4328514628858925,
-0.052790000000000004,0.7236120000000001,0.688185,1.0,-0.0592075983869889,0.7275518109725035,0.6834931035817959,
0.16245599999999993,0.850654,0.49999499999999997,1.0,0.16245637815790648,0.8506538865776185,0.49999589042931875,
-0.052790000000000004,0.7236120000000001,0.688185,1.0,-0.0592075983869889,0.7275518109725035,0.6834931035817959,
0.23282200000000008,0.657519,0.7165629999999998,1.0,0.2307912277766018,0.6649729391400707,0.7103142962047043,
0.16245599999999993,0.850654,0.49999499999999997,1.0,0.16245637815790648,0.8506538865776185,0.49999589042931875,
-0.609547,0.657519,0.4428559999999999,1.0,-0.6042309075875276,0.6649723338191165,0.4389952227201456,
-0.531941,0.502302,0.6817120000000001,1.0,-0.5236576234680893,0.50381866852951,0.6869857659550921,
-0.361804,0.7236120000000001,0.5877780000000001,1.0,-0.35385392174123004,0.7275517393882929,0.5877549392233307,
-0.531941,0.502302,0.6817120000000001,1.0,-0.5236576234680893,0.50381866852951,0.6869857659550921,
-0.262869,0.525738,0.8090120000000001,1.0,-0.26286917763817624,0.5257368727147139,0.8090120741472168,
-0.361804,0.7236120000000001,0.5877780000000001,1.0,-0.35385392174123004,0.7275517393882929,0.5877549392233307,
-0.361804,0.7236120000000001,0.5877780000000001,1.0,-0.35385392174123004,0.7275517393882929,0.5877549392233307,
-0.262869,0.525738,0.8090120000000001,1.0,-0.26286917763817624,0.5257368727147139,0.8090120741472168,
-0.052790000000000004,0.7236120000000001,0.688185,1.0,-0.0592075983869889,0.7275518109725035,0.6834931035817959,
-0.262869,0.525738,0.8090120000000001,1.0,-0.26286917763817624,0.5257368727147139,0.8090120741472168,
0.02963899999999997,0.502302,0.8641839999999998,1.0,0.01983839534895446,0.5038189457553266,0.8635814425796619,
-0.052790000000000004,0.7236120000000001,0.688185,1.0,-0.0592075983869889,0.7275518109725035,0.6834931035817959,
-0.052790000000000004,0.7236120000000001,0.688185,1.0,-0.0592075983869889,0.7275518109725035,0.6834931035817959,
0.02963899999999997,0.502302,0.8641839999999998,1.0,0.01983839534895446,0.5038189457553266,0.8635814425796619,
0.23282200000000008,0.657519,0.7165629999999998,1.0,0.2307912277766018,0.6649729391400707,0.7103142962047043,
0.02963899999999997,0.502302,0.8641839999999998,1.0,0.01983839534895446,0.5038189457553266,0.8635814425796619,
0.2763880000000001,0.44721999999999995,0.850649,1.0,0.27638775259514803,0.44721995820039745,0.8506492339399583,
0.23282200000000008,0.657519,0.7165629999999998,1.0,0.2307912277766018,0.6649729391400707,0.7103142962047043,
0.07760699999999998,0.9679500000000001,0.23885299999999998,1.0,0.08057640156530528,0.9654061629757468,0.24798867715932643,
0.251147,0.967949,0.0,1.0,0.26075244445654044,0.9654056985070778,0.0,
0.0,1.0,0.0,1.0,1.3060129397770804e-06,0.9999999999991471,0.0,
0.16245599999999993,0.850654,0.49999499999999997,1.0,0.16245637815790648,0.8506538865776185,0.49999589042931875,
0.3618000000000001,0.8944290000000001,0.26286300000000007,1.0,0.36820620295749656,0.8904258595923642,0.26751818755520523,
0.07760699999999998,0.9679500000000001,0.23885299999999998,1.0,0.08057640156530528,0.9654061629757468,0.24798867715932643,
0.23282200000000008,0.657519,0.7165629999999998,1.0,0.2307912277766018,0.6649729391400707,0.7103142962047043,
0.44720899999999997,0.7236120000000001,0.525728,1.0,0.4496437742388191,0.7275512992269764,0.5181598047720494,
0.16245599999999993,0.850654,0.49999499999999997,1.0,0.16245637815790648,0.8506538865776185,0.49999589042931875,
0.07760699999999998,0.9679500000000001,0.23885299999999998,1.0,0.08057640156530528,0.9654061629757468,0.24798867715932643,
0.3618000000000001,0.8944290000000001,0.26286300000000007,1.0,0.36820620295749656,0.8904258595923642,0.26751818755520523,
0.251147,0.967949,0.0,1.0,0.26075244445654044,0.9654056985070778,0.0,
0.3618000000000001,0.8944290000000001,0.26286300000000007,1.0,0.36820620295749656,0.8904258595923642,0.26751818755520523,
0.52573,0.850652,0.0,1.0,0.5257289266852015,0.8506521590206104,-1.057645314374342e-17,
0.251147,0.967949,0.0,1.0,0.26075244445654044,0.9654056985070778,0.0,
0.16245599999999993,0.850654,0.49999499999999997,1.0,0.16245637815790648,0.8506538865776185,0.49999589042931875,
0.44720899999999997,0.7236120000000001,0.525728,1.0,0.4496437742388191,0.7275512992269764,0.5181598047720494,
0.3618000000000001,0.8944290000000001,0.26286300000000007,1.0,0.36820620295749656,0.8904258595923642,0.26751818755520523,
0.44720899999999997,0.7236120000000001,0.525728,1.0,0.4496437742388191,0.7275512992269764,0.5181598047720494,
0.6381939999999999,0.7236099999999999,0.262864,1.0,0.6317479702095651,0.7275492343102217,0.2675193708700447,
0.3618000000000001,0.8944290000000001,0.26286300000000007,1.0,0.36820620295749656,0.8904258595923642,0.26751818755520523,
0.3618000000000001,0.8944290000000001,0.26286300000000007,1.0,0.36820620295749656,0.8904258595923642,0.26751818755520523,
0.6381939999999999,0.7236099999999999,0.262864,1.0,0.6317479702095651,0.7275492343102217,0.2675193708700447,
0.52573,0.850652,0.0,1.0,0.5257289266852015,0.8506521590206104,-1.057645314374342e-17,
0.6381939999999999,0.7236099999999999,0.262864,1.0,0.6317479702095651,0.7275492343102217,0.2675193708700447,
0.753442,0.6575150000000001,0.0,1.0,0.746871320486886,0.6649685937201661,-3.519020267383579e-18,
0.52573,0.850652,0.0,1.0,0.5257289266852015,0.8506521590206104,-1.057645314374342e-17,
0.23282200000000008,0.657519,0.7165629999999998,1.0,0.2307912277766018,0.6649729391400707,0.7103142962047043,
0.48397099999999993,0.502302,0.7165650000000001,1.0,0.4915465997259058,0.5038185159472155,0.7103160164931138,
0.44720899999999997,0.7236120000000001,0.525728,1.0,0.4496437742388191,0.7275512992269764,0.5181598047720494,
0.48397099999999993,0.502302,0.7165650000000001,1.0,0.4915465997259058,0.5038185159472155,0.7103160164931138,
0.6881889999999999,0.525736,0.499997,1.0,0.6881896241859202,0.5257346676673482,0.49999810037193615,
0.44720899999999997,0.7236120000000001,0.525728,1.0,0.4496437742388191,0.7275512992269764,0.5181598047720494,
0.44720899999999997,0.7236120000000001,0.525728,1.0,0.4496437742388191,0.7275512992269764,0.5181598047720494,
0.6881889999999999,0.525736,0.499997,1.0,0.6881896241859202,0.5257346676673482,0.49999810037193615,
0.6381939999999999,0.7236099999999999,0.262864,1.0,0.6317479702095651,0.7275492343102217,0.2675193708700447,
0.6881889999999999,0.525736,0.499997,1.0,0.6881896241859202,0.5257346676673482,0.49999810037193615,
0.831051,0.502299,0.23885299999999998,1.0,0.8274487904509396,0.5038149163054394,0.24798997820359664,
0.6381939999999999,0.7236099999999999,0.262864,1.0,0.6317479702095651,0.7275492343102217,0.2675193708700447,
0.6381939999999999,0.7236099999999999,0.262864,1.0,0.6317479702095651,0.7275492343102217,0.2675193708700447,
0.831051,0.502299,0.23885299999999998,1.0,0.8274487904509396,0.5038149163054394,0.24798997820359664,
0.753442,0.6575150000000001,0.0,1.0,0.746871320486886,0.6649685937201661,-3.519020267383579e-18,
0.831051,0.502299,0.23885299999999998,1.0,0.8274487904509396,0.5038149163054394,0.24798997820359664,
0.8944260000000002,0.44721600000000006,0.0,1.0,0.8944264388330799,0.4472150998304671,-7.024693876715296e-18,
0.753442,0.6575150000000001,0.0,1.0,0.746871320486886,0.6649685937201661,-3.519020267383579e-18,
0.956626,0.25114900000000007,-0.14761800000000003,1.0,0.9578262483355788,0.24306118218022527,-0.15326493309476094,
0.831051,0.502299,-0.23885299999999998,1.0,0.8274486846864867,0.5038152762710822,-0.24798959979502425,
0.8944260000000002,0.44721600000000006,0.0,1.0,0.8944264388330799,0.4472150998304671,-7.024693876715296e-18,
0.951058,0.0,-0.309013,1.0,0.9510575012112954,5.074933413732154e-07,-0.30901396309789836,
0.861804,0.2763960000000001,-0.425322,1.0,0.8593175031254149,0.27241679196618035,-0.43285392487207186,
0.956626,0.25114900000000007,-0.14761800000000003,1.0,0.9578262483355788,0.24306118218022527,-0.15326493309476094,
0.860698,-0.251151,-0.442858,1.0,0.8649868190167103,-0.2430628154105527,-0.4389968914377966,
0.8090190000000002,0.0,-0.587782,1.0,0.8089870842176278,0.008873212629478702,-0.5877594437069411,
0.951058,0.0,-0.309013,1.0,0.9510575012112954,5.074933413732154e-07,-0.30901396309789836,
0.956626,0.25114900000000007,-0.14761800000000003,1.0,0.9578262483355788,0.24306118218022527,-0.15326493309476094,
0.861804,0.2763960000000001,-0.425322,1.0,0.8593175031254149,0.27241679196618035,-0.43285392487207186,
0.831051,0.502299,-0.23885299999999998,1.0,0.8274486846864867,0.5038152762710822,-0.24798959979502425,
0.861804,0.2763960000000001,-0.425322,1.0,0.8593175031254149,0.27241679196618035,-0.43285392487207186,
0.6881889999999999,0.525736,-0.499997,1.0,0.688189315323338,0.5257353070007666,-0.49999785324299634,
0.831051,0.502299,-0.23885299999999998,1.0,0.8274486846864867,0.5038152762710822,-0.24798959979502425,
0.951058,0.0,-0.309013,1.0,0.9510575012112954,5.074933413732154e-07,-0.30901396309789836,
0.8090190000000002,0.0,-0.587782,1.0,0.8089870842176278,0.008873212629478702,-0.5877594437069411,
0.861804,0.2763960000000001,-0.425322,1.0,0.8593175031254149,0.27241679196618035,-0.43285392487207186,
0.8090190000000002,0.0,-0.587782,1.0,0.8089870842176278,0.008873212629478702,-0.5877594437069411,
0.6708210000000001,0.276397,-0.688189,1.0,0.6772151552047805,0.272417935232739,-0.6834969657024793,
0.861804,0.2763960000000001,-0.425322,1.0,0.8593175031254149,0.27241679196618035,-0.43285392487207186,
0.861804,0.2763960000000001,-0.425322,1.0,0.8593175031254149,0.27241679196618035,-0.43285392487207186,
0.6708210000000001,0.276397,-0.688189,1.0,0.6772151552047805,0.272417935232739,-0.6834969657024793,
0.6881889999999999,0.525736,-0.499997,1.0,0.688189315323338,0.5257353070007666,-0.49999785324299634,
0.6708210000000001,0.276397,-0.688189,1.0,0.6772151552047805,0.272417935232739,-0.6834969657024793,
0.48397099999999993,0.502302,-0.716565,1.0,0.4915463260698537,0.5038187053981455,-0.7103160714908299,
0.6881889999999999,0.525736,-0.499997,1.0,0.688189315323338,0.5257353070007666,-0.49999785324299634,
0.860698,-0.251151,-0.442858,1.0,0.8649868190167103,-0.2430628154105527,-0.4389968914377966,
0.6871589999999999,-0.25115200000000004,-0.681715,1.0,0.6848117102472356,-0.2430639714860927,-0.6869882293559796,
0.8090190000000002,0.0,-0.587782,1.0,0.8089870842176278,0.008873212629478702,-0.5877594437069411,
0.6871589999999999,-0.25115200000000004,-0.681715,1.0,0.6848117102472356,-0.2430639714860927,-0.6869882293559796,
0.5877859999999999,0.0,-0.809017,1.0,0.5877858829948915,-2.554691144635855e-08,-0.809016536142442,
0.8090190000000002,0.0,-0.587782,1.0,0.8089870842176278,0.008873212629478702,-0.5877594437069411,
0.8090190000000002,0.0,-0.587782,1.0,0.8089870842176278,0.008873212629478702,-0.5877594437069411,
0.5877859999999999,0.0,-0.809017,1.0,0.5877858829948915,-2.554691144635855e-08,-0.809016536142442,
0.6708210000000001,0.276397,-0.688189,1.0,0.6772151552047805,0.272417935232739,-0.6834969657024793,
0.5877859999999999,0.0,-0.809017,1.0,0.5877858829948915,-2.554691144635855e-08,-0.809016536142442,
0.43600700000000003,0.25115200000000004,-0.864188,1.0,0.44174743584464,0.2430637566759591,-0.8635850931525253,
0.6708210000000001,0.276397,-0.688189,1.0,0.6772151552047805,0.272417935232739,-0.6834969657024793,
0.6708210000000001,0.276397,-0.688189,1.0,0.6772151552047805,0.272417935232739,-0.6834969657024793,
0.43600700000000003,0.25115200000000004,-0.864188,1.0,0.44174743584464,0.2430637566759591,-0.8635850931525253,
0.48397099999999993,0.502302,-0.716565,1.0,0.4915463260698537,0.5038187053981455,-0.7103160714908299,
0.43600700000000003,0.25115200000000004,-0.864188,1.0,0.44174743584464,0.2430637566759591,-0.8635850931525253,
0.2763880000000001,0.44721999999999995,-0.850649,1.0,0.27638775259514836,0.44721995820039734,-0.8506492339399583,
0.48397099999999993,0.502302,-0.716565,1.0,0.4915463260698537,0.5038187053981455,-0.7103160714908299,
0.1552150000000001,0.25115200000000004,-0.955422,1.0,0.15021657377136222,0.24306347133980513,-0.9583084732301164,
0.02963899999999997,0.502302,-0.864184,1.0,0.019838395348954305,0.5038189457553266,-0.8635814425796619,
0.2763880000000001,0.44721999999999995,-0.850649,1.0,0.27638775259514836,0.44721995820039734,-0.8506492339399583,
0.0,0.0,-1.0,1.0,8.386527000463054e-07,1.0350315843348408e-07,-0.999999999999643,
-0.13819899999999996,0.276397,-0.951055,1.0,-0.14612907117205193,0.2724178643965829,-0.9510177715037708,
0.1552150000000001,0.25115200000000004,-0.955422,1.0,0.15021657377136222,0.24306347133980513,-0.9583084732301164,
-0.155215,-0.25115200000000004,-0.955422,1.0,-0.1502164527684422,-0.24306415178722385,-0.9583083196099383,
-0.30901599999999996,0.0,-0.951057,1.0,-0.30900375318742496,0.00887256725174435,-0.9510194309615595,
0.0,0.0,-1.0,1.0,8.386527000463054e-07,1.0350315843348408e-07,-0.999999999999643,
0.1552150000000001,0.25115200000000004,-0.955422,1.0,0.15021657377136222,0.24306347133980513,-0.9583084732301164,
-0.13819899999999996,0.276397,-0.951055,1.0,-0.14612907117205193,0.2724178643965829,-0.9510177715037708,
0.02963899999999997,0.502302,-0.864184,1.0,0.019838395348954305,0.5038189457553266,-0.8635814425796619,
-0.13819899999999996,0.276397,-0.951055,1.0,-0.14612907117205193,0.2724178643965829,-0.9510177715037708,
-0.262869,0.525738,-0.809012,1.0,-0.2628688830438233,0.5257372869737825,-0.8090119006619986,
0.02963899999999997,0.502302,-0.864184,1.0,0.019838395348954305,0.5038189457553266,-0.8635814425796619,
0.0,0.0,-1.0,1.0,8.386527000463054e-07,1.0350315843348408e-07,-0.999999999999643,
-0.30901599999999996,0.0,-0.951057,1.0,-0.30900375318742496,0.00887256725174435,-0.9510194309615595,
-0.13819899999999996,0.276397,-0.951055,1.0,-0.14612907117205193,0.2724178643965829,-0.9510177715037708,
-0.30901599999999996,0.0,-0.951057,1.0,-0.30900375318742496,0.00887256725174435,-0.9510194309615595,
-0.4472149999999999,0.276397,-0.850649,1.0,-0.440777418602302,0.2724181414021976,-0.8552798509758447,
-0.13819899999999996,0.276397,-0.951055,1.0,-0.14612907117205193,0.2724178643965829,-0.9510177715037708,
-0.13819899999999996,0.276397,-0.951055,1.0,-0.14612907117205193,0.2724178643965829,-0.9510177715037708,
-0.4472149999999999,0.276397,-0.850649,1.0,-0.440777418602302,0.2724181414021976,-0.8552798509758447,
-0.262869,0.525738,-0.809012,1.0,-0.2628688830438233,0.5257372869737825,-0.8090119006619986,
-0.4472149999999999,0.276397,-0.850649,1.0,-0.440777418602302,0.2724181414021976,-0.8552798509758447,
-0.531941,0.502302,-0.681712,1.0,-0.5236577408730431,0.5038188776590388,-0.6869855230921009,
-0.262869,0.525738,-0.809012,1.0,-0.2628688830438233,0.5257372869737825,-0.8090119006619986,
-0.155215,-0.25115200000000004,-0.955422,1.0,-0.1502164527684422,-0.24306415178722385,-0.9583083196099383,
-0.43600700000000003,-0.25115200000000004,-0.864188,1.0,-0.4417472320955005,-0.24306420283334987,-0.8635850718006606,
-0.30901599999999996,0.0,-0.951057,1.0,-0.30900375318742496,0.00887256725174435,-0.9510194309615595,
-0.43600700000000003,-0.25115200000000004,-0.864188,1.0,-0.4417472320955005,-0.24306420283334987,-0.8635850718006606,
-0.587786,0.0,-0.809017,1.0,-0.5877863671165282,8.898111888585574e-08,-0.8090161844066818,
-0.30901599999999996,0.0,-0.951057,1.0,-0.30900375318742496,0.00887256725174435,-0.9510194309615595,
-0.30901599999999996,0.0,-0.951057,1.0,-0.30900375318742496,0.00887256725174435,-0.9510194309615595,
-0.587786,0.0,-0.809017,1.0,-0.5877863671165282,8.898111888585574e-08,-0.8090161844066818,
-0.4472149999999999,0.276397,-0.850649,1.0,-0.440777418602302,0.2724181414021976,-0.8552798509758447,
-0.587786,0.0,-0.809017,1.0,-0.5877863671165282,8.898111888585574e-08,-0.8090161844066818,
-0.687159,0.25115200000000004,-0.681715,1.0,-0.6848117463759701,0.2430639454016199,-0.6869882025706792,
-0.4472149999999999,0.276397,-0.850649,1.0,-0.440777418602302,0.2724181414021976,-0.8552798509758447,
-0.4472149999999999,0.276397,-0.850649,1.0,-0.440777418602302,0.2724181414021976,-0.8552798509758447,
-0.687159,0.25115200000000004,-0.681715,1.0,-0.6848117463759701,0.2430639454016199,-0.6869882025706792,
-0.531941,0.502302,-0.681712,1.0,-0.5236577408730431,0.5038188776590388,-0.6869855230921009,
-0.687159,0.25115200000000004,-0.681715,1.0,-0.6848117463759701,0.2430639454016199,-0.6869882025706792,
-0.723607,0.44721999999999995,-0.525725,1.0,-0.7236067216830412,0.44721965132148317,-0.5257260653677089,
-0.531941,0.502302,-0.681712,1.0,-0.5236577408730431,0.5038188776590388,-0.6869855230921009,
-0.860698,0.2511510000000001,-0.442858,1.0,-0.8649868290678857,0.2430624631623782,-0.43899706666505395,
-0.812729,0.5023010000000001,-0.295238,1.0,-0.8151846510833863,0.503817580270061,-0.2857303456913146,
-0.723607,0.44721999999999995,-0.525725,1.0,-0.7236067216830412,0.44721965132148317,-0.5257260653677089,
-0.951058,0.0,-0.309013,1.0,-0.9510573479382253,-7.330831644240639e-07,-0.30901443482816815,
-0.947213,0.2763960000000001,-0.162458,1.0,-0.9496281766536325,0.27241723641349325,-0.15490376176946866,
-0.860698,0.2511510000000001,-0.442858,1.0,-0.8649868290678857,0.2430624631623782,-0.43899706666505395,
-0.956626,-0.25114900000000007,-0.14761800000000003,1.0,-0.9578262170326509,-0.24306111405524766,-0.15326523676014436,
-1.0,9.999999999177334e-07,0.0,1.0,-0.999960625461639,0.008873980299981307,-5.7641038767457417e-08,
-0.951058,0.0,-0.309013,1.0,-0.9510573479382253,-7.330831644240639e-07,-0.30901443482816815,
-0.860698,0.2511510000000001,-0.442858,1.0,-0.8649868290678857,0.2430624631623782,-0.43899706666505395,
-0.947213,0.2763960000000001,-0.162458,1.0,-0.9496281766536325,0.27241723641349325,-0.15490376176946866,
-0.812729,0.5023010000000001,-0.295238,1.0,-0.8151846510833863,0.503817580270061,-0.2857303456913146,
-0.947213,0.2763960000000001,-0.162458,1.0,-0.9496281766536325,0.27241723641349325,-0.15490376176946866,
-0.850648,0.525736,0.0,1.0,-0.850648504669507,0.5257348395374611,-2.2739670286765194e-07,
-0.812729,0.5023010000000001,-0.295238,1.0,-0.8151846510833863,0.503817580270061,-0.2857303456913146,
-0.951058,0.0,-0.309013,1.0,-0.9510573479382253,-7.330831644240639e-07,-0.30901443482816815,
-1.0,9.999999999177334e-07,0.0,1.0,-0.999960625461639,0.008873980299981307,-5.7641038767457417e-08,
-0.947213,0.2763960000000001,-0.162458,1.0,-0.9496281766536325,0.27241723641349325,-0.15490376176946866,
-1.0,9.999999999177334e-07,0.0,1.0,-0.999960625461639,0.008873980299981307,-5.7641038767457417e-08,
-0.947213,0.276397,0.162458,1.0,-0.9496280396827057,0.2724178616838374,0.1549035018454631,
-0.947213,0.2763960000000001,-0.162458,1.0,-0.9496281766536325,0.27241723641349325,-0.15490376176946866,
-0.947213,0.2763960000000001,-0.162458,1.0,-0.9496281766536325,0.27241723641349325,-0.15490376176946866,
-0.947213,0.276397,0.162458,1.0,-0.9496280396827057,0.2724178616838374,0.1549035018454631,
-0.850648,0.525736,0.0,1.0,-0.850648504669507,0.5257348395374611,-2.2739670286765194e-07,
-0.947213,0.276397,0.162458,1.0,-0.9496280396827057,0.2724178616838374,0.1549035018454631,
-0.812729,0.5023010000000001,0.2952379999999999,1.0,-0.8151843815554107,0.5038178905016056,0.28573056763082694,
-0.850648,0.525736,0.0,1.0,-0.850648504669507,0.5257348395374611,-2.2739670286765194e-07,
-0.956626,-0.25114900000000007,-0.14761800000000003,1.0,-0.9578262170326509,-0.24306111405524766,-0.15326523676014436,
-0.956626,-0.25114900000000007,0.14761800000000003,1.0,-0.9578262170326509,-0.24306111405524763,0.1532652367601444,
-1.0,9.999999999177334e-07,0.0,1.0,-0.999960625461639,0.008873980299981307,-5.7641038767457417e-08,
-0.956626,-0.25114900000000007,0.14761800000000003,1.0,-0.9578262170326509,-0.24306111405524763,0.1532652367601444,
-0.951058,0.0,0.309013,1.0,-0.951057331086145,-8.671557238488273e-07,0.3090144866936615,
-1.0,9.999999999177334e-07,0.0,1.0,-0.999960625461639,0.008873980299981307,-5.7641038767457417e-08,
-1.0,9.999999999177334e-07,0.0,1.0,-0.999960625461639,0.008873980299981307,-5.7641038767457417e-08,
-0.951058,0.0,0.309013,1.0,-0.951057331086145,-8.671557238488273e-07,0.3090144866936615,
-0.947213,0.276397,0.162458,1.0,-0.9496280396827057,0.2724178616838374,0.1549035018454631,
-0.951058,0.0,0.309013,1.0,-0.951057331086145,-8.671557238488273e-07,0.3090144866936615,
-0.860698,0.2511510000000001,0.442858,1.0,-0.8649867092922593,0.24306239483169045,0.43899734050040895,
-0.947213,0.276397,0.162458,1.0,-0.9496280396827057,0.2724178616838374,0.1549035018454631,
-0.947213,0.276397,0.162458,1.0,-0.9496280396827057,0.2724178616838374,0.1549035018454631,
-0.860698,0.2511510000000001,0.442858,1.0,-0.8649867092922593,0.24306239483169045,0.43899734050040895,
-0.812729,0.5023010000000001,0.2952379999999999,1.0,-0.8151843815554107,0.5038178905016056,0.28573056763082694,
-0.860698,0.2511510000000001,0.442858,1.0,-0.8649867092922593,0.24306239483169045,0.43899734050040895,
-0.723607,0.44721999999999995,0.525725,1.0,-0.7236067216830413,0.4472196513214834,0.5257260653677087,
-0.812729,0.5023010000000001,0.2952379999999999,1.0,-0.8151843815554107,0.5038178905016056,0.28573056763082694,
-0.687159,0.25115200000000004,0.6817150000000001,1.0,-0.6848115755465203,0.24306396103886968,0.6869883673262506,
-0.531941,0.502302,0.6817120000000001,1.0,-0.5236576234680893,0.50381866852951,0.6869857659550921,
-0.723607,0.44721999999999995,0.525725,1.0,-0.7236067216830413,0.4472196513214834,0.5257260653677087,
-0.587786,0.0,0.8090169999999999,1.0,-0.5877858058415312,4.349631417008017e-07,0.8090165921976091,
-0.44721600000000006,0.276397,0.8506480000000001,1.0,-0.440777780043386,0.2724176399428321,0.8552798244247329,
-0.687159,0.25115200000000004,0.6817150000000001,1.0,-0.6848115755465203,0.24306396103886968,0.6869883673262506,
-0.43600700000000003,-0.25115200000000004,0.864188,1.0,-0.4417470436660011,-0.2430638114471244,0.8635852783466985,
-0.309017,-1.0000000000287557e-06,0.9510559999999999,1.0,-0.30900470758363174,0.008872576054985893,0.9510191207779699,
-0.587786,0.0,0.8090169999999999,1.0,-0.5877858058415312,4.349631417008017e-07,0.8090165921976091,
-0.687159,0.25115200000000004,0.6817150000000001,1.0,-0.6848115755465203,0.24306396103886968,0.6869883673262506,
-0.44721600000000006,0.276397,0.8506480000000001,1.0,-0.440777780043386,0.2724176399428321,0.8552798244247329,
-0.531941,0.502302,0.6817120000000001,1.0,-0.5236576234680893,0.50381866852951,0.6869857659550921,
-0.44721600000000006,0.276397,0.8506480000000001,1.0,-0.440777780043386,0.2724176399428321,0.8552798244247329,
-0.262869,0.525738,0.8090120000000001,1.0,-0.26286917763817624,0.5257368727147139,0.8090120741472168,
-0.531941,0.502302,0.6817120000000001,1.0,-0.5236576234680893,0.50381866852951,0.6869857659550921,
-0.587786,0.0,0.8090169999999999,1.0,-0.5877858058415312,4.349631417008017e-07,0.8090165921976091,
-0.309017,-1.0000000000287557e-06,0.9510559999999999,1.0,-0.30900470758363174,0.008872576054985893,0.9510191207779699,
-0.44721600000000006,0.276397,0.8506480000000001,1.0,-0.440777780043386,0.2724176399428321,0.8552798244247329,
-0.309017,-1.0000000000287557e-06,0.9510559999999999,1.0,-0.30900470758363174,0.008872576054985893,0.9510191207779699,
-0.13819899999999996,0.276397,0.951055,1.0,-0.14613018086329244,0.2724171419127992,0.9510178079473188,
-0.44721600000000006,0.276397,0.8506480000000001,1.0,-0.440777780043386,0.2724176399428321,0.8552798244247329,
-0.44721600000000006,0.276397,0.8506480000000001,1.0,-0.440777780043386,0.2724176399428321,0.8552798244247329,
-0.13819899999999996,0.276397,0.951055,1.0,-0.14613018086329244,0.2724171419127992,0.9510178079473188,
-0.262869,0.525738,0.8090120000000001,1.0,-0.26286917763817624,0.5257368727147139,0.8090120741472168,
-0.13819899999999996,0.276397,0.951055,1.0,-0.14613018086329244,0.2724171419127992,0.9510178079473188,
0.02963899999999997,0.502302,0.8641839999999998,1.0,0.01983839534895446,0.5038189457553266,0.8635814425796619,
-0.262869,0.525738,0.8090120000000001,1.0,-0.26286917763817624,0.5257368727147139,0.8090120741472168,
-0.43600700000000003,-0.25115200000000004,0.864188,1.0,-0.4417470436660011,-0.2430638114471244,0.8635852783466985,
-0.155215,-0.25115200000000004,0.955422,1.0,-0.15021677729008256,-0.24306351370824936,0.9583084305819194,
-0.309017,-1.0000000000287557e-06,0.9510559999999999,1.0,-0.30900470758363174,0.008872576054985893,0.9510191207779699,
-0.155215,-0.25115200000000004,0.955422,1.0,-0.15021677729008256,-0.24306351370824936,0.9583084305819194,
0.0,0.0,1.0,1.0,-6.802996438484687e-08,1.7058485892572035e-07,0.9999999999999832,
-0.309017,-1.0000000000287557e-06,0.9510559999999999,1.0,-0.30900470758363174,0.008872576054985893,0.9510191207779699,
-0.309017,-1.0000000000287557e-06,0.9510559999999999,1.0,-0.30900470758363174,0.008872576054985893,0.9510191207779699,
0.0,0.0,1.0,1.0,-6.802996438484687e-08,1.7058485892572035e-07,0.9999999999999832,
-0.13819899999999996,0.276397,0.951055,1.0,-0.14613018086329244,0.2724171419127992,0.9510178079473188,
0.0,0.0,1.0,1.0,-6.802996438484687e-08,1.7058485892572035e-07,0.9999999999999832,
0.1552150000000001,0.25115200000000004,0.955422,1.0,0.15021657377136222,0.24306347133980513,0.9583084732301164,
-0.13819899999999996,0.276397,0.951055,1.0,-0.14613018086329244,0.2724171419127992,0.9510178079473188,
-0.13819899999999996,0.276397,0.951055,1.0,-0.14613018086329244,0.2724171419127992,0.9510178079473188,
0.1552150000000001,0.25115200000000004,0.955422,1.0,0.15021657377136222,0.24306347133980513,0.9583084732301164,
0.02963899999999997,0.502302,0.8641839999999998,1.0,0.01983839534895446,0.5038189457553266,0.8635814425796619,
0.1552150000000001,0.25115200000000004,0.955422,1.0,0.15021657377136222,0.24306347133980513,0.9583084732301164,
0.2763880000000001,0.44721999999999995,0.850649,1.0,0.27638775259514803,0.44721995820039745,0.8506492339399583,
0.02963899999999997,0.502302,0.8641839999999998,1.0,0.01983839534895446,0.5038189457553266,0.8635814425796619,
0.43600700000000003,0.25115200000000004,0.864188,1.0,0.4417474635405354,0.24306379703966605,0.8635850676245875,
0.48397099999999993,0.502302,0.7165650000000001,1.0,0.4915465997259058,0.5038185159472155,0.7103160164931138,
0.2763880000000001,0.44721999999999995,0.850649,1.0,0.27638775259514803,0.44721995820039745,0.8506492339399583,
0.5877859999999999,0.0,0.8090169999999999,1.0,0.5877853232201069,3.613410911975069e-08,0.8090169428429995,
0.67082,0.2763960000000001,0.6881900000000001,1.0,0.6772144971664549,0.27241774977147326,0.6834976916106101,
0.43600700000000003,0.25115200000000004,0.864188,1.0,0.4417474635405354,0.24306379703966605,0.8635850676245875,
0.6871589999999999,-0.25115200000000004,0.6817150000000001,1.0,0.6848111757491196,-0.24306484466307332,0.6869884532203029,
0.8090190000000002,-1.999999999946489e-06,0.5877829999999999,1.0,0.8089866848506967,0.008871945415033243,0.5877600125211242,
0.5877859999999999,0.0,0.8090169999999999,1.0,0.5877853232201069,3.613410911975069e-08,0.8090169428429995,
0.43600700000000003,0.25115200000000004,0.864188,1.0,0.4417474635405354,0.24306379703966605,0.8635850676245875,
0.67082,0.2763960000000001,0.6881900000000001,1.0,0.6772144971664549,0.27241774977147326,0.6834976916106101,
0.48397099999999993,0.502302,0.7165650000000001,1.0,0.4915465997259058,0.5038185159472155,0.7103160164931138,
0.67082,0.2763960000000001,0.6881900000000001,1.0,0.6772144971664549,0.27241774977147326,0.6834976916106101,
0.6881889999999999,0.525736,0.499997,1.0,0.6881896241859202,0.5257346676673482,0.49999810037193615,
0.48397099999999993,0.502302,0.7165650000000001,1.0,0.4915465997259058,0.5038185159472155,0.7103160164931138,
0.5877859999999999,0.0,0.8090169999999999,1.0,0.5877853232201069,3.613410911975069e-08,0.8090169428429995,
0.8090190000000002,-1.999999999946489e-06,0.5877829999999999,1.0,0.8089866848506967,0.008871945415033243,0.5877600125211242,
0.67082,0.2763960000000001,0.6881900000000001,1.0,0.6772144971664549,0.27241774977147326,0.6834976916106101,
0.8090190000000002,-1.999999999946489e-06,0.5877829999999999,1.0,0.8089866848506967,0.008871945415033243,0.5877600125211242,
0.861804,0.27639400000000003,0.4253230000000001,1.0,0.8593173212717677,0.2724158342746917,0.43285488861596255,
0.67082,0.2763960000000001,0.6881900000000001,1.0,0.6772144971664549,0.27241774977147326,0.6834976916106101,
0.67082,0.2763960000000001,0.6881900000000001,1.0,0.6772144971664549,0.27241774977147326,0.6834976916106101,
0.861804,0.27639400000000003,0.4253230000000001,1.0,0.8593173212717677,0.2724158342746917,0.43285488861596255,
0.6881889999999999,0.525736,0.499997,1.0,0.6881896241859202,0.5257346676673482,0.49999810037193615,
0.861804,0.27639400000000003,0.4253230000000001,1.0,0.8593173212717677,0.2724158342746917,0.43285488861596255,
0.831051,0.502299,0.23885299999999998,1.0,0.8274487904509396,0.5038149163054394,0.24798997820359664,
0.6881889999999999,0.525736,0.499997,1.0,0.6881896241859202,0.5257346676673482,0.49999810037193615,
0.6871589999999999,-0.25115200000000004,0.6817150000000001,1.0,0.6848111757491196,-0.24306484466307332,0.6869884532203029,
0.860698,-0.251151,0.442858,1.0,0.864986890060841,-0.24306353018273283,0.4389963557001157,
0.8090190000000002,-1.999999999946489e-06,0.5877829999999999,1.0,0.8089866848506967,0.008871945415033243,0.5877600125211242,
0.860698,-0.251151,0.442858,1.0,0.864986890060841,-0.24306353018273283,0.4389963557001157,
0.951058,0.0,0.309013,1.0,0.9510576790560566,4.844418859218338e-07,0.30901341574156965,
0.8090190000000002,-1.999999999946489e-06,0.5877829999999999,1.0,0.8089866848506967,0.008871945415033243,0.5877600125211242,
0.8090190000000002,-1.999999999946489e-06,0.5877829999999999,1.0,0.8089866848506967,0.008871945415033243,0.5877600125211242,
0.951058,0.0,0.309013,1.0,0.9510576790560566,4.844418859218338e-07,0.30901341574156965,
0.861804,0.27639400000000003,0.4253230000000001,1.0,0.8593173212717677,0.2724158342746917,0.43285488861596255,
0.951058,0.0,0.309013,1.0,0.9510576790560566,4.844418859218338e-07,0.30901341574156965,
0.956626,0.25114900000000007,0.14761800000000003,1.0,0.9578261805030606,0.24306129258052184,0.15326518192989683,
0.861804,0.27639400000000003,0.4253230000000001,1.0,0.8593173212717677,0.2724158342746917,0.43285488861596255,
0.861804,0.27639400000000003,0.4253230000000001,1.0,0.8593173212717677,0.2724158342746917,0.43285488861596255,
0.956626,0.25114900000000007,0.14761800000000003,1.0,0.9578261805030606,0.24306129258052184,0.15326518192989683,
0.831051,0.502299,0.23885299999999998,1.0,0.8274487904509396,0.5038149163054394,0.24798997820359664,
0.956626,0.25114900000000007,0.14761800000000003,1.0,0.9578261805030606,0.24306129258052184,0.15326518192989683,
0.8944260000000002,0.44721600000000006,0.0,1.0,0.8944264388330799,0.4472150998304671,-7.024693876715296e-18,
0.831051,0.502299,0.23885299999999998,1.0,0.8274487904509396,0.5038149163054394,0.24798997820359664,
0.43600700000000003,0.25115200000000004,-0.864188,1.0,0.44174743584464,0.2430637566759591,-0.8635850931525253,
0.1552150000000001,0.25115200000000004,-0.955422,1.0,0.15021657377136222,0.24306347133980513,-0.9583084732301164,
0.2763880000000001,0.44721999999999995,-0.850649,1.0,0.27638775259514836,0.44721995820039734,-0.8506492339399583,
0.5877859999999999,0.0,-0.809017,1.0,0.5877858829948915,-2.554691144635855e-08,-0.809016536142442,
0.3090169999999999,0.0,-0.951056,1.0,0.3090047066659712,-0.008872910630520342,-0.9510191179546391,
0.43600700000000003,0.25115200000000004,-0.864188,1.0,0.44174743584464,0.2430637566759591,-0.8635850931525253,
0.6871589999999999,-0.25115200000000004,-0.681715,1.0,0.6848117102472356,-0.2430639714860927,-0.6869882293559796,
0.44721600000000006,-0.2763979999999999,-0.850648,1.0,0.4407780664296207,-0.27241829131158907,-0.8552794693627569,
0.5877859999999999,0.0,-0.809017,1.0,0.5877858829948915,-2.554691144635855e-08,-0.809016536142442,
0.43600700000000003,0.25115200000000004,-0.864188,1.0,0.44174743584464,0.2430637566759591,-0.8635850931525253,
0.3090169999999999,0.0,-0.951056,1.0,0.3090047066659712,-0.008872910630520342,-0.9510191179546391,
0.1552150000000001,0.25115200000000004,-0.955422,1.0,0.15021657377136222,0.24306347133980513,-0.9583084732301164,
0.3090169999999999,0.0,-0.951056,1.0,0.3090047066659712,-0.008872910630520342,-0.9510191179546391,
0.0,0.0,-1.0,1.0,8.386527000463054e-07,1.0350315843348408e-07,-0.999999999999643,
0.1552150000000001,0.25115200000000004,-0.955422,1.0,0.15021657377136222,0.24306347133980513,-0.9583084732301164,
0.5877859999999999,0.0,-0.809017,1.0,0.5877858829948915,-2.554691144635855e-08,-0.809016536142442,
0.44721600000000006,-0.2763979999999999,-0.850648,1.0,0.4407780664296207,-0.27241829131158907,-0.8552794693627569,
0.3090169999999999,0.0,-0.951056,1.0,0.3090047066659712,-0.008872910630520342,-0.9510191179546391,
0.44721600000000006,-0.2763979999999999,-0.850648,1.0,0.4407780664296207,-0.27241829131158907,-0.8552794693627569,
0.13819899999999996,-0.2763979999999999,-0.951055,1.0,0.14612974047217775,-0.27241779329109583,-0.9510176890299905,
0.3090169999999999,0.0,-0.951056,1.0,0.3090047066659712,-0.008872910630520342,-0.9510191179546391,
0.3090169999999999,0.0,-0.951056,1.0,0.3090047066659712,-0.008872910630520342,-0.9510191179546391,
0.13819899999999996,-0.2763979999999999,-0.951055,1.0,0.14612974047217775,-0.27241779329109583,-0.9510176890299905,
0.0,0.0,-1.0,1.0,8.386527000463054e-07,1.0350315843348408e-07,-0.999999999999643,
0.13819899999999996,-0.2763979999999999,-0.951055,1.0,0.14612974047217775,-0.27241779329109583,-0.9510176890299905,
-0.155215,-0.25115200000000004,-0.955422,1.0,-0.1502164527684422,-0.24306415178722385,-0.9583083196099383,
0.0,0.0,-1.0,1.0,8.386527000463054e-07,1.0350315843348408e-07,-0.999999999999643,
0.6871589999999999,-0.25115200000000004,-0.681715,1.0,0.6848117102472356,-0.2430639714860927,-0.6869882293559796,
0.531941,-0.502302,-0.681712,1.0,0.5236579140350146,-0.503818798851909,-0.6869854488938736,
0.44721600000000006,-0.2763979999999999,-0.850648,1.0,0.4407780664296207,-0.27241829131158907,-0.8552794693627569,
0.531941,-0.502302,-0.681712,1.0,0.5236579140350146,-0.503818798851909,-0.6869854488938736,
0.262869,-0.525738,-0.809012,1.0,0.26286895228372437,-0.5257372320187721,-0.8090119138767345,
0.44721600000000006,-0.2763979999999999,-0.850648,1.0,0.4407780664296207,-0.27241829131158907,-0.8552794693627569,
0.44721600000000006,-0.2763979999999999,-0.850648,1.0,0.4407780664296207,-0.27241829131158907,-0.8552794693627569,
0.262869,-0.525738,-0.809012,1.0,0.26286895228372437,-0.5257372320187721,-0.8090119138767345,
0.13819899999999996,-0.2763979999999999,-0.951055,1.0,0.14612974047217775,-0.27241779329109583,-0.9510176890299905,
0.262869,-0.525738,-0.809012,1.0,0.26286895228372437,-0.5257372320187721,-0.8090119138767345,
-0.02963899999999997,-0.502302,-0.864184,1.0,-0.019838720158978862,-0.5038191057760348,-0.8635813417608618,
0.13819899999999996,-0.2763979999999999,-0.951055,1.0,0.14612974047217775,-0.27241779329109583,-0.9510176890299905,
0.13819899999999996,-0.2763979999999999,-0.951055,1.0,0.14612974047217775,-0.27241779329109583,-0.9510176890299905,
-0.02963899999999997,-0.502302,-0.864184,1.0,-0.019838720158978862,-0.5038191057760348,-0.8635813417608618,
-0.155215,-0.25115200000000004,-0.955422,1.0,-0.1502164527684422,-0.24306415178722385,-0.9583083196099383,
-0.02963899999999997,-0.502302,-0.864184,1.0,-0.019838720158978862,-0.5038191057760348,-0.8635813417608618,
-0.2763880000000001,-0.44721999999999995,-0.850649,1.0,-0.2763877525951483,-0.44721995820039734,-0.8506492339399583,
-0.155215,-0.25115200000000004,-0.955422,1.0,-0.1502164527684422,-0.24306415178722385,-0.9583083196099383,
-0.687159,0.25115200000000004,-0.681715,1.0,-0.6848117463759701,0.2430639454016199,-0.6869882025706792,
-0.860698,0.2511510000000001,-0.442858,1.0,-0.8649868290678857,0.2430624631623782,-0.43899706666505395,
-0.723607,0.44721999999999995,-0.525725,1.0,-0.7236067216830412,0.44721965132148317,-0.5257260653677089,
-0.587786,0.0,-0.809017,1.0,-0.5877863671165282,8.898111888585574e-08,-0.8090161844066818,
-0.809018,0.0,-0.587783,1.0,-0.8089865397400394,-0.008873289185182267,-0.587760191964779,
-0.687159,0.25115200000000004,-0.681715,1.0,-0.6848117463759701,0.2430639454016199,-0.6869882025706792,
-0.43600700000000003,-0.25115200000000004,-0.864188,1.0,-0.4417472320955005,-0.24306420283334987,-0.8635850718006606,
-0.670819,-0.276397,-0.688191,1.0,-0.6772137611074175,-0.2724178575158659,-0.6834983779594587,
-0.587786,0.0,-0.809017,1.0,-0.5877863671165282,8.898111888585574e-08,-0.8090161844066818,
-0.687159,0.25115200000000004,-0.681715,1.0,-0.6848117463759701,0.2430639454016199,-0.6869882025706792,
-0.809018,0.0,-0.587783,1.0,-0.8089865397400394,-0.008873289185182267,-0.587760191964779,
-0.860698,0.2511510000000001,-0.442858,1.0,-0.8649868290678857,0.2430624631623782,-0.43899706666505395,
-0.809018,0.0,-0.587783,1.0,-0.8089865397400394,-0.008873289185182267,-0.587760191964779,
-0.951058,0.0,-0.309013,1.0,-0.9510573479382253,-7.330831644240639e-07,-0.30901443482816815,
-0.860698,0.2511510000000001,-0.442858,1.0,-0.8649868290678857,0.2430624631623782,-0.43899706666505395,
-0.587786,0.0,-0.809017,1.0,-0.5877863671165282,8.898111888585574e-08,-0.8090161844066818,
-0.670819,-0.276397,-0.688191,1.0,-0.6772137611074175,-0.2724178575158659,-0.6834983779594587,
-0.809018,0.0,-0.587783,1.0,-0.8089865397400394,-0.008873289185182267,-0.587760191964779,
-0.670819,-0.276397,-0.688191,1.0,-0.6772137611074175,-0.2724178575158659,-0.6834983779594587,
-0.861803,-0.276396,-0.42532400000000004,1.0,-0.8593167049440582,-0.2724165069227901,-0.43285568883875336,
-0.809018,0.0,-0.587783,1.0,-0.8089865397400394,-0.008873289185182267,-0.587760191964779,
-0.809018,0.0,-0.587783,1.0,-0.8089865397400394,-0.008873289185182267,-0.587760191964779,
-0.861803,-0.276396,-0.42532400000000004,1.0,-0.8593167049440582,-0.2724165069227901,-0.43285568883875336,
-0.951058,0.0,-0.309013,1.0,-0.9510573479382253,-7.330831644240639e-07,-0.30901443482816815,
-0.861803,-0.276396,-0.42532400000000004,1.0,-0.8593167049440582,-0.2724165069227901,-0.43285568883875336,
-0.956626,-0.25114900000000007,-0.14761800000000003,1.0,-0.9578262170326509,-0.24306111405524766,-0.15326523676014436,
-0.951058,0.0,-0.309013,1.0,-0.9510573479382253,-7.330831644240639e-07,-0.30901443482816815,
-0.43600700000000003,-0.25115200000000004,-0.864188,1.0,-0.4417472320955005,-0.24306420283334987,-0.8635850718006606,
-0.48397099999999993,-0.502302,-0.716565,1.0,-0.4915461091474215,-0.5038186497816622,-0.7103162610515219,
-0.670819,-0.276397,-0.688191,1.0,-0.6772137611074175,-0.2724178575158659,-0.6834983779594587,
-0.48397099999999993,-0.502302,-0.716565,1.0,-0.4915461091474215,-0.5038186497816622,-0.7103162610515219,
-0.688189,-0.525736,-0.499997,1.0,-0.6881896629138985,-0.5257350598001616,-0.4999976347497809,
-0.670819,-0.276397,-0.688191,1.0,-0.6772137611074175,-0.2724178575158659,-0.6834983779594587,
-0.670819,-0.276397,-0.688191,1.0,-0.6772137611074175,-0.2724178575158659,-0.6834983779594587,
-0.688189,-0.525736,-0.499997,1.0,-0.6881896629138985,-0.5257350598001616,-0.4999976347497809,
-0.861803,-0.276396,-0.42532400000000004,1.0,-0.8593167049440582,-0.2724165069227901,-0.43285568883875336,
-0.688189,-0.525736,-0.499997,1.0,-0.6881896629138985,-0.5257350598001616,-0.4999976347497809,
-0.831051,-0.502299,-0.23885299999999998,1.0,-0.827448675299351,-0.503815221812631,-0.24798974175404667,
-0.861803,-0.276396,-0.42532400000000004,1.0,-0.8593167049440582,-0.2724165069227901,-0.43285568883875336,
-0.861803,-0.276396,-0.42532400000000004,1.0,-0.8593167049440582,-0.2724165069227901,-0.43285568883875336,
-0.831051,-0.502299,-0.23885299999999998,1.0,-0.827448675299351,-0.503815221812631,-0.24798974175404667,
-0.956626,-0.25114900000000007,-0.14761800000000003,1.0,-0.9578262170326509,-0.24306111405524766,-0.15326523676014436,
-0.831051,-0.502299,-0.23885299999999998,1.0,-0.827448675299351,-0.503815221812631,-0.24798974175404667,
-0.894426,-0.44721600000000006,0.0,1.0,-0.8944264388330798,-0.44721509983046726,3.5123469383576465e-18,
-0.956626,-0.25114900000000007,-0.14761800000000003,1.0,-0.9578262170326509,-0.24306111405524766,-0.15326523676014436,
-0.860698,0.2511510000000001,0.442858,1.0,-0.8649867092922593,0.24306239483169045,0.43899734050040895,
-0.687159,0.25115200000000004,0.6817150000000001,1.0,-0.6848115755465203,0.24306396103886968,0.6869883673262506,
-0.723607,0.44721999999999995,0.525725,1.0,-0.7236067216830413,0.4472196513214834,0.5257260653677087,
-0.951058,0.0,0.309013,1.0,-0.951057331086145,-8.671557238488273e-07,0.3090144866936615,
-0.809018,0.0,0.5877829999999999,1.0,-0.8089865397400394,-0.008873289185182359,0.5877601919647789,
-0.860698,0.2511510000000001,0.442858,1.0,-0.8649867092922593,0.24306239483169045,0.43899734050040895,
-0.956626,-0.25114900000000007,0.14761800000000003,1.0,-0.9578262170326509,-0.24306111405524763,0.1532652367601444,
-0.861803,-0.276396,0.42532400000000004,1.0,-0.8593167049440582,-0.2724165069227901,0.43285568883875347,
-0.951058,0.0,0.309013,1.0,-0.951057331086145,-8.671557238488273e-07,0.3090144866936615,
-0.860698,0.2511510000000001,0.442858,1.0,-0.8649867092922593,0.24306239483169045,0.43899734050040895,
-0.809018,0.0,0.5877829999999999,1.0,-0.8089865397400394,-0.008873289185182359,0.5877601919647789,
-0.687159,0.25115200000000004,0.6817150000000001,1.0,-0.6848115755465203,0.24306396103886968,0.6869883673262506,
-0.809018,0.0,0.5877829999999999,1.0,-0.8089865397400394,-0.008873289185182359,0.5877601919647789,
-0.587786,0.0,0.8090169999999999,1.0,-0.5877858058415312,4.349631417008017e-07,0.8090165921976091,
-0.687159,0.25115200000000004,0.6817150000000001,1.0,-0.6848115755465203,0.24306396103886968,0.6869883673262506,
-0.951058,0.0,0.309013,1.0,-0.951057331086145,-8.671557238488273e-07,0.3090144866936615,
-0.861803,-0.276396,0.42532400000000004,1.0,-0.8593167049440582,-0.2724165069227901,0.43285568883875347,
-0.809018,0.0,0.5877829999999999,1.0,-0.8089865397400394,-0.008873289185182359,0.5877601919647789,
-0.861803,-0.276396,0.42532400000000004,1.0,-0.8593167049440582,-0.2724165069227901,0.43285568883875347,
-0.670819,-0.276397,0.688191,1.0,-0.6772137611074175,-0.2724178575158658,0.6834983779594588,
-0.809018,0.0,0.5877829999999999,1.0,-0.8089865397400394,-0.008873289185182359,0.5877601919647789,
-0.809018,0.0,0.5877829999999999,1.0,-0.8089865397400394,-0.008873289185182359,0.5877601919647789,
-0.670819,-0.276397,0.688191,1.0,-0.6772137611074175,-0.2724178575158658,0.6834983779594588,
-0.587786,0.0,0.8090169999999999,1.0,-0.5877858058415312,4.349631417008017e-07,0.8090165921976091,
-0.670819,-0.276397,0.688191,1.0,-0.6772137611074175,-0.2724178575158658,0.6834983779594588,
-0.43600700000000003,-0.25115200000000004,0.864188,1.0,-0.4417470436660011,-0.2430638114471244,0.8635852783466985,
-0.587786,0.0,0.8090169999999999,1.0,-0.5877858058415312,4.349631417008017e-07,0.8090165921976091,
-0.956626,-0.25114900000000007,0.14761800000000003,1.0,-0.9578262170326509,-0.24306111405524763,0.1532652367601444,
-0.831051,-0.502299,0.23885299999999998,1.0,-0.8274488479658778,-0.5038149789897272,0.24798965894876002,
-0.861803,-0.276396,0.42532400000000004,1.0,-0.8593167049440582,-0.2724165069227901,0.43285568883875347,
-0.831051,-0.502299,0.23885299999999998,1.0,-0.8274488479658778,-0.5038149789897272,0.24798965894876002,
-0.688189,-0.525736,0.499997,1.0,-0.6881895511641616,-0.5257349869564159,0.49999786515384953,
-0.861803,-0.276396,0.42532400000000004,1.0,-0.8593167049440582,-0.2724165069227901,0.43285568883875347,
-0.861803,-0.276396,0.42532400000000004,1.0,-0.8593167049440582,-0.2724165069227901,0.43285568883875347,
-0.688189,-0.525736,0.499997,1.0,-0.6881895511641616,-0.5257349869564159,0.49999786515384953,
-0.670819,-0.276397,0.688191,1.0,-0.6772137611074175,-0.2724178575158658,0.6834983779594588,
-0.688189,-0.525736,0.499997,1.0,-0.6881895511641616,-0.5257349869564159,0.49999786515384953,
-0.48397099999999993,-0.502302,0.7165650000000001,1.0,-0.49154612462755637,-0.503818632525199,0.7103162625789089,
-0.670819,-0.276397,0.688191,1.0,-0.6772137611074175,-0.2724178575158658,0.6834983779594588,
-0.670819,-0.276397,0.688191,1.0,-0.6772137611074175,-0.2724178575158658,0.6834983779594588,
-0.48397099999999993,-0.502302,0.7165650000000001,1.0,-0.49154612462755637,-0.503818632525199,0.7103162625789089,
-0.43600700000000003,-0.25115200000000004,0.864188,1.0,-0.4417470436660011,-0.2430638114471244,0.8635852783466985,
-0.48397099999999993,-0.502302,0.7165650000000001,1.0,-0.49154612462755637,-0.503818632525199,0.7103162625789089,
-0.2763880000000001,-0.44721999999999995,0.850649,1.0,-0.27638775259514803,-0.44721995820039745,0.8506492339399584,
-0.43600700000000003,-0.25115200000000004,0.864188,1.0,-0.4417470436660011,-0.2430638114471244,0.8635852783466985,
0.1552150000000001,0.25115200000000004,0.955422,1.0,0.15021657377136222,0.24306347133980513,0.9583084732301164,
0.43600700000000003,0.25115200000000004,0.864188,1.0,0.4417474635405354,0.24306379703966605,0.8635850676245875,
0.2763880000000001,0.44721999999999995,0.850649,1.0,0.27638775259514803,0.44721995820039745,0.8506492339399583,
0.0,0.0,1.0,1.0,-6.802996438484687e-08,1.7058485892572035e-07,0.9999999999999832,
0.3090169999999999,0.0,0.9510559999999999,1.0,0.30900470666597124,-0.008872910630520276,0.9510191179546391,
0.1552150000000001,0.25115200000000004,0.955422,1.0,0.15021657377136222,0.24306347133980513,0.9583084732301164,
-0.155215,-0.25115200000000004,0.955422,1.0,-0.15021677729008256,-0.24306351370824936,0.9583084305819194,
0.13819899999999996,-0.2763979999999999,0.951055,1.0,0.14612974047217758,-0.2724177932910958,0.9510176890299905,
0.0,0.0,1.0,1.0,-6.802996438484687e-08,1.7058485892572035e-07,0.9999999999999832,
0.1552150000000001,0.25115200000000004,0.955422,1.0,0.15021657377136222,0.24306347133980513,0.9583084732301164,
0.3090169999999999,0.0,0.9510559999999999,1.0,0.30900470666597124,-0.008872910630520276,0.9510191179546391,
0.43600700000000003,0.25115200000000004,0.864188,1.0,0.4417474635405354,0.24306379703966605,0.8635850676245875,
0.3090169999999999,0.0,0.9510559999999999,1.0,0.30900470666597124,-0.008872910630520276,0.9510191179546391,
0.5877859999999999,0.0,0.8090169999999999,1.0,0.5877853232201069,3.613410911975069e-08,0.8090169428429995,
0.43600700000000003,0.25115200000000004,0.864188,1.0,0.4417474635405354,0.24306379703966605,0.8635850676245875,
0.0,0.0,1.0,1.0,-6.802996438484687e-08,1.7058485892572035e-07,0.9999999999999832,
0.13819899999999996,-0.2763979999999999,0.951055,1.0,0.14612974047217758,-0.2724177932910958,0.9510176890299905,
0.3090169999999999,0.0,0.9510559999999999,1.0,0.30900470666597124,-0.008872910630520276,0.9510191179546391,
0.13819899999999996,-0.2763979999999999,0.951055,1.0,0.14612974047217758,-0.2724177932910958,0.9510176890299905,
0.44721600000000006,-0.2763979999999999,0.8506480000000001,1.0,0.44077806642962053,-0.27241829131158873,0.8552794693627571,
0.3090169999999999,0.0,0.9510559999999999,1.0,0.30900470666597124,-0.008872910630520276,0.9510191179546391,
0.3090169999999999,0.0,0.9510559999999999,1.0,0.30900470666597124,-0.008872910630520276,0.9510191179546391,
0.44721600000000006,-0.2763979999999999,0.8506480000000001,1.0,0.44077806642962053,-0.27241829131158873,0.8552794693627571,
0.5877859999999999,0.0,0.8090169999999999,1.0,0.5877853232201069,3.613410911975069e-08,0.8090169428429995,
0.44721600000000006,-0.2763979999999999,0.8506480000000001,1.0,0.44077806642962053,-0.27241829131158873,0.8552794693627571,
0.6871589999999999,-0.25115200000000004,0.6817150000000001,1.0,0.6848111757491196,-0.24306484466307332,0.6869884532203029,
0.5877859999999999,0.0,0.8090169999999999,1.0,0.5877853232201069,3.613410911975069e-08,0.8090169428429995,
-0.155215,-0.25115200000000004,0.955422,1.0,-0.15021677729008256,-0.24306351370824936,0.9583084305819194,
-0.02963899999999997,-0.502302,0.8641839999999998,1.0,-0.019838689717257413,-0.5038192559913451,0.8635812548235572,
0.13819899999999996,-0.2763979999999999,0.951055,1.0,0.14612974047217758,-0.2724177932910958,0.9510176890299905,
-0.02963899999999997,-0.502302,0.8641839999999998,1.0,-0.019838689717257413,-0.5038192559913451,0.8635812548235572,
0.262869,-0.525738,0.8090120000000001,1.0,0.26286888259023233,-0.5257372188438393,0.8090119450836976,
0.13819899999999996,-0.2763979999999999,0.951055,1.0,0.14612974047217758,-0.2724177932910958,0.9510176890299905,
0.13819899999999996,-0.2763979999999999,0.951055,1.0,0.14612974047217758,-0.2724177932910958,0.9510176890299905,
0.262869,-0.525738,0.8090120000000001,1.0,0.26286888259023233,-0.5257372188438393,0.8090119450836976,
0.44721600000000006,-0.2763979999999999,0.8506480000000001,1.0,0.44077806642962053,-0.27241829131158873,0.8552794693627571,
0.262869,-0.525738,0.8090120000000001,1.0,0.26286888259023233,-0.5257372188438393,0.8090119450836976,
0.531941,-0.502302,0.6817120000000001,1.0,0.5236580515960895,-0.5038185204865161,0.6869855481837774,
0.44721600000000006,-0.2763979999999999,0.8506480000000001,1.0,0.44077806642962053,-0.27241829131158873,0.8552794693627571,
0.44721600000000006,-0.2763979999999999,0.8506480000000001,1.0,0.44077806642962053,-0.27241829131158873,0.8552794693627571,
0.531941,-0.502302,0.6817120000000001,1.0,0.5236580515960895,-0.5038185204865161,0.6869855481837774,
0.6871589999999999,-0.25115200000000004,0.6817150000000001,1.0,0.6848111757491196,-0.24306484466307332,0.6869884532203029,
0.531941,-0.502302,0.6817120000000001,1.0,0.5236580515960895,-0.5038185204865161,0.6869855481837774,
0.7236069999999999,-0.44721999999999995,0.525725,1.0,0.7236067216830413,-0.4472196513214831,0.5257260653677089,
0.6871589999999999,-0.25115200000000004,0.6817150000000001,1.0,0.6848111757491196,-0.24306484466307332,0.6869884532203029,
0.956626,0.25114900000000007,0.14761800000000003,1.0,0.9578261805030606,0.24306129258052184,0.15326518192989683,
0.956626,0.25114900000000007,-0.14761800000000003,1.0,0.9578262483355788,0.24306118218022527,-0.15326493309476094,
0.8944260000000002,0.44721600000000006,0.0,1.0,0.8944264388330799,0.4472150998304671,-7.024693876715296e-18,
0.951058,0.0,0.309013,1.0,0.9510576790560566,4.844418859218338e-07,0.30901341574156965,
1.0,0.0,0.0,1.0,0.9999606296359095,-0.00887350991183931,0.0,
0.956626,0.25114900000000007,0.14761800000000003,1.0,0.9578261805030606,0.24306129258052184,0.15326518192989683,
0.860698,-0.251151,0.442858,1.0,0.864986890060841,-0.24306353018273283,0.4389963557001157,
0.9472130000000001,-0.276396,0.162458,1.0,0.9496282556409833,-0.27241716831043955,0.15490339730937155,
0.951058,0.0,0.309013,1.0,0.9510576790560566,4.844418859218338e-07,0.30901341574156965,
0.956626,0.25114900000000007,0.14761800000000003,1.0,0.9578261805030606,0.24306129258052184,0.15326518192989683,
1.0,0.0,0.0,1.0,0.9999606296359095,-0.00887350991183931,0.0,
0.956626,0.25114900000000007,-0.14761800000000003,1.0,0.9578262483355788,0.24306118218022527,-0.15326493309476094,
1.0,0.0,0.0,1.0,0.9999606296359095,-0.00887350991183931,0.0,
0.951058,0.0,-0.309013,1.0,0.9510575012112954,5.074933413732154e-07,-0.30901396309789836,
0.956626,0.25114900000000007,-0.14761800000000003,1.0,0.9578262483355788,0.24306118218022527,-0.15326493309476094,
0.951058,0.0,0.309013,1.0,0.9510576790560566,4.844418859218338e-07,0.30901341574156965,
0.9472130000000001,-0.276396,0.162458,1.0,0.9496282556409833,-0.27241716831043955,0.15490339730937155,
1.0,0.0,0.0,1.0,0.9999606296359095,-0.00887350991183931,0.0,
0.9472130000000001,-0.276396,0.162458,1.0,0.9496282556409833,-0.27241716831043955,0.15490339730937155,
0.9472130000000001,-0.276396,-0.162458,1.0,0.9496282556409833,-0.27241716831043955,-0.15490339730937153,
1.0,0.0,0.0,1.0,0.9999606296359095,-0.00887350991183931,0.0,
1.0,0.0,0.0,1.0,0.9999606296359095,-0.00887350991183931,0.0,
0.9472130000000001,-0.276396,-0.162458,1.0,0.9496282556409833,-0.27241716831043955,-0.15490339730937153,
0.951058,0.0,-0.309013,1.0,0.9510575012112954,5.074933413732154e-07,-0.30901396309789836,
0.9472130000000001,-0.276396,-0.162458,1.0,0.9496282556409833,-0.27241716831043955,-0.15490339730937153,
0.860698,-0.251151,-0.442858,1.0,0.8649868190167103,-0.2430628154105527,-0.4389968914377966,
0.951058,0.0,-0.309013,1.0,0.9510575012112954,5.074933413732154e-07,-0.30901396309789836,
0.860698,-0.251151,0.442858,1.0,0.864986890060841,-0.24306353018273283,0.4389963557001157,
0.812729,-0.502301,0.2952379999999999,1.0,0.8151848055269568,-0.503817229437447,0.2857305236756347,
0.9472130000000001,-0.276396,0.162458,1.0,0.9496282556409833,-0.27241716831043955,0.15490339730937155,
0.812729,-0.502301,0.2952379999999999,1.0,0.8151848055269568,-0.503817229437447,0.2857305236756347,
0.8506480000000001,-0.525736,0.0,1.0,0.8506487792762305,-0.5257343952185694,-1.551196823478276e-07,
0.9472130000000001,-0.276396,0.162458,1.0,0.9496282556409833,-0.27241716831043955,0.15490339730937155,
0.9472130000000001,-0.276396,0.162458,1.0,0.9496282556409833,-0.27241716831043955,0.15490339730937155,
0.8506480000000001,-0.525736,0.0,1.0,0.8506487792762305,-0.5257343952185694,-1.551196823478276e-07,
0.9472130000000001,-0.276396,-0.162458,1.0,0.9496282556409833,-0.27241716831043955,-0.15490339730937153,
0.8506480000000001,-0.525736,0.0,1.0,0.8506487792762305,-0.5257343952185694,-1.551196823478276e-07,
0.812729,-0.502301,-0.295238,1.0,0.8151846510833864,-0.5038175802700607,-0.2857303456913148,
0.9472130000000001,-0.276396,-0.162458,1.0,0.9496282556409833,-0.27241716831043955,-0.15490339730937153,
0.9472130000000001,-0.276396,-0.162458,1.0,0.9496282556409833,-0.27241716831043955,-0.15490339730937153,
0.812729,-0.502301,-0.295238,1.0,0.8151846510833864,-0.5038175802700607,-0.2857303456913148,
0.860698,-0.251151,-0.442858,1.0,0.8649868190167103,-0.2430628154105527,-0.4389968914377966,
0.812729,-0.502301,-0.295238,1.0,0.8151846510833864,-0.5038175802700607,-0.2857303456913148,
0.7236069999999999,-0.44721999999999995,-0.525725,1.0,0.7236067216830413,-0.4472196513214831,-0.525726065367709,
0.860698,-0.251151,-0.442858,1.0,0.8649868190167103,-0.2430628154105527,-0.4389968914377966,
0.6095470000000001,-0.657519,-0.442856,1.0,0.60423092704266,-0.6649723365238669,-0.4389951918451463,
0.531941,-0.502302,-0.681712,1.0,0.5236579140350146,-0.503818798851909,-0.6869854488938736,
0.7236069999999999,-0.44721999999999995,-0.525725,1.0,0.7236067216830413,-0.4472196513214831,-0.525726065367709,
0.4253230000000001,-0.850654,-0.3090109999999999,1.0,0.42532286056333185,-0.8506540013904963,-0.3090117056044348,
0.3618030000000001,-0.723612,-0.587779,1.0,0.3538531927575634,-0.727551553663659,-0.5877556080012123,
0.6095470000000001,-0.657519,-0.442856,1.0,0.60423092704266,-0.6649723365238669,-0.4389951918451463,
0.20318100000000006,-0.96795,-0.14761800000000003,1.0,0.21095286907952562,-0.9654060533326492,-0.15326460522832558,
0.1381969999999999,-0.894429,-0.42532100000000006,1.0,0.14064406863988954,-0.890425561238057,-0.4328528223892147,
0.4253230000000001,-0.850654,-0.3090109999999999,1.0,0.42532286056333185,-0.8506540013904963,-0.3090117056044348,
0.6095470000000001,-0.657519,-0.442856,1.0,0.60423092704266,-0.6649723365238669,-0.4389951918451463,
0.3618030000000001,-0.723612,-0.587779,1.0,0.3538531927575634,-0.727551553663659,-0.5877556080012123,
0.531941,-0.502302,-0.681712,1.0,0.5236579140350146,-0.503818798851909,-0.6869854488938736,
0.3618030000000001,-0.723612,-0.587779,1.0,0.3538531927575634,-0.727551553663659,-0.5877556080012123,
0.262869,-0.525738,-0.809012,1.0,0.26286895228372437,-0.5257372320187721,-0.8090119138767345,
0.531941,-0.502302,-0.681712,1.0,0.5236579140350146,-0.503818798851909,-0.6869854488938736,
0.4253230000000001,-0.850654,-0.3090109999999999,1.0,0.42532286056333185,-0.8506540013904963,-0.3090117056044348,
0.1381969999999999,-0.894429,-0.42532100000000006,1.0,0.14064406863988954,-0.890425561238057,-0.4328528223892147,
0.3618030000000001,-0.723612,-0.587779,1.0,0.3538531927575634,-0.727551553663659,-0.5877556080012123,
0.1381969999999999,-0.894429,-0.42532100000000006,1.0,0.14064406863988954,-0.890425561238057,-0.4328528223892147,
0.052788999999999975,-0.723611,-0.688186,1.0,0.05920646379214723,-0.7275510143742654,-0.683494049811852,
0.3618030000000001,-0.723612,-0.587779,1.0,0.3538531927575634,-0.727551553663659,-0.5877556080012123,
0.3618030000000001,-0.723612,-0.587779,1.0,0.3538531927575634,-0.727551553663659,-0.5877556080012123,
0.052788999999999975,-0.723611,-0.688186,1.0,0.05920646379214723,-0.7275510143742654,-0.683494049811852,
0.262869,-0.525738,-0.809012,1.0,0.26286895228372437,-0.5257372320187721,-0.8090119138767345,
0.052788999999999975,-0.723611,-0.688186,1.0,0.05920646379214723,-0.7275510143742654,-0.683494049811852,
-0.02963899999999997,-0.502302,-0.864184,1.0,-0.019838720158978862,-0.5038191057760348,-0.8635813417608618,
0.262869,-0.525738,-0.809012,1.0,0.26286895228372437,-0.5257372320187721,-0.8090119138767345,
0.20318100000000006,-0.96795,-0.14761800000000003,1.0,0.21095286907952562,-0.9654060533326492,-0.15326460522832558,
-0.07760699999999998,-0.96795,-0.23885299999999998,1.0,-0.08057588379380852,-0.9654061724258667,-0.24798880860410688,
0.1381969999999999,-0.894429,-0.42532100000000006,1.0,0.14064406863988954,-0.890425561238057,-0.4328528223892147,
-0.07760699999999998,-0.96795,-0.23885299999999998,1.0,-0.08057588379380852,-0.9654061724258667,-0.24798880860410688,
-0.16245599999999993,-0.850654,-0.49999499999999997,1.0,-0.1624559605874681,-0.8506538252498717,-0.4999961304423903,
0.1381969999999999,-0.894429,-0.42532100000000006,1.0,0.14064406863988954,-0.890425561238057,-0.4328528223892147,
0.1381969999999999,-0.894429,-0.42532100000000006,1.0,0.14064406863988954,-0.890425561238057,-0.4328528223892147,
-0.16245599999999993,-0.850654,-0.49999499999999997,1.0,-0.1624559605874681,-0.8506538252498717,-0.4999961304423903,
0.052788999999999975,-0.723611,-0.688186,1.0,0.05920646379214723,-0.7275510143742654,-0.683494049811852,
-0.16245599999999993,-0.850654,-0.49999499999999997,1.0,-0.1624559605874681,-0.8506538252498717,-0.4999961304423903,
-0.23282199999999997,-0.657519,-0.716563,1.0,-0.23079127648765035,-0.664972933661906,-0.7103142855062675,
0.052788999999999975,-0.723611,-0.688186,1.0,0.05920646379214723,-0.7275510143742654,-0.683494049811852,
0.052788999999999975,-0.723611,-0.688186,1.0,0.05920646379214723,-0.7275510143742654,-0.683494049811852,
-0.23282199999999997,-0.657519,-0.716563,1.0,-0.23079127648765035,-0.664972933661906,-0.7103142855062675,
-0.02963899999999997,-0.502302,-0.864184,1.0,-0.019838720158978862,-0.5038191057760348,-0.8635813417608618,
-0.23282199999999997,-0.657519,-0.716563,1.0,-0.23079127648765035,-0.664972933661906,-0.7103142855062675,
-0.2763880000000001,-0.44721999999999995,-0.850649,1.0,-0.2763877525951483,-0.44721995820039734,-0.8506492339399583,
-0.02963899999999997,-0.502302,-0.864184,1.0,-0.019838720158978862,-0.5038191057760348,-0.8635813417608618,
-0.23282199999999997,-0.657519,-0.716563,1.0,-0.23079127648765035,-0.664972933661906,-0.7103142855062675,
-0.48397099999999993,-0.502302,-0.716565,1.0,-0.4915461091474215,-0.5038186497816622,-0.7103162610515219,
-0.2763880000000001,-0.44721999999999995,-0.850649,1.0,-0.2763877525951483,-0.44721995820039734,-0.8506492339399583,
-0.16245599999999993,-0.850654,-0.49999499999999997,1.0,-0.1624559605874681,-0.8506538252498717,-0.4999961304423903,
-0.447211,-0.723612,-0.525727,1.0,-0.4496452961078909,-0.7275509278708348,-0.5181590055594274,
-0.23282199999999997,-0.657519,-0.716563,1.0,-0.23079127648765035,-0.664972933661906,-0.7103142855062675,
-0.07760699999999998,-0.96795,-0.23885299999999998,1.0,-0.08057588379380852,-0.9654061724258667,-0.24798880860410688,
-0.36180100000000004,-0.894429,-0.26286300000000007,1.0,-0.36820701052687826,-0.8904256400317344,-0.2675178068333686,
-0.16245599999999993,-0.850654,-0.49999499999999997,1.0,-0.1624559605874681,-0.8506538252498717,-0.4999961304423903,
-0.23282199999999997,-0.657519,-0.716563,1.0,-0.23079127648765035,-0.664972933661906,-0.7103142855062675,
-0.447211,-0.723612,-0.525727,1.0,-0.4496452961078909,-0.7275509278708348,-0.5181590055594274,
-0.48397099999999993,-0.502302,-0.716565,1.0,-0.4915461091474215,-0.5038186497816622,-0.7103162610515219,
-0.447211,-0.723612,-0.525727,1.0,-0.4496452961078909,-0.7275509278708348,-0.5181590055594274,
-0.688189,-0.525736,-0.499997,1.0,-0.6881896629138985,-0.5257350598001616,-0.4999976347497809,
-0.48397099999999993,-0.502302,-0.716565,1.0,-0.4915461091474215,-0.5038186497816622,-0.7103162610515219,
-0.16245599999999993,-0.850654,-0.49999499999999997,1.0,-0.1624559605874681,-0.8506538252498717,-0.4999961304423903,
-0.36180100000000004,-0.894429,-0.26286300000000007,1.0,-0.36820701052687826,-0.8904256400317344,-0.2675178068333686,
-0.447211,-0.723612,-0.525727,1.0,-0.4496452961078909,-0.7275509278708348,-0.5181590055594274,
-0.36180100000000004,-0.894429,-0.26286300000000007,1.0,-0.36820701052687826,-0.8904256400317344,-0.2675178068333686,
-0.638195,-0.723609,-0.26286300000000007,1.0,-0.6317494048790507,-0.7275484141008814,-0.2675182135374292,
-0.447211,-0.723612,-0.525727,1.0,-0.4496452961078909,-0.7275509278708348,-0.5181590055594274,
-0.447211,-0.723612,-0.525727,1.0,-0.4496452961078909,-0.7275509278708348,-0.5181590055594274,
-0.638195,-0.723609,-0.26286300000000007,1.0,-0.6317494048790507,-0.7275484141008814,-0.2675182135374292,
-0.688189,-0.525736,-0.499997,1.0,-0.6881896629138985,-0.5257350598001616,-0.4999976347497809,
-0.638195,-0.723609,-0.26286300000000007,1.0,-0.6317494048790507,-0.7275484141008814,-0.2675182135374292,
-0.831051,-0.502299,-0.23885299999999998,1.0,-0.827448675299351,-0.503815221812631,-0.24798974175404667,
-0.688189,-0.525736,-0.499997,1.0,-0.6881896629138985,-0.5257350598001616,-0.4999976347497809,
-0.07760699999999998,-0.96795,-0.23885299999999998,1.0,-0.08057588379380852,-0.9654061724258667,-0.24798880860410688,
-0.251147,-0.967949,0.0,1.0,-0.26075247981128585,-0.965405688957526,8.4223782992918e-07,
-0.36180100000000004,-0.894429,-0.26286300000000007,1.0,-0.36820701052687826,-0.8904256400317344,-0.2675178068333686,
-0.251147,-0.967949,0.0,1.0,-0.26075247981128585,-0.965405688957526,8.4223782992918e-07,
-0.52573,-0.850652,0.0,1.0,-0.5257291351746985,-0.8506520301675546,5.30161602573815e-07,
-0.36180100000000004,-0.894429,-0.26286300000000007,1.0,-0.36820701052687826,-0.8904256400317344,-0.2675178068333686,
-0.36180100000000004,-0.894429,-0.26286300000000007,1.0,-0.36820701052687826,-0.8904256400317344,-0.2675178068333686,
-0.52573,-0.850652,0.0,1.0,-0.5257291351746985,-0.8506520301675546,5.30161602573815e-07,
-0.638195,-0.723609,-0.26286300000000007,1.0,-0.6317494048790507,-0.7275484141008814,-0.2675182135374292,
-0.52573,-0.850652,0.0,1.0,-0.5257291351746985,-0.8506520301675546,5.30161602573815e-07,
-0.753442,-0.657515,0.0,1.0,-0.7468712183386028,-0.6649687084497966,-1.4345962018813593e-07,
-0.638195,-0.723609,-0.26286300000000007,1.0,-0.6317494048790507,-0.7275484141008814,-0.2675182135374292,
-0.638195,-0.723609,-0.26286300000000007,1.0,-0.6317494048790507,-0.7275484141008814,-0.2675182135374292,
-0.753442,-0.657515,0.0,1.0,-0.7468712183386028,-0.6649687084497966,-1.4345962018813593e-07,
-0.831051,-0.502299,-0.23885299999999998,1.0,-0.827448675299351,-0.503815221812631,-0.24798974175404667,
-0.753442,-0.657515,0.0,1.0,-0.7468712183386028,-0.6649687084497966,-1.4345962018813593e-07,
-0.894426,-0.44721600000000006,0.0,1.0,-0.8944264388330798,-0.44721509983046726,3.5123469383576465e-18,
-0.831051,-0.502299,-0.23885299999999998,1.0,-0.827448675299351,-0.503815221812631,-0.24798974175404667,
-0.753442,-0.657515,0.0,1.0,-0.7468712183386028,-0.6649687084497966,-1.4345962018813593e-07,
-0.831051,-0.502299,0.23885299999999998,1.0,-0.8274488479658778,-0.5038149789897272,0.24798965894876002,
-0.894426,-0.44721600000000006,0.0,1.0,-0.8944264388330798,-0.44721509983046726,3.5123469383576465e-18,
-0.52573,-0.850652,0.0,1.0,-0.5257291351746985,-0.8506520301675546,5.30161602573815e-07,
-0.638195,-0.723609,0.262864,1.0,-0.6317485209773642,-0.7275487814839495,0.2675193017412632,
-0.753442,-0.657515,0.0,1.0,-0.7468712183386028,-0.6649687084497966,-1.4345962018813593e-07,
-0.251147,-0.967949,0.0,1.0,-0.26075247981128585,-0.965405688957526,8.4223782992918e-07,
-0.36180100000000004,-0.894428,0.262864,1.0,-0.3682072805368218,-0.8904250916957412,0.26751926031280254,
-0.52573,-0.850652,0.0,1.0,-0.5257291351746985,-0.8506520301675546,5.30161602573815e-07,
-0.753442,-0.657515,0.0,1.0,-0.7468712183386028,-0.6649687084497966,-1.4345962018813593e-07,
-0.638195,-0.723609,0.262864,1.0,-0.6317485209773642,-0.7275487814839495,0.2675193017412632,
-0.831051,-0.502299,0.23885299999999998,1.0,-0.8274488479658778,-0.5038149789897272,0.24798965894876002,
-0.638195,-0.723609,0.262864,1.0,-0.6317485209773642,-0.7275487814839495,0.2675193017412632,
-0.688189,-0.525736,0.499997,1.0,-0.6881895511641616,-0.5257349869564159,0.49999786515384953,
-0.831051,-0.502299,0.23885299999999998,1.0,-0.8274488479658778,-0.5038149789897272,0.24798965894876002,
-0.52573,-0.850652,0.0,1.0,-0.5257291351746985,-0.8506520301675546,5.30161602573815e-07,
-0.36180100000000004,-0.894428,0.262864,1.0,-0.3682072805368218,-0.8904250916957412,0.26751926031280254,
-0.638195,-0.723609,0.262864,1.0,-0.6317485209773642,-0.7275487814839495,0.2675193017412632,
-0.36180100000000004,-0.894428,0.262864,1.0,-0.3682072805368218,-0.8904250916957412,0.26751926031280254,
-0.447211,-0.72361,0.5257290000000001,1.0,-0.44964507698926237,-0.7275501699756488,0.5181602598692076,
-0.638195,-0.723609,0.262864,1.0,-0.6317485209773642,-0.7275487814839495,0.2675193017412632,
-0.638195,-0.723609,0.262864,1.0,-0.6317485209773642,-0.7275487814839495,0.2675193017412632,
-0.447211,-0.72361,0.5257290000000001,1.0,-0.44964507698926237,-0.7275501699756488,0.5181602598692076,
-0.688189,-0.525736,0.499997,1.0,-0.6881895511641616,-0.5257349869564159,0.49999786515384953,
-0.447211,-0.72361,0.5257290000000001,1.0,-0.44964507698926237,-0.7275501699756488,0.5181602598692076,
-0.48397099999999993,-0.502302,0.7165650000000001,1.0,-0.49154612462755637,-0.503818632525199,0.7103162625789089,
-0.688189,-0.525736,0.499997,1.0,-0.6881895511641616,-0.5257349869564159,0.49999786515384953,
-0.251147,-0.967949,0.0,1.0,-0.26075247981128585,-0.965405688957526,8.4223782992918e-07,
-0.07760699999999998,-0.96795,0.23885299999999998,1.0,-0.08057675620781352,-0.9654060832357604,0.2479888723519962,
-0.36180100000000004,-0.894428,0.262864,1.0,-0.3682072805368218,-0.8904250916957412,0.26751926031280254,
-0.07760699999999998,-0.96795,0.23885299999999998,1.0,-0.08057675620781352,-0.9654060832357604,0.2479888723519962,
-0.16245599999999993,-0.850654,0.49999499999999997,1.0,-0.16245708015289456,-0.8506538856343064,0.4999956639446509,
-0.36180100000000004,-0.894428,0.262864,1.0,-0.3682072805368218,-0.8904250916957412,0.26751926031280254,
-0.36180100000000004,-0.894428,0.262864,1.0,-0.3682072805368218,-0.8904250916957412,0.26751926031280254,
-0.16245599999999993,-0.850654,0.49999499999999997,1.0,-0.16245708015289456,-0.8506538856343064,0.4999956639446509,
-0.447211,-0.72361,0.5257290000000001,1.0,-0.44964507698926237,-0.7275501699756488,0.5181602598692076,
-0.16245599999999993,-0.850654,0.49999499999999997,1.0,-0.16245708015289456,-0.8506538856343064,0.4999956639446509,
-0.23282199999999997,-0.657519,0.7165629999999998,1.0,-0.23079124291012987,-0.6649730641972427,0.7103141742131627,
-0.447211,-0.72361,0.5257290000000001,1.0,-0.44964507698926237,-0.7275501699756488,0.5181602598692076,
-0.447211,-0.72361,0.5257290000000001,1.0,-0.44964507698926237,-0.7275501699756488,0.5181602598692076,
-0.23282199999999997,-0.657519,0.7165629999999998,1.0,-0.23079124291012987,-0.6649730641972427,0.7103141742131627,
-0.48397099999999993,-0.502302,0.7165650000000001,1.0,-0.49154612462755637,-0.503818632525199,0.7103162625789089,
-0.23282199999999997,-0.657519,0.7165629999999998,1.0,-0.23079124291012987,-0.6649730641972427,0.7103141742131627,
-0.2763880000000001,-0.44721999999999995,0.850649,1.0,-0.27638775259514803,-0.44721995820039745,0.8506492339399584,
-0.48397099999999993,-0.502302,0.7165650000000001,1.0,-0.49154612462755637,-0.503818632525199,0.7103162625789089,
0.812729,-0.502301,-0.295238,1.0,0.8151846510833864,-0.5038175802700607,-0.2857303456913148,
0.6095470000000001,-0.657519,-0.442856,1.0,0.60423092704266,-0.6649723365238669,-0.4389951918451463,
0.7236069999999999,-0.44721999999999995,-0.525725,1.0,0.7236067216830413,-0.4472196513214831,-0.525726065367709,
0.8506480000000001,-0.525736,0.0,1.0,0.8506487792762305,-0.5257343952185694,-1.551196823478276e-07,
0.670817,-0.723611,-0.16245699999999996,1.0,0.6683377704518599,-0.7275503751292589,-0.15490344165547704,
0.812729,-0.502301,-0.295238,1.0,0.8151846510833864,-0.5038175802700607,-0.2857303456913148,
0.812729,-0.502301,0.2952379999999999,1.0,0.8151848055269568,-0.503817229437447,0.2857305236756347,
0.6708180000000001,-0.72361,0.162458,1.0,0.6683384936921797,-0.727549561234357,0.1549041438986152,
0.8506480000000001,-0.525736,0.0,1.0,0.8506487792762305,-0.5257343952185694,-1.551196823478276e-07,
0.812729,-0.502301,-0.295238,1.0,0.8151846510833864,-0.5038175802700607,-0.2857303456913148,
0.670817,-0.723611,-0.16245699999999996,1.0,0.6683377704518599,-0.7275503751292589,-0.15490344165547704,
0.6095470000000001,-0.657519,-0.442856,1.0,0.60423092704266,-0.6649723365238669,-0.4389951918451463,
0.670817,-0.723611,-0.16245699999999996,1.0,0.6683377704518599,-0.7275503751292589,-0.15490344165547704,
0.4253230000000001,-0.850654,-0.3090109999999999,1.0,0.42532286056333185,-0.8506540013904963,-0.3090117056044348,
0.6095470000000001,-0.657519,-0.442856,1.0,0.60423092704266,-0.6649723365238669,-0.4389951918451463,
0.8506480000000001,-0.525736,0.0,1.0,0.8506487792762305,-0.5257343952185694,-1.551196823478276e-07,
0.6708180000000001,-0.72361,0.162458,1.0,0.6683384936921797,-0.727549561234357,0.1549041438986152,
0.670817,-0.723611,-0.16245699999999996,1.0,0.6683377704518599,-0.7275503751292589,-0.15490344165547704,
0.6708180000000001,-0.72361,0.162458,1.0,0.6683384936921797,-0.727549561234357,0.1549041438986152,
0.447211,-0.894428,9.999999999177334e-07,1.0,0.4551295869979919,-0.8904252124903946,6.877146626628624e-07,
0.670817,-0.723611,-0.16245699999999996,1.0,0.6683377704518599,-0.7275503751292589,-0.15490344165547704,
0.670817,-0.723611,-0.16245699999999996,1.0,0.6683377704518599,-0.7275503751292589,-0.15490344165547704,
0.447211,-0.894428,9.999999999177334e-07,1.0,0.4551295869979919,-0.8904252124903946,6.877146626628624e-07,
0.4253230000000001,-0.850654,-0.3090109999999999,1.0,0.42532286056333185,-0.8506540013904963,-0.3090117056044348,
0.447211,-0.894428,9.999999999177334e-07,1.0,0.4551295869979919,-0.8904252124903946,6.877146626628624e-07,
0.20318100000000006,-0.96795,-0.14761800000000003,1.0,0.21095286907952562,-0.9654060533326492,-0.15326460522832558,
0.4253230000000001,-0.850654,-0.3090109999999999,1.0,0.42532286056333185,-0.8506540013904963,-0.3090117056044348,
0.812729,-0.502301,0.2952379999999999,1.0,0.8151848055269568,-0.503817229437447,0.2857305236756347,
0.6095470000000001,-0.657519,0.4428559999999999,1.0,0.6042310408008547,-0.6649722006723842,0.43899524105124693,
0.6708180000000001,-0.72361,0.162458,1.0,0.6683384936921797,-0.727549561234357,0.1549041438986152,
0.6095470000000001,-0.657519,0.4428559999999999,1.0,0.6042310408008547,-0.6649722006723842,0.43899524105124693,
0.4253230000000001,-0.850654,0.3090109999999999,1.0,0.42532325551188366,-0.8506538075846909,0.30901169551076946,
0.6708180000000001,-0.72361,0.162458,1.0,0.6683384936921797,-0.727549561234357,0.1549041438986152,
0.6708180000000001,-0.72361,0.162458,1.0,0.6683384936921797,-0.727549561234357,0.1549041438986152,
0.4253230000000001,-0.850654,0.3090109999999999,1.0,0.42532325551188366,-0.8506538075846909,0.30901169551076946,
0.447211,-0.894428,9.999999999177334e-07,1.0,0.4551295869979919,-0.8904252124903946,6.877146626628624e-07,
0.4253230000000001,-0.850654,0.3090109999999999,1.0,0.42532325551188366,-0.8506538075846909,0.30901169551076946,
0.20318100000000006,-0.96795,0.14761800000000003,1.0,0.21095266289464853,-0.9654061618992498,0.15326420516420788,
0.447211,-0.894428,9.999999999177334e-07,1.0,0.4551295869979919,-0.8904252124903946,6.877146626628624e-07,
0.447211,-0.894428,9.999999999177334e-07,1.0,0.4551295869979919,-0.8904252124903946,6.877146626628624e-07,
0.20318100000000006,-0.96795,0.14761800000000003,1.0,0.21095266289464853,-0.9654061618992498,0.15326420516420788,
0.20318100000000006,-0.96795,-0.14761800000000003,1.0,0.21095286907952562,-0.9654060533326492,-0.15326460522832558,
0.20318100000000006,-0.96795,0.14761800000000003,1.0,0.21095266289464853,-0.9654061618992498,0.15326420516420788,
0.0,-1.0,0.0,1.0,-1.306012939612e-06,-0.9999999999991471,7.024692550196524e-18,
0.20318100000000006,-0.96795,-0.14761800000000003,1.0,0.21095286907952562,-0.9654060533326492,-0.15326460522832558,
-0.23282199999999997,-0.657519,0.7165629999999998,1.0,-0.23079124291012987,-0.6649730641972427,0.7103141742131627,
-0.02963899999999997,-0.502302,0.8641839999999998,1.0,-0.019838689717257413,-0.5038192559913451,0.8635812548235572,
-0.2763880000000001,-0.44721999999999995,0.850649,1.0,-0.27638775259514803,-0.44721995820039745,0.8506492339399584,
-0.16245599999999993,-0.850654,0.49999499999999997,1.0,-0.16245708015289456,-0.8506538856343064,0.4999956639446509,
0.05278999999999989,-0.723612,0.688185,1.0,0.05920723925994218,-0.7275515145351986,0.6834934502369095,
-0.23282199999999997,-0.657519,0.7165629999999998,1.0,-0.23079124291012987,-0.6649730641972427,0.7103141742131627,
-0.07760699999999998,-0.96795,0.23885299999999998,1.0,-0.08057675620781352,-0.9654060832357604,0.2479888723519962,
0.13819899999999996,-0.894429,0.42532100000000006,1.0,0.1406455146287707,-0.8904254422627637,0.4328525972960891,
-0.16245599999999993,-0.850654,0.49999499999999997,1.0,-0.16245708015289456,-0.8506538856343064,0.4999956639446509,
-0.23282199999999997,-0.657519,0.7165629999999998,1.0,-0.23079124291012987,-0.6649730641972427,0.7103141742131627,
0.05278999999999989,-0.723612,0.688185,1.0,0.05920723925994218,-0.7275515145351986,0.6834934502369095,
-0.02963899999999997,-0.502302,0.8641839999999998,1.0,-0.019838689717257413,-0.5038192559913451,0.8635812548235572,
0.05278999999999989,-0.723612,0.688185,1.0,0.05920723925994218,-0.7275515145351986,0.6834934502369095,
0.262869,-0.525738,0.8090120000000001,1.0,0.26286888259023233,-0.5257372188438393,0.8090119450836976,
-0.02963899999999997,-0.502302,0.8641839999999998,1.0,-0.019838689717257413,-0.5038192559913451,0.8635812548235572,
-0.16245599999999993,-0.850654,0.49999499999999997,1.0,-0.16245708015289456,-0.8506538856343064,0.4999956639446509,
0.13819899999999996,-0.894429,0.42532100000000006,1.0,0.1406455146287707,-0.8904254422627637,0.4328525972960891,
0.05278999999999989,-0.723612,0.688185,1.0,0.05920723925994218,-0.7275515145351986,0.6834934502369095,
0.13819899999999996,-0.894429,0.42532100000000006,1.0,0.1406455146287707,-0.8904254422627637,0.4328525972960891,
0.36180499999999993,-0.723611,0.587779,1.0,0.3538549988818572,-0.7275505518078368,0.5877557607803032,
0.05278999999999989,-0.723612,0.688185,1.0,0.05920723925994218,-0.7275515145351986,0.6834934502369095,
0.05278999999999989,-0.723612,0.688185,1.0,0.05920723925994218,-0.7275515145351986,0.6834934502369095,
0.36180499999999993,-0.723611,0.587779,1.0,0.3538549988818572,-0.7275505518078368,0.5877557607803032,
0.262869,-0.525738,0.8090120000000001,1.0,0.26286888259023233,-0.5257372188438393,0.8090119450836976,
0.36180499999999993,-0.723611,0.587779,1.0,0.3538549988818572,-0.7275505518078368,0.5877557607803032,
0.531941,-0.502302,0.6817120000000001,1.0,0.5236580515960895,-0.5038185204865161,0.6869855481837774,
0.262869,-0.525738,0.8090120000000001,1.0,0.26286888259023233,-0.5257372188438393,0.8090119450836976,
-0.07760699999999998,-0.96795,0.23885299999999998,1.0,-0.08057675620781352,-0.9654060832357604,0.2479888723519962,
0.20318100000000006,-0.96795,0.14761800000000003,1.0,0.21095266289464853,-0.9654061618992498,0.15326420516420788,
0.13819899999999996,-0.894429,0.42532100000000006,1.0,0.1406455146287707,-0.8904254422627637,0.4328525972960891,
0.20318100000000006,-0.96795,0.14761800000000003,1.0,0.21095266289464853,-0.9654061618992498,0.15326420516420788,
0.4253230000000001,-0.850654,0.3090109999999999,1.0,0.42532325551188366,-0.8506538075846909,0.30901169551076946,
0.13819899999999996,-0.894429,0.42532100000000006,1.0,0.1406455146287707,-0.8904254422627637,0.4328525972960891,
0.13819899999999996,-0.894429,0.42532100000000006,1.0,0.1406455146287707,-0.8904254422627637,0.4328525972960891,
0.4253230000000001,-0.850654,0.3090109999999999,1.0,0.42532325551188366,-0.8506538075846909,0.30901169551076946,
0.36180499999999993,-0.723611,0.587779,1.0,0.3538549988818572,-0.7275505518078368,0.5877557607803032,
0.4253230000000001,-0.850654,0.3090109999999999,1.0,0.42532325551188366,-0.8506538075846909,0.30901169551076946,
0.6095470000000001,-0.657519,0.4428559999999999,1.0,0.6042310408008547,-0.6649722006723842,0.43899524105124693,
0.36180499999999993,-0.723611,0.587779,1.0,0.3538549988818572,-0.7275505518078368,0.5877557607803032,
0.36180499999999993,-0.723611,0.587779,1.0,0.3538549988818572,-0.7275505518078368,0.5877557607803032,
0.6095470000000001,-0.657519,0.4428559999999999,1.0,0.6042310408008547,-0.6649722006723842,0.43899524105124693,
0.531941,-0.502302,0.6817120000000001,1.0,0.5236580515960895,-0.5038185204865161,0.6869855481837774,
0.6095470000000001,-0.657519,0.4428559999999999,1.0,0.6042310408008547,-0.6649722006723842,0.43899524105124693,
0.7236069999999999,-0.44721999999999995,0.525725,1.0,0.7236067216830413,-0.4472196513214831,0.5257260653677089,
0.531941,-0.502302,0.6817120000000001,1.0,0.5236580515960895,-0.5038185204865161,0.6869855481837774
    ]);

    this.vboVerts = 960;							// # of vertices held in 'vboContents' array;
    this.FSIZE = this.vboContents.BYTES_PER_ELEMENT;
                                  // bytes req'd by 1 vboContents array element;
                                  // (why? used to compute stride and offset 
                                  // in bytes for vertexAttribPointer() calls)
    this.vboBytes = this.vboContents.length * this.FSIZE;               
                                  // (#  of floats in vboContents array) * 
                                  // (# of bytes/float).
    this.vboStride = this.vboBytes / this.vboVerts;     
                                  // From any attrib in a given vertex, 
                                  // move forward by 'vboStride' bytes to arrive 
                                  // at the same attrib for the next vertex. 
                                  // (== # of bytes used to store one vertex) 
                                  
                //----------------------Attribute sizes
    this.vboFcount_a_Position = 4;  // # of floats in the VBO needed to store the
                                  // attribute named a_Position (4: x,y,z,w values)
    this.vboFcount_a_Normal = 3;   // # of floats for this attrib (r,g,b values)
    // this.vboFcount_a_PtSize = 1;  // # of floats for this attrib (just one!)
                 //----------------------Attribute offsets
    this.vboOffset_a_Position = 0;   
                                  //# of bytes from START of vbo to the START
                                  // of 1st a_Position attrib value in vboContents[]
    this.vboOffset_a_Normal = (this.vboFcount_a_Position) * this.FSIZE;  
                                  // == 4 floats * bytes/float
                                  //# of bytes from START of vbo to the START
                                  // of 1st a_Color attrib value in vboContents[]
                                  
                //-----------------------GPU memory locations:
    this.vboLoc;									// GPU Location for Vertex Buffer Object, 
                                  // returned by gl.createBuffer() function call
    this.shaderLoc;								// GPU Location for compiled Shader-program  
                                  // set by compile/link of VERT_SRC and FRAG_SRC.
                            //------Attribute locations in our shaders:
    this.a_PositionLoc;							// GPU location: shader 'a_Position' attribute
    this.a_NormalLoc;								// GPU location: shader 'a_Color' attribute
    // this.a_PtSizeLoc;								// GPU location: shader 'a_PtSize' attribute
    
                //---------------------- Uniform locations &values in our shaders
    this.ModelMatrix = new Matrix4();	// Transforms CVV axes to model axes.
    this.MvpMatrix = new Matrix4();	// Transforms CVV axes to model axes.
    this.NormalMatrix = new Matrix4();	// Transforms CVV axes to model axes.
    this.u_ModelMatrixLoc;						// GPU location for u_ModelMat uniform
  };
  
  
  VBObox2.prototype.init = function() {
  //=============================================================================
  // Prepare the GPU to use all vertices, GLSL shaders, attributes, & uniforms 
  // kept in this VBObox. (This function usually called only once, within main()).
  // Specifically:
  // a) Create, compile, link our GLSL vertex- and fragment-shaders to form an 
  //  executable 'program' stored and ready to use inside the GPU.  
  // b) create a new VBO object in GPU memory and fill it by transferring in all
  //  the vertex data held in our Float32array member 'VBOcontents'. 
  // c) Find & save the GPU location of all our shaders' attribute-variables and 
  //  uniform-variables (needed by switchToMe(), adjust(), draw(), reload(), etc.)
  // 
  // CAREFUL!  before you can draw pictures using this VBObox contents, 
  //  you must call this VBObox object's switchToMe() function too!
  
    // a) Compile,link,upload shaders---------------------------------------------
    this.shaderLoc = createProgram(gl, this.VERT_SRC, this.FRAG_SRC);
    if (!this.shaderLoc) {
      console.log(this.constructor.name + 
                  '.init() failed to create executable Shaders on the GPU. Bye!');
      return;
    }
    // CUTE TRICK: let's print the NAME of this VBObox object: tells us which one!
    //  else{console.log('You called: '+ this.constructor.name + '.init() fcn!');}
  
    gl.program = this.shaderLoc;		// (to match cuon-utils.js -- initShaders())
  
    // b) Create VBO on GPU, fill it----------------------------------------------
    this.vboLoc = gl.createBuffer();	
    if (!this.vboLoc) {
      console.log(this.constructor.name + 
                  '.init() failed to create VBO in GPU. Bye!'); 
      return;
    }
    // Specify the purpose of our newly-created VBO.  Your choices are:
    //	== "gl.ARRAY_BUFFER" : the VBO holds vertices, each made of attributes 
    // (positions, colors, normals, etc), or 
    //	== "gl.ELEMENT_ARRAY_BUFFER" : the VBO holds indices only; integer values 
    // that each select one vertex from a vertex array stored in another VBO.
    gl.bindBuffer(gl.ARRAY_BUFFER,	    // GLenum 'target' for this GPU buffer 
                    this.vboLoc);				// the ID# the GPU uses for this buffer.
  
    // Fill the GPU's newly-created VBO object with the vertex data we stored in
    //  our 'vboContents' member (JavaScript Float32Array object).
    //  (Recall gl.bufferData() will evoke GPU's memory allocation & managemt: use 
    //		gl.bufferSubData() to modify VBO contents without changing VBO size)
    gl.bufferData(gl.ARRAY_BUFFER, 			  // GLenum target(same as 'bindBuffer()')
                      this.vboContents, 		// JavaScript Float32Array
                     gl.STATIC_DRAW);			// Usage hint.
    //	The 'hint' helps GPU allocate its shared memory for best speed & efficiency
    //	(see OpenGL ES specification for more info).  Your choices are:
    //		--STATIC_DRAW is for vertex buffers rendered many times, but whose 
    //				contents rarely or never change.
    //		--DYNAMIC_DRAW is for vertex buffers rendered many times, but whose 
    //				contents may change often as our program runs.
    //		--STREAM_DRAW is for vertex buffers that are rendered a small number of 
    // 			times and then discarded; for rapidly supplied & consumed VBOs.
  
    // c1) Find All Attributes:---------------------------------------------------
    //  Find & save the GPU location of all our shaders' attribute-variables and 
    //  uniform-variables (for switchToMe(), adjust(), draw(), reload(),etc.)
    this.a_PositionLoc = gl.getAttribLocation(this.shaderLoc, 'a_Position');
    if(this.a_PositionLoc < 0) {
      console.log(this.constructor.name + 
                  '.init() Failed to get GPU location of attribute a_Position');
      return -1;	// error exit.
    }
    this.a_NormalLoc = gl.getAttribLocation(this.shaderLoc, 'a_Normal');
    if(this.a_NormalLoc < 0) {
      console.log(this.constructor.name + 
                  '.init() Failed to get GPU location of attribute a_Normal');
      return -1;	// error exit.
    }

    // c2) Find All Uniforms:-----------------------------------------------------
    //Get GPU storage location for each uniform var used in our shader programs: 

   this.u_eyePosWorld = gl.getUniformLocation(gl.program, 'u_eyePosWorld');

   this.u_ModelMatrixLoc = gl.getUniformLocation(this.shaderLoc, 'u_ModelMatrix');
    if (!this.u_ModelMatrixLoc) { 
      console.log(this.constructor.name + 
                  '.init() failed to get GPU location for u_ModelMatrix uniform');
      return;
    }

    this.u_NormalMatrixLoc = gl.getUniformLocation(this.shaderLoc, 'u_NormalMatrix');
    if (!this.u_ModelMatrixLoc) { 
      console.log(this.constructor.name + 
                  '.init() failed to get GPU location for u_NormalMatrix uniform');
      return;
  }

  // this.u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
  // this.u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
  // this.u_AmbientLight = gl.getUniformLocation(gl.program, 'u_AmbientLight');

  // if (!this.u_LightColor || !this.u_LightPosition　|| !this.u_AmbientLight) { 
  //   console.log('Failed to get the storage location');
  //   return;
  // }
  this.u_MvpMatrixLoc = gl.getUniformLocation(gl.program, 	'u_MvpMatrix');

  	//  ... for Phong light source:
    this.u_Lamp0Pos  = gl.getUniformLocation(gl.program, 	'u_Lamp0Pos');
    this.u_Lamp0Amb  = gl.getUniformLocation(gl.program, 	'u_Lamp0Amb');
    this.u_Lamp0Diff = gl.getUniformLocation(gl.program, 	'u_Lamp0Diff');
    this.u_Lamp0Spec	= gl.getUniformLocation(gl.program,		'u_Lamp0Spec');
    if( !this.u_Lamp0Pos || !this.u_Lamp0Amb	) {//|| !u_Lamp0Diff	) { // || !u_Lamp0Spec	) {
      console.log('Failed to get the Lamp0 storage locations');
      return;
    }
    // ... for Phong material/reflectance:
    this.u_Ke = gl.getUniformLocation(gl.program, 'u_Ke');
    this.u_Ka = gl.getUniformLocation(gl.program, 'u_Ka');
    this.u_Kd = gl.getUniformLocation(gl.program, 'u_Kd');
    this.u_Ks = gl.getUniformLocation(gl.program, 'u_Ks');
  //	var u_Kshiny = gl.getUniformLocation(gl.program, 'u_Kshiny');

    this.u_blinn = gl.getUniformLocation(gl.program, 'blinn');
    this.u_not_blinn = gl.getUniformLocation(gl.program, 'not_blinn');
    
    if(!this.u_Ke || !this.u_Ka || !this.u_Kd 
  //		 || !u_Ks || !u_Kshiny
       ) {
      console.log('Failed to get the Phong Reflectance storage locations');
      return;
    }
  }
  
  VBObox2.prototype.switchToMe = function() {
  //==============================================================================
  // Set GPU to use this VBObox's contents (VBO, shader, attributes, uniforms...)
  //
  // We only do this AFTER we called the init() function, which does the one-time-
  // only setup tasks to put our VBObox contents into GPU memory.  !SURPRISE!
  // even then, you are STILL not ready to draw our VBObox's contents onscreen!
  // We must also first complete these steps:
  //  a) tell the GPU to use our VBObox's shader program (already in GPU memory),
  //  b) tell the GPU to use our VBObox's VBO  (already in GPU memory),
  //  c) tell the GPU to connect the shader program's attributes to that VBO.
  
  // a) select our shader program:
    gl.useProgram(this.shaderLoc);
  //		Each call to useProgram() selects a shader program from the GPU memory,
  // but that's all -- it does nothing else!  Any previously used shader program's 
  // connections to attributes and uniforms are now invalid, and thus we must now
  // establish new connections between our shader program's attributes and the VBO
  // we wish to use.  
    
  // b) call bindBuffer to disconnect the GPU from its currently-bound VBO and
  //  instead connect to our own already-created-&-filled VBO.  This new VBO can 
  //    supply values to use as attributes in our newly-selected shader program:
    gl.bindBuffer(gl.ARRAY_BUFFER,	    // GLenum 'target' for this GPU buffer 
                      this.vboLoc);			// the ID# the GPU uses for our VBO.
  
  // c) connect our newly-bound VBO to supply attribute variable values for each
  // vertex to our SIMD shader program, using 'vertexAttribPointer()' function.
  // this sets up data paths from VBO to our shader units:
    // 	Here's how to use the almost-identical OpenGL version of this function:
    //		http://www.opengl.org/sdk/docs/man/xhtml/glVertexAttribPointer.xml )
    gl.vertexAttribPointer(
      this.a_PositionLoc,//index == ID# for the attribute var in GLSL shader pgm;
      this.vboFcount_a_Position, // # of floats used by this attribute: 1,2,3 or 4?
      gl.FLOAT,		  // type == what data type did we use for those numbers?
      false,				// isNormalized == are these fixed-point values that we need
                    //									normalize before use? true or false
      this.vboStride,// Stride == #bytes we must skip in the VBO to move from the
                    // stored attrib for this vertex to the same stored attrib
                    //  for the next vertex in our VBO.  This is usually the 
                    // number of bytes used to store one complete vertex.  If set 
                    // to zero, the GPU gets attribute values sequentially from 
                    // VBO, starting at 'Offset'.	 (Our vertex size in bytes: 
                    // 4 floats for Position + 3 for Color + 1 for PtSize = 8).
      this.vboOffset_a_Position);	
                    // Offset == how many bytes from START of buffer to the first
                    // value we will actually use?  (We start with a_Position).
    gl.vertexAttribPointer(this.a_NormalLoc, this.vboFcount_a_Normal, 
                gl.FLOAT, false, 
                this.vboStride, this.vboOffset_a_Normal);

  // --Enable this assignment of each of these attributes to its' VBO source:
    gl.enableVertexAttribArray(this.a_PositionLoc);
    gl.enableVertexAttribArray(this.a_NormalLoc);

  }
  
  VBObox2.prototype.isReady = function() {
  //==============================================================================
  // Returns 'true' if our WebGL rendering context ('gl') is ready to render using
  // this objects VBO and shader program; else return false.
  // see: https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/getParameter
  
  var isOK = true;
    if(gl.getParameter(gl.CURRENT_PROGRAM) != this.shaderLoc)  {
      console.log(this.constructor.name + 
                  '.isReady() false: shader program at this.shaderLoc not in use!');
      isOK = false;
    }
    if(gl.getParameter(gl.ARRAY_BUFFER_BINDING) != this.vboLoc) {
        console.log(this.constructor.name + 
                '.isReady() false: vbo at this.vboLoc not in use!');
      isOK = false;
    }
    return isOK;
  }
  
  VBObox2.prototype.adjust = function() {
  //=============================================================================
  // Update the GPU to newer, current values we now store for 'uniform' vars on 
  // the GPU; and (if needed) update the VBO's contents, and (if needed) each 
  // attribute's stride and offset in VBO.
  
    // check: was WebGL context set to use our VBO & shader program?
    if(this.isReady()==false) {
          console.log('ERROR! before' + this.constructor.name + 
                '.adjust() call you needed to call this.switchToMe()!!');
    }
  
    // Adjust values for our uniforms;-------------------------------------------
  // THIS DOESN'T WORK!!  this.ModelMatrix = g_worldMat;

    this.MvpMatrix.set(g_worldMat);
    // Ready to draw in World coord axes.
    // this.ModelMatrix = new Matrix4();
    // this.MvpMatrix = new Matrix4();    // Model view projection matrix
    // this.NormalMatrix = new Matrix4();
  
    this.ModelMatrix.translate(0.0, 0.0, 0.0);						// then translate them.

    this.ModelMatrix.rotate(currentAngle, 0, 0, 1);

    this.MvpMatrix.multiply(this.ModelMatrix);

    this.NormalMatrix.setInverseOf(this.ModelMatrix);
    this.NormalMatrix.transpose();
    // this.ModelMatrix.rotate(g_angleNow2, 0, 0, 1);	// -spin drawing axes,
    //  Transfer new uniforms' values to the GPU:--------------------------------
    // Send  new 'ModelMat' values to the GPU's 'u_ModelMat1' uniform: 
    gl.uniformMatrix4fv(this.u_ModelMatrixLoc,	  // GPU location of the uniform
                        false, 										// use matrix transpose instead?
                        this.ModelMatrix.elements);	// send data from Javascript.
    
    
    gl.uniformMatrix4fv(this.u_MvpMatrixLoc,	  // GPU location of the uniform
    false, 										// use matrix transpose instead?
    this.MvpMatrix.elements);	// send data from Javascript.

    gl.uniformMatrix4fv(this.u_NormalMatrixLoc,	  // GPU location of the uniform
    false, 										// use matrix transpose instead?
    this.NormalMatrix.elements);	// send data from Javascript.
    // Adjust values in VBOcontents array-----------------------------------------
    // Make one dot-size grow/shrink;
    // this.vboContents[15] = 15.0*(1.0 + Math.cos(Math.PI * 3.0 * g_angleNow1 / 180.0)); // radians
    // // change y-axis value of 1st vertex
    // this.vboContents[1] = g_posNow0;
    // Transfer new VBOcontents to GPU-------------------------------------------- 
    this.reload();
  }
  
  VBObox2.prototype.draw = function() {
  //=============================================================================
  // Render current VBObox contents.
    // check: was WebGL context set to use our VBO & shader program?
    if(this.isReady()==false) {
          console.log('ERROR! before' + this.constructor.name + 
                '.draw() call you needed to call this.switchToMe()!!');
    }
    // // Set the light color (white)
    // gl.uniform3f(this.u_LightColor, 0.8, 0.8, 0.8);
    // // Set the light direction (in the world coordinate)
    // gl.uniform3f(this.u_LightPosition, 0.0, 0.0, 1.0);
    // // Set the ambient light
    // gl.uniform3f(this.u_AmbientLight, 0.2, 0.2, 0.2);

    var light_pos_x = document.getElementById("pos_x").value;
    var light_pos_y = document.getElementById("pos_y").value;
    var light_pos_z = document.getElementById("pos_z").value;

    var amb_r = document.getElementById("amb_r").value;
    var amb_g = document.getElementById("amb_g").value;
    var amb_b = document.getElementById("amb_b").value;

    var dif_r = document.getElementById("dif_r").value;
    var dif_g = document.getElementById("dif_g").value;
    var dif_b = document.getElementById("dif_b").value;

    var spec_r = document.getElementById("spec_r").value;
    var spec_g = document.getElementById("spec_g").value;
    var spec_b = document.getElementById("spec_b").value;

    if (on_light == 1){
      gl.uniform4f(this.u_Lamp0Pos, light_pos_x, light_pos_y, light_pos_z, 1.0);
    } else {
      gl.uniform4f(this.u_Lamp0Pos, 0, 0, 0, 1.0);
    }

    // Position the first light source in World coords: 

  gl.uniform3f(this.u_Lamp0Amb,  amb_r, amb_g, amb_b);		// ambient
  gl.uniform3f(this.u_Lamp0Diff, dif_r, dif_g, dif_b);		// diffuse
  gl.uniform3f(this.u_Lamp0Spec, spec_r, spec_g, spec_b);		// Specular

	// Set the Phong materials' reflectance:
	// gl.uniform3f(this.u_Ke, 0.0, 0.0, 0.0);				// Ke emissive
	// gl.uniform3f(this.u_Ka, 0.6, 0.0, 0.0);				// Ka ambient
  // gl.uniform3f(this.u_Kd, 0.8, 0.0, 0.0);				// Kd	diffuse
	// gl.uniform3f(this.u_Ks, 0.8, 0.8, 0.8);				// Ks specular
    gl.uniform3f(this.u_Ke, 0.0, 0.0, 0.0);
    gl.uniform3f(this.u_Ka, 0.25, 0.20725, 0.20725);
    gl.uniform3f(this.u_Kd, 1, 0.829, 0.829);
    gl.uniform3f(this.u_Ks, 0.296648, 0.296648,	0.296648);
//	gl.uniform1i(u_Kshiny, 4);							// Kshiny shinyness exponent

    gl.uniform1f(this.u_blinn, blinn);
    gl.uniform1f(this.u_not_blinn, !blinn);

    	// Pass the eye position to u_eyePosWorld
	gl.uniform4f(this.u_eyePosWorld, 6,0,0, 1);
    // gl.uniformMatrix4fv(this.u_NormalMatrixLoc, false, this.NormalMatrix.elements);
    gl.uniformMatrix4fv(this.u_ModelMatrixLoc, false, this.ModelMatrix.elements);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.vboVerts);
  }
  
  VBObox2.prototype.reload = function() {
  //=============================================================================
  // Over-write current values in the GPU for our already-created VBO: use 
  // gl.bufferSubData() call to re-transfer some or all of our Float32Array 
  // 'vboContents' to our VBO, but without changing any GPU memory allocations.
                          
   gl.bufferSubData(gl.ARRAY_BUFFER, 	// GLenum target(same as 'bindBuffer()')
                    0,                  // byte offset to where data replacement
                                        // begins in the VBO.
                      this.vboContents);   // the JS source-data array used to fill VBO
  }

  