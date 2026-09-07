# SolidJS simple example

A small SolidJS + TypeScript + Vite app using the `motherMask` and
`motherMaskDecimal` custom directives from `mother-mask/solid`. The
directives live in the
[library's Solid entry point](../../packages/mother-mask/src/solid/index.ts).
Includes phone and date masks plus three decimal formats: US dollars
(including negatives), Brazilian real, and a percentage. Each field shows its
Solid signal state. The buttons fill or clear all fields programmatically.

## Run

This example uses the local `mother-mask` package. From the repository root:

```bash
bun install
bun run --cwd packages/mother-mask build
cd examples/solid-simple
bun install
bun run dev
```

Open the local URL printed by Vite. Run `bun run build` to typecheck and build,
then `bun run preview` to preview the production build.

## Use the directive

```tsx
import { createSignal } from 'solid-js'
import { motherMask } from 'mother-mask/solid'

export function PhoneField() {
  const [phone, setPhone] = createSignal('')

  return (
    <>
      <label for="phone">Phone number</label>
      <input use:motherMask={{ mask: '(99) 99999-9999', value: phone(), onValueChange: setPhone }} />
      <p>{phone()}</p>
    </>
  )
}
```

- `use:motherMask` takes `{ mask, options?, value?, onValueChange? }`;
  `use:motherMaskDecimal` takes `{ options?, value?, onValueChange? }` and
  calls `onValueChange(value, numericValue)`.
- Reading a signal (e.g. `value: phone()`) inside the directive's params
  object is what makes it reactive — Solid's `createEffect` inside the
  directive tracks exactly the signals read there, so it rebinds only when
  `mask`, `options`, or an externally-set `value` actually changes.
- Directives run when Solid mounts the element to the live DOM and are never
  invoked during server-side rendering, so this is SSR-safe by construction
  — no manual `typeof window` check needed.
- `onCleanup` inside the directive guarantees `dispose()` runs exactly once,
  both before every rebind and when the element unmounts.

See [`App.tsx`](src/App.tsx) for the full set of examples.
