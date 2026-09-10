/**
 * Shared by the dropdown, integration guide, and build-time snippet
 * generator. `filename` labels the integration guide's editor-chrome tab
 * (see src/lib/framework.ts) — it names the file that framework's
 * `framework-*` snippet in src/content/snippets.ts is written in, so keep
 * the two in sync if either changes.
 */
export const FRAMEWORKS = [
  { id: 'vanilla', label: 'Vanilla JS', filename: 'index.html' },
  { id: 'react', label: 'React', filename: 'PaymentForm.tsx' },
  { id: 'vue', label: 'Vue', filename: 'PaymentForm.vue' },
  { id: 'angular', label: 'Angular', filename: 'payment-form.ts' },
  { id: 'svelte', label: 'Svelte', filename: 'PaymentForm.svelte' },
  { id: 'solid', label: 'SolidJS', filename: 'PaymentForm.tsx' },
  { id: 'preact', label: 'Preact', filename: 'PaymentForm.tsx' },
  { id: 'lit', label: 'Lit', filename: 'index.html' },
  { id: 'stencil', label: 'Stencil', filename: 'index.html' },
  { id: 'alpine', label: 'Alpine.js', filename: 'index.html' },
  { id: 'web-components', label: 'Web Components', filename: 'index.html' },
  { id: 'qwik', label: 'Qwik', filename: 'PaymentForm.tsx' },
  { id: 'inferno', label: 'Inferno', filename: 'PaymentForm.tsx' },
  { id: 'octane', label: 'Octane', filename: 'PaymentForm.tsx' },
  { id: 'mithril', label: 'Mithril.js', filename: 'payment-form.ts' },
  { id: 'ember', label: 'Ember.js', filename: 'payment-form.ts' },
  { id: 'knockout', label: 'Knockout.js', filename: 'index.html' },
  { id: 'riot', label: 'Riot.js', filename: 'index.html' },
] as const

export type Framework = typeof FRAMEWORKS[number]['id']
export type Adapter = Exclude<Framework, 'vanilla'>

export function isFramework(value: string | null): value is Framework {
  return FRAMEWORKS.some((framework) => framework.id === value)
}
