'use strict';

function glsl(literals) {
    return literals.join('');
}

var vertexShaderSource = glsl `
	attribute vec2 position;
	attribute vec2 a_texCoord;

	varying vec2 v_texCoord;

	void main() {
		gl_Position = vec4(position, 0, 1);
		v_texCoord = a_texCoord;
	}
`;

var fragmentShaderSource = glsl `
	precision mediump float;

	void main() {
		float t = 2.;
		float period = 1.;
		float pixelIndexScaling = 0.0001;
		vec2 resolution = vec2(800., 800.);

		float pixelIndex =
			(gl_FragCoord.x + gl_FragCoord.y * resolution.x) * pixelIndexScaling;

		gl_FragColor = vec4(
				vec3((sin(period * (pixelIndex + t)) + 1.) / 2.),
				1);
	}
`;

var invertShaderSource = glsl `
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

function createProgram(gl, shaders) {
    const program = gl.createProgram();
    shaders.forEach(shader => gl.attachShader(program, shader));
    gl.linkProgram(program);
    if (gl.getProgramParameter(program, gl.LINK_STATUS) && program != null) {
        return program;
    }
    else {
        const infoLog = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error(infoLog);
    }
}
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) && shader != null) {
        return shader;
    }
    else {
        const infoLog = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(infoLog);
    }
}
function createBuffer(gl, data, hint) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, hint);
    if (buffer == null) {
        throw new Error("Failed to create buffer");
    }
    return buffer;
}
function bindVertexAttribute(gl, buffer, location, type, normalize) {
    if (type !== 'vec2') {
        throw new Error("Unsupported attribute type");
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, normalize, 0, 0);
}

// https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
function resizeCanvas(canvas) {
    var realToCSSPixels = window.devicePixelRatio;
    // Lookup the size the browser is displaying the canvas in CSS pixels
    // and compute a size needed to make our drawingbuffer match it in
    // device pixels.
    const displayWidth = Math.floor(canvas.clientWidth * realToCSSPixels);
    const displayHeight = Math.floor(canvas.clientHeight * realToCSSPixels);
    // Check if the canvas is not the same size.
    if (canvas.width !== displayWidth ||
        canvas.height !== displayHeight) {
        // Make the canvas the same size
        canvas.width = displayWidth;
        canvas.height = displayHeight;
    }
}

function render(gl) {
    resizeCanvas(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    const pixelShaderProgramAttributes = [
        {
            identifier: 'position',
            type: 'vec2',
            buffer: createBuffer(gl, new Float32Array([
                -1, -1,
                1, -1,
                -1, 1,
                -1, 1,
                1, -1,
                1, 1
            ]), gl.STATIC_DRAW)
        },
        {
            identifier: 'a_texCoord',
            type: 'vec2',
            buffer: createBuffer(gl, new Float32Array([
                0, 0,
                1, 0,
                0, 1,
                0, 1,
                1, 0,
                1, 1,
            ]), gl.STATIC_DRAW)
        },
    ];
    const startProgram = createProgramWithFragmentShader(gl, fragmentShaderSource);
    const startProgramAttributes = buildAttributesDictionary(gl, pixelShaderProgramAttributes, startProgram);
    activateProgram(gl, startProgram, startProgramAttributes, {});
    const renderTexture = createAndSetupTexture(gl);
    gl.bindTexture(gl.TEXTURE_2D, renderTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderTexture, 0);
    // Set texture-targeted framebuffer.
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    const primitiveType = gl.TRIANGLES;
    const drawOffset = 0;
    const drawCount = 6;
    gl.drawArrays(primitiveType, drawOffset, drawCount);
    const invertProgram = createProgramWithFragmentShader(gl, invertShaderSource);
    const invertProgramAttributes = buildAttributesDictionary(gl, pixelShaderProgramAttributes, invertProgram);
    activateProgram(gl, invertProgram, invertProgramAttributes, buildUniformsDictionary(gl, [
        {
            identifier: 'inputTextureDimensions',
            value: [gl.canvas.width, gl.canvas.height]
        },
        {
            identifier: 'inputTexture',
            value: renderTexture
        }
    ], invertProgram));
    // this should set the sampler2D uniform, i think
    gl.bindTexture(gl.TEXTURE_2D, renderTexture);
    // draw to canvas
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.drawArrays(primitiveType, drawOffset, drawCount);
}
function createAndSetupTexture(gl) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Set up texture so we can render any size image and so we are
    // working with pixels.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    if (texture == null) {
        throw new Error("Failed to create texture");
    }
    return texture;
}
function createProgramWithFragmentShader(gl, fragmentShaderSource$$1) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource$$1);
    return createProgram(gl, [vertexShader, fragmentShader]);
}
function buildAttributesDictionary(gl, attributeSpecifications, program) {
    return attributeSpecifications
        .map(({ identifier, buffer, type }) => ({
        [identifier]: {
            location: gl.getAttribLocation(program, identifier),
            buffer,
            type: type
        }
    }))
        .reduce((acc, elm) => Object.assign(acc, elm), {});
}
function buildUniformsDictionary(gl, uniformSpecifications, program) {
    return uniformSpecifications
        .map(spec => {
        const location = gl.getUniformLocation(program, spec.identifier);
        if (location == null) {
            throw new Error("Invalid uniform");
        }
        return {
            [spec.identifier]: {
                location,
                value: spec.value
            }
        };
    })
        .reduce((acc, elm) => Object.assign(acc, elm), {});
}
function activateProgram(gl, program, attributes, uniforms) {
    gl.useProgram(program);
    Object.keys(attributes)
        .map(iden => attributes[iden])
        .forEach(attribute => {
        gl.enableVertexAttribArray(attribute.location);
        bindVertexAttribute(gl, attribute.buffer, attribute.location, attribute.type, false);
    });
    let numberOfBoundTextures = 0;
    Object.keys(uniforms)
        .map(iden => uniforms[iden])
        .forEach(uniform => {
        if (typeof uniform.value === 'number') {
            gl.uniform1f(uniform.location, uniform.value);
        }
        else if (uniform.value instanceof WebGLTexture) {
            gl.activeTexture(gl.TEXTURE0 + numberOfBoundTextures);
            gl.bindTexture(gl.TEXTURE_2D, uniform.value);
            gl.uniform1i(uniform.location, numberOfBoundTextures);
            numberOfBoundTextures++;
        }
        else if (uniform.value instanceof Array) {
            if (uniform.value.length === 2) {
                gl.uniform2f(uniform.location, uniform.value[0], uniform.value[1]);
            }
            else {
                throw new Error("Unsupported vector length");
            }
        }
    });
}

const stage = document.getElementById("stage");
const gl = stage.getContext('webgl');
if (gl == null) {
    throw new Error("WebGL not supported");
}
render(gl);
//# sourceMappingURL=runner.js.map
