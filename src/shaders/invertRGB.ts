import { glsl } from '../utility/glslTemplate';

export default glsl`
	precision mediump float;

	uniform sampler2D inputTexture;
	uniform vec2 inputTextureDimensions;

	void main() {
		vec4 inverted = 1. - texture2D(inputTexture, gl_FragCoord.xy / inputTextureDimensions);
		gl_FragColor = vec4(
			inverted.rgb,
			1);
	}
`;
