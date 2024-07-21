import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'
import babel from '@rollup/plugin-babel'
import terser from '@rollup/plugin-terser'
import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

const config = [
  {
    input: 'src/main.ts',
    output: [
      {
        file: 'build/index.js',
        format: 'esm',
      },
    ],
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
      }),
      nodeResolve(), commonjs(),
      // terser(),
      babel({
        babelHelpers: 'bundled',
        extensions: ['.js','.ts'],
      }),
    ],
  },
  {
    input: 'src/main.ts',
    output: [{ file: 'build/index.d.ts', format: 'es' }],
    plugins: [dts()],
  },
]
export default config
