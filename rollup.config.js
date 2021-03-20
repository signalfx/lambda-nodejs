const commonjs = require('@rollup/plugin-commonjs');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const json = require('@rollup/plugin-json');
const localResolve = require('rollup-plugin-local-resolve');
const filesize = require('rollup-plugin-filesize');

const pkg = require('./package.json');

const PLUGINS = [
  json(),
  localResolve(),
  nodeResolve({ extensions: ['.js', '.json']}),
  commonjs(),
  filesize()
];

export default {
  input: 'signalfx-lambda.js',
  output: [
    {
      file: pkg.module,
      format: 'esm',
    },
    {
      file: pkg.main,
      format: 'umd',
      name: 'umd bundle'
    },
    {
      file: 'dist/index.cjs',
      format: 'cjs',
      name: 'cjs bundle'
    },
  ],
  plugins: PLUGINS
}
