/**
 * The Shiki theme used to highlight every sample in src/content/snippets.ts.
 *
 * Highlighting happens once, at build time, in vite/plugin-snippets.ts. Rather
 * than baking this site's palette into the theme as hex — which would have to
 * be kept in sync with global.css by hand, twice, once per color scheme — each
 * scope group is given a unique *sentinel* color that means nothing on its own.
 * The plugin maps every sentinel back to the class in `TOKEN_CLASS`, and
 * global.css points those classes at the site's CSS custom properties.
 *
 * The upshot: light and dark code colors come from the same `--accent`,
 * `--text-dim`, `--code-text` variables as the rest of the page, so the
 * palette is defined in exactly one place and the theme toggle needs no
 * second set of token colors.
 */

/** Sentinel -> class name. The classes are styled in global.css (`.shiki .tk-*`). */
export const TOKEN_CLASS = {
  '#000001': 'tk-com', // comments
  '#000002': 'tk-key', // keywords, storage, control flow, tags
  '#000003': 'tk-pun', // punctuation, operators, separators
  '#000004': 'tk-str', // strings
  '#000005': 'tk-acc', // numbers, regexp, constants, functions, types
  '#000006': 'tk-bad', // invalid / illegal
} as const

const COMMENT = '#000001'
const KEYWORD_COLOR = '#000002'
const PUNCTUATION_COLOR = '#000003'
const STRING_COLOR = '#000004'
const ACCENT_COLOR = '#000005'
const INVALID_COLOR = '#000006'

/** Plain identifiers inherit `pre`'s own `--code-text`, so they get no class. */
const PLAIN_COLOR = '#000000'

const KEYWORD = [
  'keyword',
  'keyword.control',
  'keyword.control.flow',
  'keyword.control.import',
  'keyword.control.export',
  'keyword.control.conditional',
  'keyword.control.loop',
  'keyword.control.as',
  'keyword.other',
  'storage',
  'storage.type',
  'storage.modifier',
  'keyword.operator.new',
  'keyword.operator.expression',
  'variable.language.this',
  'variable.language.super',
  'entity.name.tag',
  'punctuation.definition.tag',
]

const PUNCTUATION = [
  'punctuation',
  'punctuation.separator',
  'punctuation.terminator',
  'punctuation.accessor',
  'punctuation.definition.block',
  'punctuation.definition.parameters',
  'punctuation.section',
  'meta.brace',
  'keyword.operator',
  'keyword.operator.assignment',
  'keyword.operator.arithmetic',
  'keyword.operator.comparison',
  'keyword.operator.logical',
  'keyword.operator.relational',
  'keyword.operator.ternary',
  'keyword.operator.optional',
  'keyword.operator.type.annotation',
  'keyword.operator.arrow',
  'keyword.operator.spread',
]

const STRING = [
  'string',
  'string.quoted',
  'string.quoted.single',
  'string.quoted.double',
  'string.template',
  'punctuation.definition.string',
  'punctuation.definition.string.begin',
  'punctuation.definition.string.end',
  'string.other.link',
  'meta.attribute string',
  'string.unquoted',
]

const REGEXP_AND_CONST = [
  'string.regexp',
  'punctuation.definition.string.begin.regexp',
  'punctuation.definition.string.end.regexp',
  'constant.other.character-class.regexp',
  'keyword.control.anchor.regexp',
  'keyword.operator.quantifier.regexp',
  'constant.numeric',
  'constant.language',
  'constant.language.boolean',
  'constant.language.null',
  'constant.language.undefined',
  'support.constant',
  'entity.name.function',
  'support.function',
  'meta.function-call',
  'meta.function-call.generic',
  'variable.function',
  'entity.name.type',
  'entity.name.type.alias',
  'entity.other.inherited-class',
  'support.type',
  'support.class',
  'meta.type.annotation',
]

const ESCAPE = ['constant.character.escape']

const PLAIN = [
  'variable',
  'variable.parameter',
  'variable.other',
  'variable.other.readwrite',
  'variable.other.property',
  'meta.object-literal.key',
  'support.variable.property',
]

/**
 * A Shiki `ThemeRegistrationRaw`. Typed structurally rather than imported from
 * shiki so this module stays importable from anywhere without pulling in the
 * highlighter.
 */
export const codeTheme = {
  name: 'mother-mask',
  type: 'light',
  colors: {
    // Both are overridden in CSS; Shiki only needs them to resolve defaults.
    'editor.background': '#ffffff',
    'editor.foreground': PLAIN_COLOR,
  },
  tokenColors: [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: COMMENT, fontStyle: 'italic' } },
    { scope: KEYWORD, settings: { foreground: KEYWORD_COLOR } },
    { scope: PUNCTUATION, settings: { foreground: PUNCTUATION_COLOR } },
    { scope: STRING, settings: { foreground: STRING_COLOR } },
    { scope: REGEXP_AND_CONST, settings: { foreground: ACCENT_COLOR } },
    { scope: ESCAPE, settings: { foreground: KEYWORD_COLOR } },
    { scope: PLAIN, settings: { foreground: PLAIN_COLOR } },
    { scope: ['invalid', 'invalid.illegal'], settings: { foreground: INVALID_COLOR } },
  ],
} as const
