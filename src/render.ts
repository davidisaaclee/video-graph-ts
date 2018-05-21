import vertexShaderSource from 'shaders/vertex';
import fragmentShaderSource from 'shaders/oscillator';
import invertShaderSource from 'shaders/invertRGB';
import { AttributeType, BufferData } from 'utility/glTypes';
import {
	createProgram, createShader, createBuffer, bindVertexAttribute
} from 'utility/glHelpers';
import { resizeCanvas } from 'utility/resizeCanvas';



export function render(gl: WebGLRenderingContext) {
	resizeCanvas(gl.canvas);
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	const pixelShaderProgramAttributes = [
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
	] as AttributeSpecification[];

	
	const startProgram = createProgramWithFragmentShader(gl, fragmentShaderSource);
	const startProgramAttributes =
		buildAttributesDictionary(gl, pixelShaderProgramAttributes, startProgram);
	activateProgram(
		gl,
		startProgram,
		startProgramAttributes,
		{});


	const renderTexture = createAndSetupTexture(gl);

	gl.bindTexture(
		gl.TEXTURE_2D,
		renderTexture);
	gl.texImage2D(
		gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0,
		gl.RGBA, gl.UNSIGNED_BYTE, null);

	const framebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	gl.framebufferTexture2D(
		gl.FRAMEBUFFER,
		gl.COLOR_ATTACHMENT0,
		gl.TEXTURE_2D,
		renderTexture,
		0);


	// Set texture-targeted framebuffer.
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);


	const primitiveType = gl.TRIANGLES;
	const drawOffset = 0;
	const drawCount = 6;
	gl.drawArrays(primitiveType, drawOffset, drawCount);
	

	const invertProgram = createProgramWithFragmentShader(gl, invertShaderSource);
	const invertProgramAttributes =
		buildAttributesDictionary(
			gl,
			pixelShaderProgramAttributes,
			invertProgram);
	activateProgram(
		gl,
		invertProgram,
		invertProgramAttributes,
		buildUniformsDictionary(
			gl,
			[
				{
					identifier: 'inputTextureDimensions',
					value: [gl.canvas.width, gl.canvas.height]
				},
				{
					identifier: 'inputTexture',
					value: renderTexture
				}
			],
			invertProgram));

	// this should set the sampler2D uniform, i think
	gl.bindTexture(gl.TEXTURE_2D, renderTexture);


	// draw to canvas
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);


	gl.drawArrays(primitiveType, drawOffset, drawCount);

}

function createAndSetupTexture(gl: WebGLRenderingContext): WebGLTexture {
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);

	// Set up texture so we can render any size image and so we are
	// working with pixels.
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	if (texture == null) {
		throw new Error("Failed to create texture");
	}

	return texture;
}

interface AttributeData {
	location: number;
	buffer: WebGLBuffer;
	type: AttributeType;
};

type AttributeDictionary = { [identifier: string]: AttributeData };

function createProgramWithFragmentShader(
	gl: WebGLRenderingContext,
	fragmentShaderSource: string
): WebGLProgram  {
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

	return createProgram(gl, [vertexShader, fragmentShader]);
}

interface AttributeSpecification {
	identifier: string;
	type: AttributeType;
	buffer: WebGLBuffer
}

function buildAttributesDictionary(
	gl: WebGLRenderingContext,
	attributeSpecifications: AttributeSpecification[],
	program: WebGLProgram
): AttributeDictionary {
	return attributeSpecifications
		.map(({ identifier, buffer, type }) => ({
			[identifier]: {
				location: gl.getAttribLocation(program, identifier),
				buffer,
				type: type as AttributeType
			}
		}))
		.reduce((acc, elm) => Object.assign(acc, elm), {});
}

type UniformValue
	= number
	| number[]
	| WebGLTexture
	;

interface UniformSpecification {
	identifier: string;
	value: UniformValue;
}

interface UniformData {
	location: WebGLUniformLocation;
	value: UniformValue;
}

function buildUniformsDictionary(
	gl: WebGLRenderingContext,
	uniformSpecifications: UniformSpecification[],
	program: WebGLProgram
): { [iden: string]: UniformData } {
	return uniformSpecifications
		.map(spec => {
			const location = gl.getUniformLocation(program, spec.identifier);
			if (location == null) {
				throw new Error("Invalid uniform");
			}

			return {
				[spec.identifier]: {
					location,
					value: spec.value
				}
			};
		})
		.reduce((acc, elm) => Object.assign(acc, elm), {});
}


function activateProgram(
	gl: WebGLRenderingContext,
	program: WebGLProgram,
	attributes: AttributeDictionary,
	uniforms: { [iden: string]: UniformData }
) {
	gl.useProgram(program);

	Object.keys(attributes)
		.map(iden => attributes[iden])
		.forEach(attribute => {
			gl.enableVertexAttribArray(attribute.location)
			bindVertexAttribute(
				gl,
				attribute.buffer,
				attribute.location,
				attribute.type,
				false);
		});

	let numberOfBoundTextures = 0;
	Object.keys(uniforms)
		.map(iden => uniforms[iden])
		.forEach(uniform => {
			if (typeof uniform.value === 'number') {
				gl.uniform1f(uniform.location, uniform.value);
			} else if (uniform.value instanceof WebGLTexture) {
				gl.activeTexture(gl.TEXTURE0 + numberOfBoundTextures);
				gl.bindTexture(gl.TEXTURE_2D, uniform.value);
				gl.uniform1i(uniform.location, numberOfBoundTextures);

				numberOfBoundTextures++;
			} else if (uniform.value instanceof Array) {
				if (uniform.value.length === 2) {
					gl.uniform2f(uniform.location, uniform.value[0], uniform.value[1]);
				} else {
					throw new Error("Unsupported vector length");
				}
			}
		});
}


