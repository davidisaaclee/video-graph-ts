import { render } from 'render';
const stage = document.getElementById("stage");
const gl = stage.getContext('webgl');
if (gl == null) {
    throw new Error("WebGL not supported");
}
render(gl);
