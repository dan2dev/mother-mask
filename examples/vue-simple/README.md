# Vue simple example

A small Vue 3.5 + TypeScript + Vite app using the `vMotherMask` and
`vMotherMaskDecimal` custom directives from `mother-mask/vue`. The directives
live in the
[library's Vue entry point](../../packages/mother-mask/src/vue/index.ts).
Includes phone and date masks plus three decimal formats: US dollars
(including negatives), Brazilian real, and a percentage. Each field shows its
Vue state alongside the native `<input>`. The buttons fill or clear all
fields programmatically.

## Run

This example uses the local `mother-mask` package. From the repository root:

```bash
bun install
bun run --cwd packages/mother-mask build
cd examples/vue-simple
bun install
bun run dev
```

Open the local URL printed by Vite. Run `bun run build` to build, then
`bun run preview` to preview the production build.

## Use the directive

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { vMotherMask } from 'mother-mask/vue'

const phone = ref('')
</script>

<template>
  <label for="phone">Phone number</label>
  <input
    id="phone"
    name="phone"
    inputmode="tel"
    v-mother-mask="{ mask: '(99) 99999-9999', value: phone, onValueChange: (v) => (phone = v) }"
  />
  <p>{{ phone }}</p>
</template>
```

- Both `vMotherMask` and `vMotherMaskDecimal` take `{ mask?, options?,
  value?, onValueChange? }` (`mask` is required for `vMotherMask`);
  `onValueChange` receives the formatted string, and for
  `vMotherMaskDecimal` also the parsed numeric value as a second argument.
  Keep the `options` object identity stable across renders — a new object on
  every render is treated as a real change and rebinds the mask.
- Both directives are exported pre-named `v` + PascalCase — Vue's own
  convention for a local directive in `<script setup>` — so `import {
  vMotherMask } from 'mother-mask/vue'` alone makes `v-mother-mask="..."`
  available in the template, with no import rename needed.
- Binding happens on `mounted`, a lifecycle hook Vue never invokes during
  SSR, so this directive is safe on a server-rendered page with no manual
  `typeof window` check; `beforeUnmount` disposes the binding.
- `vMotherMaskDecimal` always sets `inputmode="decimal"` on the element.

See [`App.vue`](src/App.vue) for the full set of examples, including how to
read the numeric value alongside the formatted one:

```vue
<input
  v-mother-mask-decimal="{
    options: amountOptions,
    value: amount,
    onValueChange: (v, numeric) => { amount = v; amountNumeric = numeric },
  }"
/>
```
