# Inferno simple example

A small TypeScript + Vite app using `InputMask` and `InputDecimal` from
`mother-mask/inferno`. The components live in the
[library's Inferno entry point](../../packages/mother-mask/src/inferno).

## Run

This example uses the local `mother-mask` package. From the repository root:

```bash
bun install
bun run --cwd packages/mother-mask build
cd examples/inferno-simple
bun install
bun run dev
```

Open the local URL printed by Vite. Run `bun run build` to typecheck and
build, then `bun run preview` to preview the production build.

## Use the component

```tsx
import { Component, render } from 'inferno'
import { InputMask } from 'mother-mask/inferno'

class App extends Component {
  state = { phone: '' }
  render() {
    return (
      <InputMask
        mask="999-999"
        value={this.state.phone}
        onValueChange={(v: string) => this.setState({ phone: v })}
      />
    )
  }
}

render(<App />, document.getElementById('app'))
```

- Real JSX, unlike the library's own Inferno entry (which calls Inferno's
  `createVNode` directly — see the library README's Inferno section for
  why). This example uses [`babel-plugin-inferno`](https://github.com/infernojs/babel-plugin-inferno)
  (Inferno's own documented JSX compiler, wired into Vite via
  [`vite-plugin-babel`](https://www.npmjs.com/package/vite-plugin-babel) —
  see [`vite.config.ts`](vite.config.ts)) compiling JSX straight into
  monomorphic `createVNode` calls, plus `@babel/preset-typescript` to strip
  the TS types first. `tsconfig.json` sets `"jsx": "preserve"` so `tsc`
  only type-checks the JSX (against Inferno's own ambient
  `JSX.IntrinsicElements`) and leaves compiling it to Babel.
- Binding happens in `componentDidMount` and disposes in
  `componentWillUnmount`. `componentDidUpdate` reactively rebinds whenever
  `mask`/`options` change or `value` is set externally, ignoring an echo of
  the component's own `onValueChange`.
- `InputDecimal` always sets `inputmode="decimal"` and reports
  `onValueChange(value, numericValue)`.

See [`App.tsx`](src/App.tsx) for the full example.
