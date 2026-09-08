# Alpine.js simple example

A small TypeScript + Vite app using the `x-mask` directive from
`mother-mask/alpine`. The plugin lives in the
[library's Alpine entry point](../../packages/mother-mask/src/alpine/plugin.ts).

## Run

This example uses the local `mother-mask` package. From the repository root:

```bash
bun install
bun run --cwd packages/mother-mask build
cd examples/alpine-simple
bun install
bun run dev
```

Open the local URL printed by Vite. Run `bun run build` to typecheck and
build, then `bun run preview` to preview the production build.

## Use the directive

```html
<input x-data="{ phone: '' }" x-mask="{ mask: '999-999', value: phone }"
       x-on:mask-change="phone = $event.detail" />

<input x-data="{ amount: '' }" x-mask.decimal="{ value: amount }"
       x-on:mask-change="amount = $event.detail"
       x-on:mask-numeric-change="console.log($event.detail)" />
```

```js
import Alpine from 'alpinejs'
import { motherMaskPlugin } from 'mother-mask/alpine'

Alpine.plugin(motherMaskPlugin)
Alpine.start()
```

- Two-way binding goes through DOM events (`mask-change`, and for
  `.decimal`, also `mask-numeric-change`) rather than writing back into
  Alpine state directly — combine with `x-on:mask-change`, not `x-model`,
  to avoid both fighting over the input's live value on every keystroke.
- `effect()`/`cleanup()` guarantee `dispose()` runs exactly once, both
  before every rebind and when the element is removed.

See [`main.ts`](src/main.ts) and [`index.html`](index.html) for the full
example.
