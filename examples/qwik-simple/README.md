# Qwik simple example

A small TypeScript + Vite app using `InputMask` and `InputDecimal` from
`mother-mask/qwik`. The components live in the
[library's Qwik entry point](../../packages/mother-mask/src/qwik) — see
that entry's README section for why it ships close to raw source instead
of pre-bundled.

## Run

This example uses the local `mother-mask` package. From the repository root:

```bash
bun install
bun run --cwd packages/mother-mask build
cd examples/qwik-simple
bun install
bun run dev
```

Open the local URL printed by Vite. Run `bun run build` to typecheck and
build, then `bun run preview` to preview the production build.

## Use the component

```tsx
import { component$, useSignal } from '@builder.io/qwik'
import { InputMask } from 'mother-mask/qwik'

export default component$(() => {
  const phone = useSignal('')
  return <InputMask mask="999-999" value={phone.value} onValueChange$={(v) => (phone.value = v)} />
})
```

- Both components accept `value` and `onValueChange$` (a QRL — inline
  arrow functions work). `mask`/`options` work the same as the React
  version.
- Binding happens in `useVisibleTask$`, a hook Qwik only ever runs on the
  client once the element is visible, reactively rebinding whenever
  `mask`/`options`/`value` change and ignoring an echo of the component's
  own `onValueChange$`.
- `InputDecimal` defaults to `inputMode="decimal"` and reports
  `onValueChange$(value, numericValue)`.

See [`root.tsx`](src/root.tsx) for the full example.
