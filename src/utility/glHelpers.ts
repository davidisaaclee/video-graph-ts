import {
	ShaderType, BufferHint, AttributeType, BufferData
} from 'utility/glTypes';
import planeVertexShader from 'shaders/vertex';

export function createProgram(gl: WebGLRenderingContext, shaders: WebGLShader[]): WebGLProgram {
	const program = gl.createProgram();
	shaders.forEach(shader => gl.attachShader(program, shader));
	gl.linkProgram(program);
	if (gl.getProgramParameter(program, gl.LINK_STATUS) && program != null) {
		return program;
	} else {
		const infoLog = gl.getProgramInfoLog(program) as string;
		gl.deleteProgram(program);
		throw new Error(infoLog);
	}
}

export function createShader(gl: WebGLRenderingContext, type: ShaderType, source: string): WebGLShader {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) && shader != null) {
		return shader;
	} else {
		const infoLog = gl.getShaderInfoLog(shader) as string;
		gl.deleteShader(shader);
		throw new Error(infoLog);
	}
}

export function createBuffer(gl: WebGLRenderingContext, data: BufferData, hint: BufferHint): WebGLBuffer {
	const buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.bufferData(gl.ARRAY_BUFFER, data, hint);

	if (buffer == null) {
		throw new Error("Failed to create buffer");
	}
	return buffer;
}

export function bindVertexAttribute(
	gl: WebGLRenderingContext,
	buffer: WebGLBuffer,
	location: number,
	type: AttributeType,
	normalize: boolean
) {
	if (type !== 'vec2') {
		throw new Error("Unsupported attribute type");
	}

	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.vertexAttribPointer(location, 2, gl.FLOAT, normalize, 0, 0);
}


export function createProgramWithFragmentShader(
	gl: WebGLRenderingContext,
	fragmentShaderSource: string
): WebGLProgram  {
	const vertexShader =
		createShader(
			gl,
			gl.VERTEX_SHADER,
			planeVertexShader);

	const fragmentShader =
		createShader(
			gl,
			gl.FRAGMENT_SHADER,
			fragmentShaderSource);

	return createProgram(gl, [vertexShader, fragmentShader]);
}

