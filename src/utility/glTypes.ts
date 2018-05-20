// e.g. gl.VERTEX_SHADER, gl.FRAGMENT_SHADER
export type ShaderType = number;

// e.g. gl.STATIC_DRAW
export type BufferHint = number;

// The GLSL type of an attribute.
export type AttributeType = 'vec2';

// Can be set to a buffer via a call to gl.bufferData
export type BufferData = Float32Array;
