import vertexShaderSource from 'shaders/vertex';
import fragmentShaderSource from 'shaders/fragment';

console.log(vertexShaderSource, fragmentShaderSource);

/*
export function render(gl: WebGLRenderingContext) {
	resize(gl.canvas);
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	const vertexShader =
		createShader(
			gl,
			gl.VERTEX_SHADER,
			vertexShaderSource);

	const fragmentShader =
		createShader(
			gl,
			gl.FRAGMENT_SHADER,
			fragmentShaderSource);

	const program =
		createProgram(gl, [vertexShader, fragmentShader]);
}

function createProgram(gl, shaders) {
	const program = gl.createProgram();
	shaders.forEach(shader => gl.attachShader(program, shader));
	gl.linkProgram(program);
	if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
		return program;
	} else {
		console.log(gl.getProgramInfoLog(program));
		gl.deleteProgram(program);
	}
}

function createShader(gl, type, source) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		return shader;
	} else {
		console.log(gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return null;
	}
}

// https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
function resize(canvas) {
	var realToCSSPixels = window.devicePixelRatio;

	// Lookup the size the browser is displaying the canvas in CSS pixels
	// and compute a size needed to make our drawingbuffer match it in
	// device pixels.
	var displayWidth =
		Math.floor(canvas.clientWidth * realToCSSPixels);
	var displayHeight =
		Math.floor(canvas.clientHeight * realToCSSPixels);

	// Check if the canvas is not the same size.
	if (canvas.width !== displayWidth ||
		canvas.height !== displayHeight) {

		// Make the canvas the same size
		canvas.width = displayWidth;
		canvas.height = displayHeight;
	}
}
*/

export function render(gl: WebGLRenderingContext) {
}
