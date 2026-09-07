# Preact simple example

A small Preact + TypeScript + Vite app using `InputMask` and `InputDecimal`
from `mother-mask/preact`. The components live in the
[library's Preact entry point](../../packages/mother-mask/src/preact/index.ts).
Includes phone and date masks plus three decimal formats: US dollars
(including negatives), Brazilian real, and a percentage. Each field shows its
Preact state. The buttons fill or clear all fields programmatically.

## Run

This example uses the local `mother-mask` package. From the repository root:

```bash
bun install
bun run --cwd packages/mother-mask build
cd examples/preact-simple
bun install
bun run dev
```

Open the local URL printed by Vite. Run `bun run build` to typecheck and build,
then `bun run preview` to preview the production build.

## Use the component

```tsx
import { useState } from 'preact/hooks'
import { InputMask } from 'mother-mask/preact'

export function PhoneField() {
  const [phone, setPhone] = useState('')

  return (
    <>
      <label htmlFor="phone">Phone number</label>
      <InputMask
        id="phone"
        name="phone"
        mask="(99) 99999-9999"
        value={phone}
        inputMode="tel"
        onValueChange={setPhone}
      />
      <p>{phone}</p>
    </>
  )
}
```

- `value`/`onValueChange` work the same as the React version: pass
  `value={phone}` and update state in `onValueChange` to keep the field
  controlled; omit `value` and use `defaultValue` for an uncontrolled field.
- Access to the underlying `<input>` is via an `inputRef` prop, not `ref` —
  Preact passes `ref` on a function component straight to the built-in
  element ref rather than forwarding it as a prop (unlike React 19), so
  reusing `ref` would need `preact/compat`. This entry avoids that extra
  weight entirely.
- This is a leaner port than the React version: it drops the IME composition
  and native-`reset` edge-case handling built for React-DOM's synthetic
  event layer, which doesn't exist in Preact. The dispose guarantee on every
  rebind/unmount is identical.
- `InputDecimal` defaults to `inputMode="decimal"` and reports
  `onValueChange(formattedValue, numericValue)`.

See [`App.tsx`](src/App.tsx) for the full set of examples.
