import { glsl } from '../utility/glslTemplate';

export default glsl`
	precision mediump float;

	void main() {
		gl_FragColor = vec4(
				vec3(gl_FragCoord.x / 800.),
				1);
	}
`;
