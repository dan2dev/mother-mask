# Svelte simple example

A small Svelte 5 + TypeScript + Vite app using the `motherMask` and
`motherMaskDecimal` actions from `mother-mask/svelte`. The actions live in the
[library's Svelte entry point](../../packages/mother-mask/src/svelte/index.ts).
Includes phone and date masks plus three decimal formats: US dollars
(including negatives), Brazilian real, and a percentage. Each field shows its
Svelte `$state` rune. The buttons fill or clear all fields programmatically.

## Run

This example uses the local `mother-mask` package. From the repository root:

```bash
bun install
bun run --cwd packages/mother-mask build
cd examples/svelte-simple
bun install
bun run dev
```

Open the local URL printed by Vite. Run `bun run build` to build, then
`bun run preview` to preview the production build.

## Use the action

```svelte
<script lang="ts">
  import { motherMask } from 'mother-mask/svelte'

  let phone = $state('')
</script>

<label for="phone">Phone number</label>
<input use:motherMask={{ mask: '(99) 99999-9999', value: phone, onValueChange: (v) => (phone = v) }} />
<p>{phone}</p>
```

- `use:motherMask` takes `{ mask, options?, value?, onValueChange? }`;
  `use:motherMaskDecimal` takes `{ options?, value?, onValueChange? }` and
  calls `onValueChange(value, numericValue)`.
- Actions run only once Svelte mounts the element to the live DOM, and are
  torn down when it leaves — Svelte never invokes `use:` directives during
  server-side rendering, so this is SSR-safe with no `typeof window` guard.
- `update(params)` is Svelte's own reactivity hook: whenever a `$state`
  value read inside the `use:motherMask={...}` expression changes — `mask`,
  `options`, or `value` — Svelte re-invokes it with the new params, and the
  action rebinds only if the mask/options changed or `value` was set
  externally (an echo of the action's own `onValueChange` is ignored).
  `destroy()` guarantees `dispose()` runs exactly once.
- This entry has no runtime dependency on the `svelte` package itself — it's
  plain TypeScript, usable from any Svelte 5 (or 4) component via `use:`.

See [`App.svelte`](src/App.svelte) for the full set of examples.
