import { glsl } from '../utility/glslTemplate';

export default glsl`
	precision mediump float;

	const float TWO_PI = 6.28318530718;
	const float N_SCANLINES = 500.;

	// in cycles / frame
	uniform float frequency;

	// todo: change to ivec2
	uniform highp vec2 inputTextureDimensions;

	void main() {
		vec2 position =
			gl_FragCoord.xy;
		vec2 uv =
			position / inputTextureDimensions;
		highp float pixelIndex =
			uv.x / N_SCANLINES + (uv.y - mod(uv.y, 1. / N_SCANLINES));
		float y = frequency * pixelIndex;
		float x = 
			mod(y, TWO_PI);
		float r = 
			(sin(x) + 1.) / 2.;

		gl_FragColor = vec4(
			// (sin(x) + 1.) / 2.,
			r,
			vec2(0.),
			1);
	}

`;
