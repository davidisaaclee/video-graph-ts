import vertexShaderSource from 'shaders/vertex';
import fragmentShaderSource from 'shaders/oscillator';
import constantFragmentSource from 'shaders/constantColor';
import invertShaderSource from 'shaders/invertRGB';
import { AttributeType, BufferData } from 'utility/glTypes';
import {
	createProgram, createShader, createBuffer, bindVertexAttribute
} from 'utility/glHelpers';
import { resizeCanvas } from 'utility/resizeCanvas';
import {
	Graph, resolveDependencies, edgesWithSource
} from 'utility/Graph';

interface PluginNode {
	program: WebGLProgram;
	inletToUniformIdentifiers: { [inletKey: string]: string };
	uniforms?: UniformSpecification[];
}

interface PluginConnection {
	inlet: string;
}

type VideoGraph = Graph<PluginNode, PluginConnection>;

const makeGraph: (gl: WebGLRenderingContext) => VideoGraph = (gl) => ({
	nodes: {
		'oscillator': {
			program: createProgramWithFragmentShader(gl, fragmentShaderSource),
			inletToUniformIdentifiers: {}
		},
		'constant': {
			program: createProgramWithFragmentShader(gl, constantFragmentSource),
			inletToUniformIdentifiers: {},
			uniforms: [
				{ identifier: 'value', value: { type: '3f', data: [1, 0, 0] } }
			]
		},
		'invert': {
			program: createProgramWithFragmentShader(gl, invertShaderSource),
			inletToUniformIdentifiers: { 'input': 'inputTexture' }
		}
	},
	edges: {
		'constant <- invert': {
			src: 'invert',
			dst: 'constant',
			metadata: { inlet: 'input' }
		},
		/*
		'osc <- invert': {
			src: 'invert',
			dst: 'oscillator',
			metadata: { inlet: 'input' }
		}
		*/
	}
});

function renderGraph(
	gl: WebGLRenderingContext,
	graph: VideoGraph,
	outputNodeKey: string
) {
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

	const textures = Object.keys(graph.nodes)
		.map(key => ({ [key]: createAndSetupTexture(gl) }))
		.reduce((acc, elm) => Object.assign(acc, elm), {});

	const framebuffers = Object.keys(textures)
		.map(key => {
			if (key === outputNodeKey) {
				return { [key]: null };
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
		const { program, inletToUniformIdentifiers, uniforms: constantUniforms } = graph.nodes[step.nodeKey];
		const attributes =
			buildAttributesDictionary(
				gl,
				pixelShaderProgramAttributes,
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
					throw new Error("TODO");
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

		drawWithSpecs(
			gl,
			program,
			pixelShaderProgramAttributes,
			[...(constantUniforms == null ? [] : constantUniforms), ...textureUniforms],
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
		uniforms: Array<UniformSpecification>,
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

export function render(gl: WebGLRenderingContext) {
	renderGraph(gl, makeGraph(gl), "invert");
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
	= { type: 'f', data: number }
	| { type: '2f', data: [number, number] }
	| { type: '3f', data: [number, number, number] }
	| { type: 'texture', data: WebGLTexture }
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
			} else if (uniform.value.type === 'texture') {
				gl.activeTexture(gl.TEXTURE0 + numberOfBoundTextures);
				gl.bindTexture(gl.TEXTURE_2D, uniform.value.data);
				gl.uniform1i(uniform.location, numberOfBoundTextures);
				numberOfBoundTextures++;
			}
		});
}


