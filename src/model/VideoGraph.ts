import { UniformSpecification } from 'utility/glTypes';
import { createProgram, createShader } from 'utility/glHelpers';
import { Graph } from 'utility/Graph';

export interface PluginNode {
	program: WebGLProgram;
	uniforms?: { [identifier: string]: UniformSpecification };
}

export interface PluginConnection {
	uniformIdentifier: string;
}

export type VideoGraph = Graph<PluginNode, PluginConnection>;

