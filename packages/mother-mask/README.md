# mother-mask

Lightweight input mask library for browsers. Zero runtime dependencies, TypeScript-first, ships **ESM**, **CJS**, and **UMD**.

Published as [`mother-mask` on npm](https://www.npmjs.com/package/mother-mask).

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
| `buildMask(value, mask, caret?)` | Build a `Mask` instance (array `mask` is resolved to one string first). |
| `getMaxLength(mask)` | Maximum string length for the mask (for array masks, the longest pattern). |
| `applyMask(value, mask, inputCaret?)` | Low-level: apply a **single** mask string; returns `{ value, caret }`. |

### `Mask` class

`buildMask` returns a `Mask` for advanced use. The instance applies the pattern and keeps a `caret` position aligned with the masked output (see TypeScript definitions in the package).

### Types

```ts
type MaskPattern = string | string[]

interface MaskResult {
  readonly value: string
  readonly caret: number
}

interface BindOptions {
  onChange?: (value: string) => void
}
```

`MaskPattern`, `MaskResult`, and `BindOptions` are exported as types.

## License

MIT — [Danilo Celestino de Castro](https://github.com/dan2dev)
