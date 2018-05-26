import { glsl } from 'utility/glslTemplate';

export default glsl`
	precision mediump float;

	uniform int t;
	uniform float frequency;
	uniform vec2 inputTextureDimensions;
	uniform mat3 transform;

	void main() {
		vec2 resolution = inputTextureDimensions;
		float numberOfPixels = resolution.x * resolution.y;
		float pixelIndexScaling = 1. / numberOfPixels;

		vec2 position =
			(transform * gl_FragCoord.xyz).xy;

		float pixelIndex =
			position.x + position.y * resolution.x
			+ float(t) * numberOfPixels
		;

		float x =
			pixelIndex
			* 3.141 * 2.
			/ numberOfPixels
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
