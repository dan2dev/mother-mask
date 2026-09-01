/**
 * Every code sample shown on the site, in one place.
 *
 * This module is read twice, and never by the browser:
 *
 *  - `vite/plugin-snippets.ts` imports it during the build, runs Shiki over
 *    each entry with the site's own themes (../styles/code-theme.ts), and
 *    serves the tokenized result as `virtual:snippets`.
 *  - `tsc` reads it for the `SnippetName` union, so a page that asks for a
 *    key that does not exist fails the build instead of rendering blank.
 *
 * Because the plugin imports this file directly — outside Vite's module
 * graph, under Bun or Node — it must stay free of imports and of anything
 * that needs bundler resolution. Plain data only.
 *
 * Keys that start with `ex-` are demo ids: `ExampleCard` looks its snippet up
 * by the id of the input it wraps, so a card's visible code and its live
 * `bind()` call in `src/scripts/demos/` share one name. Change a mask here and
 * the matching demo is one grep away.
 *
 * Snippets are written with `String.raw` so a backslash in a sample is the
 * backslash a reader sees — mask patterns are full of them.
 */

export type SnippetLang = 'ts' | 'html' | 'bash'

export interface RawSnippet {
  lang: SnippetLang
  code: string
}

/**
 * One Shiki token: its text, and the `tk-*` class carrying its color (empty
 * for plain text, which inherits the surrounding `pre`).
 */
export type SnippetToken = readonly [text: string, className: string]

/** What `virtual:snippets` serves per snippet: pre-tokenized lines of tokens. */
export type HighlightedSnippet = SnippetToken[][]

export const snippets = {
  // ── Overview ───────────────────────────────────────────────────────────────

  'home-playground': {
    lang: 'ts',
    code: String.raw`import { bind, bindDecimal } from 'mother-mask'

bind(phone, '(99) 99999-9999')
bind(card, '9999 9999 9999 9999')
bind(date, '9{1,2}/9{1,2}/9{4}')
bindDecimal(amount, {
  prefix: 'R$ ',
  separator: '.',
  decimalSeparator: ',',
  decimalPlaces: 2,
})`,
  },

  // ── Quick start ────────────────────────────────────────────────────────────

  'quick-start-html': {
    lang: 'html',
    code: String.raw`<input id="phone" type="text" inputmode="tel" aria-label="Phone number" />`,
  },

  'quick-start-ts': {
    lang: 'ts',
    code: String.raw`import { bind, process } from 'mother-mask'

const input = document.querySelector<HTMLInputElement>('#phone')!
const mask = '(99) 99999-9999'
input.value = process('11987654321', mask)

const dispose = bind(input, mask, {
  autocomplete: 'tel',
  onChange: value => console.log(value),
})

// Later, during cleanup, before rebinding or removing the input:
// dispose()`,
  },

  // ── Examples ───────────────────────────────────────────────────────────────

  'examples-tokens': {
    lang: 'ts',
    code: String.raw`const uppercaseLetter = {
  match: /[a-z]/i,
  transform: (char: string) => char.toUpperCase(),
}
const uppercaseAlphanumeric = {
  match: /[a-z0-9]/i,
  transform: (char: string) => char.toUpperCase(),
}`,
  },

  'ex-cpf': { lang: 'ts', code: String.raw`bind(input, '999.999.999-99')` },
  'ex-cnpj': { lang: 'ts', code: String.raw`bind(input, 'AA.AAA.AAA/AAAA-99', { tokens: { A: uppercaseAlphanumeric } })` },
  'ex-cep': { lang: 'ts', code: String.raw`bind(input, '99999-999')` },
  'ex-phone': { lang: 'ts', code: String.raw`bind(input, ['(99) 9999-9999', '(99) 99999-9999'])` },
  'ex-date-seg': { lang: 'ts', code: String.raw`bind(input, '99/99/9999')` },
  'ex-date-flat': { lang: 'ts', code: String.raw`bind(input, '99/99/9999', { segmented: false })` },
  'ex-date-eager': { lang: 'ts', code: String.raw`bind(input, '99/99/9999')` },
  'ex-date-not-eager': { lang: 'ts', code: String.raw`bind(input, '99/99/9999', { eager: false })` },
  'ex-date-flex': { lang: 'ts', code: String.raw`bind(input, '9{1,2}/9{1,2}/9{4}')` },
  'ex-time': { lang: 'ts', code: String.raw`bind(input, '99:99')` },
  'ex-plate': { lang: 'ts', code: String.raw`bind(input, 'ZZZ-9999', { segmented: false, tokens: { Z: uppercaseLetter } })` },
  'ex-mercosul': { lang: 'ts', code: String.raw`bind(input, 'ZZZ-9Z99', { tokens: { Z: uppercaseLetter } })` },
  'ex-card': { lang: 'ts', code: String.raw`bind(input, ['9999 999999 99999', '9999 9999 9999 9999'])` },
  'ex-usd': { lang: 'ts', code: String.raw`bindDecimal(input, { decimalPlaces: 2, prefix: '$' })` },
  'ex-eur': { lang: 'ts', code: String.raw`bindDecimal(input, { decimalPlaces: 2, separator: '.', decimalSeparator: ',', suffix: ' €' })` },
  'ex-qty': { lang: 'ts', code: String.raw`bindDecimal(input, { decimalPlaces: 0, suffix: ' units' })` },
  'ex-balance': { lang: 'ts', code: String.raw`bindDecimal(input, { decimalPlaces: 2, prefix: '$', allowNegative: true })` },

  'ex-raw': {
    lang: 'ts',
    code: String.raw`bind(input, '999.999.999-99', value => {
  document.getElementById('ex-raw-masked')!.textContent = value;
  document.getElementById('ex-raw-digits')!.textContent = value.replace(/\D/g, '')
})`,
  },

  // ── Custom patterns ────────────────────────────────────────────────────────

  'ex-hex': { lang: 'ts', code: String.raw`bind(input, 'HH:HH:HH:HH:HH:HH', { tokens: { H: /[0-9A-Fa-f]/ } })` },
  'ex-upper': { lang: 'ts', code: String.raw`bind(input, 'UUU-999', { tokens: { U: { match: /[a-z]/i, transform: char => char.toUpperCase() } } })` },
  'ex-dynamic-card': {
    lang: 'ts',
    code: String.raw`bind(input, '9999 9999 9999 9999', { resolveMask: v => v.startsWith('34') || v.startsWith('37') ? '9999 999999 99999' : '9999 9999 9999 9999' })`,
  },
  'ex-escaped': { lang: 'ts', code: String.raw`bind(input, '\\A-999999')` },
  'ex-unicode': { lang: 'ts', code: String.raw`bind(input, 'LLLL', { tokens: { L: /\p{L}/u } })` },

  // ── Editing ────────────────────────────────────────────────────────────────

  'ex-phone-edit': { lang: 'ts', code: String.raw`bind(input, '(999) 999-9999')` },
  'ex-phone-edit-lazy': { lang: 'ts', code: String.raw`bind(input, '(999) 999-9999', { eager: false })` },

  'editing-caret': {
    lang: 'ts',
    code: String.raw`// | marks the caret after the edit.
// Delete 222:          (111) |-3333
// Backspace again:     (111|-3333
// The caret stays before the untouched -3333 tail.

// CPF: select 012.153.441 in 012.153.441-39, then type 015.
// Result:              015.|-39`,
  },

  // ── Decimals ───────────────────────────────────────────────────────────────

  'ex-decimal-free': { lang: 'ts', code: String.raw`bindDecimal(input)` },
  'ex-decimal-usd': { lang: 'ts', code: String.raw`bindDecimal(input, { decimalPlaces: 2, prefix: '$' })` },
  'ex-decimal-brl': { lang: 'ts', code: String.raw`bindDecimal(input, { decimalPlaces: 2, separator: '.', decimalSeparator: ',', prefix: 'R$ ' })` },
  'ex-decimal-eur': { lang: 'ts', code: String.raw`bindDecimal(input, { decimalPlaces: 2, separator: '.', decimalSeparator: ',', suffix: ' €' })` },
  'ex-decimal-units': { lang: 'ts', code: String.raw`bindDecimal(input, { decimalPlaces: 0, suffix: ' units' })` },
  'ex-decimal-negative': { lang: 'ts', code: String.raw`bindDecimal(input, { decimalPlaces: 2, prefix: '$', allowNegative: true })` },
  'ex-decimal-plain': { lang: 'ts', code: String.raw`bindDecimal(input, { decimalPlaces: 2, segmented: false })` },
  'ex-decimal-width': { lang: 'ts', code: String.raw`bindDecimal(input, { numberPlaces: 2, decimalPlaces: 2 })` },
  'ex-decimal-callback': {
    lang: 'ts',
    code: String.raw`bindDecimal(input, { suffix: ' kg', onChange: (masked, numeric) => updateOutputs(masked, numeric) })`,
  },

  'decimals-helpers': {
    lang: 'ts',
    code: String.raw`import { bindDecimal, formatDecimalValue, unmaskDecimal } from 'mother-mask'

const options = {
  decimalPlaces: 2,
  separator: '.',
  decimalSeparator: ',',
  suffix: ' €',
}

input.value = formatDecimalValue(1234.5, options) // '1.234,50 €'
bindDecimal(input, {
  ...options,
  onChange: (value, numericValue) => console.log(value, numericValue),
})
unmaskDecimal('1.234,50 €', options) // 1234.5`,
  },

  // ── Regional ───────────────────────────────────────────────────────────────

  'ex-us-phone': { lang: 'ts', code: String.raw`bind(input, '(999) 999-9999')` },
  'ex-us-ssn': { lang: 'ts', code: String.raw`bind(input, '999-99-9999')` },
  'ex-us-zip': { lang: 'ts', code: String.raw`bind(input, '99999-9999')` },
  'ex-us-date': { lang: 'ts', code: String.raw`bind(input, '9{1,2}/9{1,2}/9{4}')` },
  'ex-iso-date': { lang: 'ts', code: String.raw`bind(input, '9{4}-9{1,2}-9{1,2}')` },
  'ex-ca-postal': {
    lang: 'ts',
    code: String.raw`bind(input, 'Z9Z 9Z9', { tokens: { Z: { match: /[a-z]/i, transform: char => char.toUpperCase() } } })`,
  },
  'ex-ca-sin': { lang: 'ts', code: String.raw`bind(input, '999 999 999')` },
  'ex-eu-iban': { lang: 'ts', code: String.raw`bind(input, 'DE99 9999 9999 9999 9999 99')` },
  'ex-eu-vat': { lang: 'ts', code: String.raw`bind(input, 'DE999999999')` },
  'ex-pl-postal': { lang: 'ts', code: String.raw`bind(input, '99-999')` },

  // ── Pattern syntax ─────────────────────────────────────────────────────────

  'patterns-quantifiers': {
    lang: 'ts',
    code: String.raw`9{4}     exactly four digits
9{1,2}   one or two digits
Z{2,4}   two to four letters
A{1,8}   one to eight alphanumeric characters`,
  },

  'patterns-quantifier-bind': {
    lang: 'ts',
    code: String.raw`bind(date, '9{1,2}/9{1,2}/9{4}')
// 3/4/1986   3/12/1986   12/4/1986   12/12/1986`,
  },

  'patterns-quantifier-standin': {
    lang: 'ts',
    code: String.raw`bind(date, '9{1,2}/9{1,2}/9{4}')
// type "3.4.1986" → "3/4/1986"
// type "3-4-1986" → "3/4/1986"
// type "3 4 1986" → "3/4/1986"`,
  },

  'patterns-escapes': {
    lang: 'ts',
    code: String.raw`bind(input, '\\A-999999') // '123456' → 'A-123456'
bind(input, '\\9-99')     // '12' → '9-12'
bind(input, '\\Z-99')     // '12' → 'Z-12'
bind(input, '\\\\99')      // a literal backslash, then two digits`,
  },

  // ── CDN ────────────────────────────────────────────────────────────────────

  'cdn-umd': {
    lang: 'html',
    code: String.raw`<input id="cpf" inputmode="numeric" aria-label="CPF" />

<script src="https://unpkg.com/mother-mask/dist/mother-mask.umd.js"></script>
<script>
  const input = document.getElementById('cpf')
  const dispose = MotherMask.bind(input, '999.999.999-99')
</script>`,
  },

  // ── API reference ──────────────────────────────────────────────────────────

  'api-pure-formatting': {
    lang: 'ts',
    code: String.raw`import { applyMask, process, processDecimal } from 'mother-mask'

process('12345678901', '999.999.999-99') // '123.456.789-01'
applyMask('25122025', '99/99/9999', 8) // { value: '25/12/2025', caret: 10 }
processDecimal('1234.567') // '1,234.567'
processDecimal('7.3', { numberPlaces: 2, decimalPlaces: 2 }) // '07.30'`,
  },

  'api-types': {
    lang: 'ts',
    code: String.raw`type MaskPattern = string | string[]

interface MaskResult {
  readonly value: string
  readonly caret: number // UTF-16 offset
}

type TokenMatcher = RegExp | ((char: string) => boolean)
interface MaskTokenDefinition {
  match: TokenMatcher
  transform?: (char: string) => string // exactly one code point
}
type MaskTokens = Record<string, TokenMatcher | MaskTokenDefinition>
type MaskResolver = (value: string) => MaskPattern

interface ApplyMaskOptions {
  segmented?: boolean // hard field boundaries for static masks — default true
  eager?: boolean     // reveal upcoming literals — default true
  tokens?: MaskTokens
  resolveMask?: MaskResolver
}

interface BindInputAttributes {
  autocomplete?: HTMLInputElement['autocomplete'] // default 'off'
  autocorrect?: 'on' | 'off'                      // default 'off'
  autocapitalize?: 'on' | 'off' | 'none' | 'sentences' | 'words' | 'characters' // default 'off'
  spellcheck?: boolean                             // default false
}

interface BindOptions extends ApplyMaskOptions, BindInputAttributes {
  onChange?: (value: string) => void
}

interface DecimalMaskOptions {
  decimalPlaces?: number      // unset: optional, unlimited fraction
  numberPlaces?: number       // unset: unlimited integer part
  segmented?: boolean         // group into thousands — default true
  separator?: string          // thousands separator — default ','
  decimalSeparator?: string   // default '.'
  prefix?: string             // default ''
  suffix?: string             // default ''
  allowNegative?: boolean     // default false
}

interface BindDecimalOptions extends DecimalMaskOptions, BindInputAttributes {
  onChange?: (value: string, numericValue: number) => void
}`,
  },
} satisfies Record<string, RawSnippet>

export type SnippetName = keyof typeof snippets
