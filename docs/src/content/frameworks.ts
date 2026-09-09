/** Shared by the dropdown, integration guide, and build-time snippet generator. */
export const FRAMEWORKS = [
  { id: 'vanilla', label: 'Vanilla JS' },
  { id: 'react', label: 'React' },
  { id: 'vue', label: 'Vue' },
  { id: 'angular', label: 'Angular' },
  { id: 'svelte', label: 'Svelte' },
  { id: 'solid', label: 'SolidJS' },
  { id: 'preact', label: 'Preact' },
  { id: 'lit', label: 'Lit' },
  { id: 'stencil', label: 'Stencil' },
  { id: 'alpine', label: 'Alpine.js' },
  { id: 'web-components', label: 'Web Components' },
  { id: 'qwik', label: 'Qwik' },
  { id: 'inferno', label: 'Inferno' },
  { id: 'octane', label: 'Octane' },
  { id: 'mithril', label: 'Mithril.js' },
  { id: 'ember', label: 'Ember.js' },
  { id: 'knockout', label: 'Knockout.js' },
  { id: 'riot', label: 'Riot.js' },
] as const

export type Framework = typeof FRAMEWORKS[number]['id']
export type Adapter = Exclude<Framework, 'vanilla'>

export function isFramework(value: string | null): value is Framework {
  return FRAMEWORKS.some((framework) => framework.id === value)
}
