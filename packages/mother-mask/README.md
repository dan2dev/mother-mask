# mother-mask

Lightweight input masks for browser forms. Zero runtime dependencies, written in TypeScript, and published with ESM, CJS, and UMD builds.

[npm](https://www.npmjs.com/package/mother-mask) | [Documentation and live examples](https://mother-mask.dan2.dev/)

Format phone numbers, dates, identifiers, and decimal inputs with static patterns,
custom tokens, or a mask chosen from the value. Formatting does **not** validate
dates, checksums, card networks, or whether an identifier exists; validate those
separately in your application.

[Basic usage](#basic-usage) · [Decimals](#decimal-inputs) ·
[Patterns](#pattern-syntax) · [Custom tokens](#custom-tokens-and-transforms) ·
[Dynamic masks](#content-dependent-masks) · [Editing](#segmented-editing) · [API](#api)

## Install

```bash
npm install mother-mask
```

```bash
pnpm add mother-mask
```

## Basic Usage

Use a text input with an appropriate keyboard hint:

```html
<input id="phone" type="text" inputmode="tel" aria-label="Phone number" />
```

```ts
import { bind } from 'mother-mask'

const input = document.querySelector<HTMLInputElement>('#phone')!

const dispose = bind(input, '(99) 99999-9999')

// Later, remove listeners and allow rebinding.
dispose()
```

Use an ordered mask array for values with more than one length. Order by data
capacity, shortest first; selection uses the number of accepted characters, not
their content:

```ts
bind(input, ['(99) 9999-9999', '(99) 99999-9999'])
```

Use [`resolveMask`](#content-dependent-masks) when a prefix determines the layout.

Listen for changes with either a callback or an options object:

```ts
bind(input, '999.999.999-99', (value) => {
  document.querySelector<HTMLInputElement>('#cpf-value')!.value = value
})

bind(input, '999.999.999-99', {
  onChange: (value) => {
    document.querySelector<HTMLInputElement>('#cpf-value')!.value = value
  },
})
```

Both binders add `autocomplete="off"`, `autocorrect="off"`,
`autocapitalize="off"`, and `spellcheck="false"` when those attributes are
absent. Override the defaults through the same typed options object:

```ts
bind(input, '(99) 99999-9999', {
  autocomplete: 'tel',
  autocorrect: 'on',
  autocapitalize: 'words',
  spellcheck: true,
})
```

Bind each input once. Calling `bind` or `bindDecimal` on an already-bound input
does nothing; dispose the existing binding before changing its options. In a UI
framework, bind after the input mounts and call the disposer during cleanup.
Disposal removes listeners, pending frames, and attributes added by the library;
attributes that were already present are preserved.

Binding does not format the initial value or fire an initial callback. Use the
[pure helpers](#formatting-without-an-input) to prepare values before binding.
Assignments to `input.value` do not dispatch an input event, so format programmatic
updates yourself as well.

## React

Import the React 19.2 components from the separate `mother-mask/react` entry:

```tsx
import { useState } from 'react'
import { InputMask, InputDecimal, formatDecimalValue } from 'mother-mask/react'

// Keep option objects and mask arrays stable across renders.
const currency = { decimalPlaces: 2, prefix: '$', allowNegative: true }

export function Form() {
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')

  return (
    <>
      <label htmlFor="phone">Phone</label>
      <InputMask
        id="phone"
        name="phone"
        mask="(99) 99999-9999"
        inputMode="tel"
        value={phone}
        onValueChange={setPhone}
      />
      <label htmlFor="amount">Amount</label>
      <InputDecimal
        id="amount"
        name="amount"
        options={currency}
        value={amount}
        onValueChange={setAmount}
      />
      <button type="button" onClick={() => setAmount(formatDecimalValue(1234.5, currency))}>
        Set amount
      </button>
    </>
  )
}
```

`mother-mask/react` re-exports every core function, class, and type as well as
`InputMask`, `InputDecimal`, `InputMaskProps`, and `InputDecimalProps`. Its core
exports are aliases to `mother-mask`, sharing the same implementation and caches.
The core ESM, CommonJS, and UMD builds remain independent of React. React is an
optional peer dependency required only when importing `mother-mask/react`;
the supported version range is `^19.2.0`. React is not bundled.

- Both components accept controlled string `value` or uncontrolled string
  `defaultValue`. Update controlled state synchronously in `onValueChange`;
  assigning `''` clears the input. Use `formatDecimalValue` to convert JS numbers
  to decimal strings using the same options as the field.
- `InputMask` accepts `mask` and optional `BindOptions` (without `onChange`).
  `onValueChange(value)` reports the formatted string.
- `InputDecimal` accepts optional `BindDecimalOptions` (without `onChange`).
  `onValueChange(value, numericValue)` reports the formatted string and parsed
  JS number; empty input reports `('', 0)`. Decimal strings use the configured
  decimal separator. Preserve the string in state so intermediate edits work.
- Native input props and `ref` are forwarded. Both use `type="text"`;
  `InputDecimal` defaults to `inputMode="decimal"`. Use `onValueChange` instead
  of React's `onChange`. Initial formatting and parent updates do not fire it.
- The components dispose listeners and pending frames on replacement, unmount,
  and Activity hide. Controlled echoes preserve the mask's caret and editing
  state. Keep options and mask arrays stable to avoid unnecessary rebinding.
- IME composition drafts survive unrelated renders. Configuration changes made
  while an Activity is hidden are applied when it becomes visible again.
  Native attributes supplied through React are preserved across rebinding.
- Native form reset keeps a controlled field's current value. An uncontrolled
  field resets to its original `defaultValue`, formatted with its current
  options. Canceled resets are respected; reset does not fire `onValueChange`.
  This also works for inputs associated with a form through the `form` prop.
  Readonly and disabled fields do not emit change callbacks.

The React entry preserves a `use client` directive for React Server Components;
server-only code can continue importing pure helpers from `mother-mask`.
See the [React example](https://github.com/dan2dev/mother-mask/tree/main/examples/react-simple)
for a runnable app and browser lifecycle/memory tests.

## Vue

Import the custom directives from the separate `mother-mask/vue` entry:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { vMotherMask, vMotherMaskDecimal, formatDecimalValue } from 'mother-mask/vue'

// Keep the options object stable across renders.
const currency = { decimalPlaces: 2, prefix: '$', allowNegative: true }

const phone = ref('')
const amount = ref('')
</script>

<template>
  <label for="phone">Phone</label>
  <input
    id="phone"
    name="phone"
    inputmode="tel"
    v-mother-mask="{ mask: '(99) 99999-9999', value: phone, onValueChange: (v) => (phone = v) }"
  />

  <label for="amount">Amount</label>
  <input
    id="amount"
    name="amount"
    v-mother-mask-decimal="{ options: currency, value: amount, onValueChange: (v) => (amount = v) }"
  />

  <button type="button" @click="amount = formatDecimalValue(1234.5, currency)">
    Set amount
  </button>
</template>
```

`mother-mask/vue` re-exports every core function, class, and type as well as
the `vMotherMask` and `vMotherMaskDecimal` directives. Its core exports are
aliases to `mother-mask`, sharing the same implementation and caches. The
core ESM, CommonJS, and UMD builds remain independent of Vue. Vue is an
optional peer dependency required only when importing `mother-mask/vue`; the
supported version range is `^3.5.0`. Vue is not bundled.

- `vMotherMask` takes `{ mask, options?, value?, onValueChange? }`;
  `vMotherMaskDecimal` takes `{ options?, value?, onValueChange? }` and calls
  `onValueChange(value, numericValue)`. `vMotherMaskDecimal` always sets
  `inputmode="decimal"` on mount.
- Both are exported pre-named `v` + PascalCase — Vue's own convention for a
  local directive in `<script setup>` — so `import { vMotherMask } from
  'mother-mask/vue'` alone makes `v-mother-mask="..."` available in the
  template with no import rename. Register it globally instead with
  `app.directive('mother-mask', vMotherMask)` to make `v-mother-mask`
  available in every component.
- `mounted` runs only once Vue mounts the element to the live DOM — Vue
  never invokes directive hooks during server-side rendering, so this is
  SSR-safe with no `typeof window` guard needed. `updated` runs on every
  re-render of the owning component (not only when the bound value actually
  changes), so it rebinds only if the mask, options, or an externally-set
  value actually changed — an echo of the directive's own `onValueChange` is
  ignored. `beforeUnmount` guarantees `dispose()` runs exactly once.
- A `declare module 'vue' { interface GlobalDirectives { ... } }`
  augmentation ships alongside each directive, so a globally-registered
  `v-mother-mask`/`v-mother-mask-decimal` also type-checks in templates
  without extra setup.

See the [Vue example](https://github.com/dan2dev/mother-mask/tree/main/examples/vue-simple)
for a runnable app.

## Angular

Import the standalone directives from the separate `mother-mask/angular` entry:

```ts
import { Component } from '@angular/core'
import { MotherMaskDecimalDirective, MotherMaskDirective, formatDecimalValue } from 'mother-mask/angular'

// Keep option objects stable across change detection cycles.
const currency = { decimalPlaces: 2, prefix: '$', allowNegative: true }

@Component({
  standalone: true,
  imports: [MotherMaskDirective, MotherMaskDecimalDirective],
  template: `
    <label for="phone">Phone</label>
    <input id="phone" name="phone" motherMask="(99) 99999-9999" inputmode="tel" [(value)]="phone" />

    <label for="amount">Amount</label>
    <input id="amount" name="amount" motherMaskDecimal [motherMaskDecimalOptions]="currency" [(value)]="amount" />

    <button type="button" (click)="amount = formatDecimalValue(1234.5, currency)">Set amount</button>
  `,
})
export class FormComponent {
  readonly currency = currency
  // Plain fields, not signals: the directives below bind `value` through
  // classic @Input/@Output (see why in the notes under this example), so
  // `[(value)]` assigns to this property directly on each change.
  phone = ''
  amount = ''
}
```

`mother-mask/angular` re-exports every core function, class, and type as well
as `MotherMaskDirective` and `MotherMaskDecimalDirective`. Its core exports
are aliases to `mother-mask`, sharing the same implementation and caches. The
core ESM, CommonJS, and UMD builds remain independent of Angular. Angular is
an optional peer dependency required only when importing
`mother-mask/angular`; the supported version range is `^19.0.0 || ^20.0.0`.
Angular is not bundled.

- Both directives are attribute selectors (`input[motherMask]` and
  `input[motherMaskDecimal]`) and support `[(value)]` two-way binding.
  `MotherMaskDirective` accepts `motherMask` (a `MaskPattern`) and optional
  `[motherMaskOptions]`; `MotherMaskDecimalDirective` accepts optional
  `[motherMaskDecimalOptions]` and additionally emits `(numericValueChange)`.
- The binding lifecycle is Signals-driven: `ngOnChanges` pushes the current
  mask/options/value into an internal `signal`, and `afterRenderEffect` —
  which Angular runs only on the browser, never during server-side
  rendering, so no manual `typeof window` check is needed — reactively
  (re)binds whenever that signal changes. `ngOnDestroy` disposes the
  binding, and it is disposed and recreated whenever the mask/options change
  or `value` is updated externally.
- `value`/`valueChange` (and `numericValueChange`) use classic
  `@Input`/`@Output` rather than the functional `input()`/`model()` API,
  since Angular only wires signal-based inputs to template bindings through
  the ngtsc compiler's static analysis — unavailable without the Angular CLI
  build toolchain. Both forms compile to the same `[(value)]` template
  syntax for consumers.
- `MotherMaskDecimalDirective` always sets `inputmode="decimal"` via a host
  binding.

See the [Angular example](https://github.com/dan2dev/mother-mask/tree/main/examples/angular-simple)
for a runnable app.

## Svelte

Import the Svelte 5 actions from the separate `mother-mask/svelte` entry:

```svelte
<script lang="ts">
  import { motherMask, motherMaskDecimal, formatDecimalValue } from 'mother-mask/svelte'

  // Keep the options object stable across renders.
  const currency = { decimalPlaces: 2, prefix: '$', allowNegative: true }

  let phone = $state('')
  let amount = $state('')
</script>

<label for="phone">Phone</label>
<input
  id="phone"
  name="phone"
  inputmode="tel"
  use:motherMask={{ mask: '(99) 99999-9999', value: phone, onValueChange: (v) => (phone = v) }}
/>

<label for="amount">Amount</label>
<input
  id="amount"
  name="amount"
  use:motherMaskDecimal={{ options: currency, value: amount, onValueChange: (v) => (amount = v) }}
/>

<button type="button" onclick={() => (amount = formatDecimalValue(1234.5, currency))}>
  Set amount
</button>
```

`mother-mask/svelte` re-exports every core function, class, and type as well
as the `motherMask` and `motherMaskDecimal` actions. Its core exports are
aliases to `mother-mask`, sharing the same implementation and caches. The
core ESM, CommonJS, and UMD builds remain independent of Svelte, and this
entry has no runtime dependency on the `svelte` package at all — it's plain
TypeScript, usable from any Svelte 5 (or 4) component via `use:`.

- Actions run only once Svelte mounts the element to the live DOM, and are
  torn down when it leaves — Svelte never invokes `use:` directives during
  server-side rendering, so this is SSR-safe with no `typeof window` guard.
  `destroy()` guarantees `dispose()` runs exactly once.
- `update(params)` is Svelte's own reactivity hook: whenever a `$state`
  value read inside the `use:motherMask={...}` expression changes — `mask`,
  `options`, or `value` — Svelte re-invokes it with the new params, and the
  action rebinds only if the mask/options changed or `value` was set
  externally (an echo of the action's own `onValueChange` is ignored).
- `motherMask` takes `{ mask, options?, value?, onValueChange? }`;
  `motherMaskDecimal` takes `{ options?, value?, onValueChange? }` and calls
  `onValueChange(value, numericValue)`. `motherMaskDecimal` always sets
  `inputmode="decimal"` on mount.

See the [Svelte example](https://github.com/dan2dev/mother-mask/tree/main/examples/svelte-simple)
for a runnable app.

## SolidJS

Import the custom directives from the separate `mother-mask/solid` entry:

```tsx
import { createSignal } from 'solid-js'
import { motherMask, motherMaskDecimal, formatDecimalValue } from 'mother-mask/solid'

// Keep the options object stable across renders.
const currency = { decimalPlaces: 2, prefix: '$', allowNegative: true }

export function Form() {
  const [phone, setPhone] = createSignal('')
  const [amount, setAmount] = createSignal('')

  return (
    <>
      <label for="phone">Phone</label>
      <input
        id="phone"
        name="phone"
        inputmode="tel"
        use:motherMask={{ mask: '(99) 99999-9999', value: phone(), onValueChange: setPhone }}
      />

      <label for="amount">Amount</label>
      <input
        id="amount"
        name="amount"
        use:motherMaskDecimal={{ options: currency, value: amount(), onValueChange: setAmount }}
      />

      <button type="button" onClick={() => setAmount(formatDecimalValue(1234.5, currency))}>
        Set amount
      </button>
    </>
  )
}
```

Directive props are typed via `declare module 'solid-js' { namespace JSX { interface Directives { ... } } }`,
so `use:motherMask`/`use:motherMaskDecimal` type-check without extra setup once
`mother-mask/solid` is imported anywhere in your project.

`mother-mask/solid` re-exports every core function, class, and type as well
as the `motherMask` and `motherMaskDecimal` directives. Its core exports are
aliases to `mother-mask`, sharing the same implementation and caches. The
core ESM, CommonJS, and UMD builds remain independent of Solid. Solid is an
optional peer dependency required only when importing `mother-mask/solid`;
the supported version range is `^1.9.0`. Solid is not bundled.

- Directives run when Solid mounts the element to the live DOM. Solid's
  server-rendering path never instantiates real elements or invokes `use:`
  callbacks, so this is SSR-safe with no `typeof window` guard needed.
- `createEffect` gives fine-grained reactivity: it tracks only the signals
  actually read while building the params object passed to `use:motherMask`
  (e.g. `value: phone()`), and reruns exactly when those change — rebinding
  only if the mask, options, or an externally-set value actually changed
  (an echo of the directive's own `onValueChange` is ignored). `onCleanup`
  guarantees `dispose()` runs exactly once, both before every rebind and
  when the element unmounts.
- `motherMask` takes `{ mask, options?, value?, onValueChange? }`;
  `motherMaskDecimal` takes `{ options?, value?, onValueChange? }` and calls
  `onValueChange(value, numericValue)`, and always sets `inputmode="decimal"`.

See the [SolidJS example](https://github.com/dan2dev/mother-mask/tree/main/examples/solid-simple)
for a runnable app.

## Preact

Import the Preact components from the separate `mother-mask/preact` entry:

```tsx
import { useState } from 'preact/hooks'
import { InputMask, InputDecimal, formatDecimalValue } from 'mother-mask/preact'

// Keep option objects and mask arrays stable across renders.
const currency = { decimalPlaces: 2, prefix: '$', allowNegative: true }

export function Form() {
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')

  return (
    <>
      <label htmlFor="phone">Phone</label>
      <InputMask
        id="phone"
        name="phone"
        mask="(99) 99999-9999"
        inputMode="tel"
        value={phone}
        onValueChange={setPhone}
      />
      <label htmlFor="amount">Amount</label>
      <InputDecimal
        id="amount"
        name="amount"
        options={currency}
        value={amount}
        onValueChange={setAmount}
      />
      <button type="button" onClick={() => setAmount(formatDecimalValue(1234.5, currency))}>
        Set amount
      </button>
    </>
  )
}
```

`mother-mask/preact` re-exports every core function, class, and type as well
as `InputMask`, `InputDecimal`, `InputMaskProps`, and `InputDecimalProps`.
Its core exports are aliases to `mother-mask`, sharing the same
implementation and caches. The core ESM, CommonJS, and UMD builds remain
independent of Preact. Preact is an optional peer dependency required only
when importing `mother-mask/preact`; the supported version range is
`^10.0.0`. Preact is not bundled, and this entry never imports
`preact/compat` — it's built directly on `preact` + `preact/hooks` to keep
Preact's footprint advantage intact.

- Both components accept controlled string `value` or uncontrolled string
  `defaultValue`, same as the React version. `InputMask` accepts `mask` and
  optional `BindOptions`; `InputDecimal` accepts optional
  `BindDecimalOptions` and reports `(value, numericValue)`.
- Access to the underlying `<input>` is via an `inputRef` prop, not `ref`:
  Preact passes `ref` on a function component straight through to the
  built-in element/instance ref rather than forwarding it as a normal prop
  (unlike React 19), so reusing `ref` here would require `preact/compat`'s
  `forwardRef` — extra weight this entry deliberately avoids.
- This is a leaner port than the React version: it drops the IME
  composition and native-`reset` edge-case handling built for React-DOM's
  synthetic event layer (which doesn't exist in Preact), keeping to
  `useLayoutEffect`/`useRef`/`useState` from `preact/hooks`. The dispose
  guarantee is identical — every rebind and unmount releases the previous
  binding first.

See the [Preact example](https://github.com/dan2dev/mother-mask/tree/main/examples/preact-simple)
for a runnable app.

## Lit

Import the `<lit-mask-input>` and `<lit-mask-decimal>` custom elements from
the separate `mother-mask/lit` entry — importing the module registers both
elements as a side effect:

```html
<script type="module">
  import 'mother-mask/lit'
</script>

<label for="phone">Phone</label>
<lit-mask-input id="phone" name="phone" mask="(99) 99999-9999" input-mode="tel"></lit-mask-input>

<label for="amount">Amount</label>
<lit-mask-decimal id="amount" name="amount"></lit-mask-decimal>

<script type="module">
  const phone = document.getElementById('phone')
  phone.addEventListener('value-change', (e) => console.log(e.detail))

  const amount = document.getElementById('amount')
  amount.options = { decimalPlaces: 2, prefix: '$', allowNegative: true }
  amount.addEventListener('numeric-value-change', (e) => console.log(e.detail))
</script>
```

`mother-mask/lit` re-exports every core function, class, and type as well as
the `LitMaskInput` and `LitMaskDecimal` classes (for `instanceof` checks or
subclassing). Its core exports are aliases to `mother-mask`, sharing the
same implementation and caches. The core ESM, CommonJS, and UMD builds
remain independent of Lit. Lit is an optional peer dependency required only
when importing `mother-mask/lit`; the supported version range is `^3.0.0`.
Lit is not bundled.

- Both elements render into **light DOM** (`createRenderRoot()` returns
  `this`, not a shadow root), so a page's own `<label for>` and global CSS
  reach the native `<input>` directly, the same as any other text field.
- `<lit-mask-input>` accepts `mask` (a plain string works as an HTML
  attribute; assign an array/function `MaskPattern` as a JS property) and an
  `options` object (JS property only — objects can't be expressed as plain
  attributes). It emits `value-change` (`detail: string`).
  `<lit-mask-decimal>` accepts an `options` object and emits both
  `value-change` and `numeric-value-change` (`detail: number`), and always
  sets `inputmode="decimal"`.
- Binding happens in `firstUpdated` (Lit's DOM-is-ready hook) and disposes
  in `disconnectedCallback` — both fire only on the browser, so there's no
  `typeof window` guard to write. `updated` reactively rebinds whenever
  `mask`/`options` change or `value` is set externally; an echo of the
  element's own `value-change` event is ignored.
- A curated set of native attributes forward to the inner `<input>`: `name`,
  `placeholder`, `disabled`, `readonly`, `required`, `input-mode`, and
  `autocomplete`. `id` is a special case: `<lit-mask-input id="phone">`
  writes `id="phone"` onto the custom element itself, not the `<input>` it
  renders — a `<label for="phone">` would then resolve to the (unfocusable)
  host instead of the actual control. After first render, the element moves
  its own `id` onto the rendered `<input>` and removes it from itself, so
  `<label for="phone">` keeps working exactly as if `<lit-mask-input>`
  weren't there.

## Stencil

Import the `<stencil-mask-input>` and `<stencil-mask-decimal>` custom
elements from their own `mother-mask/stencil/mask-input` and
`mother-mask/stencil/mask-decimal` entries — each registers its element as
an import side effect:

```html
<script type="module">
  import 'mother-mask/stencil/mask-input'
  import 'mother-mask/stencil/mask-decimal'
</script>

<label for="phone">Phone</label>
<stencil-mask-input id="phone" name="phone" mask="(99) 99999-9999" input-mode="tel"></stencil-mask-input>

<label for="amount">Amount</label>
<stencil-mask-decimal id="amount" name="amount"></stencil-mask-decimal>

<script type="module">
  const phone = document.getElementById('phone')
  phone.addEventListener('value-change', (e) => console.log(e.detail))

  const amount = document.getElementById('amount')
  amount.options = { decimalPlaces: 2, prefix: '$', allowNegative: true }
  amount.addEventListener('numeric-value-change', (e) => console.log(e.detail))
</script>
```

Stencil components are fundamentally a compiled artifact — `@Component`,
`@Prop`, `@Event`, and friends are erased by the Stencil compiler at build
time and have no meaningful runtime implementation on their own, so (unlike
every other integration in this README) `mother-mask/stencil` is **not**
built by the same tsdown pipeline as the rest of this package; it's a
separate Stencil project ([`stencil-src/`](../../packages/mother-mask/stencil-src))
compiled with the Stencil CLI's `dist-custom-elements` output target and
copied into `dist/stencil` as part of `bun run build`. Two consequences
follow from that:

- **No `mother-mask/stencil` barrel re-exporting core helpers or a
  `@stencil/core` peer dependency.** The Stencil compiler bundles
  `mother-mask`'s core logic directly into each component (there's no
  shared module identity/cache with a page's own `mother-mask` import, the
  way the other framework entries alias `export * from 'mother-mask'`), and
  bundles its own tiny runtime too (`externalRuntime: false`) — so
  `<stencil-mask-input>`/`<stencil-mask-decimal>` have **zero runtime
  dependencies** at all, usable on any page. Import core helpers like
  `formatDecimalValue` from `mother-mask` directly.
- Each component is its own tree-shakeable module (`mask-input`,
  `mask-decimal`) rather than one combined entry, matching how Stencil's
  own `dist-custom-elements` output is meant to be consumed.

- `<stencil-mask-input>` accepts `mask`, `options` (JS property only), and
  a curated set of forwarded attributes: `name`, `placeholder`, `disabled`,
  `readonly`, `required`, and `input-mode` (exposed as the `inputModeAttr`
  JS property — not `inputMode`, since this class is a real `HTMLElement`
  at runtime and already declares its own incompatible `inputMode`). It
  emits `value-change` (`detail: string`). `<stencil-mask-decimal>` accepts
  `options` and emits both `value-change` and `numeric-value-change`
  (`detail: number`), and always sets `inputmode="decimal"`.
- The ref to the native `<input>` is grabbed via `render()`'s `ref`
  callback — the only point Stencil hands back a real DOM node. Binding
  itself happens in `connectedCallback` when that ref is already available
  (true on every *re*-connection — the element was moved or re-appended —
  since the ref from the first render still exists) and otherwise in
  `componentDidLoad`, which fires exactly once, right after the very first
  render actually creates that ref. Either way, both only ever run in the
  browser — Stencil's SSR/hydration path never calls them, so there's no
  `typeof window` guard to write. `@Watch('mask')`/`@Watch('options')`/
  `@Watch('value')` reactively rebind; `disconnectedCallback` always
  disposes.
- Same `id`-transfer behavior as Lit's elements (both render into light
  DOM): after first render, a host `id` moves onto the rendered `<input>`
  so `<label for>` keeps resolving to the actual control.
- Because raw `.tsx` Stencil source can't run outside the Stencil compiler,
  [`tests/stencil.test.ts`](../../packages/mother-mask/tests/stencil.test.ts)
  exercises the *built* `dist/stencil` output directly rather than the
  source — run `bun run build` before `bun run test` if you're working on
  this entry locally.

## Alpine.js

Register the `x-mask` directive from the separate `mother-mask/alpine`
entry with `Alpine.plugin(...)`:

```html
<script type="module">
  import Alpine from 'alpinejs'
  import motherMaskPlugin from 'mother-mask/alpine'

  Alpine.plugin(motherMaskPlugin)
  Alpine.start()
</script>

<div x-data="{ phone: '', amount: '' }">
  <label for="phone">Phone</label>
  <input
    id="phone"
    name="phone"
    inputmode="tel"
    x-mask="{ mask: '(99) 99999-9999', value: phone }"
    x-on:mask-change="phone = $event.detail"
  />

  <label for="amount">Amount</label>
  <input
    id="amount"
    name="amount"
    x-mask.decimal="{ options: { decimalPlaces: 2, prefix: '$', allowNegative: true }, value: amount }"
    x-on:mask-change="amount = $event.detail"
  />
</div>
```

`mother-mask/alpine` re-exports every core function, class, and type as well
as `motherMaskPlugin` (both a named export and the module's default export,
matching Alpine's own documented plugin convention — `export default
function (Alpine) { ... }`). Its core exports are aliases to `mother-mask`,
sharing the same implementation and caches. The core ESM, CommonJS, and UMD
builds remain independent of Alpine. Alpine is an optional peer dependency
required only when importing `mother-mask/alpine`; the supported version
range is `^3.0.0`. Alpine is not bundled.

- `x-mask` takes an expression evaluating to `{ mask, options?, value? }`;
  `x-mask.decimal` takes `{ options?, value? }`. Reading a reactive value
  inside that expression (e.g. `value: phone`) is what makes it reactive —
  Alpine's own `effect()` re-runs the directive whenever a dependency read
  while evaluating the expression changes, rebinding only if the mask,
  options, or an externally-set value actually changed.
- **Two-way binding goes through a DOM event, not `x-model`.** The
  directive dispatches `mask-change` (`detail: string`, and for
  `.decimal`, also `mask-numeric-change` with `detail: number`) — bind
  those with `x-on:mask-change`, as shown above. Combining `x-mask` with
  `x-model` on the same element isn't supported: both would independently
  react to the native `input` event with no defined ordering between them,
  and could fight over the field's live value on every keystroke.
- The directive's callback runs when Alpine walks the live DOM tree —
  Alpine has no server-rendering step, so there's no `typeof window` guard
  to write. `cleanup()` guarantees `dispose()` runs exactly once, both
  before every rebind and when the element is removed from the DOM.

## Native Web Components

Import the `<mm-mask-input>` and `<mm-mask-decimal>` custom elements from
the separate `mother-mask/web-components` entry — no framework at all,
plain `customElements`. Importing the module registers both elements as a
side effect:

```html
<script type="module">
  import 'mother-mask/web-components'
</script>

<label for="phone">Phone</label>
<mm-mask-input id="phone" name="phone" mask="(99) 99999-9999" input-mode="tel"></mm-mask-input>

<label for="amount">Amount</label>
<mm-mask-decimal id="amount" name="amount"></mm-mask-decimal>

<script type="module">
  const phone = document.getElementById('phone')
  phone.addEventListener('value-change', (e) => console.log(e.detail))

  const amount = document.getElementById('amount')
  amount.options = { decimalPlaces: 2, prefix: '$', allowNegative: true }
  amount.addEventListener('numeric-value-change', (e) => console.log(e.detail))
</script>
```

`mother-mask/web-components` re-exports every core function, class, and
type as well as the `MotherMaskInputElement` and `MotherMaskDecimalElement`
classes (for `instanceof` checks or subclassing). Its core exports are
aliases to `mother-mask`, sharing the same implementation and caches. The
core ESM, CommonJS, and UMD builds remain independent of this entry, and it
has **zero runtime dependencies** of its own — it's the one integration in
this README usable with no framework, no build step, and no peer
dependency at all; drop the `<script type="module">` tag on any page.

- Both elements render into **light DOM** (a single `<input>` appended as a
  real child, no shadow root), so a page's own `<label for>` and global CSS
  reach it directly, the same as Lit's and Stencil's entries.
- `<mm-mask-input>` accepts `mask` and `options` as either a plain
  attribute (`mask`, string patterns only) or a JS property (any
  `MaskPattern`, including arrays/functions, plus `options` objects, which
  can't be expressed as attributes at all). A curated set of other
  attributes forward to the inner `<input>`: `name`, `placeholder`,
  `disabled`, `readonly`, `required`, `input-mode`, and `autocomplete`. It
  emits `value-change` (`detail: string`). `<mm-mask-decimal>` accepts
  `options` (JS property only) and emits both `value-change` and
  `numeric-value-change` (`detail: number`), and always sets
  `inputmode="decimal"`.
- Binding happens in `connectedCallback` and disposes in
  `disconnectedCallback` — both fire only when a real document actually
  connects/disconnects the element, so there's no `typeof window` guard to
  write. `attributeChangedCallback` and the `mask`/`options`/`value`
  property setters reactively rebind; an echo of the element's own
  `value-change` event is ignored.
- Same `id`-transfer behavior as Lit's and Stencil's elements: after
  connecting, a host `id` moves onto the rendered `<input>` so
  `<label for>` keeps resolving to the actual control.

## Qwik

Import the `InputMask` and `InputDecimal` components from the separate
`mother-mask/qwik` entry:

```tsx
import { component$, useSignal } from '@builder.io/qwik'
import { InputMask, InputDecimal, formatDecimalValue } from 'mother-mask/qwik'

// Keep option objects outside the component so they stay stable across renders.
const currency = { decimalPlaces: 2, prefix: '$', allowNegative: true }

export default component$(() => {
  const phone = useSignal('')
  const amount = useSignal('')

  return (
    <>
      <label for="phone">Phone</label>
      <InputMask
        id="phone"
        name="phone"
        mask="(99) 99999-9999"
        inputMode="tel"
        value={phone.value}
        onValueChange$={(v) => (phone.value = v)}
      />

      <label for="amount">Amount</label>
      <InputDecimal
        id="amount"
        name="amount"
        options={currency}
        value={amount.value}
        onValueChange$={(v) => (amount.value = v)}
      />

      <button type="button" onClick$={() => (amount.value = formatDecimalValue(1234.5, currency))}>
        Set amount
      </button>
    </>
  )
})
```

`mother-mask/qwik` re-exports every core function, class, and type as well
as `InputMask`, `InputDecimal`, `InputMaskProps`, and `InputDecimalProps`.
The core ESM, CommonJS, and UMD builds remain independent of Qwik. Qwik is
an optional peer dependency required only when importing `mother-mask/qwik`;
the supported version range is `^1.0.0`. Qwik's own components are not
bundled here — see below for why this entry, alone among the ones in this
README, ships close to raw source.

- Both components accept `value` and `onValueChange$` (a QRL — inline
  arrow functions work; the Qwik Optimizer converts them for you). `mask`
  and `options` work the same as the React version.
- Binding happens in `useVisibleTask$`, a hook Qwik only ever runs on the
  client once the element is visible — Qwik's SSR renderer never executes
  it, so this is safe to render on the server with no `typeof window`
  guard. `track()` makes it reactive: it reruns whenever `mask`, `options`,
  or `value` change, rebinding only if the mask, options, or an
  externally-set value actually changed (an echo of the component's own
  `onValueChange$` is ignored). `cleanup()` — called both before every
  re-run and when the component unmounts — guarantees `dispose()` runs
  exactly once per binding.
- `InputDecimal` defaults to `inputMode="decimal"` and reports
  `onValueChange$(value, numericValue)`.

**Why this entry isn't built like the others.** `component$`, `useVisibleTask$`,
and every other `$`-suffixed Qwik API throw at runtime ("Optimizer should
replace all usages of $() ...") unless the Qwik Optimizer has already
processed them — there's no plain-JS fallback the way Lit's or Solid's
reactivity primitives have. So `mother-mask/qwik` is built with Vite's
documented ["library" mode](https://qwik.dev/docs/advanced/library/)
(`qwikVite()` + `build.lib`, see `qwik.vite.config.mjs`) rather than
tsdown, and the output (`dist/qwik/index.qwik.mjs`) deliberately keeps
`component$`/`useVisibleTask$` **unprocessed** — exactly like Qwik's own
documented component-library recipe. A consuming Qwik app's own build
(which always runs through `qwikVite` too) is what finishes optimizing
these calls into lazy-loaded segments, scoped to that app. This also means
`mother-mask/qwik` has no shared module identity/cache with a page's own
`mother-mask` import, unlike every other framework entry's
`export * from 'mother-mask'` aliasing.
- Tests for this entry run under a separate config
  ([`vitest.qwik.config.ts`](../../packages/mother-mask/vitest.qwik.config.ts),
  `bun run test:qwik`) — Qwik's own `@builder.io/qwik/testing` needs the
  `node` environment, not `jsdom` (the two DOM implementations collide),
  and `qwikVite` as a plugin isn't scoped to its own `srcDir`, so adding it
  to the main config broke every other framework's unrelated JSX.

## Inferno

Import the `InputMask` and `InputDecimal` class components from the
separate `mother-mask/inferno` entry:

```js
import { Component, render } from 'inferno'
import { InputMask, InputDecimal, formatDecimalValue } from 'mother-mask/inferno'

// Keep option objects outside the component so they stay stable across renders.
const currency = { decimalPlaces: 2, prefix: '$', allowNegative: true }

class App extends Component {
  state = { phone: '', amount: '' }

  render() {
    return (
      <>
        <label for="phone">Phone</label>
        <InputMask
          id="phone"
          name="phone"
          mask="(99) 99999-9999"
          inputMode="tel"
          value={this.state.phone}
          onValueChange={(phone) => this.setState({ phone })}
        />

        <label for="amount">Amount</label>
        <InputDecimal
          id="amount"
          name="amount"
          options={currency}
          value={this.state.amount}
          onValueChange={(amount) => this.setState({ amount })}
        />

        <button type="button" onClick={() => this.setState({ amount: formatDecimalValue(1234.5, currency) })}>
          Set amount
        </button>
      </>
    )
  }
}

render(<App />, document.getElementById('root'))
```

`mother-mask/inferno` re-exports every core function, class, and type as
well as `InputMask`, `InputDecimal`, `InputMaskProps`, and
`InputDecimalProps`. Its core exports are aliases to `mother-mask`, sharing
the same implementation and caches. The core ESM, CommonJS, and UMD builds
remain independent of this entry. Inferno is an optional peer dependency
required only when importing `mother-mask/inferno`; the supported version
range is `^9.0.0`.

- Both components accept `value` and `onValueChange`. `mask` and `options`
  work the same as the React version; other props are typed against
  Inferno's own `InputHTMLAttributes<HTMLInputElement>`, so `name`,
  `placeholder`, `inputMode`, and friends all get real autocomplete and
  type-checking. `InputDecimal` always sets `inputmode="decimal"`
  regardless (its own `inputMode` prop is omitted from its type, since
  setting it wouldn't do anything).
- Binding happens in `componentDidMount` and disposes in
  `componentWillUnmount` — Inferno's server-rendering path
  (`inferno-server`) never calls either, so this is safe to render on the
  server with no `typeof window` guard. `componentDidUpdate` reactively
  rebinds whenever `mask`/`options` change or `value` is set externally; an
  echo of a component's own `onValueChange` is ignored.
- `InputDecimal` reports `onValueChange(value, numericValue)`.
- This entry ships without JSX: Inferno's own JSX support needs
  `ts-plugin-inferno`/`babel-plugin-inferno` for correct compile-time vnode
  flags, which isn't worth the extra toolchain for wrapping one leaf
  `<input>` — internally each component calls Inferno's `createVNode`
  directly through a small `h()` helper. This only affects the library's
  own source; consuming apps keep using their own JSX/Babel/TypeScript
  setup exactly as shown above.

## Octane

Import the `InputMask` and `InputDecimal` function components from the
separate `mother-mask/octane` entry:

```tsx
/** @jsxImportSource octane */
import { useState } from 'octane'
import { InputMask, InputDecimal, formatDecimalValue } from 'mother-mask/octane'

// Keep option objects outside the component so they stay stable across renders.
const currency = { decimalPlaces: 2, prefix: '$', allowNegative: true }

export function Checkout() {
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')

  return (
    <>
      <label for="phone">Phone</label>
      <InputMask
        id="phone"
        name="phone"
        mask="(99) 99999-9999"
        inputMode="tel"
        value={phone}
        onValueChange={setPhone}
      />

      <label for="amount">Amount</label>
      <InputDecimal id="amount" name="amount" options={currency} value={amount} onValueChange={setAmount} />

      <button onClick={() => setAmount(formatDecimalValue(1234.5, currency))}>Set amount</button>
    </>
  )
}
```

`mother-mask/octane` re-exports every core function, class, and type as
well as `InputMask`, `InputDecimal`, `InputMaskProps`, and
`InputDecimalProps`. Its core exports are aliases to `mother-mask`, sharing
the same implementation and caches. Octane is an optional peer dependency
required only when importing `mother-mask/octane`; the supported version
range is `^0.2.0`.

- Both components accept `value` and `onValueChange`. `mask` and `options`
  work the same as the React version. Access to the underlying `<input>` is
  through `inputRef` rather than `ref` — see **why this entry ships raw**
  below for why a plain `ref` would collide.
- Binding happens in `useLayoutEffect`, a hook Octane's server renderer
  never executes — this is safe to render on the server with no
  `typeof window` guard. It reconciles on every commit, rebinding only if
  the mask, options, or an externally-set value actually changed (an echo
  of this component's own `onValueChange` is ignored). The registered
  cleanup guarantees `dispose()` runs exactly once per binding, including
  on unmount.
- `InputDecimal` defaults to `inputMode="decimal"` and reports
  `onValueChange(value, numericValue)`.

**Why this entry ships raw, unlike every other one in this README.**
Octane compiles function components down to direct DOM-update code keyed to
compiler-assigned hook slots — there's no virtual DOM diff at runtime, so
`useState`/`useRef`/`useLayoutEffect` only work correctly once the Octane
compiler has processed the file. Octane's own publishing guidance for
component libraries is therefore to distribute source, not a pre-built
bundle, and let the *consuming app's* own Octane toolchain (Vite, Rspack,
or Rsbuild, all via an official Octane plugin) compile it — that plugin
already knows to look inside `node_modules` for Octane-owned files, so no
extra bundler configuration is needed on the consumer's side. Accordingly,
`"./octane"` in this package's `exports` map points straight at
`src/octane/index.ts` (and `src/octane/*.tsx`) rather than at anything in
`dist/`, and this is the one entry in this README with no `tsdown` build
step of its own. The `/** @jsxImportSource octane */` pragma at the top of
each `.tsx` file is what opts a plain-TSX file into Octane's compiler (its
Vite/Rspack plugins otherwise only claim `.tsrx` files by default).
Tests for this entry run under a separate config
([`vitest.octane.config.ts`](../../packages/mother-mask/vitest.octane.config.ts),
`bun run test:octane`) with the Octane Vite plugin scoped to just that one
test file, mirroring how Qwik's tests are isolated.

## Mithril.js

Import the `InputMask` and `InputDecimal` closure components from the
separate `mother-mask/mithril` entry:

```js
import m from 'mithril'
import { InputMask, InputDecimal, formatDecimalValue } from 'mother-mask/mithril'

// Keep option objects outside the view so they stay stable across redraws.
const currency = { decimalPlaces: 2, prefix: '$', allowNegative: true }

let phone = ''
let amount = ''

const Checkout = {
  view: () =>
    m('div', [
      m('label', { for: 'phone' }, 'Phone'),
      m(InputMask, {
        id: 'phone',
        name: 'phone',
        mask: '(99) 99999-9999',
        inputmode: 'tel',
        value: phone,
        onValueChange: (v) => { phone = v },
      }),

      m('label', { for: 'amount' }, 'Amount'),
      m(InputDecimal, {
        id: 'amount',
        name: 'amount',
        options: currency,
        value: amount,
        onValueChange: (v) => { amount = v },
      }),

      m('button', { onclick: () => { amount = formatDecimalValue(1234.5, currency) } }, 'Set amount'),
    ]),
}

m.mount(document.body, Checkout)
```

`mother-mask/mithril` re-exports every core function, class, and type as
well as `InputMask`, `InputDecimal`, `InputMaskAttrs`, and
`InputDecimalAttrs`. Its core exports are aliases to `mother-mask`, sharing
the same implementation and caches. The core ESM, CommonJS, and UMD builds
remain independent of this entry. Mithril is an optional peer dependency
required only when importing `mother-mask/mithril`; the supported version
range is `^2.0.0`.

- Both components accept `value` and `onValueChange`; `mask` and `options`
  work the same as the React version.
- Binding happens in `oncreate` and disposes in `onremove` — Mithril's
  server-side rendering never calls either, so this is safe to render on
  the server with no `typeof window` guard. `onupdate` reactively rebinds
  whenever `mask`/`options` change or `value` is set externally, ignoring
  an echo of this component's own `onValueChange`. Elements with any of
  these three hooks are exempt from Mithril's DOM-node recycling, so the
  same `<input>` is reused across redraws for as long as the vnode stays
  mounted.
- `value` is deliberately never forwarded as an `m('input', ...)`
  attribute: Mithril's vdom diff would otherwise reassign `.value` from
  `vnode.attrs` on every redraw, fighting the mask's own intermediate
  edits — the wrapper controls the DOM value directly instead, exactly
  like every other framework entry in this package.
- `InputDecimal` always sets `inputmode="decimal"` and reports
  `onValueChange(value, numericValue)`.

## Ember.js

Import the `maskInput` and `maskDecimal` modifiers from the separate
`mother-mask/ember` entry:

```hbs
{{! app/components/checkout.gjs / .gts, or a classic template }}
import { maskInput, maskDecimal } from 'mother-mask/ember';
import { formatDecimalValue } from 'mother-mask';

<template>
  <label for="phone">Phone</label>
  <input
    id="phone"
    name="phone"
    {{maskInput "(99) 99999-9999" value=this.phone onValueChange=this.setPhone}}
  />

  <label for="amount">Amount</label>
  <input
    id="amount"
    name="amount"
    {{maskDecimal options=this.currency value=this.amount onValueChange=this.setAmount}}
  />

  <button type="button" {{on "click" this.setPreset}}>Set amount</button>
</template>
```

```js
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class Checkout extends Component {
  // Keep option objects outside the class body's reactive graph so they
  // stay stable across renders — a fresh object literal here would read as
  // a changed `options` argument on every re-render.
  currency = { decimalPlaces: 2, prefix: '$', allowNegative: true };

  @tracked phone = '';
  @tracked amount = '';

  @action setPhone(value) { this.phone = value; }
  @action setAmount(value) { this.amount = value; }
  @action setPreset() { this.amount = formatDecimalValue(1234.5, this.currency); }
}
```

`mother-mask/ember` re-exports every core function, class, and type as well
as `maskInput`, `maskDecimal`, `maskInputModifier`, `maskDecimalModifier`,
`MaskInputNamedArgs`, and `MaskDecimalNamedArgs`. Its core exports are
aliases to `mother-mask`, sharing the same implementation and caches. The
core ESM, CommonJS, and UMD builds remain independent of this entry.
`ember-modifier` is an optional peer dependency required only when
importing `mother-mask/ember`; the supported version range is `^4.0.0`
(ships in every app generated by current `ember-cli`).

- `maskInput` takes the mask as its one positional argument
  (`{{maskInput "999-999" ...}}`); `maskDecimal` takes none. Both accept
  `value` and `onValueChange` as named arguments, plus `options`.
- Binding happens the first time the element the modifier is attached to is
  inserted into the document, and only on the client: Ember's server-side
  rendering (FastBoot) renders to a string and never attaches real elements
  or runs modifiers, so there is no `typeof window` guard to write.
  `ember-modifier`'s own auto-tracking reruns the modifier — tearing down
  the previous binding first — whenever an argument it reads changes,
  including the mask, `options`, or an externally-set `value`.
- Unlike every other framework entry in this README, that teardown-then-
  rerun happens unconditionally on **every** value change, including an
  echo of the modifier's own `onValueChange` — there's no hook to skip it
  from inside the modifier, since Ember has already torn down the previous
  binding by the time it runs again. This stays visually seamless anyway:
  formatting an already-formatted value is a no-op (the element's `.value`
  is never reassigned, so the caret never moves), and removing/re-adding
  the underlying event listeners doesn't touch focus or selection.
- `maskDecimal` always sets `inputmode="decimal"` and reports
  `onValueChange(value, numericValue)`.
- The masking logic lives in `maskInputModifier`/`maskDecimalModifier` —
  plain functions with the exact `(element, positional, named)` shape
  `ember-modifier` calls a function-based modifier with, exported
  separately from the `modifier()`-wrapped `maskInput`/`maskDecimal` so
  this package's own test suite can exercise them directly against a plain
  `HTMLInputElement`. That split exists because `ember-modifier` imports
  Ember framework internals (`@ember/application`, `@ember/modifier`,
  `@ember/destroyable`) that only resolve inside a real Ember app's build —
  they aren't separately installable npm packages — so the wrapped
  `modifier()` exports are verified at the type level (`tsc --noEmit`
  against `ember-modifier`'s published types) rather than by a runtime
  test in this repository.

## Knockout.js

Import the separate `mother-mask/knockout` entry once, for its side effect
of registering the `mask` and `maskDecimal` binding handlers on
`ko.bindingHandlers`:

```js
import ko from 'knockout'
import 'mother-mask/knockout'
import { formatDecimalValue } from 'mother-mask'

// Keep option objects outside the view model's observables so they stay
// stable across recomputes.
const currency = { decimalPlaces: 2, prefix: '$', allowNegative: true }

function CheckoutViewModel() {
  this.phone = ko.observable('')
  this.amount = ko.observable('')
  this.setPreset = () => this.amount(formatDecimalValue(1234.5, currency))
}

ko.applyBindings(new CheckoutViewModel(), document.getElementById('app'))
```

```html
<div id="app">
  <label for="phone">Phone</label>
  <input id="phone" name="phone"
         data-bind="mask: { mask: '(99) 99999-9999', value: phone, onValueChange: phone }">

  <label for="amount">Amount</label>
  <input id="amount" name="amount"
         data-bind="maskDecimal: { options: { decimalPlaces: 2, prefix: '$', allowNegative: true }, value: amount, onValueChange: amount }">

  <button data-bind="click: setPreset">Set amount</button>
</div>
```

`mother-mask/knockout` re-exports every core function, class, and type as
well as `maskBindingHandler`, `maskDecimalBindingHandler`,
`MaskBindingConfig`, and `MaskDecimalBindingConfig`. Its core exports are
aliases to `mother-mask`, sharing the same implementation and caches. The
core ESM, CommonJS, and UMD builds remain independent of this entry.
Knockout is an optional peer dependency required only when importing
`mother-mask/knockout`; the supported version range is `^3.5.0`.

- Both bindings take a single object: `value` (a plain string, a Knockout
  observable/computed, or any accessor `ko.unwrap` understands) and
  `onValueChange`. `mask` and `options` work the same as the React version
  — `onValueChange` in the example above is passed directly as the
  observable itself (`phone`/`amount`), since calling an observable with an
  argument is how Knockout writes to it.
- `init` binds once the element is live; `update` re-runs whenever an
  observable read while evaluating the binding's object literal changes —
  Knockout's own dependency tracking — rebinding only if the mask, options,
  or an externally-set value actually changed. An echo of the binding's own
  `onValueChange` is ignored.
- `ko.utils.domNodeDisposal.addDisposeCallback` guarantees `dispose()` runs
  exactly once, both before every rebind and when Knockout removes the
  element (`ko.removeNode`, `ko.cleanNode`, or an `if`/`foreach`/template
  removing it). Knockout never touches real DOM nodes during any
  server-side step, since it has none — `applyBindings` only ever runs
  against a live document, so there is no `typeof window` guard to write.
- `maskDecimal` always sets `inputmode="decimal"` and reports
  `onValueChange(value, numericValue)`.
- Binding state (the live `dispose()`, the last-emitted value, the last
  mask/options) lives in a `WeakMap` keyed by the element, not in the
  handler's own closure: `ko.bindingHandlers.mask` is one object shared
  across every element that uses the binding, unlike a fresh-per-instance
  factory (a React hook call, Vue's `setup()`, …) elsewhere in this package.

## Riot.js

Import the `maskInput` and `maskDecimal` pure-component factories from the
separate `mother-mask/riot` entry:

```js
import { pure } from 'riot'
import { maskInput, maskDecimal, formatDecimalValue } from 'mother-mask/riot'

// Keep option objects module-level so they stay stable across updates.
const currency = { decimalPlaces: 2, prefix: '$', allowNegative: true }

let phone = ''
const phoneField = pure(maskInput)({
  props: {
    mask: '(99) 99999-9999',
    name: 'phone',
    inputMode: 'tel',
    autocomplete: 'tel',
    value: phone,
    onValueChange: (v) => (phone = v),
  },
})
phoneField.mount(document.getElementById('phone'))

let amount = ''
const amountField = pure(maskDecimal)({
  props: { options: currency, name: 'amount', value: amount, onValueChange: (v) => (amount = v) },
})
amountField.mount(document.getElementById('amount'))

// Later, e.g. from a parent Riot component's onUpdated:
amountField.update({ options: currency, value: formatDecimalValue(1234.5, currency) })
```

```html
<label for="phone">Phone</label>
<span id="phone"></span>

<label for="amount">Amount</label>
<span id="amount"></span>
```

`mother-mask/riot` re-exports every core function, class, and type as well
as `maskInput`, `maskDecimal`, `MaskInputProps`, and `MaskDecimalProps`. Its
core exports are aliases to `mother-mask`, sharing the same implementation
and caches. The core ESM, CommonJS, and UMD builds remain independent of
this entry. Riot is an optional peer dependency required only when
importing `mother-mask/riot`; the supported version range is `^10.0.0`.

- Both factories accept `value` and `onValueChange`; `mask` (on `maskInput`
  only) and `options` work the same as the React version. A curated set of
  other props forward as plain attributes: `name`, `placeholder`,
  `inputMode` (rendered as `inputmode`, `maskInput` only — `maskDecimal`
  always sets it to `"decimal"`), `autocomplete`, `disabled`, `readonly`,
  and `required`.
- Renders into light DOM: the `<input>` is appended as a real child of the
  host element the component mounts onto, so a page's own `<label for>` and
  global CSS reach it directly, the same as this package's Lit/Stencil/Web
  Components entries. A host `id` is moved onto the `<input>` once, right
  after mounting, for the same reason those entries do it.
- `maskDecimal` always sets `inputmode="decimal"` and reports
  `onValueChange(value, numericValue)`.

**Why this entry uses Riot's `pure()` instead of a compiled `.riot`
component.** `pure()` is Riot's own documented escape hatch for
mounting non-Riot-templated content — third-party libraries, plain DOM —
as a node in a Riot component tree, bypassing the `.riot`-file/compiler
pipeline entirely; that's a direct fit here, since this wrapper's only job
is to own one plain `<input>` imperatively, exactly like every other
framework entry in this package. `riot.pure`'s own lifecycle names —
`mount`/`update`/`unmount` — serve the same purpose as a full `.riot`
component's `onMounted`/`onUnmounted`, with one difference worth calling
out: `update()` isn't automatically re-invoked by reactive tracking the
way `onUpdated` is on a full component. A parent must call this
component's own `update(props)` explicitly (typically from its own
`onUpdated`, or right after changing props) to reformat for a new
`mask`/`options`/`value` — `sync()` still rebinds only if the mask,
options, or an externally-set value actually changed, and still ignores an
echo of this component's own `onValueChange`, exactly like every other
framework entry. `mount`/`update`/`unmount` only ever run on the client:
Riot has no built-in server-side renderer of its own, so there is no
`typeof window` guard to write.

## Decimal Inputs

Use `bindDecimal` for numbers, currency fields, and values where the integer part should grow freely.

```ts
import { bindDecimal } from 'mother-mask'

bindDecimal(input, {
  decimalPlaces: 2,
  separator: ',',
  decimalSeparator: '.',
  prefix: '$',
  allowNegative: false,
  onChange: (value, numericValue) => {
    document.querySelector<HTMLInputElement>('#amount-label')!.value = value
    document.querySelector<HTMLInputElement>('#amount-value')!.value = String(numericValue)
  },
})
```

For Brazilian-style formatting:

```ts
bindDecimal(input, {
  decimalPlaces: 2,
  separator: '.',
  decimalSeparator: ',',
})
```

Without `decimalPlaces`, the fraction is optional and has no length limit. Set it
to `2` for two fixed, zero-padded places, or `0` for integers only. `numberPlaces`
optionally pads and caps the integer part; it is unlimited by default.

| Option | Default | Behavior |
| --- | --- | --- |
| `decimalPlaces` | Unset | Optional, unlimited fraction; set a width to pad and cap it |
| `numberPlaces` | Unset | Unlimited integer part; set a width to pad and cap it |
| `segmented` | `true` | Group the integer part into thousands |
| `separator` | `','` | Thousands separator |
| `decimalSeparator` | `'.'` | Separator before the fraction |
| `prefix`, `suffix` | `''` | Fixed display text, excluded from numeric parsing |
| `allowNegative` | `false` | Allow negative numbers — typing `-` anywhere makes the value negative, `+` anywhere makes it positive |
| `onChange` | Unset | Binding callback receiving the formatted string and JS number |

For decimal masks, `segmented` controls thousands grouping. It is separate from
the independent-field behavior of pattern masks. Use `type="text"` and
`inputmode="decimal"` for formatted decimal fields.

`prefix` and `suffix` are fixed display text. Typing inside the prefix inserts at
the start of the number; typing inside the suffix inserts at the end:

```ts
bindDecimal(input, { prefix: '$', decimalPlaces: 2 })
// "$0.00" — caret at the far left, type "2"
// → "$2|.00"   same as typing just after the "$"
```

Their text is never read back as part of the number either, so an affix carrying a digit or the decimal separator stays out of the value:

```ts
bindDecimal(input, { prefix: 'Q1 ', decimalPlaces: 2 })
// typing 1234 → "Q1 1,234.00"
// unmaskDecimal('Q1 1,234.00', { prefix: 'Q1 ' }) → 1234
```

## Pattern Syntax

| Character | Matches |
| --- | --- |
| `9` | ASCII digit (`0`–`9`) |
| `Z` | ASCII letter |
| `A` | ASCII letter or digit |
| Custom token | Matches its local definition (see below) |
| `{n}` / `{min,max}` | Repeats the token before it (see [quantifiers](#bounded-quantifiers)) |
| `\` | Escapes a token or another backslash (see [escaping](#escaped-literals)) |
| Anything else | Literal separator |

Examples:

```ts
bind(input, '999.999.999-99')
bind(input, '99/99/9999')
bind(input, 'AA.AAA.AAA/AAAA-99')
```

## Bounded Quantifiers

A slot token can be followed by a bounded repeat count. `{n}` is exactly `n`
occurrences; `{min,max}` is anywhere from `min` to `max`:

```text
9{4}     exactly four digits
9{1,2}   one or two digits
Z{2,4}   two to four letters
A{1,8}   one to eight alphanumeric characters
```

`{n}` is just shorthand — `9{4}` and `9999` compile to the same mask.
`{min,max}` is the new capability: a **variable-width segment**.

```ts
bind(date, '9{1,2}/9{1,2}/9{4}')
// 3/4/1986   3/12/1986   12/4/1986   12/12/1986
```

The user decides how wide a ranged segment is, using the separator:

- **Typing `"3/"` commits the one-digit first segment.** Once a ranged segment
  has reached its `min`, typing the literal that follows it ends that segment
  for good, and the separator stays visible — it is input, not decoration, so
  this holds with `eager: false` too.
- **Typing `"12"` reaches `max` and may reveal `"/"` eagerly**, exactly as a
  fixed `99` segment does. With `eager: false` it waits for the next character.

Reaching `min` alone never inserts anything: after `"3"` the value is `"3"`,
because the next keystroke could still be a second digit.

**Any separator ends the segment, and the mask prints its own.** A ranged
segment is the one place a mask cannot work out its own boundary, so a person
saying "this field is done" gets to say it with whichever divider is under
their thumb — a keypad `.`, a `-`, a space — not only the one the pattern
happens to spell:

```ts
bind(date, '9{1,2}/9{1,2}/9{4}')
// type "3.4.1986" → "3/4/1986"
// type "3-4-1986" → "3/4/1986"
// type "3 4 1986" → "3/4/1986"
```

Any Unicode punctuation, symbol, or space works, and each one behaves exactly
as the mask's own separator does — same value, same caret. Letters, digits,
and other scripts do not: a mistyped `"a"` in a date field is a typo, not a
decision, so it stays the noise it always was. Neither does a character this
mask's own alphabet accepts — a custom token matching `"."` makes `"."` content
in that mask, never a boundary.

The rule reaches exactly as far as the ambiguity it resolves. A segment only
reads a separator this way once it is at or past its `min` and still short of
its `max`; everywhere else the mask owns where its dividers go, and a segment
that reaches its width reveals the next divider by itself (see
[Eager Mode](#eager-mode)). So a pattern with no `{min,max}` segment is
completely unaffected — under `'99/99/9999'`, `"4."` and `"4/"` alike give
`"4"`, since one digit is short of the day's width either way.

Closing a segment early retires the slots it did not use, so a finished value
can be shorter than the pattern's maximum: `"3/4/1986"` is complete at eight
characters even though `getMaxLength` reports `10`. Anything typed past that
point is dropped rather than repacked — the boundaries the user set hold, and
the character that no longer fits falls off the end, exactly as an extra digit
does on a full fixed mask. So `maxlength` alone is not a completeness check for
a ranged mask; inspect the value if you need one.

Mother Mask **does not validate dates** — or anything else semantic. It never
inspects a value to decide that `"34"` cannot be a day and must mean `3/4`.
A quantifier is a width rule; explicit separators are how a user says a
segment is shorter than its maximum.

Only bounded forms are syntax. `*`, `+`, `?`, `{n,}`, `{,n}`, `{0}` and
`{2,1}` are not, and neither is a repeat count above 1000; those brace
sequences stay literal text, exactly as they did before quantifiers existed.
A quantifier is only read directly after an unescaped token, so the pattern
`'\\9{1,2}'` is the literal text `9{1,2}`.

`getMaxLength` and the `maxlength` `bind` sets use the compiled maximum
(`10` for `'9{1,2}/9{1,2}/9{4}'`), never the length of the pattern source.
Ordered mask arrays likewise select by compiled slot capacity. In flat mode
(`segmented: false`) there are no segment boundaries to commit, so a ranged
run simply behaves as its maximum width.

## Custom Tokens and Transforms

Tokens are local to an operation or binding. A definition is a `RegExp`, a
`(char: string) => boolean` matcher, or `{ match, transform? }`:

```ts
bind(input, 'HH-HH', { tokens: { H: /[0-9A-Fa-f]/ } })
// "a1b2" → "a1-b2"; "g" is rejected

bind(input, 'UUU-999', {
  tokens: {
    U: { match: /[a-z]/i, transform: char => char.toUpperCase() },
  },
})
// "abc123" → "ABC-123"
```

Keys are single Unicode code points; `\` is reserved. Custom definitions may
override `9`, `Z`, or `A` for that binding only. Definitions are snapshotted on
bind; dispose and rebind to change them. Matchers should be pure. RegExp `g`/`y`
flags are ignored on a private copy; the caller's `lastIndex` is never changed.

A transform **must return exactly one Unicode code point**, otherwise a
`RangeError` is thrown (for example, uppercasing `ß` to `SS` is not supported).
Use an idempotent transform whose output still matches the token. UTF-16 width
may change: the caret follows the source character, not the output's case or width.

Custom tokens work with ordered arrays, segmented editing, eager literals,
[bounded quantifiers](#bounded-quantifiers), and all four APIs: `applyMask`,
`process`, `buildMask`, and `bind`. A quantified run reuses the same matcher
and transform, and a transform still runs exactly once per accepted character:

```ts
process('ab-123', 'U{1,2}-9{1,3}', {
  tokens: { U: { match: /[a-z]/i, transform: char => char.toUpperCase() } },
}) // 'AB-123'
```

Use token transforms to normalize case while preserving the caret, rather than
rewriting `input.value` inside an `onChange` callback.

## Content-dependent Masks

```ts
bind(input, '9999 9999 9999 9999', {
  resolveMask(value) {
    return value.startsWith('34') || value.startsWith('37')
      ? '9999 999999 99999'
      : '9999 9999 9999 9999'
  },
})
```

`resolveMask` is called **once per masking application**, before transforms,
with candidate data: code points accepted by the slots of the supplied fallback
pattern (or any fallback array member). Complete fallback literal runs at their
slot boundaries (escaped runs also after a segment shrinks) and nonmatching characters are removed. Thus raw and formatted
card numbers give the same digit stream, and invalid letters cannot change the
prefix. Make the fallback alphabet cover every format your resolver can return.
The callback can return a string or an ordered array; arrays retain capacity-based
selection. No recursive resolution or caching of input values occurs.

Resolver masks describe **one continuous identifier**: old separators are removed
before rendering the selected layout, even with `segmented: true`. This prevents
stale boundaries when equal-capacity layouts switch. For independently editable
fields, use a static pattern/array and segmented mode instead. Eager mode still
applies; the caret tracks logical characters and already-crossed literal boundaries.

`bind` does not add `maxlength` for resolvers (the maximum is unknowable) or
custom tokens (IME drafts can exceed the final capacity). The engine still caps
slots. Author-supplied `maxlength` is preserved. Disposal removes attributes added
by the binding, so rebinding cannot inherit a library-created stale limit.

## Escaped Literals

```ts
bind(input, '\\A-999999') // "123456" → "A-123456"
bind(input, '\\9-99')     // "12" → "9-12"
bind(input, '\\Z-99')     // "12" → "Z-12"
bind(input, '\\\\99')      // a literal backslash, then two digits
```

In the pattern, backslash escapes a built-in/custom token or another backslash.
Before any other character it remains literal; a trailing backslash also remains
literal. An escaped token cannot take a
[quantifier](#bounded-quantifiers) either — `'\\9{1,2}'` is the literal text
`9{1,2}`. Existing masks that used a backslash immediately before a token or
backslash must double it to keep that backslash in the output.

Complete literal runs are treated as formatting at their boundary; escaped runs
remain formatting after a segment shrinks, rather than becoming slot data. If literal text also matches the data alphabet, raw
and already-formatted input can be ambiguous: use a distinct separator (such as
`'\\9-99'`) to distinguish the literal from user data. Resolver formats should
likewise avoid introducing data-looking literals absent from the fallback pattern.

## Unicode and Composition

```ts
bind(input, 'LLLL', { tokens: { L: /\p{L}/u } })
// accepts Á, Ç, É, ñ, ü, ø, Ж, λ, and supplementary letters such as 𐐀
```

Matching is by **Unicode code point**, not UTF-16 code unit or grapheme cluster.
Combining marks and joined emoji sequences therefore occupy separate slots if
accepted; no normalization or grapheme segmentation is performed. Caret offsets
remain DOM-compatible UTF-16 positions. Built-in `Z` and `A` remain ASCII-only.

With custom tokens, provisional IME text and selection are left untouched until
composition commits. This includes custom ASCII matchers: an arbitrary predicate's
alphabet cannot be safely inferred. Built-in-only masks keep live formatting during
Android autocorrect composition. No timeout or delayed commit is used.

## Segmented Editing

Masks are segmented by default. Separators behave like boundaries, which keeps fields such as dates from bleeding into each other while editing:

```ts
bind(input, '99/99/9999')
```

Deleting all the data in an internal segment preserves its existing dividers
while later segments still contain data. For example, three Backspaces over
`222` in `(111) 222-3333` leave `(111) |-3333` (`|` marks the caret), ready to
type a replacement. This also works with `eager: false`. Trailing separators
still follow eager mode, and selecting everything and deleting clears the input.

If another Backspace removes part of a divider, the caret follows any collapsed
text to the left: `(111|-3333`, never `(111-|3333`. Backward word/line deletion
uses the same caret rule; movement through a divider that stays visible is preserved.

Separators left in the value also anchor the characters around them, so an edit that replaces whole fields leaves the rest where it was:

```ts
bind(input, '999.999.999-99')
// "012.153.441-39" — select "012.153.441", type "015"
// → "015.|-39"     the "-" keeps "39" in the last field
```

Anchoring is only as precise as the separators allow. A mask whose separators are all the same character can produce an ambiguous value — with `'99/99/9999'`, `"1/2025"` reads equally well as `1 / 20 / 25` — and resolves it to the earliest field that fits. Masks with distinct separators (CPF, CNPJ, phone numbers) have no such gap.

Deleting a selection can take a whole field *and* the separator introducing
the next one with it — selecting `"(11) "` out of `"(11) 98765-4321"` and
pressing Backspace/Delete/Cut removes the area code, its closing paren, and
the space in one stroke. `bind()` restores that separator before masking, so
the untouched `"98765-4321"` stays exactly where it was instead of sliding
into the emptied field:

```ts
bind(input, '(99) 99999-9999')
// "(11) 98765-4321" — select "(11) ", press Backspace
// → "(|) 98765-4321"     "98765" and "4321" never moved
```

Typing a character straight over a selection destroys the same dividers the
equivalent Delete would, so it gets the same rescue — but only when it has to.
Selecting the `"3/12"` of `"3/12/1986"` on `'9{1,2}/9{1,2}/9{4}'` and typing
`"4"` leaves `"4/1986"`, where the lone surviving `"/"` reads equally well as
the day's; without the rescue the untouched year breaks apart into
`"4/19/86"`. Restoring the divider gives `"4|//1986"` instead, with the year
untouched. The caret stays in the day: it is only one of the two digits that
field accepts, so the next keystroke widens it to `"42"` rather than starting
the month — the mask has no way to know the day was finished, and eager hands
the caret across on its own once it is. Where the tail was never in danger —
retyping a CPF over `"012.153.441"`, whose `"-"` is distinct — nothing is
restored and the digits keep filling from the left exactly as before.

A divider whose removal would re-segment untouched text is not erodible:
Backspacing the second `"/"` out of `"13//1986"` would leave `"13/1986"`,
which re-reads as `13 / 19 / 86`, so it is put back and the keystroke erodes
the day instead. Where dropping a divider costs nothing — a CPF's `"-"` still
pins its last field however much of `"."` survives — Backspace peels it away
exactly as documented above.

This is bind-only, like eager's Backspace/Delete handling above: pure
`applyMask`/`buildMask`/`process` see only the resulting `(value, caret)` and
can't tell a deletion from fresh input, so `applyMask("98765-4321", mask, 0)`
still packs from the left. A selection confined to separator text (no field
data in it) is left alone, however wide — that is ordinary divider erosion,
not a swallow, and keeps working exactly as above. Word/line deletes
(`Cmd+Backspace`/`Cmd+Delete` and friends) are a deliberate bulk clear and are
never rescued, and neither are ordered mask arrays or `resolveMask`, since
which pattern or layout applies can itself change once the deletion shrinks
the data.

For classic reflow behavior, pass `segmented: false`:

```ts
bind(input, '999.999.999-99', { segmented: false })
```

## Eager Mode

On by default: the next literal separator is revealed as soon as the segment before it is completely filled, instead of waiting for the first character of the next segment:

```ts
bind(input, '99/99/9999')
// typing "25" shows "25/" right away
```

Pass `eager: false` to wait for the next real character instead:

```ts
bind(input, '99/99/9999', { eager: false })
// typing "25" shows "25" until the next digit arrives
```

A [ranged segment](#bounded-quantifiers) reveals its separator only at its
maximum, never at its minimum. A separator the user types themselves is
their input rather than a reveal, so it survives `eager: false`.

`bind` does not reinsert an eager separator immediately after Backspace/Delete
removes it: deleting the `"."` off `"012."` leaves `"012"`. This is binding behavior;
the pure helpers have no edit history and apply the configured `eager` option on
every call. Arrow keys, Home/End, and selection shortcuts retain native behavior.

## Formatting Without an Input

The pure helpers return strings or a formatted value with a caret position:

```ts
import { applyMask, process, processDecimal, formatDecimalValue, unmaskDecimal } from 'mother-mask'

process('12345678901', '999.999.999-99') // '123.456.789-01'
applyMask('25122025', '99/99/9999', 8) // { value: '25/12/2025', caret: 10 }

processDecimal('1234.567') // '1,234.567' — optional, unlimited fraction
processDecimal('1234.5', { decimalPlaces: 2, prefix: '$' }) // '$1,234.50'
processDecimal('7.3', { numberPlaces: 2, decimalPlaces: 2 }) // '07.30'

const euro = { decimalPlaces: 2, separator: '.', decimalSeparator: ',', suffix: ' €' }
formatDecimalValue(1234.5, euro) // '1.234,50 €'
unmaskDecimal('1.234,50 €', euro) // 1234.5
```

Pass the same locale and affix options when formatting and parsing.
`formatDecimalValue` accepts a JS number; the other decimal helpers accept strings
in the configured format. `unmaskDecimal` returns `0` for empty or digitless input.
All caret arguments and results are UTF-16 offsets, matching DOM selections.

## CDN

```html
<script src="https://unpkg.com/mother-mask/dist/mother-mask.umd.js"></script>
<script>
  MotherMask.bind(document.getElementById('cpf'), '999.999.999-99')
</script>
```

The global name is `MotherMask`.

## API

| Export | Returns / purpose |
| --- | --- |
| `bind(input, mask, options?)` | Disposer; bind a static pattern, ordered array, or resolver via options |
| `bindDecimal(input, options?)` | Disposer; bind a decimal input |
| `applyMask(value, mask, inputCaret?, options?)` | `MaskResult`: `{ value, caret }` |
| `process(value, mask, options?)` | Formatted string |
| `buildMask(value, mask, caret?, options?)` | `Mask` instance; call `.process()` and read `.caret` afterward |
| `new Mask(value, mask, caret?, options?)` | Low-level processor with the same options |
| `getMaxLength(mask, options?)` | Formatted UTF-16 upper bound; `Infinity` with a resolver |
| `applyDecimalMask(value, inputCaret?, options?)` | `MaskResult`: `{ value, caret }` |
| `processDecimal(value, options?)` | Formatted decimal string |
| `unmaskDecimal(value, options?)` | Parsed JS number |
| `formatDecimalValue(value, options?)` | Display string from a JS number |

Pattern options (`ApplyMaskOptions`) are `segmented` (default `true`), `eager`
(default `true`), `tokens`, and `resolveMask`. `BindOptions` adds `onChange` and
the shared `BindInputAttributes`: `autocomplete`, `autocorrect`,
`autocapitalize`, and `spellcheck`. `BindDecimalOptions` includes the same DOM
attribute options.
`bind` also accepts a `(value) => void` callback as its third argument;
`bindDecimal` accepts `(value, numericValue) => void` as its second argument.

Optional caret arguments default to `0`. `getMaxLength` counts literals,
counts a [quantified](#bounded-quantifiers) run at its maximum, and reserves up
to two UTF-16 units per custom-token slot; it is not a count of data characters
and never the length of the pattern source. See [dynamic masks](#content-dependent-masks) for `maxlength` handling.

Exported types:

- `MaskPattern`
- `TokenMatcher`
- `MaskTokenDefinition`
- `MaskTokens`
- `MaskResolver`
- `MaskResult`
- `ApplyMaskOptions`
- `BindInputAttributes`
- `BindOptions`
- `DecimalMaskOptions`
- `BindDecimalOptions`

## Development

See the [repository guide](https://github.com/dan2dev/mother-mask/blob/main/REPOSITORY.md)
for builds, tests, and release commands, and the
[docs guide](https://github.com/dan2dev/mother-mask/blob/main/docs/README.md) for
running the documentation website. Keep this README and the published package
README in sync.

## License

MIT - [Danilo Celestino de Castro](https://github.com/dan2dev)
