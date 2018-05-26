import typescript from 'typescript';
import typescriptPlugin from 'rollup-plugin-typescript';
import glsl from 'rollup-plugin-glsl';
import nodeResolve from 'rollup-plugin-node-resolve';

export default {
	input: 'src/runner.ts',

	output: {
		file: 'lib/runner.js',
		format: 'cjs',
		sourcemap: true,
	},
  plugins: [
		typescriptPlugin({
			typescript
		}),
		nodeResolve(),
  ]
};

