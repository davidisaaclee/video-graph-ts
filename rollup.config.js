import typescript from 'typescript';
import typescriptPlugin from 'rollup-plugin-typescript';
import glsl from 'rollup-plugin-glsl';

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
  ]
};

