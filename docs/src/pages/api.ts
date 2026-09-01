import { CodeBlock } from '../components/CodeBlock.ts'
import { SectionHeading } from '../components/SectionHeading.ts'
import { href } from '../router/url.ts'

function block(heading: string, ...content: NodeModLike<'div'>[]) {
  return div({ className: 'api-block' }, SectionHeading(heading), ...content)
}

function wrap(...content: NodeModLike<'div'>[]) {
  return div({ className: 'table-wrap' }, table(...content))
}

export function view() {
  return div(
    { className: 'page' },
    section(
      { id: 'api' },
      h1({ className: 'page-title' }, 'API reference'),

      block(
        'bind (primary)',
        wrap(
          tbody(
            tr(td('Signature'), td(code('bind(input, mask, options?)'))),
            tr(td('Returns'), td(code('() => void'), ' — removes listeners and attributes so the input can be bound again')),
            tr(
              td('Third argument'),
              td(
                code('BindOptions'),
                ': pattern options, ',
                code('onChange'),
                ', and the input attributes ',
                code('autocomplete'),
                ', ',
                code('autocorrect'),
                ', ',
                code('autocapitalize'),
                ', and ',
                code('spellcheck'),
                '; or a ',
                code('(value) => void'),
                ' callback',
              ),
            ),
          ),
        ),
      ),

      block(
        'Other exports',
        wrap(
          thead(tr(th('Export'), th('Description'))),
          tbody(
            tr(
              td(code('buildMask(value, mask, caret?, options?)')),
              td('Build a ', code('Mask'), ' instance with the supplied pattern and options. Call ', code('.process()'), ' for the value, then read ', code('.caret'), '.'),
            ),
            tr(
              td(code('getMaxLength(mask, options?)')),
              td(
                'Formatted UTF-16 upper bound, including literals; up to two units per custom-token slot, and a ',
                a({ href: href('patterns.html') }, 'quantified'),
                ' run counted at its maximum — never the length of the pattern source. ',
                code('Infinity'),
                ' with a resolver.',
              ),
            ),
            tr(
              td(code('applyMask(value, mask, inputCaret?, options?)')),
              td('Apply a pattern string or ordered array with all pattern options; returns ', code('{ value, caret }'), '.'),
            ),
            tr(td(code('process(value, mask, options?)')), td('Apply a mask pattern to a raw value, returning just the masked string.')),
            tr(td(code('new Mask(value, mask, caret?, options?)')), td('Low-level processor with ', code('.process()'), ' and ', code('.caret'), '.')),
          ),
        ),
      ),

      block(
        'Pure formatting',
        CodeBlock('api-pure-formatting'),
        p(
          'Optional caret arguments default to ',
          code('0'),
          '. Input and output carets use UTF-16 offsets. Pure helpers do not track edit history or DOM events; binding-specific deletion and composition behavior requires ',
          code('bind()'),
          ' or ',
          code('bindDecimal()'),
          '.',
        ),
      ),

      block(
        'bindDecimal',
        wrap(
          tbody(
            tr(td('Signature'), td(code('bindDecimal(input, options?)'))),
            tr(td('Returns'), td(code('() => void'), ' — removes listeners and attributes so the input can be bound again')),
            tr(
              td('Second argument'),
              td(
                code('BindDecimalOptions'),
                ' (decimal options, ',
                code('onChange'),
                ', and the shared input attributes), or a ',
                code('(value, numericValue) => void'),
                ' callback',
              ),
            ),
          ),
        ),
      ),

      block(
        'Other decimal exports',
        wrap(
          thead(tr(th('Export'), th('Description'))),
          tbody(
            tr(
              td(code('applyDecimalMask(value, inputCaret?, options?)')),
              td('Low-level: format a raw/already-masked value; returns ', code('{ value, caret }'), '.'),
            ),
            tr(td(code('processDecimal(value, options?)')), td('Format a string in the configured locale, returning just the masked string.')),
            tr(
              td(code('unmaskDecimal(value, options?)')),
              td('Parse a raw or masked decimal string back into a JS ', code('number'), ' (', code('0'), ' if it has no digits).'),
            ),
            tr(
              td(code('formatDecimalValue(value, options?)')),
              td('Format a plain JS ', code('number'), ' into its masked display string — useful to pre-populate an input.'),
            ),
          ),
        ),
      ),

      block('Types', CodeBlock('api-types')),
    ),
  )
}
