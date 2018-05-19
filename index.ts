

/*
type Input = number;
type Vec4 = [number, number, number, number];
type Shader = (inputs: Input[]) => (x: number, y: number) => Vec4;
const red: Shader = (inputs) => (x, y) => [1, 0, 0, 1];
*/

const red = "red";

interface Graph<Vertex> {
	nodes: { [key: string]: Vertex };
	edges: { [key: string]: { sourceKey: string, destinationKey: string } };
}

type VideoPlugin
	= { type: 'source', name: string }
	| { type: 'output', name: string };

interface Patch extends Graph<VideoPlugin> {
	outputNodeKey: string;
}


type FragmentShader = string;

function generateShader(patch: Patch): FragmentShader {
	const outputNode = patch.nodes[patch.outputNodeKey];

	if (outputNode == null || outputNode.type !== 'output') {
		throw new Error("Invalid output node");
	}

	let shaderParts = {
		helperFunctions: []
	};



	throw new Error("TODO: Finish");
}



