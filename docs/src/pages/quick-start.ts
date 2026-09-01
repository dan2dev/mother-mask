import { CodeBlock } from '../components/CodeBlock.ts'

export function view() {
  return div(
    { className: 'page' },
    section(
      { id: 'quick-start' },
      h1({ className: 'page-title' }, 'Quick start'),
      p({ className: 'section-sub' }, 'Bind after the input exists and dispose when it is removed or needs a different mask.'),
      CodeBlock('quick-start-html'),
      CodeBlock('quick-start-ts'),
      p(
        'A binding formats edits, not the initial value or programmatic assignments. Use ',
        code('process()'),
        ' or ',
        code('formatDecimalValue()'),
        ' for those. Callbacks run after edits, not on initial binding. Rebinding an already-bound input does nothing; dispose the original binding first. Bindings default ',
        code('autocomplete'),
        ', ',
        code('autocorrect'),
        ', and ',
        code('autocapitalize'),
        ' to ',
        code('off'),
        ', and ',
        code('spellcheck'),
        ' to ',
        code('false'),
        '; all four are configurable. Cleanup removes listeners, pending frames, and library-added attributes while preserving author-supplied attributes.',
      ),
    ),
  )
}
