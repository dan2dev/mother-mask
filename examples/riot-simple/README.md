# Riot.js simple example

A small TypeScript + Vite app using the `maskInput` and `maskDecimal`
`riot.pure()` factories from `mother-mask/riot`. The factories live in the
[library's Riot entry point](../../packages/mother-mask/src/riot).

## Run

This example uses the local `mother-mask` package. From the repository root:

```bash
bun install
bun run --cwd packages/mother-mask build
cd examples/riot-simple
bun install
bun run dev
```

Open the local URL printed by Vite. Run `bun run build` to typecheck and
build, then `bun run preview` to preview the production build.

## Use the component

```js
import { pure } from 'riot'
import { maskInput } from 'mother-mask/riot'

const field = pure(maskInput)({
  props: { mask: '999-999', onValueChange: (v) => console.log(v) },
})
field.mount(document.getElementById('phone'))

// Later, e.g. from a parent component's onUpdated:
field.update({ mask: '999-999', value: '123456' })
```

- `riot.pure` is Riot's own documented escape hatch for mounting
  non-Riot-templated content as a node in a Riot tree, bypassing the
  `.riot`-file/compiler pipeline entirely — a direct fit here, since this
  wrapper's only job is to own one plain `<input>` imperatively.
- `mount`/`update`/`unmount` serve the same purpose as a full `.riot`
  component's `onMounted`/`onUnmounted`, with one difference: `update()`
  isn't automatically re-invoked by reactive tracking — call it explicitly
  whenever the mask, options, or an externally-set value should change
  (see the Fill/Clear buttons in [`main.ts`](src/main.ts)).
- Renders into light DOM: the `<input>` is appended as a real child of the
  host element, and a host `id` is moved onto it once, right after
  mounting, so `<label for>` keeps resolving correctly.
- `maskDecimal` always sets `inputmode="decimal"` and reports
  `onValueChange(value, numericValue)`.

See [`main.ts`](src/main.ts) for the full example.
