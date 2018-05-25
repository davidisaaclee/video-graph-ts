
export interface Graph<Node, EdgeMetadata> {
	nodes: { [key: string]: Node };
	edges: { [key: string]: { src: string, dst: string, metadata: EdgeMetadata } };
}

export type ExecutionStep = { nodeKey: string, edges: Array<{ edgeKey: string, beginsCycle: boolean }> }

export function resolveDependencies<Node>(
	graph: Graph<Node, any>,
	startNode: string
): Array<ExecutionStep> {
	const resolved = new Set();
	const seen = new Set();

	let steps: Array<ExecutionStep> = [];
	function helper(nodeKey: string, seen: Set<string>) {
		const newSeen = new Set(seen);
		newSeen.add(nodeKey);

		let edges = [];
		for (const edgeKey of edgesWithSource(nodeKey, graph)) {
			const dst = graph.edges[edgeKey].dst;
			const beginsCycle = newSeen.has(dst);

			if (!resolved.has(dst)) {
				if (!beginsCycle) {
					helper(dst, newSeen);
				}
			}

			edges.push({ edgeKey, beginsCycle });
		}

		steps.push({ nodeKey, edges });
		resolved.add(nodeKey);
	}

	helper(startNode, new Set());

	return steps;
}

export const executionOrder = resolveDependencies;

/*
// TODO: Like crazy optimize this lol
export function executionOrder<Node>(graph: Graph<T>, outputNodeKey: string): Array<ExecutionStep> {
	// Nodes ordered by execution order.
	// We'll work through this in the second phase.
	const sortedNodes = [outputNodeKey];

	const visited = new Set(sortedNodes);
	const queue = [outputNodeKey];

	for (let currentNode = queue.shift(); currentNode != null; currentNode = queue.shift()) {
		const srcNodes =
			new Set(
				Array.from(edgesWithDestination(currentNode, graph))
					.map(edgeKey => graph.edges[edgeKey].src));

		// Without cycles
		const newSrcNodes = 
			setDifference(
				srcNodes,
				visited);
		newSrcNodes.forEach(x => {
			visited.add(x);
			sortedNodes.unshift(x);
			queue.push(x);
		});
	}

	// Reuse visited set variable.
	visited.clear();
	const result = [];
	for (const nodeKey of sortedNodes) {
		// Add the current node to visited.
		// If the current node has an edge to itself, it should be considered a cycle.
		visited.add(nodeKey);

		const edges = Array.from(edgesWithSource(nodeKey, graph))
			.map(edgeKey => {
				const dst = graph.edges[edgeKey].dst;

				return {
					edgeKey,
					// This edge begins a cycle if it is pointing to a node that
					// we've already visited.
					beginsCycle: visited.has(dst)
				}
			});

		result.push({
			nodeKey,
			edges
		});
	}

	return result;
}
*/

export function edgesWithSource<Node, EdgeMetadata>(srcKey: string, graph: Graph<Node, EdgeMetadata>): Set<string> {
	const result = new Set();

	for (const edgeKey of Object.keys(graph.edges)) {
		if (graph.edges[edgeKey].src === srcKey) {
			result.add(edgeKey);
		}
	}

	return result;
}

function edgesWithDestination<Node, EdgeMetadata>(dstKey: string, graph: Graph<Node, EdgeMetadata>): Set<string> {
	const result = new Set();

	for (const edgeKey of Object.keys(graph.edges)) {
		if (graph.edges[edgeKey].dst === dstKey) {
			result.add(edgeKey);
		}
	}

	return result;
}

function setDifference<Node>(a: Set<Node>, b: Set<Node>): Set<Node> {
	return new Set(Array.from(a).filter(element => !b.has(element)));
}

