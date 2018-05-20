import vertexShaderSource from 'shaders/vertex';
import fragmentShaderSource from 'shaders/fragment';

type ShaderType = number;
type BufferHint = number;

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

	const attributes = [
		{
			identifier: 'position',
			type: 'vec2',
			buffer: createBuffer(
				gl,
				new Float32Array([
					-1, -1,
					1, -1,
					-1, 1,
					-1, 1,
					1, -1,
					1, 1
				]),
				gl.STATIC_DRAW)
		},
		{
			identifier: 'a_texCoord',
			type: 'vec2',
			buffer: createBuffer(
				gl,
				new Float32Array([
					0, 0,
					1, 0,
					0, 1,
					0, 1,
					1, 0,
					1, 1,
				]),
				gl.STATIC_DRAW)
		},
	]
		.map(({ identifier, buffer, type }) => ({
			[identifier]: {
				location: gl.getAttribLocation(program, identifier),
				buffer,
				type: type as AttributeType
			}
		}))
		.reduce((acc, elm) => Object.assign(acc, elm), {});

	gl.useProgram(program);

	Object.keys(attributes)
		.forEach(iden => gl.enableVertexAttribArray(attributes[iden].location));

	bindVertexAttribute(gl, attributes['position'], false);
	bindVertexAttribute(gl, attributes['a_texCoord'], false);

	const primitiveType = gl.TRIANGLES;
	const drawOffset = 0;
	const drawCount = 6;
	gl.drawArrays(primitiveType, drawOffset, drawCount);
}

function createProgram(gl: WebGLRenderingContext, shaders: WebGLShader[]): WebGLProgram {
	const program = gl.createProgram();
	shaders.forEach(shader => gl.attachShader(program, shader));
	gl.linkProgram(program);
	if (gl.getProgramParameter(program, gl.LINK_STATUS) && program != null) {
		return program;
	} else {
		const infoLog = gl.getProgramInfoLog(program) as string;
		gl.deleteProgram(program);
		throw new Error(infoLog);
	}
}

function createShader(gl: WebGLRenderingContext, type: ShaderType, source: string): WebGLShader {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) && shader != null) {
		return shader;
	} else {
		const infoLog = gl.getShaderInfoLog(shader) as string;
		gl.deleteShader(shader);
		throw new Error(infoLog);
	}
}

// https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
function resize(canvas: HTMLCanvasElement) {
	var realToCSSPixels = window.devicePixelRatio;

	// Lookup the size the browser is displaying the canvas in CSS pixels
	// and compute a size needed to make our drawingbuffer match it in
	// device pixels.
	const displayWidth =
		Math.floor(canvas.clientWidth * realToCSSPixels);
	const displayHeight =
		Math.floor(canvas.clientHeight * realToCSSPixels);

	// Check if the canvas is not the same size.
	if (canvas.width !== displayWidth ||
		canvas.height !== displayHeight) {

		// Make the canvas the same size
		canvas.width = displayWidth;
		canvas.height = displayHeight;
	}
}

type BufferData = Float32Array;
function createBuffer(gl: WebGLRenderingContext, data: BufferData, hint: BufferHint): WebGLBuffer {
	const buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, data, hint);

	if (buffer == null) {
		throw new Error("Failed to create buffer");
	}
	return buffer;
}

type AttributeType = 'vec2';
function bindVertexAttribute(
	gl: WebGLRenderingContext,
	attribute: {
		buffer: WebGLBuffer,
		location: number,
		type: AttributeType
	},
	normalize: boolean
) {
	if (attribute.type !== 'vec2') {
		throw new Error("Unsupported attribute type");
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, attribute.buffer);
	gl.vertexAttribPointer(attribute.location, 2, gl.FLOAT, normalize, 0, 0);
}

