import { renderGraph, setup } from 'render';
import { makeGraph } from 'VideoGraph';

let frequency = 60.1;

(document.getElementById("freq-slider") as HTMLInputElement)
	.addEventListener("input", evt => {
		if (evt.target != null) {
			frequency =
				20000
				* Math.pow(
					parseInt((evt.target as HTMLInputElement).value) / 100,
					2);
		}
	});


const stage = document.getElementById("stage") as HTMLCanvasElement;
const gl = stage.getContext('webgl');

if (gl == null) {
	throw new Error("WebGL not supported");
}

const graph = makeGraph(gl);

setup(gl);

const fps = 60;
const start = Date.now();
function renderLoop() {
	// render(gl as WebGLRenderingContext, (Date.now() - start) / 1000);
	if (gl == null) {
		return;
	}

	renderGraph(
		gl as WebGLRenderingContext,
		graph,
		{
			"oscillator": {
				'frequency': {
					identifier: 'frequency',
					value: { type: 'f', data: frequency }
				},
				'inputTextureDimensions': {
					identifier: 'inputTextureDimensions',
					value: {
						type: '2f',
						data: [gl.canvas.width, gl.canvas.height]
					}
				}
			}
		},
		// "invert",
		"oscillator",
		Math.floor((Date.now() - start) / (1000 / fps))
	);
	window.requestAnimationFrame(renderLoop);
}

renderLoop();

