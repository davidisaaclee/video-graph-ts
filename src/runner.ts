import { render } from 'render';

const stage = document.getElementById("stage") as HTMLCanvasElement;
const gl = stage.getContext('webgl');

if (gl == null) {
	throw new Error("WebGL not supported");
}

const start = Date.now();
function renderLoop() {
	render(gl as WebGLRenderingContext, (Date.now() - start) / 1000);
	window.requestAnimationFrame(renderLoop);
}

renderLoop();

