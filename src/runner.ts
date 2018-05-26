import { renderGraph, setup } from 'render';
import { makeGraph } from 'VideoGraph';

const stage = document.getElementById("stage") as HTMLCanvasElement;
const gl = stage.getContext('webgl');

if (gl == null) {
	throw new Error("WebGL not supported");
}

const graph = makeGraph(gl);

setup(gl);

const start = Date.now();
function renderLoop() {
	// render(gl as WebGLRenderingContext, (Date.now() - start) / 1000);
	renderGraph(
		gl as WebGLRenderingContext,
		graph,
		"invert",
		Math.floor((Date.now() - start) / (1000 / 60))
	);
	window.requestAnimationFrame(renderLoop);
}

renderLoop();

