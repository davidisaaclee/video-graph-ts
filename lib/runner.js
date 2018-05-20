'use strict';

function glsl(literals, ...placeholders) {
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

console.log(vertexShaderSource, fragmentShaderSource);

const stage = document.getElementById("stage");
const gl = stage.getContext('webgl');
if (gl == null) {
    throw new Error("WebGL not supported");
}
