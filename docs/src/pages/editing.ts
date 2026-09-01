import { CodeBlock } from '../components/CodeBlock.ts'
import { ExampleCard } from '../components/ExampleCard.ts'
import { createDemos } from '../demos/live.ts'
import { href } from '../router/url.ts'
import type { PageTeardown } from '../router/page.ts'

export function view() {
  return div(
    { className: 'page' },
    section(
      { id: 'editing' },
      h1({ className: 'page-title' }, 'Segmented editing and eager literals'),
      p(
        { className: 'section-sub' },
        'Static patterns and arrays use ',
        code('segmented: true'),
        ' and ',
        code('eager: true'),
        ' by default. Separators anchor independent fields while you edit.',
      ),

      div(
        { className: 'examples-grid' },
        ExampleCard(
          {
            title: 'Empty an internal segment',
            inputId: 'ex-phone-edit',
            ariaLabel: 'Segmented phone editing',
            inputmode: 'tel',
            value: '(111) 222-3333',
          },
          span({ className: 'hint' }, 'Place the caret after 222 and press Backspace three times.'),
        ),
        ExampleCard(
          {
            title: 'The same edit without eager literals',
            inputId: 'ex-phone-edit-lazy',
            ariaLabel: 'Segmented phone editing without eager literals',
            inputmode: 'tel',
            value: '(111) 222-3333',
          },
          span({ className: 'hint' }, 'Existing internal dividers remain even with eager disabled.'),
        ),
      ),

      CodeBlock('editing-caret'),

      p(
        'Existing internal dividers survive while later segments contain data. Backspace follows collapsed text to the left, including backward word and line deletion. Movement within a divider that stays visible is preserved. Selecting everything and deleting clears the field.',
      ),
      p(
        'Repeated separators can make an edited value ambiguous: ',
        code('1/2025'),
        ' with ',
        code('99/99/9999'),
        " resolves to the earliest fields that fit. Distinct separators give more precise anchors. For a continuous value where all following characters should shift, set the mask's ",
        code('segmented: false'),
        '.',
      ),
      p(
        'A ',
        a({ href: href('patterns.html') }, 'bounded quantifier'),
        ' such as ',
        code('9{1,2}'),
        ' makes a segment variable-width, and the separator you type is what closes it: with ',
        code('9{1,2}/9{1,2}/9{4}'),
        ', typing ',
        code('3/'),
        ' commits a one-digit day. That boundary then behaves like any other divider while you edit — later fields stay anchored, and the retired slots are not quietly reclaimed by the next keystroke.',
      ),
      p(
        'Typing a character straight over a selection destroys the same dividers the equivalent Delete would, so ',
        code('bind()'),
        ' gives it the same rescue — but only when it has to. Selecting the ',
        code('3/12'),
        ' of ',
        code('3/12/1986'),
        ' and typing ',
        code('4'),
        ' leaves ',
        code('4/1986'),
        ", where the one surviving ",
        code('/'),
        " reads equally well as the day's, and the untouched year would otherwise break apart into ",
        code('4/19/86'),
        '. Restoring the divider gives ',
        code('4|//1986'),
        ', year intact. The caret stays in the day — that field takes two digits and has only one, so the next keystroke widens it to ',
        code('42'),
        ' rather than starting the month; eager hands the caret across by itself once the field is full. Where the tail was never in danger — retyping a CPF over ',
        code('012.153.441'),
        ', whose ',
        code('-'),
        ' is distinct — nothing is restored. Like the Backspace/Delete handling, this is ',
        code('bind()'),
        '-only: the pure helpers see just ',
        code('(value, caret)'),
        ' and cannot tell a replacement from fresh input.',
      ),
      p(
        'A divider whose removal would re-segment untouched text is not erodible either. Backspacing the second ',
        code('/'),
        ' out of ',
        code('13//1986'),
        ' would leave ',
        code('13/1986'),
        ', which re-reads as ',
        code('13 / 19 / 86'),
        ", so it is put back and the keystroke erodes the day instead. Where dropping a divider costs nothing — a CPF's ",
        code('-'),
        ' still pins its last field — Backspace peels it away as described above.',
      ),
      p(
        'Eager mode reveals the next literal when a segment fills: typing ',
        code('25'),
        ' into a date shows ',
        code('25/'),
        '. Set ',
        code('eager: false'),
        ' to wait for the next digit. ',
        code('bind()'),
        ' does not immediately restore an eager literal removed with Backspace/Delete. Pure helpers have no edit history and apply the configured eager option on every call. Arrow keys, Home/End, and selection shortcuts retain native behavior.',
      ),
    ),
  )
}

export function setup(): PageTeardown {
  const demos = createDemos()

  demos.mask('ex-phone-edit', '(999) 999-9999')
  demos.mask('ex-phone-edit-lazy', '(999) 999-9999', { eager: false })

  return demos.teardown
}
