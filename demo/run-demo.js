/*
import fragment from './demo/fragment.glsl';
console.log(fragment);
*/

const stage = document.getElementById('#stage');

const gl = stage.getContext('webgl');

if (gl == null) {
	throw new Error("WebGL not supported");
}

console.log(gl);


