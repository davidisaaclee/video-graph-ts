import { UniformSpecification } from 'utility/glTypes';
import { createProgram, createShader } from 'utility/glHelpers';
import vertexShaderSource from 'shaders/vertex';
import fragmentShaderSource from 'shaders/oscillator';
import constantFragmentSource from 'shaders/constantColor';
import invertShaderSource from 'shaders/invertRGB';
import {
	Graph, resolveDependencies, edgesWithSource
} from 'utility/Graph';
import { indexBy } from 'utility/indexBy';

export interface PluginNode {
	program: WebGLProgram;
	inletToUniformIdentifiers: { [inletKey: string]: string };
	timeUniformIdentifier?: string;
	uniforms?: { [identifier: string]: UniformSpecification };
}

export interface PluginConnection {
	inlet: string;
}

export type VideoGraph = Graph<PluginNode, PluginConnection>;

export const makeGraph: (gl: WebGLRenderingContext) => VideoGraph = (gl) => ({
	nodes: {
		'oscillator': {
			program: createProgramWithFragmentShader(gl, fragmentShaderSource),
			inletToUniformIdentifiers: {},
			timeUniformIdentifier: 't',
			uniforms: uniformDictFromArray(
				[
					{
						identifier: 'phaseWrap',
						value: { type: 'f', data: 0 }
					},
					{
						identifier: 'frequency',
						value: { type: 'f', data: 0.1 }
					}
				])
		},
		'constant': {
			program: createProgramWithFragmentShader(gl, constantFragmentSource),
			inletToUniformIdentifiers: {},
			uniforms: uniformDictFromArray([
				{ identifier: 'value', value: { type: '3f', data: [1, 1, 0] } }
			])
		},
		'invert': {
			program: createProgramWithFragmentShader(gl, invertShaderSource),
			inletToUniformIdentifiers: { 'input': 'inputTexture' }
		}
	},
	edges: {
		/*
		'constant <- invert': {
			src: 'invert',
			dst: 'constant',
			metadata: { inlet: 'input' }
		},
		*/
		'osc <- invert': {
			src: 'invert',
			dst: 'oscillator',
			metadata: { inlet: 'input' }
		}
	}
});

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

function uniformDictFromArray(uniforms: UniformSpecification[]): { [iden: string]: UniformSpecification } {
	return indexBy(s => s.identifier, uniforms);
}
