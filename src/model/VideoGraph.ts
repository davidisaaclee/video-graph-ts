import { UniformSpecification } from '../utility/glTypes';
import { createProgram, createShader } from '../utility/glHelpers';
import { Graph } from '@davidisaaclee/graph';

export interface PluginNode {
	program: WebGLProgram;
	uniforms?: { [identifier: string]: UniformSpecification };
	uniformLocations?: { [identifier: string]: WebGLUniformLocation };
}

export interface PluginConnection {
	uniformIdentifier: string;
}

export type VideoGraph = Graph<PluginNode, PluginConnection>;

