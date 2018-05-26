import {
	AttributeType, BufferData,
	UniformData, UniformSpecification, UniformValue
} from 'utility/glTypes';
import { createBuffer, bindVertexAttribute } from 'utility/glHelpers';
import { resizeCanvas } from 'utility/resizeCanvas';
import {
	Graph, resolveDependencies, edgesWithSource
} from 'utility/Graph';
import { indexBy } from 'utility/indexBy';
import { mapValues } from 'utility/mapValues';

import { VideoGraph, makeGraph } from 'VideoGraph';

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

// TODO: Keep texture cache local to render call
let textures: { [iden: string]: WebGLTexture } = {};
let framebuffers: { [iden: string]: WebGLFramebuffer | null } = {};

export function renderGraph(
	gl: WebGLRenderingContext,
	graph: VideoGraph,
	runtimeUniforms: { [nodeKey: string]: { [iden: string]: UniformSpecification } },
	outputNodeKey: string,
	frameIndex: number,
) {
	// Clear the canvas AND the depth buffer.
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// NOTE: this iterates through nodes that we don't need to make textures for
	textures = Object.keys(graph.nodes)
		.map(key => ({ [key]: textures[key] || createAndSetupTexture(gl) }))
		.reduce((acc, elm) => Object.assign(acc, elm), {});

	framebuffers = Object.keys(textures)
		.map(key => {
			if (key === outputNodeKey) {
				return { [key]: null };
			}

			if (framebuffers[key] != null) {
				return { [key]: framebuffers[key] };
			}

			const framebuffer = gl.createFramebuffer();
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
			gl.framebufferTexture2D(
				gl.FRAMEBUFFER,
				gl.COLOR_ATTACHMENT0,
				gl.TEXTURE_2D,
				textures[key],
				0);

			return { [key]: framebuffer };
		})
		.reduce((acc, elm) => Object.assign(acc, elm), {});
	const steps = resolveDependencies(graph, outputNodeKey);

	for (const step of steps) {
		const {
			program, inletToUniformIdentifiers, uniforms: constantUniforms,
			timeUniformIdentifier
		} = graph.nodes[step.nodeKey];
		const attributes =
			buildAttributesDictionary(
				gl,
				pixelShaderProgramAttributes == null ? [] : pixelShaderProgramAttributes,
				program);

		const edges = Array.from(edgesWithSource(step.nodeKey, graph));
		const textureUniforms =
			Object.keys(inletToUniformIdentifiers)
			.map(inletKey => {
				const matchingEdgeKeys =
					edges.filter(e => graph.edges[e].metadata.inlet === inletKey);
				const sourceNodeKey = matchingEdgeKeys.length === 0
					? null
					: graph.edges[matchingEdgeKeys[0]].dst;

				return { inletKey, sourceNodeKey };
			})
			.map(({ inletKey, sourceNodeKey }) => {
				if (sourceNodeKey == null) {
					throw new Error(`No source node for inlet ${inletKey} of node ${step.nodeKey}`);
				}

				return {
					identifier: inletToUniformIdentifiers[inletKey],
					value: { type: 'texture', data: textures[sourceNodeKey] } as UniformValue
				};
			});

		if (textureUniforms.length > 0) {
			textureUniforms.push({
				identifier: 'inputTextureDimensions',
				value: { type: '2f', data: [gl.canvas.width, gl.canvas.height] }
			});
		}

		const uniformsWithoutRuntimeUniforms = Object.assign(
			{},
			timeUniformIdentifier == null ? {} : {
				[timeUniformIdentifier]: {
					identifier: timeUniformIdentifier,
					value: { type: 'i', data: frameIndex } as UniformValue
				}
			},
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
			uniformsWithoutRuntimeUniforms,
			framebuffers[step.nodeKey]
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

export function render(
	gl: WebGLRenderingContext,
	frameIndex: number,
	runtimeUniforms: { [nodeKey: string]: { [iden: string]: UniformSpecification } },
) {
	renderGraph(
		gl,
		makeGraph(gl),
		runtimeUniforms,
		"invert",
		frameIndex);
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


