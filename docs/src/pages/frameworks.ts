import { CodeBlock } from '../components/CodeBlock.ts'
import { FRAMEWORKS, type Adapter } from '../content/frameworks.ts'
import { REPO_URL } from '../site.ts'

const notes = {
  'react': 'Use InputMask and InputDecimal with string state and onValueChange callbacks.',
  'vue': 'Use the vMotherMask and vMotherMaskDecimal custom directives on native inputs in a Vue single-file component.',
  'angular': 'Use the standalone MotherMaskDirective and MotherMaskDecimalDirective with two-way value binding.',
  'svelte': 'Use motherMask and motherMaskDecimal actions on native inputs in a Svelte 5 component.',
  'solid': 'Use motherMask and motherMaskDecimal directives on native inputs.',
  'preact': 'Use InputMask and InputDecimal with string state and onValueChange callbacks.',
  'lit': 'Importing the adapter registers both Lit custom elements. Use this HTML in a module-aware app.',
  'stencil': 'Import each compiled custom element separately. Core helpers are available from mother-mask.',
  'alpine': 'Register the plugin before Alpine.start(); synchronize values with mask-change rather than x-model.',
  'web-components': 'Native custom elements require no framework peer dependency. Use this HTML in a module-aware app.',
  'qwik': 'Use onValueChange$ callbacks in an app configured with the Qwik Optimizer.',
  'inferno': 'Use InputMask and InputDecimal class components in an Inferno JSX app with a root element.',
  'octane': 'Use InputMask and InputDecimal with string state and onValueChange callbacks.',
  'mithril': 'Use InputMask and InputDecimal with string state and onValueChange callbacks.',
  'ember': 'Use maskInput and maskDecimal modifiers in a Glimmer component with a .gjs template.',
  'knockout': 'Importing the adapter registers mask and maskDecimal bindings. Run the module after the markup exists.',
  'riot': 'Mount the pure maskInput and maskDecimal wrappers, then unmount them during parent teardown.',
} satisfies Record<Adapter, string>

export function view() {
  return div(
    { className: 'page' },
    section(
      { id: 'frameworks' },
      h1({ className: 'page-title' }, 'Frameworks'),
      p({ className: 'section-sub' }, 'Choose a framework in the global Code examples dropdown. The selection applies to every integration example across these docs.'),
      div(
        { 'data-framework-guide': 'vanilla' },
        h2('Vanilla JS'),
        p('Bind native inputs after they exist, and dispose the bindings during teardown.'),
      ),
      ...FRAMEWORKS.filter((framework) => framework.id !== 'vanilla').map((framework) => div(
        { 'data-framework-guide': framework.id, hidden: true },
        h2(framework.label),
        p(notes[framework.id]),
        framework.id === 'web-components'
          ? p('A standalone example app is not yet available. ', a({ href: `${REPO_URL}/tree/main/packages/mother-mask/src/web-components` }, 'View the Web Components adapter →'))
          : p(a({ href: `${REPO_URL}/tree/main/examples/${framework.id}-simple` }, `Run the ${framework.label} example →`)),
      )),
      CodeBlock('framework-install'),
      CodeBlock('framework-guide'),
    ),
  )
}
