import {
	AttributeType, BufferData,
	UniformData, UniformSpecification, UniformValue
} from './utility/glTypes';
import { createBuffer, bindVertexAttribute } from './utility/glHelpers';
import { resizeCanvas } from './utility/resizeCanvas';
import {
	Graph, resolveDependencies, edgesWithSource,
	allNodes, nodeForKey,
} from '@davidisaaclee/graph';
import { indexBy } from './utility/indexBy';
import { mapValues } from './utility/mapValues';
import { VideoGraph } from './model/VideoGraph';

let pixelShaderProgramAttributes: AttributeSpecification[] | null = null;
export function setup(gl: WebGLRenderingContext) {
	resizeCanvas(gl.canvas);

	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	pixelShaderProgramAttributes = [
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
}

export type RenderCache = {
	textures: { [iden: string]: WebGLTexture },
	framebuffers: { [iden: string]: WebGLFramebuffer | null },
};

export function renderGraph(
	gl: WebGLRenderingContext,
	graph: VideoGraph,
	runtimeUniforms: { [nodeKey: string]: { [iden: string]: UniformSpecification } },
	outputNodeKey: string,
	readCache: RenderCache,
	// mutated in-place
	writeCache: RenderCache = readCache,
) {
	// Clear the canvas AND the depth buffer.
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	const allVideoNodes = allNodes(graph);

	// Create empty textures for nodes that don't have textures yet.
	// NOTE: this iterates through nodes that we don't need to make textures for
	readCache.textures = Object.keys(allVideoNodes)
		.map(nodeKey => ({ [nodeKey]: readCache.textures[nodeKey] || createAndSetupTexture(gl) }))
		.reduce((acc, elm) => Object.assign(acc, elm), {});
	writeCache.textures = Object.keys(allVideoNodes)
		.map(nodeKey => {
			const existingTexture = writeCache.textures[nodeKey];
			if (existingTexture != null) {
				// Use the existing texture;
				// but update the dimensions to account for window change.
				gl.bindTexture(gl.TEXTURE_2D, existingTexture);
				gl.texImage2D(
					gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0,
					gl.RGBA, gl.UNSIGNED_BYTE, null);
				return { [nodeKey]: existingTexture };
			} else {
				return { [nodeKey]: createAndSetupTexture(gl) };
			}
		})
		.reduce((acc, elm) => Object.assign(acc, elm), {});

	// Create framebuffers targeting each texture in the write cache.
	writeCache.framebuffers = Object.keys(writeCache.textures)
		.map(nodeKey => {
			// For the output node, don't use a framebuffer; just draw directly to canvas.
			// (Encode this as a null framebuffer.)
			if (nodeKey === outputNodeKey) {
				return { [nodeKey]: null };
			}

			// If there's already a framebuffer, don't make a new one.
			if (writeCache.framebuffers[nodeKey] != null) {
				return { [nodeKey]: writeCache.framebuffers[nodeKey] };
			}

			const framebuffer = gl.createFramebuffer();
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
			gl.framebufferTexture2D(
				gl.FRAMEBUFFER,
				gl.COLOR_ATTACHMENT0,
				gl.TEXTURE_2D,
				writeCache.textures[nodeKey],
				0);

			return { [nodeKey]: framebuffer };
		})
		.reduce((acc, elm) => Object.assign(acc, elm), {});
	const steps = resolveDependencies(graph, outputNodeKey);

	for (const step of steps) {
		const {
			program, uniforms: constantUniforms,
		} = nodeForKey(graph, step.nodeKey)!;

		const attributes =
			buildAttributesDictionary(
				gl,
				pixelShaderProgramAttributes == null ? [] : pixelShaderProgramAttributes,
				program);

		const edges = edgesWithSource(step.nodeKey, graph);
		const textureUniforms = Object.keys(edges)
			.map(key => edges[key])
			.map(({ dst, metadata }) => {
				return {
					identifier: metadata.uniformIdentifier,
					value: {
						type: 'texture',
						data: readCache.textures[dst]
					}
				};
			})

		if (textureUniforms.length > 0) {
			// TODO: Allow shaders to specify custom uniform for specifying dimensions of input texture.
			// also to specify actual dimensions of textures
			textureUniforms.push({
				identifier: 'inputTextureDimensions',
				value: { type: '2f', data: [gl.canvas.width, gl.canvas.height] }
			});
		}

		const uniforms = Object.assign(
			{},
			constantUniforms == null ? {} : constantUniforms,
			indexBy(s => s.identifier, textureUniforms),
			runtimeUniforms[step.nodeKey] == null
				? {}
				: runtimeUniforms[step.nodeKey]
		);

		drawWithSpecs(
			gl,
			program,
			pixelShaderProgramAttributes == null ? [] : pixelShaderProgramAttributes,
			uniforms,
			writeCache.framebuffers[step.nodeKey]
		);
	}

	
	function draw(framebuffer: WebGLFramebuffer | null) {
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		// gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

		const primitiveType = gl.TRIANGLES;
		const drawOffset = 0;
		const drawCount = 6;
		gl.drawArrays(primitiveType, drawOffset, drawCount);
	}

	function drawWithSpecs(
		gl: WebGLRenderingContext,
		program: WebGLProgram,
		attributes: Array<AttributeSpecification>,
		uniforms: { [iden: string]: UniformSpecification },
		outputFramebuffer: WebGLFramebuffer | null
	) {
		return drawWith(
			program,
			buildAttributesDictionary(
				gl,
				attributes,
				program),
			buildUniformsDictionary(
				gl,
				uniforms,
				program),
			outputFramebuffer);
	}

	function drawWith(
		program: WebGLProgram,
		attributesDictionary: AttributeDictionary,
		uniformsDictionary: { [iden: string]: UniformData },
		outputFramebuffer: WebGLFramebuffer | null
	) {
		activateProgram(
			gl,
			program,
			attributesDictionary,
			uniformsDictionary);

		draw(outputFramebuffer);
	}

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

	gl.texImage2D(
		gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0,
		gl.RGBA, gl.UNSIGNED_BYTE, null);

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

function buildUniformsDictionary(
	gl: WebGLRenderingContext,
	uniformSpecifications: { [iden: string]: UniformSpecification },
	program: WebGLProgram
): { [iden: string]: UniformData } {
	return mapValues(
		uniformSpecifications,
		spec => {
			const location = gl.getUniformLocation(program, spec.identifier);
			if (location == null) {
				throw new Error("Invalid uniform");
			}

			return {
				location,
				value: spec.value
			};
		});

	/*
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
		*/
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
			if (uniform.value.type === 'f') {
				gl.uniform1f(uniform.location, uniform.value.data);
			} else if (uniform.value.type === '2f') {
				gl.uniform2f(uniform.location, uniform.value.data[0], uniform.value.data[1]);
			} else if (uniform.value.type === '3f') {
				gl.uniform3f(
					uniform.location,
					uniform.value.data[0],
					uniform.value.data[1],
					uniform.value.data[2],
				);
			} else if (uniform.value.type === 'i') {
				gl.uniform1i(
					uniform.location,
					uniform.value.data);
			} else if (uniform.value.type === 'mat3') {
				gl.uniformMatrix3fv(
					uniform.location,
					false,
					uniform.value.data);
			} else if (uniform.value.type === 'texture') {
				gl.activeTexture(gl.TEXTURE0 + numberOfBoundTextures);
				gl.bindTexture(gl.TEXTURE_2D, uniform.value.data);
				gl.uniform1i(uniform.location, numberOfBoundTextures);
				numberOfBoundTextures++;
			}
		});
}


