import { renderGraph, setup } from 'render';
import { makeGraph } from 'VideoGraph';

let lfoFrequency = 60.1;
(document.getElementById("freq-slider") as HTMLInputElement)
	.addEventListener("input", evt => {
		if (evt.target != null) {
			lfoFrequency =
				20000
				* Math.pow(
					parseInt((evt.target as HTMLInputElement).value) / 100,
					2);
		}
	});
let freq = 60.1;
(document.getElementById("freq2-slider") as HTMLInputElement)
	.addEventListener("input", evt => {
		if (evt.target != null) {
			freq =
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

	const frameIndex =
		Math.floor((Date.now() - start) / (1000 / fps));

	renderGraph(
		gl as WebGLRenderingContext,
		graph,
		{
			"oscillator": {
				'frequency': {
					identifier: 'frequency',
					value: { type: 'f', data: lfoFrequency }
				},
				'phaseOffset': {
					identifier: 'phaseOffset',
					value: {
						type: 'f',
						data: (frameIndex * 2 * Math.PI / lfoFrequency) % 1
					}
				}
			},
			"oscillator2": {
				'frequency': {
					identifier: 'frequency',
					value: { type: 'f', data: freq }
				},
				'phaseOffset': {
					identifier: 'phaseOffset',
					value: {
						type: 'f',
						data: (frameIndex * 2 * Math.PI / freq) % 1
					}
				}
			}
		},
		// "invert",
		"oscillator2",
		frameIndex
	);
	window.requestAnimationFrame(renderLoop);
}

renderLoop();

