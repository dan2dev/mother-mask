# Ember.js simple example

A small Ember app — generated with `ember-cli new` on Ember's current
Vite-based build (`@embroider/vite`, the default since Ember 6.8; see the
[build tools guide](https://guides.emberjs.com/release/build-tools/)) —
using the `maskInput` and `maskDecimal` modifiers from `mother-mask/ember`.
The modifiers live in the
[library's Ember entry point](../../packages/mother-mask/src/ember).

## Run

This example uses the local `mother-mask` package. From the repository root:

```bash
bun install
bun run --cwd packages/mother-mask build
cd examples/ember-simple
bun install
bun run dev
```

Open the local URL printed by Vite (`http://localhost:4200` by default).
Run `bun run build` to build for production, then `bun run preview` to
preview it.

## Use the modifier

See [`app/components/checkout.gjs`](app/components/checkout.gjs) for the
full example. In short:

```gjs
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { maskInput } from 'mother-mask/ember';
import Component from '@glimmer/component';

export default class PhoneField extends Component {
  @tracked phone = '';

  @action
  setPhone(value) {
    this.phone = value;
  }

  <template>
    <input {{maskInput "(99) 99999-9999" value=this.phone onValueChange=this.setPhone}} />
    <p>{{this.phone}}</p>
  </template>
}
```

- `maskInput` takes the mask as its one positional argument; `maskDecimal`
  takes none. Both accept `value` and `onValueChange`, plus `options`.
- Binding happens the first time the element is inserted into the
  document, and only on the client — Ember's FastBoot server-side
  rendering never attaches real elements or runs modifiers.
- `ember-modifier`'s own auto-tracking tears down and re-runs the modifier
  on **every** value change, including an echo of its own `onValueChange`
  — there's no hook to skip it from inside the modifier, unlike every
  other framework entry in this package. This stays visually seamless
  anyway: formatting an already-formatted value is a no-op, so the input's
  caret never moves.
- `maskDecimal` always sets `inputmode="decimal"` and reports
  `onValueChange(value, numericValue)`.

See the [full Ember.js section](../../packages/mother-mask/README.md#emberjs)
in the package README for more.
