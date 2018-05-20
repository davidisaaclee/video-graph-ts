import vertexShaderSource from 'shaders/vertex';
import fragmentShaderSource from 'shaders/fragment';
import { AttributeType } from 'utility/glTypes';
import {
	createProgram, createShader, createBuffer, bindVertexAttribute
} from 'utility/glHelpers';
import { resizeCanvas } from 'utility/resizeCanvas';


export function render(gl: WebGLRenderingContext) {
	resizeCanvas(gl.canvas);
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

	function bindAttribute(attribute: {
		buffer: WebGLBuffer,
		location: number,
		type: AttributeType
	}) {
		gl.enableVertexAttribArray(attribute.location)
		bindVertexAttribute(
			gl,
			attribute.buffer,
			attribute.location,
			attribute.type,
			false);
	}

	Object.keys(attributes)
		.forEach(iden => bindAttribute(attributes[iden]));

	const primitiveType = gl.TRIANGLES;
	const drawOffset = 0;
	const drawCount = 6;
	gl.drawArrays(primitiveType, drawOffset, drawCount);
}

