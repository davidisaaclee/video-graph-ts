import { renderGraph, setup } from 'render';
import { VideoGraph, createProgramWithFragmentShader } from 'model/VideoGraph';
import vertexShaderSource from 'shaders/vertex';
import fragmentShaderSource from 'shaders/oscillator';
import constantFragmentSource from 'shaders/constantColor';
import invertShaderSource from 'shaders/invertRGB';
import { UniformSpecification } from 'utility/glTypes';
import { indexBy } from 'utility/indexBy';

function uniformDictFromArray(uniforms: UniformSpecification[]): { [iden: string]: UniformSpecification } {
	return indexBy(s => s.identifier, uniforms);
}

const makeGraph: (gl: WebGLRenderingContext) => VideoGraph = (gl) => ({
	nodes: {
		'oscillator': {
			program: createProgramWithFragmentShader(gl, fragmentShaderSource),
			// timeUniformIdentifier: 't',
			uniforms: uniformDictFromArray(
				[
					{
						identifier: 'frequency',
						value: { type: 'f', data: 0.1 }
					},
				])
		},

		'oscillator2': {
			program: createProgramWithFragmentShader(gl, fragmentShaderSource),
			// timeUniformIdentifier: 't',
			uniforms: uniformDictFromArray(
				[
					{
						identifier: 'frequency',
						value: { type: 'f', data: 200 }
					},
				])
		},

		'constant': {
			program: createProgramWithFragmentShader(gl, constantFragmentSource),
			uniforms: uniformDictFromArray([
				{
					identifier: 'value',
					value: { type: '3f', data: [1, 0, 0] }
				}
			])
		},
		'invert': {
			program: createProgramWithFragmentShader(gl, invertShaderSource),
		}
	},
	edges: {
		/*
		'constant <- invert': {
			src: 'invert',
			dst: 'constant',
			metadata: { inlet: 'inputTexture' }
		},
		'osc <- invert': {
			src: 'invert',
			dst: 'oscillator',
			metadata: { inlet: 'inputTexture' }
		}
		*/
		'osc.rotation <- constant': {
			src: 'oscillator',
			dst: 'constant',
			metadata: { uniformIdentifier: 'rotationTheta' }
		},
		'osc2.rotation <- osc': {
			src: 'oscillator2',
			dst: 'oscillator',
			metadata: { uniformIdentifier: 'rotationTheta' }
		},
		/*
		'osc.rotation <- osc2': {
			src: 'oscillator',
			dst: 'oscillator2',
			metadata: { inlet: 'rotationTheta' }
		}
		*/
	}
});

let lfoFrequency = 502;
(document.getElementById("freq-slider") as HTMLInputElement)
	.addEventListener("input", evt => {
		if (evt.target != null) {
			lfoFrequency =
				2000
				* Math.pow(
					parseFloat((evt.target as HTMLInputElement).value) / 100,
					2);
		}
	});
let freq = 60.1;
(document.getElementById("freq2-slider") as HTMLInputElement)
	.addEventListener("input", evt => {
		if (evt.target != null) {
			freq =
				200
				* Math.pow(
					parseFloat((evt.target as HTMLInputElement).value) / 100,
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
				'inputTextureDimensions': {
					identifier: 'inputTextureDimensions',
					value: { type: '2f', data: [gl.canvas.width, gl.canvas.height] }
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

