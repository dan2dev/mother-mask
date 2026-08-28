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
| `Z` | ASCII letter |
| `A` | ASCII letter or digit |
| Anything else | Literal separator |

Examples:

```ts
bind(input, '999.999.999-99')
bind(input, '99/99/9999')
bind(input, 'AA.AAA.AAA/AAAA-99')
```

## Custom Tokens and Transforms

Tokens are local to an operation or binding. A definition is a `RegExp`, a
`(char: string) => boolean` matcher, or `{ match, transform? }`:

```ts
bind(input, 'HH-HH', { tokens: { H: /[0-9A-Fa-f]/ } })
// "a1b2" → "a1-b2"; "g" is rejected

bind(input, 'UUU-999', {
  tokens: {
    U: { match: /[a-z]/i, transform: char => char.toUpperCase() },
  },
})
// "abc123" → "ABC-123"
```

Keys are single Unicode code points; `\` is reserved. Custom definitions may
override `9`, `Z`, or `A` for that binding only. Definitions are snapshotted on
bind; dispose and rebind to change them. Matchers should be pure. RegExp `g`/`y`
flags are ignored on a private copy; the caller's `lastIndex` is never changed.

A transform **must return exactly one Unicode code point**, otherwise a
`RangeError` is thrown (for example, uppercasing `ß` to `SS` is not supported).
Use an idempotent transform whose output still matches the token. UTF-16 width
may change: the caret follows the source character, not the output's case or width.

Custom tokens work with ordered arrays, segmented editing, eager literals,
and all four APIs: `applyMask`, `process`, `buildMask`, and `bind`.

## Content-dependent Masks

```ts
bind(input, '9999 9999 9999 9999', {
  resolveMask(value) {
    return value.startsWith('34') || value.startsWith('37')
      ? '9999 999999 99999'
      : '9999 9999 9999 9999'
  },
})
```

`resolveMask` is called **once per masking application**, before transforms,
with candidate data: code points accepted by the slots of the supplied fallback
pattern (or any fallback array member). Complete fallback literal runs at their
slot boundaries (escaped runs also after a segment shrinks) and nonmatching characters are removed. Thus raw and formatted
card numbers give the same digit stream, and invalid letters cannot change the
prefix. Make the fallback alphabet cover every format your resolver can return.
The callback can return a string or an ordered array; arrays retain capacity-based
selection. No recursive resolution or caching of input values occurs.

Resolver masks describe **one continuous identifier**: old separators are removed
before rendering the selected layout, even with `segmented: true`. This prevents
stale boundaries when equal-capacity layouts switch. For independently editable
fields, use a static pattern/array and segmented mode instead. Eager mode still
applies; the caret tracks logical characters and already-crossed literal boundaries.

`bind` does not add `maxlength` for resolvers (the maximum is unknowable) or
custom tokens (IME drafts can exceed the final capacity). The engine still caps
slots. Author-supplied `maxlength` is preserved. Disposal removes attributes added
by the binding, so rebinding cannot inherit a library-created stale limit.

## Escaped Literals

```ts
bind(input, '\\A-999999') // "123456" → "A-123456"
bind(input, '\\9-99')     // "12" → "9-12"
bind(input, '\\Z-99')     // "12" → "Z-12"
bind(input, '\\\\99')      // a literal backslash, then two digits
```

In the pattern, backslash escapes a built-in/custom token or another backslash.
Before any other character it remains literal; a trailing backslash also remains
literal. Existing masks that used a backslash immediately before a token or
backslash must double it to keep that backslash in the output.

Complete literal runs are treated as formatting at their boundary; escaped runs
remain formatting after a segment shrinks, rather than becoming slot data. If literal text also matches the data alphabet, raw
and already-formatted input can be ambiguous: use a distinct separator (such as
`'\\9-99'`) to distinguish the literal from user data. Resolver formats should
likewise avoid introducing data-looking literals absent from the fallback pattern.

## Unicode and Composition

```ts
bind(input, 'LLLL', { tokens: { L: /\p{L}/u } })
// accepts Á, Ç, É, ñ, ü, ø, Ж, λ, and supplementary letters such as 𐐀
```

Matching is by **Unicode code point**, not UTF-16 code unit or grapheme cluster.
Combining marks and joined emoji sequences therefore occupy separate slots if
accepted; no normalization or grapheme segmentation is performed. Caret offsets
remain DOM-compatible UTF-16 positions. Built-in `Z` and `A` remain ASCII-only.

With custom tokens, provisional IME text and selection are left untouched until
composition commits. This includes custom ASCII matchers: an arbitrary predicate's
alphabet cannot be safely inferred. Built-in-only masks keep live formatting during
Android autocorrect composition. No timeout or delayed commit is used.

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
- `getMaxLength(mask, options?)` (formatted UTF-16 upper bound; `Infinity` with a resolver)
- `applyDecimalMask(value, inputCaret?, options?)`
- `processDecimal(value, options?)`
- `unmaskDecimal(value, options?)`
- `formatDecimalValue(value, options?)`
- `Mask`

Exported types:

- `MaskPattern`
- `TokenMatcher`
- `MaskTokenDefinition`
- `MaskTokens`
- `MaskResolver`
- `MaskResult`
- `ApplyMaskOptions`
- `BindOptions`
- `DecimalMaskOptions`
- `BindDecimalOptions`

## License

MIT - [Danilo Celestino de Castro](https://github.com/dan2dev)
