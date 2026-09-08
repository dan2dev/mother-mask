# Stencil simple example

A small TypeScript + Vite app using `<stencil-mask-input>` and
`<stencil-mask-decimal>` from `mother-mask/stencil/mask-input` and
`mother-mask/stencil/mask-decimal`. These are compiled artifacts of the
[library's Stencil sub-project](../../packages/mother-mask/stencil-src) —
no `@stencil/core` dependency is needed here, since the compiler already
bundled its own tiny runtime into the built custom elements.

## Run

This example uses the local `mother-mask` package. From the repository root:

```bash
bun install
bun run --cwd packages/mother-mask build
cd examples/stencil-simple
bun install
bun run dev
```

Open the local URL printed by Vite. Run `bun run build` to typecheck and
build, then `bun run preview` to preview the production build.

## Use the component

```html
<script type="module">
  import 'mother-mask/stencil/mask-input'
</script>

<label for="phone">Phone</label>
<stencil-mask-input id="phone" name="phone" mask="(99) 99999-9999" input-mode="tel"></stencil-mask-input>

<script type="module">
  document.querySelector('#phone').addEventListener('value-change', (e) => console.log(e.detail))
</script>
```

- Both elements render into light DOM, so a page's own `<label for>` and
  global CSS reach the native `<input>` directly. `mask`/`options` work as
  either a plain attribute (`mask`, string patterns only) or a JS property.
  `<stencil-mask-input>` emits `value-change`; `<stencil-mask-decimal>`
  also emits `numeric-value-change` and always sets `inputmode="decimal"`.
- `input-mode` is exposed as the `inputModeAttr` JS property, not
  `inputMode` — this class is a real `HTMLElement` at runtime and already
  declares its own incompatible `inputMode`.
- A host `id` (e.g. `<stencil-mask-input id="phone">`) is moved onto the
  rendered `<input>` once, right after first render, so `<label for>`
  keeps resolving correctly.

See [`main.ts`](src/main.ts) for the full example.
