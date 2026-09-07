# React simple example

A small React + TypeScript + Vite app using `InputMask` and `InputDecimal` from
`mother-mask/react`. The components live in the [library's React entry point](../../packages/mother-mask/src/react/index.ts).
Includes controlled phone, date, and currency masks, live React state, and buttons
that fill or clear the fields programmatically.

## Run

This example uses the local `mother-mask` package. From the repository root:

```bash
bun install
bun run --cwd packages/mother-mask build
cd examples/react-simple
bun install
bun run dev
```

Open the local URL printed by Vite. Run `bun run build` to typecheck and build,
then `bun run preview` to preview the production build.

## Use the component

```tsx
import { useState } from 'react'
import { InputMask } from 'mother-mask/react'

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

- `mask` accepts a pattern string or an ordered array of patterns, shortest first.
- `options` forwards `mother-mask` binding options, such as `{ eager: false }`.
  Keep option objects and mask arrays outside the component, or memoize them,
  to avoid rebinding on every render.
- `onValueChange` receives the formatted string from the library's callback.
  Use it instead of React's `onChange`, and update controlled state synchronously.
  Initial values and parent updates do not fire this callback.
- `value` makes the component controlled. Pass `value={phone}` and
  `onValueChange={setPhone}` to bind React state. Set `phone` to a new string to
  update the input, or `''` to clear it. Raw strings are formatted for display;
  user edits report formatted strings. If the parent rejects an edit by keeping
  the old value, the input restores that value.
- `defaultValue` accepts an initial string, formatted with `process()` before
  binding. As with a native uncontrolled input, subsequent changes to
  `defaultValue` do not update the field. Omit `value` to use this uncontrolled
  mode; use either `value` or `defaultValue` and keep the mode stable.
- Native input props such as `id`, `name`, `disabled`, `required`, `inputMode`,
  and accessibility attributes are forwarded. The input uses `type="text"`.
- `ref` exposes the native input for focus, selection, and form-library refs
  (this example uses React 19's ref prop). Update controlled values through
  state instead of assigning `ref.current.value`.

The wrapper synchronizes controlled values through a DOM ref before paint.
Echoing a formatted edit back into `value` leaves the DOM value and caret alone,
preserving mid-string edits and separator deletion. External value changes and
changes to `mask` or `options` format the current value and replace the binding
so its editing history stays in sync. Cleanup disposes the binding on unmount,
including React Strict Mode's development setup/cleanup cycle.

Both wrappers use React 19.2's
[`useEffectEvent`](https://react.dev/reference/react/useEffectEvent) to read the
latest change callback without rebinding. A small layout effect synchronizes
external values before paint; it deliberately checks every commit to restore a
controlled value when the parent rejects an edit. Echoed edits do not rebind or
rewrite the DOM. Each replaced or unmounted binding runs its disposer, releasing
listeners and pending animation frames, and clears the stored handle. React also
clears the forwarded ref during unmount or Activity hide.

Composition drafts are preserved during unrelated renders. Configuration
changes made while hidden apply when the field returns. React-provided native
attributes survive rebinding. A native form reset keeps controlled values and
restores uncontrolled fields to the original `defaultValue` using the current
mask/options; canceled resets are respected. Resets, readonly fields, and
disabled fields do not emit `onValueChange`.

See React's [effect guidance](https://react.dev/reference/react/useEffect#connecting-to-an-external-system)
for integrating external libraries this way.

## Decimal input

`InputDecimal` wraps `bindDecimal` with the same controlled/uncontrolled behavior
and ref support as `InputMask`. It uses `type="text"` and defaults to
`inputMode="decimal"` so formatted values can include separators and currency text.

```tsx
import { useState } from 'react'
import { formatDecimalValue, InputDecimal } from 'mother-mask/react'

const options = { decimalPlaces: 2, prefix: '$', allowNegative: true }

export function AmountField() {
  const [amount, setAmount] = useState('')

  return (
    <>
      <label htmlFor="amount">Amount</label>
      <InputDecimal
        id="amount"
        name="amount"
        options={options}
        value={amount}
        onValueChange={setAmount}
      />
      <button type="button" onClick={() => setAmount(formatDecimalValue(1234.5, options))}>
        Set $1,234.50
      </button>
      <button type="button" onClick={() => setAmount('')}>Clear</button>
    </>
  )
}
```

- `options` forwards decimal binding options, including `decimalPlaces`,
  `numberPlaces`, `separator`, `decimalSeparator`, `prefix`, `suffix`,
  `segmented`, and `allowNegative`. Keep the object stable across renders.
  Omitting `decimalPlaces` allows an optional, unlimited fraction.
- `value` and `defaultValue` are strings. Initial and external values are
  formatted with `processDecimal`; strings must use the configured decimal
  separator. For a JS number, use `formatDecimalValue(number, options)` first.
  When changing locale separators, supply a value formatted for the new options.
- `onValueChange(formattedValue, numericValue)` runs after user edits. The first
  argument preserves editable text such as a trailing decimal separator or a
  lone minus sign. Keep that string in controlled state; use the second argument
  when you need the parsed number. Empty input reports `('', 0)`.
- To observe both values, use
  `onValueChange={(formatted, numeric) => setAmount({ formatted, numeric })}`
  with `value={amount.formatted}`, as shown in [`App.tsx`](src/App.tsx).
- Parent updates and initial formatting do not fire `onValueChange`. Use
  `defaultValue="1234.50"` without `value` for an uncontrolled field.

## Lifecycle and memory tests

After the setup above, run these commands from this example's directory:

```bash
bunx playwright install chromium firefox webkit
bun run test
```

The browser suite imports the built `mother-mask/react` entry and runs functional
tests in Chromium, Firefox, and WebKit. It covers both wrappers in Strict Mode: controlled and
uncontrolled values, current callbacks without extra bindings, native refs,
Activity hide/show, rebinding, caret behavior, IME drafts, native form reset,
readonly/disabled fields, and queued-frame cancellation.
Memory tests run only in Chromium, where forced garbage collection is available.
They check WeakRefs to detached
inputs, callbacks, and options. A stress test performs 600 additional mounts
with option changes, queued reset microtasks, and pending frames after warm-up, checking retained DOM nodes,
event listeners, and heap growth. Listener/frame assertions run immediately
after unmount; heap checks advance React's bounded development deletion history
with a native-element commit before measuring. These tests guard the exercised lifecycle
paths; they are not a guarantee for every possible application or browser.
