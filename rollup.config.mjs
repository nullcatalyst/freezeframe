import typescript from '@rollup/plugin-typescript';
// import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default {
    input: 'src/main.ts',
    output: {
        dir: 'lib',
        format: 'iife',
    },
    plugins: [
        typescript(),
        // commonjs(),
        terser(),
    ],
};
