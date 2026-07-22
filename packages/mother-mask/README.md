# mother-mask

Lightweight input masks for browser forms. Zero runtime dependencies, written in TypeScript, and published with ESM, CJS, and UMD builds.

[npm](https://www.npmjs.com/package/mother-mask) | [Live demo](https://stackblitz.com/edit/mother-mask-simple-demo?file=src%2Fmain.ts)

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

For classic reflow behavior, pass `segmented: false`:

```ts
bind(input, '999.999.999-99', { segmented: false })
```

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
