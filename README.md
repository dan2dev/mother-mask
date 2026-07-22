# mother-mask

Lightweight input mask library for browsers. Zero runtime dependencies, TypeScript-first, ships **ESM**, **CJS**, and **UMD**.

Published as [`mother-mask` on npm](https://www.npmjs.com/package/mother-mask).

## Live demo

**[Try it on StackBlitz →](https://stackblitz.com/edit/mother-mask-simple-demo?file=src%2Fmain.ts)**

## Install

```bash
npm install mother-mask
# or
pnpm add mother-mask
```

## Usage

### `bind(input, mask, options?)`

Attach a mask to any input element — this is the main API.

- **Idempotent** — calling `bind()` again on the same element does nothing (the element is marked with `data-masked`).
- **Returns a dispose function** — call it to remove listeners and attributes so you can bind again later.
- Sets sensible defaults when missing: `autocomplete`, `autocorrect`, `autocapitalize`, `spellcheck`, and `maxlength` from the mask.

```ts
import { bind } from 'mother-mask'

const input = document.getElementById('phone') as HTMLInputElement

// Fixed mask
const dispose = bind(input, '(99) 99999-9999')

// Dynamic mask — picks the pattern from an ordered list (shortest → longest)
bind(input, ['(99) 9999-9999', '(99) 99999-9999'])

// Callback after paste or keyboard-driven changes
bind(input, '999.999.999-99', (value) => {
  console.log(value) // e.g. "123.456.789-01"
})

// Or options object (same as callback for a single `onChange`)
bind(input, '999.999.999-99', { onChange: (value) => console.log(value) })

// Later: allow rebinding
dispose()
```

### Segmented masks (default) vs. flat/reflow masks

By default, every mask treats its literal separators as hard boundaries
between independent fields. Selecting "12" in `25/12/2025` and typing a
shorter or longer replacement stays scoped to the month — it never bleeds
digits into the year, and deleting a whole field just leaves it empty
instead of pulling the next field left across the separator:

```ts
bind(input, '99/99/9999') // segmented by default
```

This is the right behavior for masks made of independent fields — dates,
times — and it's a safe default everywhere else too, since it never
*discards* data (typing past a field's capacity still flows forward into
the next one; only backward bleed is blocked). A fully raw, unformatted
paste (e.g. `25122025`) still fills every field in one pass, and array
masks that switch pattern width (see below) still reflow correctly.

Pass `segmented: false` to opt into the classic flat/reflow behavior
instead, where deleting or replacing characters anywhere shifts everything
after it to close the gap — useful when a mask really is one continuous
number with cosmetic separators (e.g. formatting a running total) rather
than independent fields:

```ts
bind(input, '999.999.999-99', { segmented: false })
```

`segmented` is also accepted by `applyMask`, `buildMask`, and `process` as
part of an options object.

### `bindDecimal(input, options?)`

A second binder for decimal/currency-style inputs — numbers, not
pattern-slot strings. There's no fixed template: the integer part grows and
shrinks freely as the user types, and formatting (grouping, decimal places,
prefix/suffix) is driven entirely by `options`. Same contract as `bind()`:
idempotent, marked with `data-masked`, returns a dispose function.

Typing behaves like a normal number field, not a cents-first calculator:
digits fill the integer part until you type the decimal separator, and the
fixed-width fraction is always shown zero-padded. A lone placeholder "0" in
the integer part (an untouched field showing e.g. "$0.00") is overwritten,
not extended, by the next digit — typing "2" anywhere against that "0" gives
"$2.00", never "$20.00" or "$02.00".

```ts
import { bindDecimal } from 'mother-mask'

const input = document.querySelector<HTMLInputElement>('#decimal')!

bindDecimal(input, {
  decimalPlaces: 2,   // fixed fractional digits — default 2
  segmented: true,     // group the integer part into thousands — default true
  separator: ',',      // thousands grouping separator — default ','
  decimalSeparator: '.', // integer/fraction separator, and its typing trigger — default '.'
  prefix: '$',
  suffix: '',
  allowNegative: false, // allow a leading "-" — default false
})

// Typing "42"      → "$42.00"
// Typing "423"     → "$423.00"
// Typing "423."    → "$423.00"   (the separator opens the fraction segment)
// Typing "423.4"   → "$423.40"
// Typing "423.42"  → "$423.42"

// Editing is segmented, same as bind(): shortening "423.42" to "423.4"
// (deleting the trailing "2") re-pads the fraction instead of reflowing
// digits from the integer part → "$423.40"

// Either "." or "," opens the fraction, regardless of decimalSeparator —
// handy since numeric keypads often only have ".".

// Callback receives both the masked string and its parsed numeric value
bindDecimal(input, {
  prefix: '$',
  onChange: (value, numericValue) => {
    console.log(value, numericValue) // "$423.42", 423.42
  },
})

// Or a bare callback (legacy style, same as bind())
bindDecimal(input, (value, numericValue) => console.log(value, numericValue))
```

Locale note: `separator` and `decimalSeparator` are independent, so
`{ separator: '.', decimalSeparator: ',' }` gives the `1.234,56` format
common outside the US.

## Pattern syntax

| Character | Matches |
|-----------|---------|
| `9` | Digit (`0`–`9`) |
| `Z` | Letter (`a`–`z`, `A`–`Z`) |
| `A` | Alphanumeric (digit or letter) |
| Anything else | Literal — inserted as the user fills slots |

## Array masks

Pass an ordered array **shortest → longest** for variable-length inputs. The active mask is chosen from the **count of alphanumeric “data” characters** in the current value, so it works for both progressively masked input and fast typing.

```ts
bind(input, ['(99) 9999-9999', '(99) 99999-9999'])
bind(input, ['999.999.999-99', 'AA.AAA.AAA/AAAA-99'])
```

## UMD / CDN

```html
<script src="https://unpkg.com/mother-mask/dist/mother-mask.umd.js"></script>
<script>
  const dispose = MotherMask.bind(document.getElementById('cpf'), '999.999.999-99')
</script>
```

The global name is **`MotherMask`**.

## API reference

### `bind` (primary)

| | |
|--|--|
| **Signature** | `bind(input, mask, options?)` |
| **Returns** | `() => void` — call to remove listeners and attributes so the input can be bound again |
| **Third argument** | `{ onChange?: (value: string) => void }`, or a legacy `(value) => void` callback |

### Other exports

| Export | Description |
|--------|-------------|
| `buildMask(value, mask, caret?, options?)` | Build a `Mask` instance (array `mask` is resolved to one string first). |
| `getMaxLength(mask)` | Maximum string length for the mask (for array masks, the longest pattern). |
| `applyMask(value, mask, inputCaret?, options?)` | Low-level: apply a **single** mask string; returns `{ value, caret }`. |
| `process(value, mask, options?)` | Apply a mask pattern to a raw value and return just the masked string. |

### `Mask` class

`buildMask` returns a `Mask` for advanced use. The instance applies the pattern and keeps a `caret` position aligned with the masked output (see TypeScript definitions in the package).

### `bindDecimal`

| | |
|--|--|
| **Signature** | `bindDecimal(input, options?)` |
| **Returns** | `() => void` — call to remove listeners and attributes so the input can be bound again |
| **Second argument** | `DecimalMaskOptions & { onChange?: (value: string, numericValue: number) => void }`, or a legacy `(value, numericValue) => void` callback |

### Other decimal exports

| Export | Description |
|--------|-------------|
| `applyDecimalMask(value, inputCaret?, options?)` | Low-level: format a raw/already-masked value; returns `{ value, caret }`. |
| `processDecimal(value, options?)` | Apply a decimal mask to a raw value and return just the masked string. |
| `unmaskDecimal(value, options?)` | Parse a raw or masked decimal string back into a JS `number` (`0` if it has no digits). |
| `formatDecimalValue(value, options?)` | Format a plain JS `number` into its masked display string — useful to pre-populate an input. |

### Types

```ts
type MaskPattern = string | string[]

interface MaskResult {
  readonly value: string
  readonly caret: number
}

interface ApplyMaskOptions {
  /** Hard boundaries between fields — on by default. Pass `false` for flat/reflow. */
  segmented?: boolean
}

interface BindOptions extends ApplyMaskOptions {
  onChange?: (value: string) => void
}

interface DecimalMaskOptions {
  decimalPlaces?: number      // default 2
  segmented?: boolean         // group into thousands — default true
  separator?: string          // thousands separator — default ','
  decimalSeparator?: string   // default '.'
  prefix?: string             // default ''
  suffix?: string             // default ''
  allowNegative?: boolean     // default false
}

interface BindDecimalOptions extends DecimalMaskOptions {
  onChange?: (value: string, numericValue: number) => void
}
```

`MaskPattern`, `MaskResult`, `ApplyMaskOptions`, `BindOptions`, `DecimalMaskOptions`, and `BindDecimalOptions` are exported as types.

## License

MIT — [Danilo Celestino de Castro](https://github.com/dan2dev)
