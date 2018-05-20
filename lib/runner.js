'use strict';

function glsl(literals) {
    return literals.join('');
}

var vertexShaderSource = glsl `
	attribute vec2 position;
	attribute vec2 a_texCoord;

	varying vec2 v_texCoord;

	void main() {
		gl_Position = vec4(position, 0, 1);
		v_texCoord = a_texCoord;
	}
`;

var fragmentShaderSource = glsl `
	precision mediump float;

	varying vec2 v_texCoord;

	void main() {
		gl_FragColor = vec4(
				vec3(gl_FragCoord.x / 800.),
				1);
	}
`;

function render(gl) {
    resize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createProgram(gl, [vertexShader, fragmentShader]);
    const attributes = [
        {
            identifier: 'position',
            type: 'vec2',
            buffer: createBuffer(gl, new Float32Array([
                -1, -1,
                1, -1,
                -1, 1,
                -1, 1,
                1, -1,
                1, 1
            ]), gl.STATIC_DRAW)
        },
        {
            identifier: 'a_texCoord',
            type: 'vec2',
            buffer: createBuffer(gl, new Float32Array([
                0, 0,
                1, 0,
                0, 1,
                0, 1,
                1, 0,
                1, 1,
            ]), gl.STATIC_DRAW)
        },
    ]
        .map(({ identifier, buffer, type }) => ({
        [identifier]: {
            location: gl.getAttribLocation(program, identifier),
            buffer,
            type: type
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
function createProgram(gl, shaders) {
    const program = gl.createProgram();
    shaders.forEach(shader => gl.attachShader(program, shader));
    gl.linkProgram(program);
    if (gl.getProgramParameter(program, gl.LINK_STATUS) && program != null) {
        return program;
    }
    else {
        const infoLog = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error(infoLog);
    }
}
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) && shader != null) {
        return shader;
    }
    else {
        const infoLog = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(infoLog);
    }
}
// https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
function resize(canvas) {
    var realToCSSPixels = window.devicePixelRatio;
    // Lookup the size the browser is displaying the canvas in CSS pixels
    // and compute a size needed to make our drawingbuffer match it in
    // device pixels.
    const displayWidth = Math.floor(canvas.clientWidth * realToCSSPixels);
    const displayHeight = Math.floor(canvas.clientHeight * realToCSSPixels);
    // Check if the canvas is not the same size.
    if (canvas.width !== displayWidth ||
        canvas.height !== displayHeight) {
        // Make the canvas the same size
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }
}
function createBuffer(gl, data, hint) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, hint);
    if (buffer == null) {
        throw new Error("Failed to create buffer");
    }
    return buffer;
}
function bindVertexAttribute(gl, attribute, normalize) {
    if (attribute.type !== 'vec2') {
        throw new Error("Unsupported attribute type");
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, attribute.buffer);
    gl.vertexAttribPointer(attribute.location, 2, gl.FLOAT, normalize, 0, 0);
}

const stage = document.getElementById("stage");
const gl = stage.getContext('webgl');
if (gl == null) {
    throw new Error("WebGL not supported");
}
render(gl);
