# Knockout.js simple example

A small TypeScript + Vite app using the `mask` and `maskDecimal` binding
handlers from `mother-mask/knockout`. The handlers live in the
[library's Knockout entry point](../../packages/mother-mask/src/knockout).

## Run

This example uses the local `mother-mask` package. From the repository root:

```bash
bun install
bun run --cwd packages/mother-mask build
cd examples/knockout-simple
bun install
bun run dev
```

Open the local URL printed by Vite. Run `bun run build` to typecheck and
build, then `bun run preview` to preview the production build.

## Use the binding

```js
import ko from 'knockout'
import 'mother-mask/knockout' // registers ko.bindingHandlers.mask/.maskDecimal

function ViewModel() {
  this.phone = ko.observable('')
}

ko.applyBindings(new ViewModel())
```

```html
<input data-bind="mask: { mask: '(99) 99999-9999', value: phone, onValueChange: phone }">
```

- `value` may be a plain string, a Knockout observable, or any accessor
  `ko.unwrap` understands. Passing the observable itself as
  `onValueChange` works because calling an observable with an argument is
  how Knockout writes to it — see the `amount` field in
  [`main.ts`](src/main.ts) for a case that needs to update two observables
  together instead.
- `init` binds once; `update` re-runs whenever an observable read while
  evaluating the binding's object literal changes, rebinding only if the
  mask, options, or an externally-set value actually changed.
  `ko.utils.domNodeDisposal.addDisposeCallback` guarantees `dispose()` runs
  exactly once.

See [`main.ts`](src/main.ts) and [`index.html`](index.html) for the full
example.
