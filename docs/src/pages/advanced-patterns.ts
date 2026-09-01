import { ExampleCard } from '../components/ExampleCard.ts'
import { SectionHeading } from '../components/SectionHeading.ts'
import { createDemos, uppercaseLetter } from '../demos/live.ts'
import type { PageTeardown } from '../router/page.ts'

export function view() {
  return div(
    { className: 'page' },
    section(
      { id: 'advanced-patterns' },
      h1({ className: 'page-title' }, 'Custom tokens and dynamic patterns'),
      p(
        { className: 'section-sub' },
        'Formatting only: no date, card, or identifier validation. These options also work with applyMask, process, and buildMask.',
      ),

      div(
        { className: 'examples-grid' },

        ExampleCard(
          { title: 'Hexadecimal MAC address', inputId: 'ex-hex', ariaLabel: 'MAC address', placeholder: 'a1:b2:c3:d4:e5:f6' },
          span({ className: 'hint' }, 'Try a1b2c3d4e5f6; g is rejected.'),
        ),

        ExampleCard(
          { title: 'Uppercase identifier', inputId: 'ex-upper', ariaLabel: 'Uppercase identifier', placeholder: 'ABC-123' },
          span({ className: 'hint' }, 'Type abc123, then replace a letter in the middle.'),
        ),

        ExampleCard(
          {
            title: 'Card layout by prefix',
            inputId: 'ex-dynamic-card',
            ariaLabel: 'Card layout by prefix',
            inputmode: 'numeric',
            placeholder: '3412 345678 90123',
            wide: true,
          },
          span({ className: 'hint' }, 'Change 34 to 51: the layout changes while your caret stays at the edit.'),
        ),

        ExampleCard(
          { title: 'Literal token character', inputId: 'ex-escaped', ariaLabel: 'Literal A identifier', placeholder: 'A-123456' },
          span({ className: 'hint' }, 'The A is fixed text, not a slot.'),
        ),

        ExampleCard(
          { title: 'Unicode letters', inputId: 'ex-unicode', ariaLabel: 'Unicode letters', placeholder: 'ÁЖλ𐐀' },
          span({ className: 'hint' }, 'One code point per slot; provisional IME text is preserved until commit.'),
        ),
      ),

      SectionHeading('Token and transform contracts'),
      p(
        'A token is a ',
        code('RegExp'),
        ', a character predicate, or ',
        code('{ match, transform? }'),
        '. Keys are single Unicode code points; backslash is reserved. Overrides of ',
        code('9'),
        ', ',
        code('Z'),
        ', and ',
        code('A'),
        " apply only to that operation or binding. Definitions are snapshotted on bind; dispose and rebind to change them. Use pure matchers. RegExp ",
        code('g'),
        '/',
        code('y'),
        " flags are ignored on a private copy without changing the caller's ",
        code('lastIndex'),
        '.',
      ),
      p(
        'A transform must return exactly one code point; otherwise the engine throws a ',
        code('RangeError'),
        '. Use an idempotent transform whose output still matches the token. Uppercasing ',
        code('ß'),
        ' to ',
        code('SS'),
        ' is not supported. Normalize with tokens instead of assigning to ',
        code('input.value'),
        ' in a callback so the engine can map the caret through the transformation.',
      ),

      SectionHeading('Content-dependent masks'),
      p(
        code('resolveMask'),
        " runs once per masking application, before transforms. It receives candidate data accepted by the fallback pattern's slots (or any fallback array member), with complete fallback literal runs at their boundaries and nonmatching characters removed. Escaped runs remain formatting after a segment shrinks. Make the fallback alphabet cover every layout the resolver can return. Return a string or an ordered array; arrays still select by capacity. Resolution is not recursive.",
      ),
      p(
        'Resolvers always format one continuous identifier, removing old separators before applying the new layout, even with ',
        code('segmented: true'),
        '. Use static masks or arrays when fields must remain independently editable. ',
        code('eager'),
        ' still applies, and the caret follows the logical data when a layout changes.',
      ),

      SectionHeading('Unicode, composition, and length'),
      p(
        'Slots match Unicode code points, not grapheme clusters. Combining marks and joined emoji occupy separate slots if accepted; no normalization is performed. Built-in ',
        code('Z'),
        ' and ',
        code('A'),
        ' remain ASCII-only. Caret offsets use UTF-16, as DOM selections do.',
      ),
      p(
        'Custom-token bindings leave provisional IME text and selection untouched until composition commits, including when the matcher only accepts ASCII. Built-in-only masks keep live formatting during Android autocorrect composition. Bindings with custom tokens or a resolver do not add ',
        code('maxlength'),
        '; the engine still caps slots. Author-supplied limits remain in place. Disposal removes only attributes added by the binding.',
      ),
    ),
  )
}

export function setup(): PageTeardown {
  const demos = createDemos()

  demos.mask('ex-hex', 'HH:HH:HH:HH:HH:HH', { tokens: { H: /[0-9A-Fa-f]/ } })
  demos.mask('ex-upper', 'UUU-999', { tokens: { U: uppercaseLetter } })
  demos.mask('ex-dynamic-card', '9999 9999 9999 9999', {
    resolveMask: (value) => (value.startsWith('34') || value.startsWith('37') ? '9999 999999 99999' : '9999 9999 9999 9999'),
  })
  demos.mask('ex-escaped', '\\A-999999')
  demos.mask('ex-unicode', 'LLLL', { tokens: { L: /\p{L}/u } })

  return demos.teardown
}
