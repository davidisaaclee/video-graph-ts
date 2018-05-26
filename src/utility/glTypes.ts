// e.g. gl.VERTEX_SHADER, gl.FRAGMENT_SHADER
export type ShaderType = number;

// e.g. gl.STATIC_DRAW
export type BufferHint = number;

// The GLSL type of an attribute.
export type AttributeType = 'vec2';

// Can be set to a buffer via a call to gl.bufferData
export type BufferData = Float32Array;

export type UniformValue
	= { type: 'f', data: number }
	| { type: '2f', data: [number, number] }
	| { type: '3f', data: [number, number, number] }
	| { type: 'i', data: number }
	| { type: 'mat3', data: Float32Array }
	| { type: 'texture', data: WebGLTexture }
	;


// Helpers

export interface UniformSpecification {
	identifier: string;
	value: UniformValue;
}

export interface UniformData {
	location: WebGLUniformLocation;
	value: UniformValue;
}

