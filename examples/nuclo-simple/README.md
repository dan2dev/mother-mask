# Nuclo simple example

A small Nuclo + TypeScript + Vite app using the `motherMask` and
`motherMaskDecimal` mods from `mother-mask/nuclo`. The mods live in the
[library's Nuclo entry point](../../packages/mother-mask/src/nuclo/index.ts).
Includes phone and date masks plus three decimal formats: US dollars
(including negatives), Brazilian real, and a percentage. Each field shows its
Nuclo state. The buttons fill or clear all fields programmatically.

## Run

This example uses the local `mother-mask` package. From the repository root:

```bash
bun install
bun run --cwd packages/mother-mask build
cd examples/nuclo-simple
bun install
bun run dev
```

Open the local URL printed by Vite. Run `bun run build` to typecheck and build,
then `bun run preview` to preview the production build.

## Use the mod

```ts
import 'nuclo'
import { motherMask } from 'mother-mask/nuclo'

let phone = ''

export const PhoneField = () =>
  div(
    label({ for: 'phone' }, 'Phone number'),
    input({ id: 'phone' }, motherMask('(99) 99999-9999', {
      value: () => phone,
      onChange: (next) => { phone = next; update() },
    })),
    p(() => phone),
  )
```

- `motherMask(mask, options?)` takes the same options as `bind()`;
  `motherMaskDecimal(options?)` takes the same options as `bindDecimal()`
  and calls `onChange(value, numericValue)`. Both return a plain attributes
  object, so they go wherever an `input()` builder takes attributes.
- `value` is a zero-argument function, as everywhere in Nuclo: it becomes a
  dynamic attribute re-read on every `update()`. An external change is
  formatted before it is written; an echo of the mod's own `onChange` leaves
  the input, its caret and any IME draft untouched.
- Binding happens in `onMount`, which Nuclo never runs on the server, so this
  is SSR-safe by construction. The disposer `bind()` returns is the hook's
  cleanup, so Nuclo disposes the binding when it removes the element.

See [`App.ts`](src/App.ts) for the full set of examples.
