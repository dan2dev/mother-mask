# mother-mask

Lightweight input mask library for browsers. Zero dependencies, TypeScript-first, ships ESM + CJS + UMD.

## Install

```bash
npm install mother-mask
# or
pnpm add mother-mask
```

## Usage

### `bind(input, mask, callback?)` — DOM binding

Attach a mask to any input element. Idempotent — calling `bind()` twice on the same element has no effect.

```ts
import { bind } from 'mother-mask'

const input = document.getElementById('phone') as HTMLInputElement

// Fixed mask
bind(input, '(99) 99999-9999')

// Dynamic mask — switches automatically as the user types
bind(input, ['(99) 9999-9999', '(99) 99999-9999'])

// Optional callback — receives the masked value on every change
bind(input, '999.999.999-99', (value) => {
  console.log(value) // e.g. "123.456.789-01"
})
```

### `process(value, mask)` — pure function

Apply a mask to a raw string without touching the DOM. Useful for formatting stored values.

```ts
import { process } from 'mother-mask'

process('12345678901', '999.999.999-99')       // → "123.456.789-01"
process('01012024',   '99/99/9999')            // → "01/01/2024"
process('01310100',   '99999-999')             // → "01310-100"
process('1AB2C3D45E6F78', 'AA.AAA.AAA/AAAA-99') // → "1A.B2C.3D4/5E6F-78"
```

## Pattern syntax

| Character | Matches        |
|-----------|----------------|
| `9`       | Digit (0–9)    |
| `Z`       | Letter (a–z, A–Z) |
| `A`       | Alphanumeric (0–9, a–z, A–Z) |
| anything else | Literal — inserted automatically |

## Array masks

Pass an ordered array (shortest → longest) to support variable-length inputs. The mask is selected by comparing the current value length against each mask's total length.

```ts
// Brazilian phone: 8-digit → 9-digit landline / mobile
bind(input, ['(99) 9999-9999', '(99) 99999-9999'])

// CPF / CNPJ alfanumérico
bind(input, ['999.999.999-99', 'AA.AAA.AAA/AAAA-99'])
```

## UMD / CDN

```html
<script src="https://unpkg.com/mother-mask/dist/mother-mask.umd.js"></script>
<script>
  MotherMask.bind(document.getElementById('cpf'), '999.999.999-99')
</script>
```

## API reference

```ts
// Apply mask to a string — no DOM required
process(value: string, mask: MaskPattern): string

// Bind a mask to an input element (idempotent)
bind(
  input: HTMLInputElement | Element,
  mask: MaskPattern,
  callback?: ((value: string) => void) | null,
): void

// Build a Mask instance directly (advanced use)
buildMask(value: string, mask: MaskPattern, caret?: number): Mask

// Maximum allowed input length for a given mask
getMaxLength(mask: MaskPattern): number

// Pattern type
type MaskPattern = string | string[]
```

## Development

```bash
make install    # install dependencies
make test       # run tests + coverage
make build      # build ESM + CJS + UMD
make dev        # watch mode
make lint       # lint source files
```

## Release

```bash
make publish              # bump patch, publish, commit, tag, push
make publish BUMP=minor
make publish BUMP=major
```

## License

MIT — [Danilo Celestino de Castro](https://github.com/dan2dev)
