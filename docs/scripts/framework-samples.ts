/** Build-time only: keep the exact demo masks/options and adapt the surrounding API. */
import { snippets, type RawSnippet, type SnippetName } from '../src/content/snippets.ts'
import type { Adapter } from '../src/content/frameworks.ts'

export interface SampleField {
  mask?: string
  options: string
  initial?: string
  raw?: boolean
}

/** Read the deliberately small bind(input, literal, options) format used by demo snippets.
 * No code is evaluated. Fail the build if a new demo uses an unrecognized shape. */
export function demoField(name: SnippetName): SampleField {
  if (name === 'ex-raw') return { mask: "'999.999.999-99'", options: '{}', raw: true }
  if (name === 'ex-decimal-callback') return { options: "{ suffix: ' kg' }" }
  const source = snippets[name].code
  const decimal = /^bindDecimal\(input(?:, ([\s\S]*))?\)$/.exec(source)
  if (decimal) return { options: decimal[1] ?? '{}' }
  const mask = /^bind\(input, ('(?:\\.|[^'\\])*'|\[.*?\])(?:, ([\s\S]*))?\)$/.exec(source)
  if (!mask) throw new Error(`Framework sample needs an explicit mapping: ${name}`)
  return { mask: mask[1]!, options: mask[2] ?? '{}' }
}

const indent = (code: string, spaces = 2) => code.split('\n').map((line) => line ? ' '.repeat(spaces) + line : '').join('\n')
const attr = (code: string) => code.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')

/** Full standalone component/markup for the particular fields beside a code block. */
export function integrationSample(adapter: Adapter, fields: readonly SampleField[]): RawSnippet {
  const typed = !['lit', 'stencil', 'web-components', 'alpine', 'knockout', 'riot', 'ember'].includes(adapter)
  const uses = [...new Set(fields.map((field) => field.mask ? 'InputMask' : 'InputDecimal'))].join(', ')
  const entry = `mother-mask/${adapter}`
  // Everything else is inlined directly at its point of use — the one thing
  // that can't be is a custom-token demo (uppercaseLetter/uppercaseAlphanumeric):
  // those are named function/RegExp pairs, not literals, so they still need
  // a declaration above the component.
  const preamble = fields.some((field) => /uppercaseLetter|uppercaseAlphanumeric/.test(field.options))
    ? (typed ? snippets['examples-tokens'].code : snippets['examples-tokens'].code.replaceAll(': string', '')) + '\n\n'
    : ''
  const initial = (i: number) => fields[i]!.initial ?? "''"
  // Callback param is always named `next`, distinct from any `value`/`value1`/... binding
  // above — so single-field examples can assign `value = next` instead of `value = value`.
  const log = (i: number) => fields[i]!.raw ? "console.log(next, next.replace(/\\D/g, ''))" : `console.log(next${fields[i]!.mask ? '' : ', numericValue'})`
  const params = (i: number, annotations = false) => `next${annotations ? ': string' : ''}${fields[i]!.mask ? '' : `, numericValue${annotations ? ': number' : ''}`}`
  const mask = (i: number) => fields[i]!.mask!
  const options = (i: number) => fields[i]!.options
  const props = (i: number) => `${fields[i]!.mask ? `mask: ${mask(i)}, ` : ''}options: ${options(i)}`
  const jsxProps = (i: number) => `${fields[i]!.mask ? `mask={${mask(i)}} ` : ''}options={${options(i)}}`
  const component = (i: number) => fields[i]!.mask ? 'InputMask' : 'InputDecimal'
  const modeAttr = (i: number) => fields[i]!.mask ? 'text' : 'decimal'
  const label = (i: number, forAttr = 'for') => `<label ${forAttr}="field-${i}">${fields[i]!.mask ? 'Masked value' : 'Amount'}</label>`
  // A single field reads as `value`/`mask`/`change`; only multi-field examples need
  // numbered variables, and 1-based so the first one isn't the odd "value0" out.
  const n = (i: number) => fields.length > 1 ? String(i + 1) : ''

  if (['react', 'preact', 'octane'].includes(adapter)) {
    const hook = adapter === 'preact' ? 'preact/hooks' : adapter
    return { lang: 'tsx', code: `${adapter === 'react' ? "'use client'\n" : adapter === 'octane' ? '/** @jsxImportSource octane */\n' : ''}import { useState } from '${hook}'
import { ${uses} } from '${entry}'
${preamble}export function Example() {
${fields.map((_, i) => `  const [value${n(i)}, setValue${n(i)}] = useState(${initial(i)})`).join('\n')}
  return <>
${fields.map((_, i) => `    ${label(i, adapter === 'octane' ? 'for' : 'htmlFor')}
    <${component(i)} id="field-${i}" ${jsxProps(i)}
      value={value${n(i)}} onValueChange={(${params(i)}) => { setValue${n(i)}(next); ${log(i)} }} />`).join('\n')}
  </>
}` }
  }
  if (adapter === 'vue') {
    const vueDirective = (i: number) => fields[i]!.mask ? 'mother-mask' : 'mother-mask-decimal'
    const vueImports = [...new Set(fields.map((field) => field.mask ? 'vMotherMask' : 'vMotherMaskDecimal'))].join(', ')
    return { lang: 'vue', code: `<script setup lang="ts">
import { ref } from 'vue'
import { ${vueImports} } from '${entry}'
${preamble}${fields.map((_, i) => `const value${n(i)} = ref(${initial(i)})`).join('\n')}
</script>

<template>
${fields.map((_, i) => `  ${label(i)}
  <input id="field-${i}" v-${vueDirective(i)}="{ ${props(i)},
    value: value${n(i)}, onValueChange: (${params(i)}) => { value${n(i)} = next; ${log(i)} } }" />`).join('\n')}
</template>` }
  }
  if (adapter === 'svelte') return { lang: 'svelte', code: `<script lang="ts">
import { ${[...new Set(fields.map((field) => field.mask ? 'motherMask' : 'motherMaskDecimal'))].join(', ')} } from '${entry}'
${preamble}${fields.map((_, i) => `let value${n(i)} = $state(${initial(i)})`).join('\n')}
</script>

${fields.map((_, i) => `${label(i)}
<input id="field-${i}" use:${fields[i]!.mask ? 'motherMask' : 'motherMaskDecimal'}={{ ${props(i)},
  value: value${n(i)}, onValueChange: (${params(i)}) => { value${n(i)} = next; ${log(i)} } }} />`).join('\n')}` }
  if (adapter === 'solid') return { lang: 'tsx', code: `import { createSignal } from 'solid-js'
import { ${[...new Set(fields.map((field) => field.mask ? 'motherMask' : 'motherMaskDecimal'))].join(', ')} } from '${entry}'
${preamble}export function Example() {
${fields.map((_, i) => `  const [value${n(i)}, setValue${n(i)}] = createSignal(${initial(i)})`).join('\n')}
  return <>
${fields.map((_, i) => `    ${label(i)}
    <input id="field-${i}" use:${fields[i]!.mask ? 'motherMask' : 'motherMaskDecimal'}={{ ${props(i)},
      value: value${n(i)}(), onValueChange: (${params(i)}) => { setValue${n(i)}(next); ${log(i)} } }} />`).join('\n')}
  </>
}` }
  if (adapter === 'qwik') return { lang: 'tsx', code: `import { component$, useSignal } from '@builder.io/qwik'
import { ${uses} } from '${entry}'
${preamble}export default component$(() => {
${fields.map((_, i) => `  const value${n(i)} = useSignal(${initial(i)})`).join('\n')}
  return <>
${fields.map((_, i) => `    ${label(i)}
    <${component(i)} id="field-${i}" ${jsxProps(i)}
      value={value${n(i)}.value} onValueChange$={(${params(i)}) => { value${n(i)}.value = next; ${log(i)} }} />`).join('\n')}
  </>
})` }
  if (adapter === 'inferno') return { lang: 'tsx', code: `import { Component } from 'inferno'
import { ${uses} } from '${entry}'
${preamble}export class Example extends Component {
  state = { ${fields.map((_, i) => `value${n(i)}: ${initial(i)}`).join(', ')} }
  render() {
    return <>
${fields.map((_, i) => `      ${label(i)}
      <${component(i)} id="field-${i}" ${jsxProps(i)}
        value={this.state.value${n(i)}} onValueChange={(${params(i)}) => { this.setState({ value${n(i)}: next }); ${log(i)} }} />`).join('\n')}
    </>
  }
}` }
  if (adapter === 'angular') {
    const directives = [...new Set(fields.map((field) => field.mask ? 'MotherMaskDirective' : 'MotherMaskDecimalDirective'))].join(', ')
    return { lang: 'ts', code: `import { Component } from '@angular/core'
import { ${directives} } from '${entry}'
${preamble}@Component({
  selector: 'app-example', standalone: true,
  imports: [${directives}],
  template: \`
${fields.map((field, i) => `    ${label(i)}
    <input id="field-${i}" ${field.mask ? `[motherMask]="${mask(i)}" [motherMaskOptions]="${options(i)}"` : `motherMaskDecimal [motherMaskDecimalOptions]="${options(i)}"`}
      [(value)]="value${n(i)}" ${field.mask ? `(valueChange)="change${n(i)}($event)"` : `(numericValueChange)="change${n(i)}(value${n(i)}, $event)"`} />`).join('\n')}
  \`,
})
export class ExampleComponent {
${fields.map((_, i) => `  value${n(i)} = ${initial(i)}
  change${n(i)}(${params(i, true)}) { ${log(i)} }`).join('\n')}
}` }
  }
  if (adapter === 'mithril') return { lang: 'ts', code: `import m from 'mithril'
import { ${uses} } from '${entry}'
${preamble}${fields.map((_, i) => `let value${n(i)} = ${initial(i)}`).join('\n')}

const Example = {
  view: () => m('div', [
${fields.map((field, i) => `    m('label', { for: 'field-${i}' }, '${field.mask ? 'Masked value' : 'Amount'}'),
    m(${component(i)}, { id: 'field-${i}', ${props(i)}, value: value${n(i)},
      onValueChange: (${params(i, true)}) => { value${n(i)} = next; ${log(i)} },
    }),`).join('\n')}
  ]),
}
m.mount(document.body, Example)` }
  if (adapter === 'ember') return { lang: 'ts', code: `// app/components/example.gjs
import Component from '@glimmer/component'
import { tracked } from '@glimmer/tracking'
import { action } from '@ember/object'
import { ${[...new Set(fields.map((field) => field.mask ? 'maskInput' : 'maskDecimal'))].join(', ')} } from '${entry}'

${preamble}export default class Example extends Component {
${fields.map((field, i) => `${field.mask ? `  mask${n(i)} = ${mask(i)}\n` : ''}  options${n(i)} = ${options(i)}
  @tracked value${n(i)} = ${initial(i)}
  @action change${n(i)}(${params(i)}) { this.value${n(i)} = next; ${log(i)} }`).join('\n')}
  <template>
${fields.map((field, i) => `    ${label(i)}
    <input id="field-${i}" {{${field.mask ? `maskInput this.mask${n(i)}` : 'maskDecimal'} options=this.options${n(i)}
      value=this.value${n(i)} onValueChange=this.change${n(i)}}} />`).join('\n')}
  </template>
}` }
  if (['lit', 'stencil', 'web-components'].includes(adapter)) {
    const tag = (i: number) => `${adapter === 'lit' ? 'lit' : adapter === 'stencil' ? 'stencil' : 'mm'}-mask-${fields[i]!.mask ? 'input' : 'decimal'}`
    // Stable data attributes identify hosts even after their ids move to the native inputs.
    return { lang: 'html', code: `${fields.map((_, i) => `${label(i)}
<${tag(i)} data-field="${i}" id="field-${i}"></${tag(i)}>`).join('\n')}

<script type="module">
${indent(adapter === 'stencil' ? [...new Set(fields.map((field) => `import 'mother-mask/stencil/mask-${field.mask ? 'input' : 'decimal'}'`))].join('\n') : `import '${entry}'`)}
${indent(preamble)}${fields.map((field, i) => `  const field${n(i)} = document.querySelector('${tag(i)}[data-field="${i}"]')
${field.mask ? `  field${n(i)}.mask = ${mask(i)}\n` : ''}  field${n(i)}.options = ${options(i)}
  field${n(i)}.value = ${initial(i)}
  field${n(i)}.addEventListener('value-change', (event) => {
    const value = event.detail
    ${field.mask ? log(i) : 'console.log(value)'}
  })${field.mask ? '' : `\n  field${n(i)}.addEventListener('numeric-value-change', (event) => console.log(event.detail))`}`).join('\n')}
</script>` }
  }
  if (adapter === 'alpine') return { lang: 'html', code: `<script type="module">
  import Alpine from 'alpinejs'
  import motherMaskPlugin from '${entry}'
${indent(preamble)}  Alpine.plugin(motherMaskPlugin)
  Alpine.data('example', () => ({
${fields.map((_, i) => `    value${n(i)}: ${initial(i)},`).join('\n')}
  }))
  Alpine.start()
</script>

<div x-data="example">
${fields.map((field, i) => `  ${label(i)}
  <input id="field-${i}" x-mask${field.mask ? '' : '.decimal'}="{ ${props(i)}, value: value${n(i)} }"
    x-on:mask-change="value${n(i)} = $event.detail; ${attr(field.raw ? "console.log($event.detail, $event.detail.replace(/\\D/g, ''))" : 'console.log($event.detail)')}"${field.mask ? '' : '\n    x-on:mask-numeric-change="console.log($event.detail)"'} />`).join('\n')}
</div>` }
  if (adapter === 'knockout') return { lang: 'html', code: `<div id="example">
${fields.map((field, i) => `  ${label(i)}
  <input id="field-${i}" data-bind="${field.mask ? 'mask' : 'maskDecimal'}: { ${props(i)}, value: value${n(i)}, onValueChange: change${n(i)} }" />`).join('\n')}
</div>

<script type="module">
  import ko from 'knockout'
  import '${entry}'
${indent(preamble)}  const model = {
${fields.map((_, i) => `    value${n(i)}: ko.observable(${initial(i)}),
    change${n(i)}(${params(i)}) { model.value${n(i)}(next); ${log(i)} },`).join('\n')}
  }
  ko.applyBindings(model, document.getElementById('example'))
</script>` }
  if (adapter === 'riot') return { lang: 'html', code: `${fields.map((_, i) => `${label(i)}\n<span id="field-${i}"></span>`).join('\n')}

<script type="module">
  import { pure } from 'riot'
  import { ${[...new Set(fields.map((field) => field.mask ? 'maskInput' : 'maskDecimal'))].join(', ')} } from '${entry}'
${indent(preamble)}${fields.map((field, i) => `  const field${n(i)} = pure(${field.mask ? 'maskInput' : 'maskDecimal'})({ props: {
    ${props(i)}, value: ${initial(i)}, inputMode: '${modeAttr(i)}',
    onValueChange: (${params(i)}) => { ${log(i)} },
  } })
  field${n(i)}.mount(document.getElementById('field-${i}'))`).join('\n')}

  // On parent updates, call field.update({ ...props, value }).
  // During parent teardown:
${fields.map((_, i) => `  // field${n(i)}.unmount()`).join('\n')}
</script>` }
  throw new Error(`Missing adapter generator: ${adapter}`)
}

/** Only integrations vary; pattern notation, core type definitions and install commands are shared. */
export function frameworkSamples(adapter: Adapter): Partial<Record<SnippetName, RawSnippet>> {
  const result: Partial<Record<SnippetName, RawSnippet>> = {}
  for (const name of Object.keys(snippets) as SnippetName[]) {
    if (name.startsWith('ex-')) result[name] = integrationSample(adapter, [demoField(name)])
  }
  result['framework-guide'] = snippets[`framework-${adapter}`]
  result['quick-start-ts'] = integrationSample(adapter, [{ mask: "'(99) 99999-9999'", options: "{ autocomplete: 'tel' }", initial: "'(11) 98765-4321'" }])
  for (const name of ['patterns-quantifier-bind', 'patterns-quantifier-standin', 'patterns-escapes'] as const) {
    const fields = snippets[name].code.split('\n').filter((line) => line.startsWith('bind(')).map((line) => {
      const match = /^bind\(\w+, ('(?:\\.|[^'\\])*')\)/.exec(line)
      if (!match) throw new Error(`Unrecognized pattern example: ${line}`)
      return { mask: match[1]!, options: '{}' }
    })
    result[name] = integrationSample(adapter, fields)
  }
  result['decimals-helpers'] = integrationSample(adapter, [{ options: "{ decimalPlaces: 2, separator: '.', decimalSeparator: ',', suffix: ' €' }", initial: "'1.234,50 €'" }])
  const helpers = `import { formatDecimalValue, unmaskDecimal } from 'mother-mask'
const euro = { decimalPlaces: 2, separator: '.', decimalSeparator: ',', suffix: ' €' }
formatDecimalValue(1234.5, euro) // '1.234,50 €'
unmaskDecimal('1.234,50 €', euro) // 1234.5
`
  const sample = result['decimals-helpers']!
  if (sample.code.includes('<script')) {
    sample.code = sample.code.replace(/(<script[^>]*>\n)/, `$1${helpers}\n`)
  } else {
    // Preserve React's directive at the very start of the module.
    sample.code = sample.code.startsWith("'use client'")
      ? sample.code.replace("'use client'\n", "'use client'\n" + helpers + '\n')
      : helpers + '\n' + sample.code
  }
  result['cdn-umd'] = integrationSample(adapter, [{ mask: "'999.999.999-99'", options: '{}' }])
  return result
}
