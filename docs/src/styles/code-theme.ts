// Custom Shiki themes, derived from this site's own brand palette (see the
// `:root` / `:root[data-theme='dark']` variables in ./global.css) instead of
// a stock theme like github-dark. Shiki bakes each token's color in as a
// static hex value at build time, so these mirror the CSS variables' current
// values by hand — if the brand palette in global.css changes, update the
// matching hex here too.
//
// Palette used (3 accent hues + neutrals), consistent across both themes:
//   pink   (--accent-3) -> keywords / control flow / storage
//   orange (--accent-2) -> strings
//   purple (--accent)   -> numbers, regexp, functions, types
//   dim    (--text-dim) -> comments, punctuation
//   default (--code-text) -> plain identifiers, object keys, everything else

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
  'meta.brace',
  'keyword.operator',
  'keyword.operator.assignment',
  'keyword.operator.arithmetic',
  'keyword.operator.comparison',
  'keyword.operator.logical',
  'keyword.operator.relational',
]

const STRING = [
  'string',
  'string.quoted',
  'string.quoted.single',
  'string.quoted.double',
  'string.quoted.template',
  'string.template',
  'punctuation.definition.string',
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

function tokenColors(colors: {
  keyword: string
  punctuation: string
  string: string
  accent: string
  escape: string
  plain: string
}) {
  return [
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: colors.punctuation, fontStyle: 'italic' } },
    { scope: KEYWORD, settings: { foreground: colors.keyword } },
    { scope: PUNCTUATION, settings: { foreground: colors.punctuation } },
    { scope: STRING, settings: { foreground: colors.string } },
    { scope: REGEXP_AND_CONST, settings: { foreground: colors.accent } },
    { scope: ESCAPE, settings: { foreground: colors.keyword } },
    { scope: PLAIN, settings: { foreground: colors.plain } },
    { scope: ['invalid', 'invalid.illegal'], settings: { foreground: '#ff7f97' } },
  ]
}

export const codeThemeDark = {
  name: 'mother-mask-dark',
  type: 'dark',
  colors: {
    'editor.background': '#191529',
    'editor.foreground': '#ded9ec',
  },
  tokenColors: tokenColors({
    keyword: '#ff7ec4', // --accent-3 (dark)
    punctuation: '#837e97', // --text-dim (dark)
    string: '#ff9678', // --accent-2 (dark)
    accent: '#a496ff', // --accent (dark)
    escape: '#ff7ec4',
    plain: '#ded9ec', // --code-text (dark)
  }),
} as const

export const codeThemeLight = {
  name: 'mother-mask-light',
  type: 'light',
  colors: {
    'editor.background': '#f3f0f8',
    'editor.foreground': '#2c2740',
  },
  tokenColors: tokenColors({
    keyword: '#d94ed7', // --accent-3 (light)
    punctuation: '#817c94', // --text-dim (light)
    string: '#ff745f', // --accent-2 (light)
    accent: '#7257f5', // --accent (light)
    escape: '#d94ed7',
    plain: '#2c2740', // --code-text (light)
  }),
} as const
