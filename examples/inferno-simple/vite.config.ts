import { defineConfig } from 'vite'
import babel from 'vite-plugin-babel'

export default defineConfig({
  plugins: [
    // Inferno's own JSX support needs a dedicated compiler (unlike React's
    // automatic-runtime esbuild transform) — babel-plugin-inferno compiles
    // JSX straight into monomorphic createVNode calls. @babel/preset-typescript
    // strips the TS types first so this one pass handles .tsx end to end.
    babel({
      include: /\.tsx?$/,
      babelConfig: {
        presets: ['@babel/preset-typescript'],
        plugins: [['babel-plugin-inferno', { imports: true }]],
      },
    }),
  ],
})
