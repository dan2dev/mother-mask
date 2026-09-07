# Angular simple example

A small Angular 20 (standalone, zoneless) + TypeScript + Vite app using the
`MotherMaskDirective` and `MotherMaskDecimalDirective` attribute directives
from `mother-mask/angular`. The directives live in the
[library's Angular entry point](../../packages/mother-mask/src/angular/index.ts).
Includes phone and date masks plus three decimal formats: US dollars
(including negatives), Brazilian real, and a percentage. Each field shows its
component state. The buttons fill or clear all fields programmatically.

This example runs on plain Vite rather than the Angular CLI — see
["Why Vite, not `ng build`?"](#why-vite-not-ng-build) below.

## Run

This example uses the local `mother-mask` package. From the repository root:

```bash
bun install
bun run --cwd packages/mother-mask build
cd examples/angular-simple
bun install
bun run dev
```

Open the local URL printed by Vite. Run `bun run build` to typecheck and build,
then `bun run preview` to preview the production build.

## Use the directive

```ts
import { Component } from '@angular/core'
import { MotherMaskDirective } from 'mother-mask/angular'

@Component({
  standalone: true,
  imports: [MotherMaskDirective],
  template: `
    <label for="phone">Phone number</label>
    <input id="phone" motherMask="(99) 99999-9999" [(value)]="phone" />
    <p>{{ phone }}</p>
  `,
})
export class PhoneField {
  phone = ''
}
```

- Both directives are attribute selectors (`input[motherMask]` and
  `input[motherMaskDecimal]`) and support `[(value)]` two-way binding.
  `MotherMaskDirective` accepts `motherMask` (a `MaskPattern`) and optional
  `[motherMaskOptions]`; `MotherMaskDecimalDirective` accepts optional
  `[motherMaskDecimalOptions]` and additionally emits `(numericValueChange)`.
- **Bind `value` to a plain field, not a signal.** `value`/`valueChange` use
  classic `@Input`/`@Output` (not the functional `model()` API — see below),
  so `[(value)]="phone"` compiles to a direct assignment (`this.phone =
  $event`) on each change. Binding a signal there would try to overwrite the
  signal function itself. The directives' own binding lifecycle is still
  Signals-driven internally (`ngOnChanges` feeds a `signal`, and
  `afterRenderEffect` reactively rebinds), and Angular's zoneless change
  detection still re-renders the template on every `(valueChange)` because
  it runs as part of a DOM event dispatch — see
  [`App.ts`](src/App.ts) for how the numeric value flows through
  `(numericValueChange)="amountNumeric = $event"`.
- `MotherMaskDecimalDirective` always sets `inputmode="decimal"` via a host
  binding.

## Why Vite, not `ng build`?

`mother-mask/angular` is built to be **usable without the Angular CLI's build
toolchain** — the library ships `@Input`/`@Output` (classic decorators,
recognized purely at class-decoration time) rather than the newer functional
`input()`/`model()`/`output()` API, since Angular only wires the latter up to
template bindings through the `ngtsc` compiler's static analysis. This
example follows the same constraint for consistency: it's a plain Vite app
(no `angular.json`, no `@angular/build`), bootstrapped directly with
`bootstrapApplication` and `provideZonelessChangeDetection()` (no `zone.js`).
This mirrors how the library's own tests exercise these directives — see
[`tests/angular.test.ts`](../../packages/mother-mask/tests/angular.test.ts)
and [`tests/angular-setup.ts`](../../packages/mother-mask/tests/angular-setup.ts)
in the library package for the same JIT-compiler (`import '@angular/compiler'`)
setup used here in [`main.ts`](src/main.ts).

If your own app uses the Angular CLI, `mother-mask/angular` works there too —
nothing about it depends on avoiding `ng build`; it's simply not required.
