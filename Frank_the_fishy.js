//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// Chapter 5: ColoredTriangle.js (c) 2012 matsuda  AND
// Chapter 4: RotatingTriangle_withButtons.js (c) 2012 matsuda
// became:
//
// ColoredMultiObject.js  MODIFIED for EECS 351-1, 
//									Northwestern Univ. Jack Tumblin
//    --converted from 2D to 4D (x,y,z,w) vertices
//    --demonstrate how to keep & use MULTIPLE colored shapes in just one
//			Vertex Buffer Object(VBO). 
//    --demonstrate 'nodes' vs. 'vertices'; geometric corner locations where
//				OpenGL/WebGL requires multiple co-located vertices to implement the
//				meeting point of multiple diverse faces.
//    --Simplify fcn calls: make easy-access global vars for gl,g_nVerts, etc.
//
// Vertex shader program----------------------------------
var VSHADER_SOURCE = 
  'uniform mat4 u_ModelMatrix;\n' +
  'attribute vec4 a_Position;\n' +
  'attribute vec4 a_Color;\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_Position = u_ModelMatrix * a_Position;\n' +
  '  gl_PointSize = 10.0;\n' +
  '  v_Color = a_Color;\n' +
  '}\n';

// Fragment shader program----------------------------------
var FSHADER_SOURCE = 
//  '#ifdef GL_ES\n' +					
  'precision mediump float;\n' +
//  '#endif GL_ES\n' +
  'varying vec4 v_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = v_Color;\n' +
  '}\n';

// Easy-Access Global Variables-----------------------------
// (simplifies function calls. LATER: merge them into one 'myApp' object)
var ANGLE_STEP = 45.0;  // -- Rotation angle rate (degrees/second)
var gl;                 // WebGL's rendering context; value set in main()
var g_nVerts;           // # of vertices in VBO; value set in main()
var x_STEP = 0.005;
var y_STEP = 0.005;
var currentAngle = 0.0;
var currentAngle2 = 0.0;
var currentAngle3 = 0.0;
var currentAngle4 = 0.0;
var fin_STEP = 45.0;
var tail_STEP = 60.0;
var floatsPerVertex = 7;

var myCanvas = document.getElementById('HTML5_canvas');

//------------For mouse click-and-drag: -------------------------------
var g_isDrag=false;		// mouse-drag: true when user holds down mouse button
var g_xMclik=0.0;			// last mouse button-down position (in CVV coords)
var g_yMclik=0.0;   
var g_xMdragTot=0.0;	// total (accumulated) mouse-drag amounts (in CVV coords).
var g_yMdragTot=0.0; 
var g_digits=5;			// DIAGNOSTICS: # of digits to print in console.log (
									//    console.log('xVal:', xVal.toFixed(g_digits)); // print 5 digits

function main() {
//==============================================================================
  // Retrieve <canvas> element we created in the HTML file:


  // Get rendering context from our HTML-5 canvas needed for WebGL use.
 	// Success? if so, all WebGL functions are now members of the 'gl' object.
 	// For example, gl.clearColor() calls the WebGL function 'clearColor()'.
  gl = getWebGLContext(myCanvas);
  if (!gl) {
    console.log('Failed to get the WebGL rendering context from myCanvas');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0.4, 0.64, 0.9, 1.0);
  
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Create a Vertex Buffer Object (VBO) in the GPU, and then fill it with
  // g_nVerts vertices.  (builds a float32array in JS, copies contents to GPU)
  g_nVerts = initVertexBuffer();
  if (g_nVerts < 0) {
    console.log('Failed to set the vertex information');
    return;
  }

	// NEW!! Enable 3D depth-test when drawing: don't over-draw at any pixel 
	// unless the new Z value is closer to the eye than the old one..
//	gl.depthFunc(gl.LESS);
	gl.enable(gl.DEPTH_TEST); 	  
	
  // // Create, init current rotation angle value in JavaScript
  // var currentAngle = 0.0;


  // Create, init current x coordinate value in JavaScript
  var currentX = 0.0;

  // Create, init current y coordinate value in JavaScript
  var currentY = 0.0;

  // Get handle to graphics system's storage location of u_ModelMatrix
  var u_ModelLoc = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelLoc) { 
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }
  // Create a local version of our model matrix in JavaScript 
  var modelMatrix = new Matrix4();
  // Constructor for 4x4 matrix, defined in the 'cuon-matrix-quat03.js' library
  // supplied by your textbook.  (Chapter 3)
  
  // Initialize the matrix: 
  modelMatrix.setIdentity(); // (not req'd: constructor makes identity matrix)
  
  // Transfer modelMatrix values to the u_ModelMatrix variable in the GPU
  gl.uniformMatrix4fv(u_ModelLoc, false, modelMatrix.elements);


// KEYBOARD:
  // The 'keyDown' and 'keyUp' events respond to ALL keys on the keyboard,
  //      including shift,alt,ctrl,arrow, pgUp, pgDn,f1,f2...f12 etc. 
	window.addEventListener("keydown", myKeyDown, false);
	// MOUSE:
	// Create 'event listeners' for a few vital mouse events 
	// (others events are available too... google it!).  
	window.addEventListener("mousedown", myMouseDown); 
	// (After each 'mousedown' event, browser calls the myMouseDown() fcn.)
  window.addEventListener("mousemove", myMouseMove); 
	window.addEventListener("mouseup", myMouseUp);	
	window.addEventListener("click", myMouseClick);				
   
//-----------------  DRAW STUFF!
  //---------------Beginner's method: DRAW ONCE and END the program.
  // (makes a static, non-responsive image)
  // gl.drawArrays(gl.TRIANGLES,   // drawing primitive. (try gl.LINE_LOOP too!)
  //               0, 
  //               36);
  // says to WebGL: draw these vertices held in the currently-bound VBO.

  //---------------Interactive Animation: draw repeatedly
  // Create an endlessly repeated 'tick()' function by this clever method:
  // a)  Declare the 'tick' variable whose value is this function:
  var tick = function() {
    // currentAngle = animate(currentAngle, false);  // Update the rotation angle
    animate();
    currentX = animateX(currentX);
    currentY = animateY(currentY);
    draw(currentX, currentY, modelMatrix, u_ModelLoc);   // Draw shapes
    requestAnimationFrame(tick, myCanvas);   
    									// Request that the browser re-draw the webpage
  };
  // AFTER that, call the function.
  tick();							// start (and continue) animation: 
                      // HOW?  Execution jumps to the 'tick()' function; it
                      // completes each statement inside the curly-braces {}
                      // and then goes on to the next statement.  That next
                      // statement calls 'tick()'--thus an infinite loop!

}     

function initVertexBuffer() {
//==============================================================================
  var colorShapes = new Float32Array([ 
  //Cuboid (for fins) 36 verts
  0.00, 0.00, 0.00, 1.00,    0.0, 0.0, 1.0, //back face, left triangle (bottom left point)
  0.2, 0.00, 0.00, 1.00,     1.0, 0.0, 1.0, //(bottom right point)
  0.0,  0.5, 0.00, 1.00,    1.0, 1.0, 1.0, //(top left point)

  0.00, 0.5, 0.00, 1.00,    1.0, 1.0, 1.0, //back face, right triangle (top left point)
  0.2, 0.5, 0.00, 1.00,     1.0, 0.0, 1.0, //top right point
  0.2, 0.00, 0.00, 1.00,    0.0, 0.0, 1.0, //bottom right point

  0.00, 0.00, 0.5, 1.00,     1.0, 0.0, 1.0, //front face
  0.2, 0.00, 0.5, 1.00,      0.0, 0.0, 1.0,
  0.0,  0.5, 0.5, 1.00,      1.0, 1.0, 1.0,

  0.00, 0.5, 0.5, 1.00,     1.0, 1.0, 1.0,
  0.2, 0.5, 0.5, 1.00,      1.0, 0.0, 1.0,
  0.2, 0.00, 0.5, 1.00,     0.0, 0.0, 1.0,

  0.2, 0.5, 0.5, 1.00,      1.0, 1.0, 1.0, // right face
  0.2, 0.5, 0.00, 1.00,     1.0, 0.0, 1.0,
  0.2, 0.00, 0.5, 1.00,    0.0, 0.0, 1.0,

  0.2, 0.00, 0.5, 1.00,    1.0, 0.0, 1.0,
  0.2, 0.5, 0.00, 1.00,    1.0, 1.0, 1.0,
  0.2, 0.00, 0.00, 1.00,   0.0, 0.0, 1.0,

  0.00, 0.5, 0.5, 1.00,     1.0, 1.0, 1.0, // left face
  0.00, 0.5, 0.00, 1.00,    1.0, 0.0, 1.0,
  0.00, 0.00, 0.5, 1.00,    0.0, 0.0, 1.0,

  0.00, 0.00, 0.5, 1.00,    1.0, 0.0, 1.0,
  0.00, 0.5, 0.00, 1.00,    1.0, 1.0, 1.0,
  0.00, 0.00, 0.00, 1.00,   0.0, 0.0, 1.0,

  0.0,  0.5, 0.5, 1.00,     1.0, 1.0, 1.0, // top face
  0.0,  0.5, 0.00, 1.00,    1.0, 0.0, 1.0,
  0.2, 0.5, 0.5, 1.00,      0.0, 0.0, 1.0,
  
  0.2, 0.5, 0.5, 1.00,      1.0, 0.0, 1.0,
  0.2, 0.5, 0.00, 1.00,     1.0, 1.0, 1.0,
  0.0,  0.5, 0.00, 1.00,    0.0, 0.0, 1.0,

  0.0,  0.00, 0.5, 1.00,    1.0, 0.0, 1.0, // bottom face
  0.0,  0.00, 0.00, 1.00,   0.0, 0.0, 1.0,
  0.2, 0.00, 0.5, 1.00,     1.0, 1.0, 1.0,

  0.2, 0.00, 0.5, 1.00,     1.0, 1.0, 1.0,
  0.2, 0.00, 0.00, 1.00,   0.0, 0.0, 1.0,
  0.0,  0.00, 0.00, 1.00,   1.0, 0.0, 1.0,
 
  //Cuboid 2 (for seaweed) 36 verts
  0.00, 0.00, 0.00, 1.00,   1.0, 	1.0,	1.0, //back face, left triangle (bottom left point)
  0.2, 0.00, 0.00, 1.00,    0.0, 1.0, 0.0, //(bottom right point)
  0.0,  0.5, 0.00, 1.00,    0.0, 1.0, 1.0, //(top left point)

  0.00, 0.5, 0.00, 1.00,    0.0, 1.0, 1.0, //back face, right triangle (top left point)
  0.2, 0.5, 0.00, 1.00,      0.0, 1.0, 0.0, //top right point
  0.2, 0.00, 0.00, 1.00,    1.0, 	1.0,	1.0, //bottom right point

  0.00, 0.00, 0.2, 1.00,    1.0, 	1.0,	1.0, //front face
  0.2, 0.00, 0.2, 1.00,     0.0, 1.0, 0.0,
  0.0,  0.5, 0.2, 1.00,    0.0, 1.0, 1.0,

  0.00, 0.5, 0.2, 1.00,   0.0, 1.0, 1.0,
  0.2, 0.5, 0.2, 1.00,     0.0, 1.0, 0.0,
  0.2, 0.00, 0.2, 1.00,     1.0, 	1.0,	1.0,

  0.2, 0.5, 0.2, 1.00,     1.0, 	1.0,	1.0, // right face
  0.2, 0.5, 0.00, 1.00,     0.0, 1.0, 0.0,
  0.2, 0.00, 0.2, 1.00,    0.0, 1.0, 1.0,

  0.2, 0.00, 0.2, 1.00,  0.0, 1.0, 1.0,
  0.2, 0.5, 0.00, 1.00,     0.0, 1.0, 0.0,
  0.2, 0.00, 0.00, 1.00,   1.0, 	1.0,	1.0,

  0.00, 0.5, 0.2, 1.00,     1.0, 	1.0,	1.0, // left face
  0.00, 0.5, 0.00, 1.00,    0.0, 1.0, 0.0,
  0.00, 0.00, 0.2, 1.00,    0.0, 1.0, 1.0,

  0.00, 0.00, 0.2, 1.00,    0.0, 1.0, 1.0,
  0.00, 0.5, 0.00, 1.00,     0.0, 1.0, 0.0,
  0.00, 0.00, 0.00, 1.00,   1.0, 	1.0,	1.0,

  0.0,  0.5, 0.2, 1.00,     1.0, 	1.0,	1.0, // top face
  0.0,  0.5, 0.00, 1.00,     0.0, 1.0, 0.0,
  0.2, 0.5, 0.2, 1.00,    0.0, 1.0, 1.0,
  
  0.2, 0.5, 0.2, 1.00,      0.0, 1.0, 1.0,
  0.2, 0.5, 0.00, 1.00,     0.0, 1.0, 0.0,
  0.0,  0.5, 0.00, 1.00,    1.0, 	1.0,	1.0,

  0.0,  0.00, 0.2, 1.00,    1.0, 	1.0,	1.0, // bottom face
  0.0,  0.00, 0.00, 1.00,   0.0, 1.0, 0.0,
  0.2, 0.00, 0.2, 1.00,     0.0, 1.0, 1.0,

  0.2, 0.00, 0.2, 1.00,     0.0, 1.0, 1.0,
  0.2, 0.00, 0.00, 1.00,    0.0, 1.0, 0.0,
  0.0,  0.00, 0.00, 1.00,  1.0, 	1.0,	1.0,

  //Cube (fish body) 36 verts
  -0.25, -0.25, -0.25, 1.0,   1.0, 0.0, 0.0, //back face
  0.25, -0.25, -0.25, 1.0,    1.0, 0.0, 1.0,
  -0.25, 0.25, -0.25, 1.0,    0.0, 0.0, 1.0,

  -0.25, 0.25, -0.25, 1.0,    0.0, 0.0, 1.0,
  0.25, 0.25, -0.25, 1.0,     1.0, 0.0, 1.0,
  0.25, -0.25, -0.25, 1.0,    1.0, 0.0, 0.0,

  -0.25, -0.25, 0.25, 1.0,  1.0, 0.0, 0.0, //front face
  0.25, -0.25, 0.25, 1.0,   1.0, 0.0, 1.0,
  -0.25, 0.25, 0.25, 1.0,   0.0, 0.0, 1.0,

  -0.25, 0.25, 0.25, 1.0,   0.0, 0.0, 1.0,
  0.25, 0.25, 0.25, 1.0,    1.0, 0.0, 1.0,
  0.25, -0.25, 0.25, 1.0,   1.0, 0.0, 0.0,

  -0.25, -0.25, -0.25, 1.0,   1.0, 0.0, 0.0, // left face
  -0.25, -0.25, 0.25, 1.0,  1.0, 0.0, 1.0,
  -0.25, 0.25, -0.25, 1.0,    0.0, 0.0, 1.0,

  -0.25, 0.25, -0.25, 1.0,    0.0, 0.0, 1.0,
  -0.25, 0.25, 0.25, 1.0,   1.0, 0.0, 1.0,
  -0.25, -0.25, 0.25, 1.0,  1.0, 0.0, 0.0,

  0.25, -0.25, -0.25, 1.0,    1.0, 0.0, 0.0, // right face
  0.25, -0.25, 0.25, 1.0,  1.0, 0.0, 1.0,
  0.25, 0.25, -0.25, 1.0,     0.0, 0.0, 1.0,

  0.25, 0.25, -0.25, 1.0,     0.0, 0.0, 1.0,
  0.25, 0.25, 0.25, 1.0,    1.0, 0.0, 1.0,
  0.25, -0.25, 0.25, 1.0,   1.0, 0.0, 0.0,

  -0.25, 0.25, 0.25, 1.0,   1.0, 0.0, 0.0, //top face
  0.25, 0.25, 0.25, 1.0,    1.0, 0.0, 1.0,
  -0.25, 0.25, -0.25, 1.0,   0.0, 0.0, 1.0,

  -0.25, 0.25, -0.25, 1.0,    0.0, 0.0, 1.0,
  0.25, 0.25, -0.25, 1.0,     1.0, 0.0, 1.0,
  0.25, 0.25, 0.25, 1.0,    1.0, 0.0, 0.0,

  -0.25, -0.25, 0.25, 1.0,  1.0, 0.0, 0.0, //bottom face
  0.25, -0.25, 0.25, 1.0,   1.0, 0.0, 1.0,
  -0.25, -0.25, -0.25, 1.0,   0.0, 0.0, 1.0,

  -0.25, -0.25, -0.25, 1.0,   0.0, 0.0, 1.0,
  0.25, -0.25, -0.25, 1.0,    1.0, 0.0, 1.0,
  0.25, -0.25, 0.25, 1.0,   1.0, 0.0, 0.0,

  //Spike (seaweed) 48 verts
  0.00, 0.00, 0.00, 1.00,  1.0, 	1.0,	1.0, //back face, left triangle (bottom left point)
  0.2, 0.00, 0.00, 1.00,    0.0, 1.0, 0.0, //(bottom right point)
  0.0,  0.5, 0.00, 1.00,    0.0, 1.0, 1.0, //(top left point)

  0.00, 0.5, 0.00, 1.00,   0.0, 1.0, 1.0, //back face, right triangle (top left point)
  0.2, 0.5, 0.00, 1.00,     0.0, 1.0, 0.0,  //top right point
  0.2, 0.00, 0.00, 1.00,    1.0, 	1.0,	1.0, //bottom right point

  0.00, 0.00, 0.2, 1.00,    1.0, 	1.0,	1.0, //front face
  0.2, 0.00, 0.2, 1.00,     0.0, 1.0, 0.0, 
  0.0,  0.5, 0.2, 1.00,     0.0, 1.0, 1.0,

  0.00, 0.5, 0.2, 1.00,     0.0, 1.0, 1.0,
  0.2, 0.5, 0.2, 1.00,      0.0, 1.0, 0.0, 
  0.2, 0.00, 0.2, 1.00,     1.0, 	1.0,	1.0,

  0.2, 0.5, 0.2, 1.00,      1.0, 	1.0,	1.0, // right face
  0.2, 0.5, 0.00, 1.00,     0.0, 1.0, 0.0, 
  0.2, 0.00, 0.2, 1.00,     0.0, 1.0, 1.0,

  0.2, 0.00, 0.2, 1.00,    0.0, 1.0, 1.0,
  0.2, 0.5, 0.00, 1.00,    0.0, 1.0, 0.0, 
  0.2, 0.00, 0.00, 1.00,   1.0, 	1.0,	1.0,

  0.00, 0.5, 0.2, 1.00,     1.0, 	1.0,	1.0, // left face
  0.00, 0.5, 0.00, 1.00,    0.0, 1.0, 0.0, 
  0.00, 0.00, 0.2, 1.00,    0.0, 1.0, 1.0,

  0.00, 0.00, 0.2, 1.00,    0.0, 1.0, 1.0,
  0.00, 0.5, 0.00, 1.00,    0.0, 1.0, 0.0, 
  0.00, 0.00, 0.00, 1.00,   1.0, 	1.0,	1.0,

  0.0,  0.5, 0.2, 1.00,     1.0, 	1.0,	1.0, // top face
  0.0,  0.5, 0.00, 1.00,    0.0, 1.0, 0.0, 
  0.2, 0.5, 0.2, 1.00,      0.0, 1.0, 1.0,
  
  0.2, 0.5, 0.2, 1.00,      0.0, 1.0, 1.0,
  0.2, 0.5, 0.00, 1.00,     0.0, 1.0, 0.0, 
  0.0,  0.5, 0.00, 1.00,    1.0, 	1.0,	1.0,

  0.0,  0.00, 0.2, 1.00,    1.0, 	1.0,	1.0, // bottom face
  0.0,  0.00, 0.00, 1.00,   0.0, 1.0, 0.0, 
  0.2, 0.00, 0.2, 1.00,     0.0, 1.0, 1.0,

  0.2, 0.00, 0.2, 1.00,     0.0, 1.0, 1.0,
  0.2, 0.00, 0.00, 1.00,    0.0, 1.0, 0.0, 
  0.0,  0.00, 0.00, 1.00,   1.0, 	1.0,	1.0,

  0.0, 0.5, 0.2, 1.00,      1.0, 	1.0,	1.0,  // top front triangle
  0.2, 0.5, 0.2, 1.00,      0.0, 1.0, 0.0, 
  0.1, 0.75, 0.1, 1.00,     0.0, 1.0, 1.0,

  0.0, 0.5, 0.00, 1.00,    0.0, 1.0, 1.0,// top back triangle
  0.2, 0.5, 0.00, 1.00,     0.0, 1.0, 0.0, 
  0.1, 0.75, 0.1, 1.00,     1.0, 	1.0,	1.0,

  0.0, 0.5, 0.00, 1.00,     1.0, 	1.0,	1.0, //top left triangle
  0.0, 0.5, 0.2, 1.00,      0.0, 1.0, 0.0, 
  0.1, 0.75, 0.1, 1.00,     0.0, 1.0, 1.0,

  0.2, 0.5, 0.00, 1.00,     0.0, 1.0, 1.0, //top right triangle
  0.2, 0.5, 0.2, 1.00,      0.0, 1.0, 0.0, 
  0.1, 0.75, 0.1, 1.00,     1.0, 	1.0,	1.0,

  //Fish tail 48 verts
  0.0, 0.05, 0.0, 1.0,      1.0, 1.0, 1.0, //back fan
   0.0, 0.25, 0.0, 1.0,     1.0, 0.0, 1.0,
   -0.25, 0.0, 0.0, 1.0,    1.0, 0.0, 0.0,
 
   0.0, -0.05, 0.0, 1.0,    1.0, 1.0, 1.0,
   0.0, -0.25, 0.0, 1.0,    1.0, 0.0, 1.0,
   -0.25, 0.0, 0.0, 1.0,    1.0, 0.0, 0.0,
 
   0.0, 0.05, 0.1, 1.0,     1.0, 1.0, 1.0, //front fan
   0.0, 0.25, 0.1, 1.0,     1.0, 0.0, 1.0,
   -0.25, 0.0, 0.1, 1.0,    1.0, 0.0, 0.0,
    
   0.0, -0.05, 0.1, 1.0,   1.0, 1.0, 1.0,
   0.0, -0.25, 0.1, 1.0,    1.0, 0.0, 1.0,
   -0.25, 0.0, 0.1, 1.0,    1.0, 0.0, 0.0,
 
   -0.25, 0.0, 0.0, 1.0,    1.0, 1.0, 1.0, //connecting top triangle left side
   -0.25, 0.0, 0.1, 1.0,    1.0, 0.0, 1.0,
   0.0, 0.25, 0.0, 1.0,     1.0, 0.0, 0.0,
 
   -0.25, 0.0, 0.1, 1.0,   1.0, 1.0, 1.0,
   0.0, 0.25, 0.0, 1.0,     1.0, 0.0, 1.0,
   0.0, 0.25, 0.1, 1.0,     1.0, 0.0, 0.0,
 
   -0.25, 0.0, 0.0, 1.0,    1.0, 1.0, 1.0, //connecting bottom triangle left side
   -0.25, 0.0, 0.1, 1.0,    1.0, 0.0, 1.0,
   0.0, -0.25, 0.0, 1.0,    1.0, 0.0, 0.0,
 
   -0.25, 0.0, 0.1, 1.0,    1.0, 1.0, 1.0,
   0.0, -0.25, 0.0, 1.0,    1.0, 0.0, 1.0,
   0.0, -0.25, 0.1, 1.0,    1.0, 0.0, 0.0,
 
   0.0, 0.25, 0.0, 1.0,     1.0, 1.0, 1.0, //connecting top triangle right side
   0.0, 0.25, 0.1, 1.0,     1.0, 0.0, 1.0,
   0.0, 0.05, 0.1, 1.0,     1.0, 0.0, 0.0,
    
   0.0, 0.25, 0.0, 1.0,     1.0, 1.0, 1.0,
   0.0, 0.05, 0.1, 1.0,     1.0, 0.0, 1.0,
   0.0, 0.05, 0.0, 1.0,     1.0, 0.0, 0.0,
 
   0.0, -0.25, 0.0, 1.0,    1.0, 1.0, 1.0, //connecting bottom triangle right side
   0.0, -0.25, 0.1, 1.0,    1.0, 0.0, 1.0,
   0.0, -0.05, 0.1, 1.0,    1.0, 0.0, 0.0,
 
   0.0, -0.25, 0.0, 1.0,    1.0, 1.0, 1.0,
   0.0, -0.05, 0.1, 1.0,    1.0, 0.0, 1.0,
   0.0, -0.05, 0.0, 1.0,    1.0, 0.0, 0.0,
 
   -0.25, 0.0, 0.0, 1.0,    1.0, 1.0, 1.0, //connecting top triangle middle
   -0.25, 0.0, 0.1, 1.0,    1.0, 0.0, 1.0,
   0.0, 0.05, 0.1, 1.0,     1.0, 0.0, 0.0,
 
   -0.25, 0.0, 0.0, 1.0,    1.0, 1.0, 1.0,
   0.0, 0.05, 0.1, 1.0,    1.0, 0.0, 1.0,
   0.0, 0.05, 0.0, 1.0,    1.0, 0.0, 0.0,
 
  
   -0.25, 0.0, 0.0, 1.0,    1.0, 1.0, 1.0,  //connecting bottom triangle middle
   -0.25, 0.0, 0.1, 1.0,    1.0, 0.0, 1.0,
   0.0, -0.05, 0.1, 1.0,    1.0, 0.0, 0.0,
 
   -0.25, 0.0, 0.0, 1.0,    1.0, 1.0, 1.0,
   0.0, -0.05, 0.1, 1.0,    1.0, 0.0, 1.0,
   0.0, -0.05, 0.0, 1.0,    1.0, 0.0, 0.0,

   //fish tail second part
   -0.25, 0.25, 0.0, 1.0,   1.0, 1.0, 1.0,  //front face
   -0.25, -0.25, 0.0, 1.0,  1.0, 0.0, 1.0,
   0.0, -0.25, 0.0, 1.0,    1.0, 0.0, 0.0,

   -0.25, 0.25, 0.0, 1.0,   1.0, 1.0, 1.0,
   0.0, 0.25, 0.0, 1.0,     1.0, 0.0, 1.0,
   0.0, -0.25, 0.0, 1.0,    1.0, 0.0, 0.0,

   -0.25, 0.25, 0.1, 1.0,   1.0, 1.0, 1.0,  //back face
   -0.25, -0.25, 0.1, 1.0,  1.0, 0.0, 1.0,
   0.0, -0.25, 0.1, 1.0,    1.0, 0.0, 0.0,

   -0.25, 0.25, 0.1, 1.0,   1.0, 1.0, 1.0,
   0.0, 0.25, 0.1, 1.0,     1.0, 0.0, 1.0,
   0.0, -0.25, 0.1, 1.0,    1.0, 0.0, 0.0,

   -0.25, 0.25, 0.0, 1.0,   1.0, 1.0, 1.0,  //left side
   -0.25, 0.25, 0.1, 1.0,   1.0, 0.0, 1.0,
   -0.25, -0.25, 0.1, 1.0,   1.0, 0.0, 0.0,

   -0.25, 0.25, 0.0, 1.0,   1.0, 1.0, 1.0,  
   -0.25, -0.25, 0.0, 1.0,   1.0, 1.0, 1.0,
   -0.25, -0.25, 0.1, 1.0,   1.0, 0.0, 0.0,

   0.0, 0.25, 0.0, 1.0,   1.0, 1.0, 1.0,  //right side
   0.0, 0.25, 0.1, 1.0,   1.0, 0.0, 1.0,
   0.0, -0.25, 0.1, 1.0,   1.0, 0.0, 0.0,

   0.0, 0.25, 0.0, 1.0,   1.0, 1.0, 1.0,  
   0.0, -0.25, 0.0, 1.0,   1.0, 1.0, 1.0,
   0.0, -0.25, 0.1, 1.0,   1.0, 0.0, 0.0,

   -0.25, 0.25, 0.1, 1.0,   1.0, 1.0, 1.0,   //top
   -0.25, 0.25, 0.0, 1.0,   1.0, 1.0, 1.0,
   0.0, 0.25, 0.1, 1.0,   1.0, 0.0, 0.0,

   
   0.0, 0.25, 0.0, 1.0,   1.0, 1.0, 1.0, 
   -0.25, 0.25, 0.0, 1.0,   1.0, 1.0, 1.0,
   0.0, 0.25, 0.1, 1.0,   1.0, 0.0, 0.0,

   -0.25, -0.25, 0.1, 1.0,   1.0, 1.0, 1.0,   //bottom
   -0.25, -0.25, 0.0, 1.0,   1.0, 1.0, 1.0,
   0.0, -0.25, 0.1, 1.0,   1.0, 0.0, 0.0,

   0.0, -0.25, 0.0, 1.0,   1.0, 1.0, 1.0, 
   -0.25, -0.25, 0.0, 1.0,   1.0, 1.0, 1.0,
   0.0, -0.25, 0.1, 1.0,   1.0, 0.0, 0.0,

  ]);
  var nn = 204;
	
  // Create a buffer object
  var shapeBufferHandle = gl.createBuffer();  
  if (!shapeBufferHandle) {
    console.log('Failed to create the shape buffer object');
    return false;
  }

  // Bind the the buffer object to target:
  gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);
  // Transfer data from Javascript array colorShapes to Graphics system VBO
  // (Use sparingly--may be slow if you transfer large shapes stored in files)
  gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);

  var FSIZE = colorShapes.BYTES_PER_ELEMENT; // how many bytes per stored value?
  
  // Connect a VBO Attribute to Shaders------------------------------------------
  //Get GPU's handle for our Vertex Shader's position-input variable: 
  var a_PositionLoc = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_PositionLoc < 0) {
    console.log('Failed to get attribute storage location of a_Position');
    return -1;
  }
  // Use handle to specify how to Vertex Shader retrieves position data from VBO:
  gl.vertexAttribPointer(
  		a_PositionLoc, 	// choose Vertex Shader attribute to fill with data
  		4, 						// how many values? 1,2,3 or 4.  (we're using x,y,z,w)
  		gl.FLOAT, 		// data type for each value: usually gl.FLOAT
  		false, 				// did we supply fixed-point data AND it needs normalizing?
  		FSIZE * floatsPerVertex, 		// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  		0);						// Offset -- now many bytes from START of buffer to the
  									// value we will actually use?
  gl.enableVertexAttribArray(a_PositionLoc);  
  									// Enable assignment of vertex buffer object's position data
//-----------done.
// Connect a VBO Attribute to Shaders-------------------------------------------
  // Get graphics system's handle for our Vertex Shader's color-input variable;
  var a_ColorLoc = gl.getAttribLocation(gl.program, 'a_Color');
  if(a_ColorLoc < 0) {
    console.log('Failed to get the attribute storage location of a_Color');
    return -1;
  }
  // Use handle to specify how Vertex Shader retrieves color data from our VBO:
  gl.vertexAttribPointer(
  	a_ColorLoc, 				// choose Vertex Shader attribute to fill with data
  	3, 							// how many values? 1,2,3 or 4. (we're using R,G,B)
  	gl.FLOAT, 			// data type for each value: usually gl.FLOAT
  	false, 					// did we supply fixed-point data AND it needs normalizing?
  	FSIZE * 7, 			// Stride -- how many bytes used to store each vertex?
  									// (x,y,z,w, r,g,b) * bytes/value
  	FSIZE * 4);			// Offset -- how many bytes from START of buffer to the
  									// value we will actually use?  Need to skip over x,y,z,w 									
  gl.enableVertexAttribArray(a_ColorLoc);  
  									// Enable assignment of vertex buffer object's position data
//-----------done.
  // UNBIND the buffer object: we have filled the VBO & connected its attributes
  // to our shader, so no more modifications needed.
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return nn;
}

/*    DRAWING NOTES
      Drawing cuboid 1 (fish fins)
      gl.drawArrays(gl.TRIANGLES, 0, 36);

      Drawing cuboid 2 (seaweed body)
      gl.drawArrays(gl.TRIANGLES, 36, 36);

      Drawing cube (fish body)
      gl.drawArrays(gl.TRIANGLES, 72, 36);

      Drawing spike (seaweed top)
      gl.drawArrays(gl.TRIANGLES, 108, 48);

      Drawing fish tail
      gl.drawArrays(gl.TRIANGLES, 156, 48);
*/

function drawSeaweed(currentAngle, modelMatrix, u_ModelLoc, x_coord) {
  //==============================================================================  
    //-------Draw Spinning Tetrahedron
    modelMatrix.setTranslate(x_coord , -1.0 , 0.0);  // 'set' means DISCARD old matrix,
                // (drawing axes centered in CVV), and then make new
                // drawing axes moved to the lower-left corner of CVV. 
    modelMatrix.scale(0.5, 0.5, 0.5);
                // if you DON'T scale, tetra goes outside the CVV; clipped!
    modelMatrix.rotate(currentAngle, 0, 1, 0);  // Make new drawing axes that
   //modelMatrix.rotate(20.0, 0,1,0);
                // that spin around y axis (0,1,0) of the previous 
                // drawing axes, using the same origin.
    modelMatrix.translate(-0.1, 0, -0.1);

    //modelMatrix.rotate(waveAngle * 0.25, 0, 0, 1);  
    // DRAW TETRA:  Use this matrix to transform & draw 
    //						the first set of vertices stored in our VBO:
        // Pass our current matrix to the vertex shaders:
    gl.uniformMatrix4fv(u_ModelLoc, false, modelMatrix.elements);
        // Draw just the first set of vertices: start at vertex 0...
    gl.drawArrays(gl.TRIANGLES, 36, 36);
  
    modelMatrix.translate(0.025 , 0.5 , 0.025);
    modelMatrix.scale(0.8, 0.8, 0.8);
    modelMatrix.rotate(-currentAngle * 2, 0, 1, 0);  
    modelMatrix.translate(-0.1, 0, -0.1);
    gl.uniformMatrix4fv(u_ModelLoc, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, 36, 36);

    modelMatrix.translate(0.025 , 0.5 , 0.025);
    modelMatrix.scale(0.8, 0.8, 0.8);
    modelMatrix.rotate(currentAngle * 2, 0, 1, 0);  
    modelMatrix.translate(-0.1, 0, -0.1);
    gl.uniformMatrix4fv(u_ModelLoc, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, 36, 36);

    modelMatrix.translate(0.025 , 0.5 , 0.025);
    modelMatrix.scale(0.8, 0.8, 0.8);
    modelMatrix.rotate(-currentAngle * 2, 0, 1, 0);  
    modelMatrix.translate(-0.1, 0, -0.1);
    gl.uniformMatrix4fv(u_ModelLoc, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, 108, 48);
}

function drawTurningFish(currentAngle, tailAngle, finAngle, modelMatrix, u_ModelLoc, x_coord, y_coord) {
  //body
  modelMatrix.setTranslate(x_coord , y_coord, 0.0);
  modelMatrix.scale(0.5, 0.5, 0.5);
  modelMatrix.rotate(currentAngle, 0, 1, 0);
  gl.uniformMatrix4fv(u_ModelLoc, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 72, 36);

  //tail
  modelMatrix.translate(0.5, 0.0, 0.125);
  modelMatrix.translate(-0.0625, 0, -0.125);
  pushMatrix(modelMatrix);
    modelMatrix.translate(-0.25, 0, 0);
    modelMatrix.rotate(-tailAngle, 0, 1, 0);
    modelMatrix.translate(0.25, 0, 0);
    gl.uniformMatrix4fv(u_ModelLoc, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, 156, 48);
  
    modelMatrix.scale(0.5, 0.5, 0.5);
    modelMatrix.translate(0.25, 0.25, 0);
    modelMatrix.translate(-0.25, 0, 0);
    modelMatrix.rotate(-1.2 * tailAngle, 0, 1, 0);
    modelMatrix.translate(0.25, 0, 0);
    gl.uniformMatrix4fv(u_ModelLoc, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, 204, 36);

    modelMatrix.translate(0, -0.5, 0);
    modelMatrix.translate(-0.25, 0, 0);
    //modelMatrix.rotate(-tailAngle, 0, 1, 0);
    modelMatrix.translate(0.25, 0, 0);
    gl.uniformMatrix4fv(u_ModelLoc, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, 204, 36);

  //fins
  modelMatrix = popMatrix();
  modelMatrix.translate(-0.5, - 0.15, -0.376);
  modelMatrix.scale(0.5, 0.5, 0.5);
  pushMatrix(modelMatrix);
    modelMatrix.rotate(-finAngle, 0, 0, 1);
    gl.uniformMatrix4fv(u_ModelLoc, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, 0, 36);

  modelMatrix = popMatrix();
  modelMatrix.translate(0, 0, 1);
  pushMatrix(modelMatrix);
    modelMatrix.rotate(-finAngle, 0, 0, 1);
    gl.uniformMatrix4fv(u_ModelLoc, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, 0, 36);
  modelMatrix = popMatrix();
}

function drawTinyFish(tailAngle, finAngle, modelMatrix, u_ModelLoc, x_coord, y_coord) {
  var dist = Math.sqrt(g_xMdragTot*g_xMdragTot + g_yMdragTot*g_yMdragTot);
  //body
  modelMatrix.setTranslate(x_coord , y_coord, -0.8);
  modelMatrix.scale(0.3, 0.3, 0.3);
  modelMatrix.rotate(dist*120.0, -g_yMdragTot+0.0001, g_xMdragTot+0.0001, 0.0);
  gl.uniformMatrix4fv(u_ModelLoc, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 72, 36);

  //tail
  modelMatrix.translate(0.5, 0.0, 0.125);
  modelMatrix.translate(-0.0625, 0, -0.125);
  pushMatrix(modelMatrix);
    modelMatrix.translate(-0.25, 0, 0);
    modelMatrix.rotate(-tailAngle, 0, 1, 0);
    modelMatrix.translate(0.25, 0, 0);
    gl.uniformMatrix4fv(u_ModelLoc, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, 156, 48);
  
    modelMatrix.scale(0.5, 0.5, 0.5);
    modelMatrix.translate(0.25, 0.25, 0);
    modelMatrix.translate(-0.25, 0, 0);
    modelMatrix.rotate(-1.2 * tailAngle, 0, 1, 0);
    modelMatrix.translate(0.25, 0, 0);
    gl.uniformMatrix4fv(u_ModelLoc, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, 204, 36);

    modelMatrix.translate(0, -0.5, 0);
    modelMatrix.translate(-0.25, 0, 0);
    //modelMatrix.rotate(-tailAngle, 0, 1, 0);
    modelMatrix.translate(0.25, 0, 0);
    gl.uniformMatrix4fv(u_ModelLoc, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, 204, 36);

  //fins
  modelMatrix = popMatrix();
  modelMatrix.translate(-0.5, - 0.15, -0.376);
  modelMatrix.scale(0.3, 0.3, 0.3);
  pushMatrix(modelMatrix);
    modelMatrix.rotate(-finAngle, 0, 0, 1);
    gl.uniformMatrix4fv(u_ModelLoc, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, 0, 36);

  modelMatrix = popMatrix();
  modelMatrix.translate(0, 0, 2);
  pushMatrix(modelMatrix);
    modelMatrix.rotate(-finAngle, 0, 0, 1);
    gl.uniformMatrix4fv(u_ModelLoc, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, 0, 36);
  modelMatrix = popMatrix();
}

function drawTinyOppFish(tailAngle, finAngle, modelMatrix, u_ModelLoc, x_coord, y_coord) {
  var dist = Math.sqrt(g_xMdragTot*g_xMdragTot + g_yMdragTot*g_yMdragTot);
  //body
  modelMatrix.setTranslate(x_coord , y_coord, -0.8);
  modelMatrix.scale(0.3, 0.3, 0.3);
  modelMatrix.rotate(-dist*120.0, -g_yMdragTot+0.0001, g_xMdragTot+0.0001, 0.0);
  gl.uniformMatrix4fv(u_ModelLoc, false, modelMatrix.elements);
  gl.drawArrays(gl.TRIANGLES, 72, 36);

  //tail
  modelMatrix.translate(0.5, 0.0, 0.125);
  modelMatrix.translate(-0.0625, 0, -0.125);
  pushMatrix(modelMatrix);
    modelMatrix.translate(-0.25, 0, 0);
    modelMatrix.rotate(-tailAngle, 0, 1, 0);
    modelMatrix.translate(0.25, 0, 0);
    gl.uniformMatrix4fv(u_ModelLoc, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, 156, 48);

  //fins
  modelMatrix = popMatrix();
  modelMatrix.translate(-0.5, - 0.15, -0.376);
  modelMatrix.scale(0.3, 0.3, 0.3);
  pushMatrix(modelMatrix);
    modelMatrix.rotate(-finAngle, 0, 0, 1);
    gl.uniformMatrix4fv(u_ModelLoc, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, 0, 36);

  modelMatrix = popMatrix();
  modelMatrix.translate(0, 0, 2);
  pushMatrix(modelMatrix);
    modelMatrix.rotate(-finAngle, 0, 0, 1);
    gl.uniformMatrix4fv(u_ModelLoc, false, modelMatrix.elements);
    gl.drawArrays(gl.TRIANGLES, 0, 36);
  modelMatrix = popMatrix();
}

function draw(currentX, currentY, modelMatrix, u_ModelLoc) {
//==============================================================================
  // Clear <canvas>  colors AND the depth buffer
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  drawSeaweed(currentAngle, modelMatrix, u_ModelLoc, -0.9);
  drawSeaweed(-currentAngle, modelMatrix, u_ModelLoc, -0.6);
  drawSeaweed(currentAngle, modelMatrix, u_ModelLoc, -0.3);
  drawSeaweed(-currentAngle, modelMatrix, u_ModelLoc, 0);
  drawSeaweed(currentAngle, modelMatrix, u_ModelLoc, 0.3);
  drawSeaweed(-currentAngle, modelMatrix, u_ModelLoc, 0.6);
  drawSeaweed(currentAngle, modelMatrix, u_ModelLoc, 0.9);
  drawTurningFish(currentAngle2, currentAngle3, currentAngle4, modelMatrix, u_ModelLoc, currentX, currentY);  
  //drawTinyOppFish(currentAngle3, currentAngle4, modelMatrix, u_ModelLoc, 0, -0.7); 
  //drawTinyFish(currentAngle3, currentAngle4, modelMatrix, u_ModelLoc, -0.6, -0.3); 
  //drawTinyFish(currentAngle3, currentAngle4, modelMatrix, u_ModelLoc, 0.6, -0.4); 
}
// Last time that this function was called:  (used for animation timing)
var g_last = Date.now();

function animate() {
//==============================================================================
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;
  
  // Update the current rotation angle (adjusted by the elapsed time)
  //  limit the angle to move smoothly between +20 and -85 degrees:
//  if(angle >  120.0 && ANGLE_STEP > 0) ANGLE_STEP = -ANGLE_STEP;
//  if(angle < -120.0 && ANGLE_STEP < 0) ANGLE_STEP = -ANGLE_STEP;
  if(currentAngle3 >   50.0 && tail_STEP > 0) tail_STEP = -tail_STEP;
  if(currentAngle3 <  -50.0 && tail_STEP < 0) tail_STEP = -tail_STEP;

  if(currentAngle4 >   40.0 && fin_STEP > 0) fin_STEP = -fin_STEP;
  if(currentAngle4 <  -40.0 && fin_STEP < 0) fin_STEP = -fin_STEP;

  currentAngle = (currentAngle + (ANGLE_STEP * elapsed) / 1000.0);
  currentAngle2 = (currentAngle2 + (55.0 * elapsed) / 1000.0);
  currentAngle3 = (currentAngle3 + (tail_STEP * elapsed) / 1000.0);
  currentAngle4 = (currentAngle4 + (fin_STEP * elapsed) / 1000.0);
}

//==================HTML Button Callbacks
function spinUp() {
  ANGLE_STEP += 25; 
}

function spinDown() {
 ANGLE_STEP -= 25; 
}

function runStop() {
  if(ANGLE_STEP*ANGLE_STEP > 1) {
    myTmp = ANGLE_STEP;
    ANGLE_STEP = 0;
  }
  else {
  	ANGLE_STEP = myTmp;
  }
}
 

function animateX(x_coord) {
  //==============================================================================
  if (x_coord > 0.8 && x_STEP > 0) x_STEP = -x_STEP;
  if(x_coord < -0.8 && x_STEP < 0) x_STEP = -x_STEP;

  var newX = x_coord + x_STEP;
  return newX;
  }

  
function animateY(y_coord) {
  //==============================================================================
  if (y_coord > 0.7 && y_STEP > 0) y_STEP = -y_STEP;
  if(y_coord < 0 && y_STEP < 0) y_STEP = -y_STEP;

  var newY = y_coord + y_STEP;
  return newY;
  }



  //===================Mouse and Keyboard event-handling Callbacks

function myMouseDown(ev) {
  //==============================================================================
  // Called when user PRESSES down any mouse button;
  // 									(Which button?    console.log('ev.button='+ev.button);   )
  // 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
  //		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  
  
  // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
    var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
    var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
    var yp = myCanvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
  //  console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);
    
    // Convert to Canonical View Volume (CVV) coordinates too:
    var x = (xp - myCanvas.width/2)  / 		// move origin to center of canvas and
                 (myCanvas.width/2);			// normalize canvas to -1 <= x < +1,
    var y = (yp - myCanvas.height/2) /		//										 -1 <= y < +1.
                 (myCanvas.height/2);
    
    g_isDrag = true;											// set our mouse-dragging flag
    g_xMclik = x;													// record where mouse-dragging began
    g_yMclik = y;
  };
  
  
  function myMouseMove(ev) {
  //==============================================================================
  // Called when user MOVES the mouse with a button already pressed down.
  // 									(Which button?   console.log('ev.button='+ev.button);    )
  // 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
  //		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  
  
    if(g_isDrag==false) return;				// IGNORE all mouse-moves except 'dragging'
  
    // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
    var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
    var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
    var yp = myCanvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
  //  console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);
    
    // Convert to Canonical View Volume (CVV) coordinates too:
    var x = (xp - myCanvas.width/2)  / 		// move origin to center of canvas and
                 (myCanvas.width/2);		// normalize canvas to -1 <= x < +1,
    var y = (yp - myCanvas.height/2) /		//									-1 <= y < +1.
                 (myCanvas.height/2);
  //	console.log('myMouseMove(CVV coords  ):  x, y=\t',x,',\t',y);
  
    // find how far we dragged the mouse:
    g_xMdragTot += (x - g_xMclik);			// Accumulate change-in-mouse-position,&
    g_yMdragTot += (y - g_yMclik);
    // Report new mouse position & how far we moved on webpage:
  
    g_xMclik = x;											// Make next drag-measurement from here.
    g_yMclik = y;
  };
  
  function myMouseUp(ev) {
  //==============================================================================
  // Called when user RELEASES mouse button pressed previously.
  // 									(Which button?   console.log('ev.button='+ev.button);    )
  // 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
  //		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  
  
  // Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
    var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
    var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
    var yp = myCanvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
  //  console.log('myMouseUp  (pixel coords):\n\t xp,yp=\t',xp,',\t',yp);
    
    // Convert to Canonical View Volume (CVV) coordinates too:
    var x = (xp - myCanvas.width/2)  / 		// move origin to center of canvas and
                 (myCanvas.width/2);			// normalize canvas to -1 <= x < +1,
    var y = (yp - myCanvas.height/2) /		//										 -1 <= y < +1.
                 (myCanvas.height/2);
    console.log('myMouseUp  (CVV coords  ):\n\t x, y=\t',x,',\t',y);
    
    g_isDrag = false;											// CLEAR our mouse-dragging flag, and
    // accumulate any final bit of mouse-dragging we did:
    g_xMdragTot += (x - g_xMclik);
    g_yMdragTot += (y - g_yMclik);
    // Report new mouse position:
    console.log('myMouseUp: g_xMdragTot,g_yMdragTot =',
      g_xMdragTot.toFixed(g_digits),',\t',g_yMdragTot.toFixed(g_digits));
  };
  
  function myMouseClick(ev) {
  //=============================================================================
  // Called when user completes a mouse-button single-click event 
  // (e.g. mouse-button pressed down, then released)
  // 									   
  //    WHICH button? try:  console.log('ev.button='+ev.button); 
  // 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
  //		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!) 
  //    See myMouseUp(), myMouseDown() for conversions to  CVV coordinates.
  
    // STUB
    console.log("myMouseClick() on button: ", ev.button); 
  }	
  
  
  function myKeyDown(kev) {
  //===============================================================================
  // Called when user presses down ANY key on the keyboard;
  //
  // For a light, easy explanation of keyboard events in JavaScript,
  // see:    http://www.kirupa.com/html5/keyboard_events_in_javascript.htm
  // For a thorough explanation of a mess of JavaScript keyboard event handling,
  // see:    http://javascript.info/tutorial/keyboard-events
  //
  // NOTE: Mozilla deprecated the 'keypress' event entirely, and in the
  //        'keydown' event deprecated several read-only properties I used
  //        previously, including kev.charCode, kev.keyCode. 
  //        Revised 2/2019:  use kev.key and kev.code instead.
  //
  // Report EVERYTHING in console:
    console.log(  "--kev.code:",    kev.code,   "\t\t--kev.key:",     kev.key, 
                "\n--kev.ctrlKey:", kev.ctrlKey,  "\t--kev.shiftKey:",kev.shiftKey,
                "\n--kev.altKey:",  kev.altKey,   "\t--kev.metaKey:", kev.metaKey);
  
    switch(kev.code) {
      case "KeyP":
        console.log("Pause/unPause!\n");                // print on console,
        runStop();        
        break;
      //----------------Arrow keys------------------------
      case "ArrowRight":		
        console.log('   right-arrow.');
        spinUp();
        break;
      case "ArrowLeft":
        console.log(' left-arrow.');
        spinDown();
        break;	
    }
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
	gndVerts = new Float32Array(floatsPerVertex*2*(xcount+ycount));
						// draw a grid made of xcount+ycount lines; 2 vertices per line.
						
	var xgap = xymax/(xcount-1);		// HALF-spacing between lines in x,y;
	var ygap = xymax/(ycount-1);		// (why half? because v==(0line number/2))
	
	// First, step thru x values as we make vertical lines of constant-x:
	for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
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
	for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
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
