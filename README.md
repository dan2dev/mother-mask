# mother-mask

Lightweight input masks for browser forms. Zero runtime dependencies, written in TypeScript, and published with ESM, CJS, and UMD builds.

[npm](https://www.npmjs.com/package/mother-mask) | [Live demo](https://dan2dev.github.io/mother-mask/)

## Install

```bash
npm install mother-mask
```

```bash
pnpm add mother-mask
```

## Basic Usage

```ts
import { bind } from 'mother-mask'

const input = document.querySelector<HTMLInputElement>('#phone')!

const dispose = bind(input, '(99) 99999-9999')

// Later, remove listeners and allow rebinding.
dispose()
```

Use an ordered mask array for values with more than one length:

```ts
bind(input, ['(99) 9999-9999', '(99) 99999-9999'])
```

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
  separator: '.',
  decimalSeparator: ',',
})
```

`prefix` and `suffix` are chrome, not content. Typing with the caret parked inside them lands the character at the nearest edge of the number, so every spot that looks like the start of the number behaves like it:

```ts
bindDecimal(input, { prefix: '$', decimalPlaces: 2 })
// "$0.00" — caret at the far left, type "2"
// → "$2|.00"   same as typing just after the "$"
```

Their text is never read back as part of the number either, so an affix carrying a digit or the decimal separator stays out of the value:

```ts
bindDecimal(input, { prefix: 'Q1 ', decimalPlaces: 2 })
// typing 1234 → "Q1 1,234.00", and unmaskDecimal() reports 1234
```

## Pattern Syntax

| Character | Matches |
| --- | --- |
| `9` | Digit |
| `Z` | Letter |
| `A` | Letter or digit |
| Anything else | Literal separator |

Examples:

```ts
bind(input, '999.999.999-99')
bind(input, '99/99/9999')
bind(input, 'AA.AAA.AAA/AAAA-99')
```

## Segmented Editing

Masks are segmented by default. Separators behave like boundaries, which keeps fields such as dates from bleeding into each other while editing:

```ts
bind(input, '99/99/9999')
```

Separators left in the value also anchor the characters around them, so an edit that replaces whole fields leaves the rest where it was:

```ts
bind(input, '999.999.999-99')
// "012.153.441-39" — select "012.153.441", type "015"
// → "015.|-39"     the "-" keeps "39" in the last field
```

Anchoring is only as precise as the separators allow. A mask whose separators are all the same character can produce a genuinely ambiguous value — with `'99/99/9999'`, `"1/2025"` reads equally well as `1 / 20 / 25` — and resolves it to the earliest field that fits. Masks with distinct separators (CPF, CNPJ, phone numbers) have no such gap.

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

Backspace/Delete never resurrect a separator eager just added — deleting the "." off `"012."` leaves `"012"`, not `"012."` again, so removing a character always feels like removing exactly one character.

## CDN

```html
<script src="https://unpkg.com/mother-mask/dist/mother-mask.umd.js"></script>
<script>
  MotherMask.bind(document.getElementById('cpf'), '999.999.999-99')
</script>
```

The global name is `MotherMask`.

## API

Main exports:

- `bind(input, mask, options?)`
- `bindDecimal(input, options?)`
- `applyMask(value, mask, inputCaret?, options?)`
- `process(value, mask, options?)`
- `buildMask(value, mask, caret?, options?)`
- `getMaxLength(mask)`
- `applyDecimalMask(value, inputCaret?, options?)`
- `processDecimal(value, options?)`
- `unmaskDecimal(value, options?)`
- `formatDecimalValue(value, options?)`
- `Mask`

Exported types:

- `MaskPattern`
- `MaskResult`
- `ApplyMaskOptions`
- `BindOptions`
- `DecimalMaskOptions`
- `BindDecimalOptions`

## License

MIT - [Danilo Celestino de Castro](https://github.com/dan2dev)
