import { Callout } from '../components/Callout.ts'
import { CodeBlock } from '../components/CodeBlock.ts'
import { InstallBox } from '../components/InstallBox.ts'
import { SectionHeading } from '../components/SectionHeading.ts'
import { createDemos } from '../demos/live.ts'
import { href } from '../router/url.ts'
import type { PageTeardown } from '../router/page.ts'

export function view() {
  return div(
    { className: 'page' },
    section(
      { id: 'quick-start' },
      h1({ className: 'page-title' }, 'Quick start'),
      p({ className: 'section-sub' }, 'Turn a text input into a phone field that formats as you type.'),
      p('This example uses TypeScript in a bundled app. Using a UI framework? ', a({ href: href('frameworks.html') }, 'Choose your framework'), '. For a plain HTML page, use the ', a({ href: href('cdn.html') }, 'CDN guide'), '.'),

      SectionHeading('1. Install', 'install-package'),
      InstallBox(),

      SectionHeading('2. Add a phone input', 'add-input'),
      p('Add a label and an empty text input to your page. The module script loads your code after the HTML has been parsed.'),
      CodeBlock('quick-start-html', 'index.html'),

      SectionHeading('3. Bind the mask', 'bind-mask'),
      p('In ', code('src/main.ts'), ', select the input and give it a pattern. Each ', code('9'), ' accepts a digit; parentheses, spaces, and the dash are added for you.'),
      CodeBlock('quick-start-ts', 'src/main.ts'),
      div(
        { className: 'quick-start-demo' },
        span({ className: 'section-kicker' }, 'Try the result'),
        label({ htmlFor: 'quick-start-phone' }, 'Phone number'),
        input({ id: 'quick-start-phone', name: 'phone', type: 'text', inputmode: 'tel', autocomplete: 'tel', placeholder: '(11) 98765-4321', 'aria-describedby': 'quick-start-phone-hint' }),
        p({ id: 'quick-start-phone-hint' }, 'Type ', code('11987654321'), ' to get ', code('(11) 98765-4321'), '. You can also paste a number or edit it in place.'),
      ),
      Callout('A mask controls formatting. Check separately whether the phone number is valid.'),

      SectionHeading('When you need more', 'next-steps'),
      details(
        { className: 'quick-start-detail' },
        summary('Start with an existing value'),
        p('Binding formats user edits. To prefill the field or set its value from code, format the value with ', code('process()'), '. Add this to the same module:'),
        CodeBlock('quick-start-prefill', 'src/main.ts'),
      ),
      details(
        { className: 'quick-start-detail' },
        summary('Clean up when the input is removed'),
        p('Keep the ', code('dispose'), ' function returned by ', code('bind()'), ' and call it in your page or component cleanup. Call it before binding a different mask to the same input, too.'),
        CodeBlock('quick-start-cleanup', 'src/main.ts'),
      ),
      p('Next, explore ', a({ href: href('examples.html') }, 'more live examples'), ', format ', a({ href: href('decimals.html') }, 'currency and decimals'), ', or see ', a({ href: href('api.html') }, 'callbacks and options in the API reference'), '.'),
    ),
  )
}

export function setup(): PageTeardown {
  const demos = createDemos()
  demos.mask('quick-start-phone', '(99) 99999-9999')
  return demos.teardown
}
