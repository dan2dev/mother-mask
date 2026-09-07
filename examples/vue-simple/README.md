# Vue simple example

A small Vue 3.5 + TypeScript + Vite app using `InputMask` and `InputDecimal`
from `mother-mask/vue`. The components live in the
[library's Vue entry point](../../packages/mother-mask/src/vue/index.ts).
Includes phone and date masks plus three decimal formats: US dollars
(including negatives), Brazilian real, and a percentage. Each field shows its
Vue state via `v-model`. The buttons fill or clear all fields programmatically.

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

## Use the component

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { InputMask } from 'mother-mask/vue'

const phone = ref('')
</script>

<template>
  <label for="phone">Phone number</label>
  <InputMask id="phone" name="phone" mask="(99) 99999-9999" inputmode="tel" v-model="phone" />
  <p>{{ phone }}</p>
</template>
```

- Both `InputMask` and `InputDecimal` support `v-model` (a `modelValue` prop
  plus an `update:modelValue` emit carrying the formatted string, and for
  `InputDecimal` also the parsed numeric value as a second argument).
- `InputMask` accepts `mask` and an optional `options` object (`BindOptions`
  without `onChange`). Keep the `options` object identity stable across
  renders — a new object on every render is treated as a real change and
  rebinds the mask.
- Binding happens in `onMounted`, a lifecycle hook Vue never invokes during
  SSR, so these components render safely on the server with no manual
  `typeof window` check; `onBeforeUnmount` disposes the binding.
- Native attributes (`id`, `name`, `placeholder`, ARIA attributes, ...) fall
  through to the underlying `<input>`. `InputDecimal` always sets
  `inputmode="decimal"`.

See [`App.vue`](src/App.vue) for the full set of examples, including how to
read the numeric value alongside the formatted one:

```vue
<InputDecimal
  :options="amountOptions"
  v-model="amount"
  @update:model-value="(_, numeric) => (amountNumeric = numeric)"
/>
```
