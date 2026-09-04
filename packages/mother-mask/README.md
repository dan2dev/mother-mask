# mother-mask

Lightweight input masks for browser forms. Zero runtime dependencies, written in TypeScript, and published with ESM, CJS, and UMD builds.

[npm](https://www.npmjs.com/package/mother-mask) | [Documentation and live examples](https://mother-mask.dan2.dev/)

Format phone numbers, dates, identifiers, and decimal inputs with static patterns,
custom tokens, or a mask chosen from the value. Formatting does **not** validate
dates, checksums, card networks, or whether an identifier exists; validate those
separately in your application.

[Basic usage](#basic-usage) · [Decimals](#decimal-inputs) ·
[Patterns](#pattern-syntax) · [Custom tokens](#custom-tokens-and-transforms) ·
[Dynamic masks](#content-dependent-masks) · [Editing](#segmented-editing) · [API](#api)

## Install

```bash
npm install mother-mask
```

```bash
pnpm add mother-mask
```

## Basic Usage

Use a text input with an appropriate keyboard hint:

```html
<input id="phone" type="text" inputmode="tel" aria-label="Phone number" />
```

```ts
import { bind } from 'mother-mask'

const input = document.querySelector<HTMLInputElement>('#phone')!

const dispose = bind(input, '(99) 99999-9999')

// Later, remove listeners and allow rebinding.
dispose()
```

Use an ordered mask array for values with more than one length. Order by data
capacity, shortest first; selection uses the number of accepted characters, not
their content:

```ts
bind(input, ['(99) 9999-9999', '(99) 99999-9999'])
```

Use [`resolveMask`](#content-dependent-masks) when a prefix determines the layout.

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

Both binders add `autocomplete="off"`, `autocorrect="off"`,
`autocapitalize="off"`, and `spellcheck="false"` when those attributes are
absent. Override the defaults through the same typed options object:

```ts
bind(input, '(99) 99999-9999', {
  autocomplete: 'tel',
  autocorrect: 'on',
  autocapitalize: 'words',
  spellcheck: true,
})
```

Bind each input once. Calling `bind` or `bindDecimal` on an already-bound input
does nothing; dispose the existing binding before changing its options. In a UI
framework, bind after the input mounts and call the disposer during cleanup.
Disposal removes listeners, pending frames, and attributes added by the library;
attributes that were already present are preserved.

Binding does not format the initial value or fire an initial callback. Use the
[pure helpers](#formatting-without-an-input) to prepare values before binding.
Assignments to `input.value` do not dispatch an input event, so format programmatic
updates yourself as well.

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
  decimalPlaces: 2,
  separator: '.',
  decimalSeparator: ',',
})
```

Without `decimalPlaces`, the fraction is optional and has no length limit. Set it
to `2` for two fixed, zero-padded places, or `0` for integers only. `numberPlaces`
optionally pads and caps the integer part; it is unlimited by default.

| Option | Default | Behavior |
| --- | --- | --- |
| `decimalPlaces` | Unset | Optional, unlimited fraction; set a width to pad and cap it |
| `numberPlaces` | Unset | Unlimited integer part; set a width to pad and cap it |
| `segmented` | `true` | Group the integer part into thousands |
| `separator` | `','` | Thousands separator |
| `decimalSeparator` | `'.'` | Separator before the fraction |
| `prefix`, `suffix` | `''` | Fixed display text, excluded from numeric parsing |
| `allowNegative` | `false` | Allow negative numbers — typing `-` anywhere makes the value negative, `+` anywhere makes it positive |
| `onChange` | Unset | Binding callback receiving the formatted string and JS number |

For decimal masks, `segmented` controls thousands grouping. It is separate from
the independent-field behavior of pattern masks. Use `type="text"` and
`inputmode="decimal"` for formatted decimal fields.

`prefix` and `suffix` are fixed display text. Typing inside the prefix inserts at
the start of the number; typing inside the suffix inserts at the end:

```ts
bindDecimal(input, { prefix: '$', decimalPlaces: 2 })
// "$0.00" — caret at the far left, type "2"
// → "$2|.00"   same as typing just after the "$"
```

Their text is never read back as part of the number either, so an affix carrying a digit or the decimal separator stays out of the value:

```ts
bindDecimal(input, { prefix: 'Q1 ', decimalPlaces: 2 })
// typing 1234 → "Q1 1,234.00"
// unmaskDecimal('Q1 1,234.00', { prefix: 'Q1 ' }) → 1234
```

## Pattern Syntax

| Character | Matches |
| --- | --- |
| `9` | ASCII digit (`0`–`9`) |
| `Z` | ASCII letter |
| `A` | ASCII letter or digit |
| Custom token | Matches its local definition (see below) |
| `{n}` / `{min,max}` | Repeats the token before it (see [quantifiers](#bounded-quantifiers)) |
| `\` | Escapes a token or another backslash (see [escaping](#escaped-literals)) |
| Anything else | Literal separator |

Examples:

```ts
bind(input, '999.999.999-99')
bind(input, '99/99/9999')
bind(input, 'AA.AAA.AAA/AAAA-99')
```

## Bounded Quantifiers

A slot token can be followed by a bounded repeat count. `{n}` is exactly `n`
occurrences; `{min,max}` is anywhere from `min` to `max`:

```text
9{4}     exactly four digits
9{1,2}   one or two digits
Z{2,4}   two to four letters
A{1,8}   one to eight alphanumeric characters
```

`{n}` is just shorthand — `9{4}` and `9999` compile to the same mask.
`{min,max}` is the new capability: a **variable-width segment**.

```ts
bind(date, '9{1,2}/9{1,2}/9{4}')
// 3/4/1986   3/12/1986   12/4/1986   12/12/1986
```

The user decides how wide a ranged segment is, using the separator:

- **Typing `"3/"` commits the one-digit first segment.** Once a ranged segment
  has reached its `min`, typing the literal that follows it ends that segment
  for good, and the separator stays visible — it is input, not decoration, so
  this holds with `eager: false` too.
- **Typing `"12"` reaches `max` and may reveal `"/"` eagerly**, exactly as a
  fixed `99` segment does. With `eager: false` it waits for the next character.

Reaching `min` alone never inserts anything: after `"3"` the value is `"3"`,
because the next keystroke could still be a second digit.

Closing a segment early retires the slots it did not use, so a finished value
can be shorter than the pattern's maximum: `"3/4/1986"` is complete at eight
characters even though `getMaxLength` reports `10`. Anything typed past that
point is dropped rather than repacked — the boundaries the user set hold, and
the character that no longer fits falls off the end, exactly as an extra digit
does on a full fixed mask. So `maxlength` alone is not a completeness check for
a ranged mask; inspect the value if you need one.

Mother Mask **does not validate dates** — or anything else semantic. It never
inspects a value to decide that `"34"` cannot be a day and must mean `3/4`.
A quantifier is a width rule; explicit separators are how a user says a
segment is shorter than its maximum.

Only bounded forms are syntax. `*`, `+`, `?`, `{n,}`, `{,n}`, `{0}` and
`{2,1}` are not, and neither is a repeat count above 1000; those brace
sequences stay literal text, exactly as they did before quantifiers existed.
A quantifier is only read directly after an unescaped token, so the pattern
`'\\9{1,2}'` is the literal text `9{1,2}`.

`getMaxLength` and the `maxlength` `bind` sets use the compiled maximum
(`10` for `'9{1,2}/9{1,2}/9{4}'`), never the length of the pattern source.
Ordered mask arrays likewise select by compiled slot capacity. In flat mode
(`segmented: false`) there are no segment boundaries to commit, so a ranged
run simply behaves as its maximum width.

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
[bounded quantifiers](#bounded-quantifiers), and all four APIs: `applyMask`,
`process`, `buildMask`, and `bind`. A quantified run reuses the same matcher
and transform, and a transform still runs exactly once per accepted character:

```ts
process('ab-123', 'U{1,2}-9{1,3}', {
  tokens: { U: { match: /[a-z]/i, transform: char => char.toUpperCase() } },
}) // 'AB-123'
```

Use token transforms to normalize case while preserving the caret, rather than
rewriting `input.value` inside an `onChange` callback.

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
literal. An escaped token cannot take a
[quantifier](#bounded-quantifiers) either — `'\\9{1,2}'` is the literal text
`9{1,2}`. Existing masks that used a backslash immediately before a token or
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

Deleting all the data in an internal segment preserves its existing dividers
while later segments still contain data. For example, three Backspaces over
`222` in `(111) 222-3333` leave `(111) |-3333` (`|` marks the caret), ready to
type a replacement. This also works with `eager: false`. Trailing separators
still follow eager mode, and selecting everything and deleting clears the input.

If another Backspace removes part of a divider, the caret follows any collapsed
text to the left: `(111|-3333`, never `(111-|3333`. Backward word/line deletion
uses the same caret rule; movement through a divider that stays visible is preserved.

Separators left in the value also anchor the characters around them, so an edit that replaces whole fields leaves the rest where it was:

```ts
bind(input, '999.999.999-99')
// "012.153.441-39" — select "012.153.441", type "015"
// → "015.|-39"     the "-" keeps "39" in the last field
```

Anchoring is only as precise as the separators allow. A mask whose separators are all the same character can produce an ambiguous value — with `'99/99/9999'`, `"1/2025"` reads equally well as `1 / 20 / 25` — and resolves it to the earliest field that fits. Masks with distinct separators (CPF, CNPJ, phone numbers) have no such gap.

Deleting a selection can take a whole field *and* the separator introducing
the next one with it — selecting `"(11) "` out of `"(11) 98765-4321"` and
pressing Backspace/Delete/Cut removes the area code, its closing paren, and
the space in one stroke. `bind()` restores that separator before masking, so
the untouched `"98765-4321"` stays exactly where it was instead of sliding
into the emptied field:

```ts
bind(input, '(99) 99999-9999')
// "(11) 98765-4321" — select "(11) ", press Backspace
// → "(|) 98765-4321"     "98765" and "4321" never moved
```

Typing a character straight over a selection destroys the same dividers the
equivalent Delete would, so it gets the same rescue — but only when it has to.
Selecting the `"3/12"` of `"3/12/1986"` on `'9{1,2}/9{1,2}/9{4}'` and typing
`"4"` leaves `"4/1986"`, where the lone surviving `"/"` reads equally well as
the day's; without the rescue the untouched year breaks apart into
`"4/19/86"`. Restoring the divider gives `"4|//1986"` instead, with the year
untouched. The caret stays in the day: it is only one of the two digits that
field accepts, so the next keystroke widens it to `"42"` rather than starting
the month — the mask has no way to know the day was finished, and eager hands
the caret across on its own once it is. Where the tail was never in danger —
retyping a CPF over `"012.153.441"`, whose `"-"` is distinct — nothing is
restored and the digits keep filling from the left exactly as before.

A divider whose removal would re-segment untouched text is not erodible:
Backspacing the second `"/"` out of `"13//1986"` would leave `"13/1986"`,
which re-reads as `13 / 19 / 86`, so it is put back and the keystroke erodes
the day instead. Where dropping a divider costs nothing — a CPF's `"-"` still
pins its last field however much of `"."` survives — Backspace peels it away
exactly as documented above.

This is bind-only, like eager's Backspace/Delete handling above: pure
`applyMask`/`buildMask`/`process` see only the resulting `(value, caret)` and
can't tell a deletion from fresh input, so `applyMask("98765-4321", mask, 0)`
still packs from the left. A selection confined to separator text (no field
data in it) is left alone, however wide — that is ordinary divider erosion,
not a swallow, and keeps working exactly as above. Word/line deletes
(`Cmd+Backspace`/`Cmd+Delete` and friends) are a deliberate bulk clear and are
never rescued, and neither are ordered mask arrays or `resolveMask`, since
which pattern or layout applies can itself change once the deletion shrinks
the data.

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

A [ranged segment](#bounded-quantifiers) reveals its separator only at its
maximum, never at its minimum. A separator the user types themselves is
their input rather than a reveal, so it survives `eager: false`.

`bind` does not reinsert an eager separator immediately after Backspace/Delete
removes it: deleting the `"."` off `"012."` leaves `"012"`. This is binding behavior;
the pure helpers have no edit history and apply the configured `eager` option on
every call. Arrow keys, Home/End, and selection shortcuts retain native behavior.

## Formatting Without an Input

The pure helpers return strings or a formatted value with a caret position:

```ts
import { applyMask, process, processDecimal, formatDecimalValue, unmaskDecimal } from 'mother-mask'

process('12345678901', '999.999.999-99') // '123.456.789-01'
applyMask('25122025', '99/99/9999', 8) // { value: '25/12/2025', caret: 10 }

processDecimal('1234.567') // '1,234.567' — optional, unlimited fraction
processDecimal('1234.5', { decimalPlaces: 2, prefix: '$' }) // '$1,234.50'
processDecimal('7.3', { numberPlaces: 2, decimalPlaces: 2 }) // '07.30'

const euro = { decimalPlaces: 2, separator: '.', decimalSeparator: ',', suffix: ' €' }
formatDecimalValue(1234.5, euro) // '1.234,50 €'
unmaskDecimal('1.234,50 €', euro) // 1234.5
```

Pass the same locale and affix options when formatting and parsing.
`formatDecimalValue` accepts a JS number; the other decimal helpers accept strings
in the configured format. `unmaskDecimal` returns `0` for empty or digitless input.
All caret arguments and results are UTF-16 offsets, matching DOM selections.

## CDN

```html
<script src="https://unpkg.com/mother-mask/dist/mother-mask.umd.js"></script>
<script>
  MotherMask.bind(document.getElementById('cpf'), '999.999.999-99')
</script>
```

The global name is `MotherMask`.

## API

| Export | Returns / purpose |
| --- | --- |
| `bind(input, mask, options?)` | Disposer; bind a static pattern, ordered array, or resolver via options |
| `bindDecimal(input, options?)` | Disposer; bind a decimal input |
| `applyMask(value, mask, inputCaret?, options?)` | `MaskResult`: `{ value, caret }` |
| `process(value, mask, options?)` | Formatted string |
| `buildMask(value, mask, caret?, options?)` | `Mask` instance; call `.process()` and read `.caret` afterward |
| `new Mask(value, mask, caret?, options?)` | Low-level processor with the same options |
| `getMaxLength(mask, options?)` | Formatted UTF-16 upper bound; `Infinity` with a resolver |
| `applyDecimalMask(value, inputCaret?, options?)` | `MaskResult`: `{ value, caret }` |
| `processDecimal(value, options?)` | Formatted decimal string |
| `unmaskDecimal(value, options?)` | Parsed JS number |
| `formatDecimalValue(value, options?)` | Display string from a JS number |

Pattern options (`ApplyMaskOptions`) are `segmented` (default `true`), `eager`
(default `true`), `tokens`, and `resolveMask`. `BindOptions` adds `onChange` and
the shared `BindInputAttributes`: `autocomplete`, `autocorrect`,
`autocapitalize`, and `spellcheck`. `BindDecimalOptions` includes the same DOM
attribute options.
`bind` also accepts a `(value) => void` callback as its third argument;
`bindDecimal` accepts `(value, numericValue) => void` as its second argument.

Optional caret arguments default to `0`. `getMaxLength` counts literals,
counts a [quantified](#bounded-quantifiers) run at its maximum, and reserves up
to two UTF-16 units per custom-token slot; it is not a count of data characters
and never the length of the pattern source. See [dynamic masks](#content-dependent-masks) for `maxlength` handling.

Exported types:

- `MaskPattern`
- `TokenMatcher`
- `MaskTokenDefinition`
- `MaskTokens`
- `MaskResolver`
- `MaskResult`
- `ApplyMaskOptions`
- `BindInputAttributes`
- `BindOptions`
- `DecimalMaskOptions`
- `BindDecimalOptions`

## Development

See the [repository guide](https://github.com/dan2dev/mother-mask/blob/main/REPOSITORY.md)
for builds, tests, and release commands, and the
[docs guide](https://github.com/dan2dev/mother-mask/blob/main/docs/README.md) for
running the documentation website. Keep this README and the published package
README in sync.

## License

MIT - [Danilo Celestino de Castro](https://github.com/dan2dev)
