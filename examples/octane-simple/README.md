# Octane simple example

A small TypeScript + Vite app using `InputMask` and `InputDecimal` from
`mother-mask/octane`. The components live in the
[library's Octane entry point](../../packages/mother-mask/src/octane) —
distributed as raw `.tsx` source, so this example's own `@octanejs/vite-plugin`
compiles them the same way it compiles `App.tsx`.

## Run

This example uses the local `mother-mask` package. From the repository root:

```bash
bun install
bun run --cwd packages/mother-mask build
cd examples/octane-simple
bun install
bun run dev
```

Open the local URL printed by Vite. Run `bun run build` to typecheck and
build, then `bun run preview` to preview the production build.

## Use the component

```tsx
/** @jsxImportSource octane */
import { useState } from 'octane'
import { InputMask } from 'mother-mask/octane'

export function PhoneField() {
  const [phone, setPhone] = useState('')
  return <InputMask mask="(99) 99999-9999" value={phone} onValueChange={setPhone} />
}
```

- `value`/`onValueChange` work the same as the React version. Access to the
  underlying `<input>` is via an `inputRef` prop, not `ref` (this is a
  plain function component, not `forwardRef`).
- Binding happens in `useLayoutEffect`, reconciling on every commit and
  rebinding only if the mask, options, or an externally-set value actually
  changed; an echo of the component's own `onValueChange` is ignored.
- `InputDecimal` defaults to `inputMode="decimal"` and reports
  `onValueChange(value, numericValue)`.

See [`App.tsx`](src/App.tsx) for the full example.
