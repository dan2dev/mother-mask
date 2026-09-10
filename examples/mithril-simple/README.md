# Mithril.js simple example

A small TypeScript + Vite app using `InputMask` and `InputDecimal` from
`mother-mask/mithril`. The components live in the
[library's Mithril entry point](../../packages/mother-mask/src/mithril).

## Run

This example uses the local `mother-mask` package. From the repository root:

```bash
bun install
bun run --cwd packages/mother-mask build
cd examples/mithril-simple
bun install
bun run dev
```

Open the local URL printed by Vite. Run `bun run build` to typecheck and
build, then `bun run preview` to preview the production build.

## Use the component

```js
import m from 'mithril'
import { InputMask } from 'mother-mask/mithril'

let phone = ''

const App = {
  view: () =>
    m('div', [
      m(InputMask, { mask: '(99) 99999-9999', value: phone, onValueChange: (v) => { phone = v; m.redraw() } }),
      m('p', phone),
    ]),
}

m.mount(document.body, App)
```

- `InputMask`/`InputDecimal` call `onValueChange` from a native `input`
  event listener registered by `bind()` directly, not through one of
  Mithril's own `on*` attrs — so a redraw isn't scheduled automatically.
  Call `m.redraw()` yourself after updating state in `onValueChange` (see
  [`main.ts`](src/main.ts)).
- `value` is never forwarded as an `m('input', ...)` attribute internally:
  Mithril's vdom diff would otherwise reassign `.value` on every redraw,
  fighting the mask's own intermediate edits.
- Binding happens in `oncreate` and disposes in `onremove`; `onupdate`
  reactively rebinds whenever `mask`/`options` change or `value` is set
  externally, ignoring an echo of the component's own `onValueChange`.

See [`main.ts`](src/main.ts) for the full example.
