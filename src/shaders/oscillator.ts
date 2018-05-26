import { glsl } from 'utility/glslTemplate';

export default glsl`
	precision mediump float;

	const float TWO_PI = 6.28318530718;

	uniform int t;
	uniform float frequency;
	uniform vec2 inputTextureDimensions;
	uniform sampler2D rotationTheta;

	vec2 rotate(vec2 v, float a) {
		float s = sin(a);
		float c = cos(a);
		mat2 m = mat2(c, -s, s, c);
		return m * v;
	}

	float luminance(vec3 rgb) {
		return (0.2126*rgb.r + 0.7152*rgb.g + 0.0722*rgb.b);
	}

	void main() {
		vec2 resolution = inputTextureDimensions;
		float numberOfPixels = resolution.x * resolution.y;
		float pixelIndexScaling = 1. / numberOfPixels;

		vec2 position =
			rotate(
				gl_FragCoord.xy,
				luminance(texture2D(
					rotationTheta,
					gl_FragCoord.xy / inputTextureDimensions).rgb) * TWO_PI);

		float pixelIndex =
			position.x + position.y * resolution.x
			+ float(t) * numberOfPixels
		;

		float x =
			pixelIndex
			* TWO_PI
			/ numberOfPixels
		;

		float y =
			(frequency / 60.) * x;


		gl_FragColor = vec4(
			(sin(y) + 1.) / 2.,
			vec2(0.),
			1);
	}

`;
