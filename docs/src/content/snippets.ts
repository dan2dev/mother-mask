/**
 * Every code sample shown on the site, in one place.
 *
 * This module is read twice, and never by the browser:
 *
 *  - `vite/plugin-snippets.ts` imports it during the build, runs Shiki over
 *    each entry with the site's own themes (../styles/code-theme.ts), and
 *    serves the tokenized result as `virtual:snippets`.
 *  - `tsc` reads it for the `SnippetName` union, so a page that asks for a
 *    key that does not exist fails the build instead of rendering blank.
 *
 * Because the plugin imports this file directly — outside Vite's module
 * graph, under Bun or Node — it must stay free of imports and of anything
 * that needs bundler resolution. Plain data only.
 *
 * Keys that start with `ex-` are demo ids: `ExampleCard` looks its snippet up
 * by the id of the input it wraps, so a card's visible code and its live
 * `bind()` call in `src/scripts/demos/` share one name. Change a mask here and
 * the matching demo is one grep away.
 *
 * Snippets are written with `String.raw` so a backslash in a sample is the
 * backslash a reader sees — mask patterns are full of them.
 */

export type SnippetLang = 'ts' | 'tsx' | 'vue' | 'svelte' | 'html' | 'bash'

export interface RawSnippet {
  lang: SnippetLang
  code: string
}

/**
 * One Shiki token: its text, and the `tk-*` class carrying its color (empty
 * for plain text, which inherits the surrounding `pre`).
 */
export type SnippetToken = readonly [text: string, className: string]

/** What `virtual:snippets` serves per snippet: pre-tokenized lines of tokens. */
export type HighlightedSnippet = SnippetToken[][]

export const snippets = {
  // ── Overview ───────────────────────────────────────────────────────────────

  'pg-br-phone': {
    lang: 'ts',
    code: String.raw`import { bind } from 'mother-mask'

const input = document.querySelector<HTMLInputElement>('#pg-br-phone')!
bind(input, '+55 (99) 99999-9999')`,
  },

  'pg-br-cpf': {
    lang: 'ts',
    code: String.raw`import { bind } from 'mother-mask'

const input = document.querySelector<HTMLInputElement>('#pg-br-cpf')!
bind(input, '999.999.999-99')`,
  },

  'pg-br-cnpj': {
    lang: 'ts',
    code: String.raw`import { bind } from 'mother-mask'

const input = document.querySelector<HTMLInputElement>('#pg-br-cnpj')!
bind(input, 'AA.AAA.AAA/AAAA-99', {
  tokens: {
    A: { match: /[a-z0-9]/i, transform: (char: string) => char.toUpperCase() },
  },
})`,
  },

  'pg-us-phone': {
    lang: 'ts',
    code: String.raw`import { bind } from 'mother-mask'

const input = document.querySelector<HTMLInputElement>('#pg-us-phone')!
bind(input, '+1 (999) 999-9999')`,
  },

  'pg-us-card': {
    lang: 'ts',
    code: String.raw`import { bind } from 'mother-mask'

const input = document.querySelector<HTMLInputElement>('#pg-us-card')!
bind(input, '9999 9999 9999 9999')`,
  },

  'pg-us-usd': {
    lang: 'ts',
    code: String.raw`import { bindDecimal } from 'mother-mask'

const input = document.querySelector<HTMLInputElement>('#pg-us-usd')!
bindDecimal(input, { prefix: '$', decimalPlaces: 2 })`,
  },

  'pg-eur': {
    lang: 'ts',
    code: String.raw`import { bindDecimal } from 'mother-mask'

const input = document.querySelector<HTMLInputElement>('#pg-eur')!
bindDecimal(input, {
  prefix: '',
  suffix: ' €',
  separator: '.',
  decimalSeparator: ',',
  decimalPlaces: 2,
})`,
  },

  'pg-amount': {
    lang: 'ts',
    code: String.raw`import { bindDecimal } from 'mother-mask'

const input = document.querySelector<HTMLInputElement>('#pg-amount')!
bindDecimal(input, { decimalPlaces: 0, suffix: ' units' })`,
  },

  'pg-precision': {
    lang: 'ts',
    code: String.raw`import { bindDecimal } from 'mother-mask'

const input = document.querySelector<HTMLInputElement>('#pg-precision')!
bindDecimal(input, { decimalPlaces: 4, segmented: false })`,
  },

  // ── Quick start ────────────────────────────────────────────────────────────

  'quick-start-html': {
    lang: 'html',
    code: String.raw`<label for="phone">Phone number</label>
<input
  id="phone"
  name="phone"
  type="text"
  inputmode="tel"
  autocomplete="tel"
  placeholder="(11) 98765-4321"
/>
<script type="module" src="/src/main.ts"></script>`,
  },

  'quick-start-ts': {
    lang: 'ts',
    code: String.raw`import { bind } from 'mother-mask'

const phone = document.querySelector<HTMLInputElement>('#phone')!
const dispose = bind(phone, '(99) 99999-9999')`,
  },

  'quick-start-prefill': {
    lang: 'ts',
    code: String.raw`import { process } from 'mother-mask'

// Use the same pattern as your binding.
phone.value = process('11987654321', '(99) 99999-9999')
// → (11) 98765-4321`,
  },

  'quick-start-cleanup': {
    lang: 'ts',
    code: String.raw`// Run when your page or component is removed.
dispose()`,
  },

  // Framework integrations adapted from packages/mother-mask/README.md.
  'framework-install': { lang: 'bash', code: 'npm install mother-mask' },

  'framework-react': {
    lang: 'tsx',
    code: `import { useState } from 'react'
import { InputMask, InputDecimal, formatDecimalValue } from 'mother-mask/react'

// Keep option objects and mask arrays stable across renders.
const currency = { decimalPlaces: 2, prefix: '$', allowNegative: true }

export function Form() {
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')

  return (
    <>
      <label htmlFor="phone">Phone</label>
      <InputMask
        id="phone"
        name="phone"
        mask="(99) 99999-9999"
        inputMode="tel"
        value={phone}
        onValueChange={setPhone}
      />
      <label htmlFor="amount">Amount</label>
      <InputDecimal
        id="amount"
        name="amount"
        options={currency}
        value={amount}
        onValueChange={setAmount}
      />
      <button type="button" onClick={() => setAmount(formatDecimalValue(1234.5, currency))}>
        Set amount
      </button>
    </>
  )
}`,
  },

  'framework-vue': {
    lang: 'vue',
    code: `<script setup lang="ts">
import { ref } from 'vue'
import { vMotherMask, vMotherMaskDecimal, formatDecimalValue } from 'mother-mask/vue'

// Keep the options object stable across renders.
const currency = { decimalPlaces: 2, prefix: '$', allowNegative: true }

const phone = ref('')
const amount = ref('')
</script>

<template>
  <label for="phone">Phone</label>
  <input
    id="phone"
    name="phone"
    inputmode="tel"
    v-mother-mask="{ mask: '(99) 99999-9999', value: phone, onValueChange: (v) => (phone = v) }"
  />

  <label for="amount">Amount</label>
  <input
    id="amount"
    name="amount"
    v-mother-mask-decimal="{ options: currency, value: amount, onValueChange: (v) => (amount = v) }"
  />

  <button type="button" @click="amount = formatDecimalValue(1234.5, currency)">
    Set amount
  </button>
</template>`,
  },

  'framework-angular': {
    lang: 'ts',
    code: `import { Component } from '@angular/core'
import { MotherMaskDecimalDirective, MotherMaskDirective, formatDecimalValue } from 'mother-mask/angular'

// Keep option objects stable across change detection cycles.
const currency = { decimalPlaces: 2, prefix: '$', allowNegative: true }

@Component({
  standalone: true,
  imports: [MotherMaskDirective, MotherMaskDecimalDirective],
  template: \`
    <label for="phone">Phone</label>
    <input id="phone" name="phone" motherMask="(99) 99999-9999" inputmode="tel" [(value)]="phone" />

    <label for="amount">Amount</label>
    <input id="amount" name="amount" motherMaskDecimal [motherMaskDecimalOptions]="currency" [(value)]="amount" />

    <button type="button" (click)="amount = formatDecimalValue(1234.5, currency)">Set amount</button>
  \`,
})
export class FormComponent {
  readonly currency = currency
  readonly formatDecimalValue = formatDecimalValue
  phone = ''
  amount = ''
}`,
  },

  'framework-svelte': {
    lang: 'svelte',
    code: `<script lang="ts">
  import { motherMask, motherMaskDecimal, formatDecimalValue } from 'mother-mask/svelte'

  // Keep the options object stable across renders.
  const currency = { decimalPlaces: 2, prefix: '$', allowNegative: true }

  let phone = $state('')
  let amount = $state('')
</script>

<label for="phone">Phone</label>
<input
  id="phone"
  name="phone"
  inputmode="tel"
  use:motherMask={{ mask: '(99) 99999-9999', value: phone, onValueChange: (v) => (phone = v) }}
/>

<label for="amount">Amount</label>
<input
  id="amount"
  name="amount"
  use:motherMaskDecimal={{ options: currency, value: amount, onValueChange: (v) => (amount = v) }}
/>

<button type="button" onclick={() => (amount = formatDecimalValue(1234.5, currency))}>
  Set amount
</button>`,
  },

  'framework-solid': {
    lang: 'tsx',
    code: `import { createSignal } from 'solid-js'
import { motherMask, motherMaskDecimal, formatDecimalValue } from 'mother-mask/solid'

// Keep the options object stable across renders.
const currency = { decimalPlaces: 2, prefix: '$', allowNegative: true }

export function Form() {
  const [phone, setPhone] = createSignal('')
  const [amount, setAmount] = createSignal('')

  return (
    <>
      <label for="phone">Phone</label>
      <input
        id="phone"
        name="phone"
        inputmode="tel"
        use:motherMask={{ mask: '(99) 99999-9999', value: phone(), onValueChange: setPhone }}
      />

      <label for="amount">Amount</label>
      <input
        id="amount"
        name="amount"
        use:motherMaskDecimal={{ options: currency, value: amount(), onValueChange: setAmount }}
      />

      <button type="button" onClick={() => setAmount(formatDecimalValue(1234.5, currency))}>
        Set amount
      </button>
    </>
  )
}`,
  },

  'framework-preact': {
    lang: 'tsx',
    code: `import { useState } from 'preact/hooks'
import { InputMask, InputDecimal, formatDecimalValue } from 'mother-mask/preact'

// Keep option objects and mask arrays stable across renders.
const currency = { decimalPlaces: 2, prefix: '$', allowNegative: true }

export function Form() {
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')

  return (
    <>
      <label htmlFor="phone">Phone</label>
      <InputMask
        id="phone"
        name="phone"
        mask="(99) 99999-9999"
        inputMode="tel"
        value={phone}
        onValueChange={setPhone}
      />
      <label htmlFor="amount">Amount</label>
      <InputDecimal
        id="amount"
        name="amount"
        options={currency}
        value={amount}
        onValueChange={setAmount}
      />
      <button type="button" onClick={() => setAmount(formatDecimalValue(1234.5, currency))}>
        Set amount
      </button>
    </>
  )
}`,
  },

  'framework-lit': {
    lang: 'html',
    code: `<label for="phone">Phone</label>
<lit-mask-input id="phone" name="phone" mask="(99) 99999-9999" input-mode="tel"></lit-mask-input>

<label for="amount">Amount</label>
<lit-mask-decimal id="amount" name="amount"></lit-mask-decimal>

<script type="module">
  const phone = document.getElementById('phone')
  phone.addEventListener('value-change', (e) => console.log(e.detail))

  const amount = document.getElementById('amount')
  amount.addEventListener('numeric-value-change', (e) => console.log(e.detail))

  // Register after capturing the hosts; registration transfers ids to the inputs.
  await import('mother-mask/lit')

  amount.options = { decimalPlaces: 2, prefix: '$', allowNegative: true }
</script>`,
  },

  'framework-stencil': {
    lang: 'html',
    code: `<label for="phone">Phone</label>
<stencil-mask-input id="phone" name="phone" mask="(99) 99999-9999" input-mode="tel"></stencil-mask-input>

<label for="amount">Amount</label>
<stencil-mask-decimal id="amount" name="amount"></stencil-mask-decimal>

<script type="module">
  const phone = document.getElementById('phone')
  phone.addEventListener('value-change', (e) => console.log(e.detail))

  const amount = document.getElementById('amount')
  amount.addEventListener('numeric-value-change', (e) => console.log(e.detail))

  // Register after capturing the hosts; registration transfers ids to the inputs.
  await import('mother-mask/stencil/mask-input')
  await import('mother-mask/stencil/mask-decimal')

  amount.options = { decimalPlaces: 2, prefix: '$', allowNegative: true }
</script>`,
  },

  'framework-alpine': {
    lang: 'html',
    code: `<script type="module">
  import Alpine from 'alpinejs'
  import motherMaskPlugin from 'mother-mask/alpine'

  Alpine.plugin(motherMaskPlugin)
  Alpine.start()
</script>

<div x-data="{ phone: '', amount: '' }">
  <label for="phone">Phone</label>
  <input
    id="phone"
    name="phone"
    inputmode="tel"
    x-mask="{ mask: '(99) 99999-9999', value: phone }"
    x-on:mask-change="phone = $event.detail"
  />

  <label for="amount">Amount</label>
  <input
    id="amount"
    name="amount"
    x-mask.decimal="{ options: { decimalPlaces: 2, prefix: '$', allowNegative: true }, value: amount }"
    x-on:mask-change="amount = $event.detail"
  />
</div>`,
  },

  'framework-web-components': {
    lang: 'html',
    code: `<label for="phone">Phone</label>
<mm-mask-input id="phone" name="phone" mask="(99) 99999-9999" input-mode="tel"></mm-mask-input>

<label for="amount">Amount</label>
<mm-mask-decimal id="amount" name="amount"></mm-mask-decimal>

<script type="module">
  const phone = document.getElementById('phone')
  phone.addEventListener('value-change', (e) => console.log(e.detail))

  const amount = document.getElementById('amount')
  amount.addEventListener('numeric-value-change', (e) => console.log(e.detail))

  // Register after capturing the hosts; registration transfers ids to the inputs.
  await import('mother-mask/web-components')

  amount.options = { decimalPlaces: 2, prefix: '$', allowNegative: true }
</script>`,
  },

  'framework-qwik': {
    lang: 'tsx',
    code: `import { component$, useSignal } from '@builder.io/qwik'
import { InputMask, InputDecimal, formatDecimalValue } from 'mother-mask/qwik'

// Keep option objects outside the component so they stay stable across renders.
const currency = { decimalPlaces: 2, prefix: '$', allowNegative: true }

export default component$(() => {
  const phone = useSignal('')
  const amount = useSignal('')

  return (
    <>
      <label for="phone">Phone</label>
      <InputMask
        id="phone"
        name="phone"
        mask="(99) 99999-9999"
        inputMode="tel"
        value={phone.value}
        onValueChange$={(v) => (phone.value = v)}
      />

      <label for="amount">Amount</label>
      <InputDecimal
        id="amount"
        name="amount"
        options={currency}
        value={amount.value}
        onValueChange$={(v) => (amount.value = v)}
      />

      <button type="button" onClick$={() => (amount.value = formatDecimalValue(1234.5, currency))}>
        Set amount
      </button>
    </>
  )
})`,
  },

  'framework-inferno': {
    lang: 'tsx',
    code: `import { Component, render } from 'inferno'
import { InputMask, InputDecimal, formatDecimalValue } from 'mother-mask/inferno'

// Keep option objects outside the component so they stay stable across renders.
const currency = { decimalPlaces: 2, prefix: '$', allowNegative: true }

class App extends Component {
  state = { phone: '', amount: '' }

  render() {
    return (
      <>
        <label for="phone">Phone</label>
        <InputMask
          id="phone"
          name="phone"
          mask="(99) 99999-9999"
          inputMode="tel"
          value={this.state.phone}
          onValueChange={(phone) => this.setState({ phone })}
        />

        <label for="amount">Amount</label>
        <InputDecimal
          id="amount"
          name="amount"
          options={currency}
          value={this.state.amount}
          onValueChange={(amount) => this.setState({ amount })}
        />

        <button type="button" onClick={() => this.setState({ amount: formatDecimalValue(1234.5, currency) })}>
          Set amount
        </button>
      </>
    )
  }
}

render(<App />, document.getElementById('root'))`,
  },

  'framework-octane': {
    lang: 'tsx',
    code: `/** @jsxImportSource octane */
import { useState } from 'octane'
import { InputMask, InputDecimal, formatDecimalValue } from 'mother-mask/octane'

// Keep option objects outside the component so they stay stable across renders.
const currency = { decimalPlaces: 2, prefix: '$', allowNegative: true }

export function Checkout() {
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')

  return (
    <>
      <label for="phone">Phone</label>
      <InputMask
        id="phone"
        name="phone"
        mask="(99) 99999-9999"
        inputMode="tel"
        value={phone}
        onValueChange={setPhone}
      />

      <label for="amount">Amount</label>
      <InputDecimal id="amount" name="amount" options={currency} value={amount} onValueChange={setAmount} />

      <button onClick={() => setAmount(formatDecimalValue(1234.5, currency))}>Set amount</button>
    </>
  )
}`,
  },

  'framework-mithril': {
    lang: 'ts',
    code: `import m from 'mithril'
import { InputMask, InputDecimal, formatDecimalValue } from 'mother-mask/mithril'

// Keep option objects outside the view so they stay stable across redraws.
const currency = { decimalPlaces: 2, prefix: '$', allowNegative: true }

let phone = ''
let amount = ''

const Checkout = {
  view: () =>
    m('div', [
      m('label', { for: 'phone' }, 'Phone'),
      m(InputMask, {
        id: 'phone',
        name: 'phone',
        mask: '(99) 99999-9999',
        inputmode: 'tel',
        value: phone,
        onValueChange: (v) => { phone = v },
      }),

      m('label', { for: 'amount' }, 'Amount'),
      m(InputDecimal, {
        id: 'amount',
        name: 'amount',
        options: currency,
        value: amount,
        onValueChange: (v) => { amount = v },
      }),

      m('button', { onclick: () => { amount = formatDecimalValue(1234.5, currency) } }, 'Set amount'),
    ]),
}

m.mount(document.body, Checkout)`,
  },

  'framework-ember': {
    lang: 'ts',
    code: `// app/components/checkout.gjs
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { maskInput, maskDecimal } from 'mother-mask/ember';

export default class Checkout extends Component {
  currency = { decimalPlaces: 2, prefix: '$', allowNegative: true };
  @tracked phone = '';
  @tracked amount = '';

  @action setPhone(value) { this.phone = value; }
  @action setAmount(value) { this.amount = value; }

  <template>
    <label for="phone">Phone</label>
    <input id="phone" name="phone" inputmode="tel"
      {{maskInput "(99) 99999-9999" value=this.phone onValueChange=this.setPhone}} />
    <label for="amount">Amount</label>
    <input id="amount" name="amount"
      {{maskDecimal options=this.currency value=this.amount onValueChange=this.setAmount}} />
  </template>
}`,
  },

  'framework-knockout': {
    lang: 'html',
    code: `<div id="app">
  <label for="phone">Phone</label>
  <input id="phone" name="phone"
         data-bind="mask: { mask: '(99) 99999-9999', value: phone, onValueChange: phone }">

  <label for="amount">Amount</label>
  <input id="amount" name="amount"
         data-bind="maskDecimal: { options: { decimalPlaces: 2, prefix: '$', allowNegative: true }, value: amount, onValueChange: amount }">

  <button data-bind="click: setPreset">Set amount</button>
</div>

<script type="module">
  import ko from 'knockout'
  import 'mother-mask/knockout'
  import { formatDecimalValue } from 'mother-mask'

  // Keep option objects outside the view model's observables so they stay
  // stable across recomputes.
  const currency = { decimalPlaces: 2, prefix: '$', allowNegative: true }

  function CheckoutViewModel() {
    this.phone = ko.observable('')
    this.amount = ko.observable('')
    this.setPreset = () => this.amount(formatDecimalValue(1234.5, currency))
  }

  ko.applyBindings(new CheckoutViewModel(), document.getElementById('app'))
</script>`,
  },

  'framework-riot': {
    lang: 'html',
    code: `<label for="phone">Phone</label>
<span id="phone"></span>

<label for="amount">Amount</label>
<span id="amount"></span>

<script type="module">
  import { pure } from 'riot'
  import { maskInput, maskDecimal, formatDecimalValue } from 'mother-mask/riot'

  // Keep option objects module-level so they stay stable across updates.
  const currency = { decimalPlaces: 2, prefix: '$', allowNegative: true }

  let phone = ''
  const phoneField = pure(maskInput)({
    props: {
      mask: '(99) 99999-9999',
      name: 'phone',
      inputMode: 'tel',
      autocomplete: 'tel',
      value: phone,
      onValueChange: (v) => (phone = v),
    },
  })
  phoneField.mount(document.getElementById('phone'))

  let amount = ''
  const amountField = pure(maskDecimal)({
    props: { options: currency, name: 'amount', value: amount, onValueChange: (v) => (amount = v) },
  })
  amountField.mount(document.getElementById('amount'))

  // Later, e.g. from a parent Riot component's onUpdated:
  amountField.update({ options: currency, value: formatDecimalValue(1234.5, currency) })

  // During parent teardown:
  // phoneField.unmount()
  // amountField.unmount()
</script>`,
  },

  'framework-guide': {
    lang: 'html',
    code: `<label for="phone">Phone</label>
<input id="phone" type="text" inputmode="tel" />
<label for="amount">Amount</label>
<input id="amount" type="text" inputmode="decimal" />

<script type="module">
  import { bind, bindDecimal } from 'mother-mask'

  const phone = document.getElementById('phone')
  const amount = document.getElementById('amount')
  const disposePhone = bind(phone, '(99) 99999-9999')
  const disposeAmount = bindDecimal(amount, { decimalPlaces: 2, prefix: '$' })

  // During teardown:
  // disposePhone()
  // disposeAmount()
</script>`,
  },

  // ── Examples ───────────────────────────────────────────────────────────────

  'examples-tokens': {
    lang: 'ts',
    code: String.raw`const uppercaseLetter = {
  match: /[a-z]/i,
  transform: (char: string) => char.toUpperCase(),
}
const uppercaseAlphanumeric = {
  match: /[a-z0-9]/i,
  transform: (char: string) => char.toUpperCase(),
}`,
  },

  'ex-cpf': { lang: 'ts', code: String.raw`bind(input, '999.999.999-99')` },
  'ex-cnpj': { lang: 'ts', code: String.raw`bind(input, 'AA.AAA.AAA/AAAA-99', { tokens: { A: uppercaseAlphanumeric } })` },
  'ex-cep': { lang: 'ts', code: String.raw`bind(input, '99999-999')` },
  'ex-phone': { lang: 'ts', code: String.raw`bind(input, ['(99) 9999-9999', '(99) 99999-9999'])` },
  'ex-date-seg': { lang: 'ts', code: String.raw`bind(input, '99/99/9999')` },
  'ex-date-flat': { lang: 'ts', code: String.raw`bind(input, '99/99/9999', { segmented: false })` },
  'ex-date-eager': { lang: 'ts', code: String.raw`bind(input, '99/99/9999')` },
  'ex-date-not-eager': { lang: 'ts', code: String.raw`bind(input, '99/99/9999', { eager: false })` },
  'ex-date-flex': { lang: 'ts', code: String.raw`bind(input, '9{1,2}/9{1,2}/9{4}')` },
  'ex-time': { lang: 'ts', code: String.raw`bind(input, '99:99')` },
  'ex-plate': { lang: 'ts', code: String.raw`bind(input, 'ZZZ-9999', { segmented: false, tokens: { Z: uppercaseLetter } })` },
  'ex-mercosul': { lang: 'ts', code: String.raw`bind(input, 'ZZZ-9Z99', { tokens: { Z: uppercaseLetter } })` },
  'ex-card': { lang: 'ts', code: String.raw`bind(input, ['9999 999999 99999', '9999 9999 9999 9999'])` },
  'ex-usd': { lang: 'ts', code: String.raw`bindDecimal(input, { decimalPlaces: 2, prefix: '$' })` },
  'ex-eur': { lang: 'ts', code: String.raw`bindDecimal(input, { decimalPlaces: 2, separator: '.', decimalSeparator: ',', suffix: ' €' })` },
  'ex-qty': { lang: 'ts', code: String.raw`bindDecimal(input, { decimalPlaces: 0, suffix: ' units' })` },
  'ex-balance': { lang: 'ts', code: String.raw`bindDecimal(input, { decimalPlaces: 2, prefix: '$', allowNegative: true })` },

  'ex-raw': {
    lang: 'ts',
    code: String.raw`bind(input, '999.999.999-99', value => {
  document.getElementById('ex-raw-masked')!.textContent = value;
  document.getElementById('ex-raw-digits')!.textContent = value.replace(/\D/g, '')
})`,
  },

  // ── Custom patterns ────────────────────────────────────────────────────────

  'ex-hex': { lang: 'ts', code: String.raw`bind(input, 'HH:HH:HH:HH:HH:HH', { tokens: { H: /[0-9A-Fa-f]/ } })` },
  'ex-upper': { lang: 'ts', code: String.raw`bind(input, 'UUU-999', { tokens: { U: { match: /[a-z]/i, transform: char => char.toUpperCase() } } })` },
  'ex-dynamic-card': {
    lang: 'ts',
    code: String.raw`bind(input, '9999 9999 9999 9999', { resolveMask: v => v.startsWith('34') || v.startsWith('37') ? '9999 999999 99999' : '9999 9999 9999 9999' })`,
  },
  'ex-escaped': { lang: 'ts', code: String.raw`bind(input, '\\A-999999')` },
  'ex-unicode': { lang: 'ts', code: String.raw`bind(input, 'LLLL', { tokens: { L: /\p{L}/u } })` },

  // ── Editing ────────────────────────────────────────────────────────────────

  'ex-phone-edit': { lang: 'ts', code: String.raw`bind(input, '(999) 999-9999')` },
  'ex-phone-edit-lazy': { lang: 'ts', code: String.raw`bind(input, '(999) 999-9999', { eager: false })` },

  'editing-caret': {
    lang: 'ts',
    code: String.raw`// | marks the caret after the edit.
// Delete 222:          (111) |-3333
// Backspace again:     (111|-3333
// The caret stays before the untouched -3333 tail.

// CPF: select 012.153.441 in 012.153.441-39, then type 015.
// Result:              015.|-39`,
  },

  // ── Decimals ───────────────────────────────────────────────────────────────

  'ex-decimal-free': { lang: 'ts', code: String.raw`bindDecimal(input)` },
  'ex-decimal-usd': { lang: 'ts', code: String.raw`bindDecimal(input, { decimalPlaces: 2, prefix: '$' })` },
  'ex-decimal-brl': { lang: 'ts', code: String.raw`bindDecimal(input, { decimalPlaces: 2, separator: '.', decimalSeparator: ',', prefix: 'R$ ' })` },
  'ex-decimal-eur': { lang: 'ts', code: String.raw`bindDecimal(input, { decimalPlaces: 2, separator: '.', decimalSeparator: ',', suffix: ' €' })` },
  'ex-decimal-units': { lang: 'ts', code: String.raw`bindDecimal(input, { decimalPlaces: 0, suffix: ' units' })` },
  'ex-decimal-negative': { lang: 'ts', code: String.raw`bindDecimal(input, { decimalPlaces: 2, prefix: '$', allowNegative: true })` },
  'ex-decimal-plain': { lang: 'ts', code: String.raw`bindDecimal(input, { decimalPlaces: 2, segmented: false })` },
  'ex-decimal-width': { lang: 'ts', code: String.raw`bindDecimal(input, { numberPlaces: 2, decimalPlaces: 2 })` },
  'ex-decimal-callback': {
    lang: 'ts',
    code: String.raw`bindDecimal(input, { suffix: ' kg', onChange: (masked, numeric) => updateOutputs(masked, numeric) })`,
  },

  'decimals-helpers': {
    lang: 'ts',
    code: String.raw`import { bindDecimal, formatDecimalValue, unmaskDecimal } from 'mother-mask'

const options = {
  decimalPlaces: 2,
  separator: '.',
  decimalSeparator: ',',
  suffix: ' €',
}

input.value = formatDecimalValue(1234.5, options) // '1.234,50 €'
bindDecimal(input, {
  ...options,
  onChange: (value, numericValue) => console.log(value, numericValue),
})
unmaskDecimal('1.234,50 €', options) // 1234.5`,
  },

  // ── Regional ───────────────────────────────────────────────────────────────

  'ex-us-phone': { lang: 'ts', code: String.raw`bind(input, '(999) 999-9999')` },
  'ex-us-ssn': { lang: 'ts', code: String.raw`bind(input, '999-99-9999')` },
  'ex-us-zip': { lang: 'ts', code: String.raw`bind(input, '99999-9999')` },
  'ex-us-date': { lang: 'ts', code: String.raw`bind(input, '9{1,2}/9{1,2}/9{4}')` },
  'ex-iso-date': { lang: 'ts', code: String.raw`bind(input, '9{4}-9{1,2}-9{1,2}')` },
  'ex-ca-postal': {
    lang: 'ts',
    code: String.raw`bind(input, 'Z9Z 9Z9', { tokens: { Z: { match: /[a-z]/i, transform: char => char.toUpperCase() } } })`,
  },
  'ex-ca-sin': { lang: 'ts', code: String.raw`bind(input, '999 999 999')` },
  'ex-eu-iban': { lang: 'ts', code: String.raw`bind(input, 'DE99 9999 9999 9999 9999 99')` },
  'ex-eu-vat': { lang: 'ts', code: String.raw`bind(input, 'DE999999999')` },
  'ex-pl-postal': { lang: 'ts', code: String.raw`bind(input, '99-999')` },

  // ── Pattern syntax ─────────────────────────────────────────────────────────

  'patterns-quantifiers': {
    lang: 'ts',
    code: String.raw`9{4}     exactly four digits
9{1,2}   one or two digits
Z{2,4}   two to four letters
A{1,8}   one to eight alphanumeric characters`,
  },

  'patterns-quantifier-bind': {
    lang: 'ts',
    code: String.raw`bind(date, '9{1,2}/9{1,2}/9{4}')
// 3/4/1986   3/12/1986   12/4/1986   12/12/1986`,
  },

  'patterns-quantifier-standin': {
    lang: 'ts',
    code: String.raw`bind(date, '9{1,2}/9{1,2}/9{4}')
// type "3.4.1986" → "3/4/1986"
// type "3-4-1986" → "3/4/1986"
// type "3 4 1986" → "3/4/1986"`,
  },

  'patterns-escapes': {
    lang: 'ts',
    code: String.raw`bind(input, '\\A-999999') // '123456' → 'A-123456'
bind(input, '\\9-99')     // '12' → '9-12'
bind(input, '\\Z-99')     // '12' → 'Z-12'
bind(input, '\\\\99')      // a literal backslash, then two digits`,
  },

  // ── CDN ────────────────────────────────────────────────────────────────────

  'cdn-umd': {
    lang: 'html',
    code: String.raw`<input id="cpf" inputmode="numeric" aria-label="CPF" />

<script src="https://unpkg.com/mother-mask/dist/mother-mask.umd.js"></script>
<script>
  const input = document.getElementById('cpf')
  const dispose = MotherMask.bind(input, '999.999.999-99')
</script>`,
  },

  // ── API reference ──────────────────────────────────────────────────────────

  'api-pure-formatting': {
    lang: 'ts',
    code: String.raw`import { applyMask, process, processDecimal } from 'mother-mask'

process('12345678901', '999.999.999-99') // '123.456.789-01'
applyMask('25122025', '99/99/9999', 8) // { value: '25/12/2025', caret: 10 }
processDecimal('1234.567') // '1,234.567'
processDecimal('7.3', { numberPlaces: 2, decimalPlaces: 2 }) // '07.30'`,
  },

  'api-types': {
    lang: 'ts',
    code: String.raw`type MaskPattern = string | string[]

interface MaskResult {
  readonly value: string
  readonly caret: number // UTF-16 offset
}

type TokenMatcher = RegExp | ((char: string) => boolean)
interface MaskTokenDefinition {
  match: TokenMatcher
  transform?: (char: string) => string // exactly one code point
}
type MaskTokens = Record<string, TokenMatcher | MaskTokenDefinition>
type MaskResolver = (value: string) => MaskPattern

interface ApplyMaskOptions {
  segmented?: boolean // hard field boundaries for static masks — default true
  eager?: boolean     // reveal upcoming literals — default true
  tokens?: MaskTokens
  resolveMask?: MaskResolver
}

interface BindInputAttributes {
  autocomplete?: HTMLInputElement['autocomplete'] // default 'off'
  autocorrect?: 'on' | 'off'                      // default 'off'
  autocapitalize?: 'on' | 'off' | 'none' | 'sentences' | 'words' | 'characters' // default 'off'
  spellcheck?: boolean                             // default false
}

interface BindOptions extends ApplyMaskOptions, BindInputAttributes {
  onChange?: (value: string) => void
}

interface DecimalMaskOptions {
  decimalPlaces?: number      // unset: optional, unlimited fraction
  numberPlaces?: number       // unset: unlimited integer part
  segmented?: boolean         // group into thousands — default true
  separator?: string          // thousands separator — default ','
  decimalSeparator?: string   // default '.'
  prefix?: string             // default ''
  suffix?: string             // default ''
  allowNegative?: boolean     // default false
}

interface BindDecimalOptions extends DecimalMaskOptions, BindInputAttributes {
  onChange?: (value: string, numericValue: number) => void
}`,
  },
} satisfies Record<string, RawSnippet>

export type SnippetName = keyof typeof snippets
