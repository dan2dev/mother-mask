# Lit simple example

A small TypeScript + Vite app using `<lit-mask-input>` and
`<lit-mask-decimal>` from `mother-mask/lit`. The elements live in the
[library's Lit entry point](../../packages/mother-mask/src/lit).

## Run

This example uses the local `mother-mask` package. From the repository root:

```bash
bun install
bun run --cwd packages/mother-mask build
cd examples/lit-simple
bun install
bun run dev
```

Open the local URL printed by Vite. Run `bun run build` to typecheck and
build, then `bun run preview` to preview the production build.

## Use the component

```html
<script type="module">
  import 'mother-mask/lit'
</script>

<label for="phone">Phone</label>
<lit-mask-input id="phone" name="phone" mask="(99) 99999-9999" input-mode="tel"></lit-mask-input>

<script type="module">
  document.querySelector('#phone').addEventListener('value-change', (e) => console.log(e.detail))
</script>
```

- Both elements render into light DOM (`createRenderRoot()` returns
  `this`), so a page's own `<label for>` and global CSS reach the native
  `<input>` directly. `mask`/`options` work as either a plain attribute
  (`mask`, string patterns only) or a JS property (any `MaskPattern`, plus
  `options` objects). `<lit-mask-input>` emits `value-change`;
  `<lit-mask-decimal>` also emits `numeric-value-change` and always sets
  `inputmode="decimal"`.
- Binding happens in `firstUpdated` and disposes in `disconnectedCallback`.
  `updated` reactively rebinds whenever `mask`/`options` change or `value`
  is set externally, ignoring an echo of the element's own `value-change`.
- A host `id` (e.g. `<lit-mask-input id="phone">`) is moved onto the
  rendered `<input>` once, right after first render, so `<label for>`
  keeps resolving correctly.

See [`main.ts`](src/main.ts) for the full example.
