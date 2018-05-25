import { glsl } from 'utility/glslTemplate';

export default glsl`
	precision mediump float;

	void main() {
		float t = 2.;
		float period = 1.;
		float pixelIndexScaling = 0.0001;
		vec2 resolution = vec2(800., 800.);

		float pixelIndex =
			(gl_FragCoord.x + gl_FragCoord.y * resolution.x) * pixelIndexScaling;

		gl_FragColor = vec4(
				vec2(0.),
				(sin(period * (pixelIndex + t)) + 1.) / 2.,
				1);
	}
`;
