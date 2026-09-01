/**
 * One live demo: a title, the `bind()` call that produced it, the input that
 * call is bound to, and whatever hint or output the page passes as children.
 *
 * The card takes only the input's id. That id is also the snippet's key in
 * src/content/snippets.ts and the id the page's demo script binds, so the code
 * a reader sees and the mask actually running on the field next to it cannot
 * drift apart without the build failing.
 */
import { InlineCode } from './CodeBlock.ts'
import type { SnippetName } from '../content/snippets.ts'
import { demoInputAttributes } from './demo-input-attributes.ts'

export interface ExampleCardOptions {
  /** Card heading. An array when it needs inline markup, e.g. a `<code>`. */
  title: NodeModLike<'h2'> | readonly NodeModLike<'h2'>[]
  /** The input's id, and the key of the snippet shown above it. */
  inputId: SnippetName
  ariaLabel?: string
  placeholder?: string
  inputmode?: string
  value?: string
  /** Span the full grid, for cards with wide code or two outputs. */
  wide?: boolean
}

export function ExampleCard(options: ExampleCardOptions, ...children: NodeModLike<'div'>[]) {
  const { title, inputId, ariaLabel, placeholder, inputmode, value, wide = false } = options

  return div(
    {
      // Each demo is a thing worth linking to on its own — "see the CNPJ
      // example" should be a URL. The input already owns `ex-cpf`, so the card
      // takes the readable half: `examples.html#cpf`.
      id: inputId.replace(/^ex-/, ''),
      className: wide ? 'example example-wide' : 'example',
    },
    h2(...(Array.isArray(title) ? title : [title])),
    InlineCode(inputId, 'snippet'),
    input({
      ...demoInputAttributes,
      id: inputId,
      'aria-label': ariaLabel,
      placeholder,
      inputmode,
      value,
    }),
    ...children,
  )
}
