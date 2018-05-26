import { glsl } from 'utility/glslTemplate';

export default glsl`
	precision mediump float;

	uniform int t;
	uniform float phaseWrap;
	uniform float frequency;
	uniform vec2 inputTextureDimensions;

	void main() {
		vec2 resolution = inputTextureDimensions;
		float numberOfPixels = resolution.x * resolution.y;
		float pixelIndexScaling = 1. / numberOfPixels;

		float pixelIndex =
				gl_FragCoord.x + gl_FragCoord.y * resolution.x
				+ float(t) * numberOfPixels
		;

		float x =
			pixelIndex
			* 3.141 * 2.
			/ numberOfPixels
		// TODO: Phase wrap
			+ phaseWrap * 0.
			;

		float y =
			(frequency / 60.) * x;


		gl_FragColor = vec4(
			(sin(y) + 1.) / 2.,
			vec2(0.),
			1);
	}

	float luminance(vec3 rgb) {
		return (0.2126*rgb.r + 0.7152*rgb.g + 0.0722*rgb.b);
	}
`;
