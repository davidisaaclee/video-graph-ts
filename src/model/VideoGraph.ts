import { UniformSpecification } from 'utility/glTypes';
import { createProgram, createShader } from 'utility/glHelpers';
import vertexShaderSource from 'shaders/vertex';
import { Graph } from 'utility/Graph';

export interface PluginNode {
	program: WebGLProgram;
	uniforms?: { [identifier: string]: UniformSpecification };
}

export interface PluginConnection {
	uniform: string;
}

export type VideoGraph = Graph<PluginNode, PluginConnection>;

export function createProgramWithFragmentShader(
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

