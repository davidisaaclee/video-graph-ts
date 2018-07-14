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

// We only need to use a single framebuffer.
// It'd be nice to give control of this to the user, but for now, keep it internal.
let sharedFramebuffer: WebGLFramebuffer | null = null;

let pixelShaderProgramAttributes: AttributeSpecification[] | null = null;
export function setup(gl: WebGLRenderingContext, realToCSSPixelRatio: number = window.devicePixelRatio) {
	resizeCanvas(gl.canvas, realToCSSPixelRatio);

	sharedFramebuffer = gl.createFramebuffer();
	if (sharedFramebuffer == null) {
		throw new Error('Could not create framebuffer');
	}

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

export type RenderCache = (iden: string) => WebGLTexture;

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

	const steps = resolveDependencies(graph, outputNodeKey);

	// set of visited node keys
	const visited: Record<string, boolean> = {};
	// Stores the most up-to-date textures to read from during this render pass. 
	// As textures are rendered, they are put in this structure to be referenced by
	// render steps further down the pipeline.
	const textureCache = (nodeKey: string) => visited[nodeKey] != null
		? writeCache(nodeKey)
		: readCache(nodeKey);

	for (const step of steps) {
		const {
			program, uniforms: constantUniforms,
			uniformLocations, attributeLocations,
		} = nodeForKey(graph, step.nodeKey)!;

		const attributes =
			buildAttributesDictionary(
				gl,
				pixelShaderProgramAttributes == null ? [] : pixelShaderProgramAttributes,
				program,
				attributeLocations == null ? {} : attributeLocations);

		const edges = edgesWithSource(step.nodeKey, graph);
		const textureUniforms = Object.keys(edges)
			.map(key => edges[key])
			.map(({ dst, metadata }) => {
				return {
					identifier: metadata.uniformIdentifier,
					value: {
						type: 'texture',
						data: textureCache(dst)
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

		const framebuffer = step.nodeKey === outputNodeKey 
			? null
			: attachTextureToFBO(gl, writeCache(step.nodeKey), sharedFramebuffer!);

		drawWithSpecs(
			gl,
			program,
			pixelShaderProgramAttributes == null ? [] : pixelShaderProgramAttributes,
			uniforms,
			uniformLocations == null ? {} : uniformLocations,
			attributeLocations == null ? {} : attributeLocations,
			framebuffer);

		// During this render pass, we want to read from this most up-to-date texture.
		// To update `textureCache`, update the visited set.
		visited[step.nodeKey] = true;
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
		cachedUniformLocations: { [iden: string]: WebGLUniformLocation },
		cachedAttributeLocations: { [iden: string]: number },
		outputFramebuffer: WebGLFramebuffer | null
	) {
		return drawWith(
			program,
			buildAttributesDictionary(
				gl,
				attributes,
				program,
				cachedAttributeLocations),
			buildUniformsDictionary(
				gl,
				uniforms,
				cachedUniformLocations,
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


function attachTextureToFBO(gl: WebGLRenderingContext, texture: WebGLTexture, framebuffer: WebGLFramebuffer): WebGLFramebuffer {
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	gl.framebufferTexture2D(
		gl.FRAMEBUFFER,
		gl.COLOR_ATTACHMENT0,
		gl.TEXTURE_2D,
		texture,
		0);
	return framebuffer;
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
	program: WebGLProgram,
	cachedAttributeLocations: { [iden: string]: number },
): AttributeDictionary {
	return attributeSpecifications
		.map(({ identifier, buffer, type }) => {
			const location = cachedAttributeLocations[identifier] != null
				? cachedAttributeLocations[identifier]
				: gl.getAttribLocation(program, identifier);

			return {
				[identifier]: {
					location,
					buffer,
					type: type as AttributeType
				}
			};
		})
		.reduce((acc, elm) => Object.assign(acc, elm), {});
}

function buildUniformsDictionary(
	gl: WebGLRenderingContext,
	uniformSpecifications: { [iden: string]: UniformSpecification },
	cachedUniformLocations: { [iden: string]: WebGLUniformLocation },
	program: WebGLProgram
): { [iden: string]: UniformData } {
	return mapValues(
		uniformSpecifications,
		spec => {
			const location = cachedUniformLocations[spec.identifier] != null
				? cachedUniformLocations[spec.identifier]
				: gl.getUniformLocation(program, spec.identifier);

			if (location == null) {
				throw new Error(`Could not find location for uniform ${spec.identifier}`);
			}

			return {
				location,
				value: spec.value
			};
		});
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


