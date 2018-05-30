import { glsl } from '../utility/glslTemplate';

export default glsl`
	attribute vec2 position;
	attribute vec2 a_texCoord;

	varying vec2 v_texCoord;

	void main() {
		gl_Position = vec4(position, 0, 1);
		v_texCoord = a_texCoord;
	}
`;
