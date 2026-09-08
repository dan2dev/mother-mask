import { CodeBlock } from '../components/CodeBlock.ts'
import { FrameworkTabs, setupFrameworkTabs } from '../components/FrameworkTabs.ts'
import type { SnippetName } from '../content/snippets.ts'
import { REPO_URL } from '../site.ts'

const frameworks = [
  { id: 'react', label: 'React', note: 'Use InputMask and InputDecimal with string state and onValueChange callbacks.', snippets: ['framework-react'] },
  { id: 'vue', label: 'Vue', note: 'Use InputMask and InputDecimal with v-model in a Vue single-file component.', snippets: ['framework-vue'] },
  { id: 'angular', label: 'Angular', note: 'Use the standalone MotherMaskDirective and MotherMaskDecimalDirective with two-way value binding.', snippets: ['framework-angular'] },
  { id: 'svelte', label: 'Svelte', note: 'Use motherMask and motherMaskDecimal actions on native inputs in a Svelte 5 component.', snippets: ['framework-svelte'] },
  { id: 'solid', label: 'SolidJS', note: 'Use motherMask and motherMaskDecimal directives on native inputs.', snippets: ['framework-solid'] },
  { id: 'preact', label: 'Preact', note: 'Use InputMask and InputDecimal with string state and onValueChange callbacks.', snippets: ['framework-preact'] },
  { id: 'lit', label: 'Lit', note: 'Importing the adapter registers both Lit custom elements. Use this HTML in a module-aware app.', snippets: ['framework-lit'] },
  { id: 'stencil', label: 'Stencil', note: 'Import each compiled custom element separately. Core helpers are available from mother-mask.', snippets: ['framework-stencil'] },
  { id: 'alpine', label: 'Alpine.js', note: 'Register the plugin before Alpine.start(); synchronize values with mask-change rather than x-model.', snippets: ['framework-alpine'] },
  { id: 'web-components', label: 'Web Components', note: 'Native custom elements require no framework peer dependency. Use this HTML in a module-aware app.', snippets: ['framework-web-components'] },
  { id: 'qwik', label: 'Qwik', note: 'Use onValueChange$ callbacks in an app configured with the Qwik Optimizer.', snippets: ['framework-qwik'] },
  { id: 'inferno', label: 'Inferno', note: 'Use InputMask and InputDecimal class components in an Inferno JSX app with a root element.', snippets: ['framework-inferno'] },
  { id: 'octane', label: 'Octane', note: 'Use InputMask and InputDecimal with string state and onValueChange callbacks.', snippets: ['framework-octane'] },
  { id: 'mithril', label: 'Mithril.js', note: 'Use InputMask and InputDecimal with string state and onValueChange callbacks.', snippets: ['framework-mithril'] },
  { id: 'ember', label: 'Ember.js', note: 'Use maskInput and maskDecimal modifiers in a Glimmer component with a .gjs template.', snippets: ['framework-ember'] },
  { id: 'knockout', label: 'Knockout.js', note: 'Importing the adapter registers mask and maskDecimal bindings. Run the module after the markup exists.', snippets: ['framework-knockout'] },
  { id: 'riot', label: 'Riot.js', note: 'Mount the pure maskInput and maskDecimal wrappers, then unmount them during parent teardown.', snippets: ['framework-riot'] },
] as const satisfies readonly { id: string; label: string; note: string; snippets: readonly SnippetName[] }[]

export function view() {
  return div(
    { className: 'page' },
    section(
      { id: 'frameworks' },
      h1({ className: 'page-title' }, 'Frameworks'),
      p({ className: 'section-sub' }, 'Choose your framework for masked text and decimal inputs. Add mother-mask to an existing framework app, then copy its integration below.'),
      FrameworkTabs(frameworks.map((framework) => ({
        id: framework.id,
        label: framework.label,
        content: div(
          h2(framework.label),
          p(framework.note),
          CodeBlock('framework-install'),
          ...framework.snippets.map((name) => CodeBlock(name)),
          framework.id === 'web-components'
            ? p('A standalone example app is not yet available. ', a({ href: `${REPO_URL}/tree/main/packages/mother-mask/src/web-components` }, 'View the Web Components adapter →'))
            : p(a({ href: `${REPO_URL}/tree/main/examples/${framework.id}-simple` }, `Run the ${framework.label} example →`)),
        ),
      }))),
    ),
  )
}

export const setup = setupFrameworkTabs
