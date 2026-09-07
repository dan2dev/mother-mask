import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import Alpine from 'alpinejs'
import * as core from '../src/index'
import * as alpineApi from '../src/alpine/index'
import { motherMaskPlugin } from '../src/alpine/plugin'

let root: HTMLDivElement | undefined

beforeAll(() => {
  Alpine.plugin(motherMaskPlugin)
  Alpine.start()
})

afterEach(() => {
  root?.remove()
  root = undefined
  vi.restoreAllMocks()
})

function mount(html: string): HTMLDivElement {
  const el = document.createElement('div')
  el.innerHTML = html
  document.body.append(el)
  root = el
  Alpine.initTree(el)
  return el
}

it('aliases every core export without exposing the plugin from core', () => {
  for (const name of Object.keys(core) as Array<keyof typeof core>) {
    expect(alpineApi[name]).toBe(core[name])
  }
  expect(core).not.toHaveProperty('motherMaskPlugin')
})

it('exports the plugin as both a named export and the default export', () => {
  expect(alpineApi.default).toBe(alpineApi.motherMaskPlugin)
})

describe('x-mask', () => {
  it('formats the initial value from the expression', () => {
    const el = mount(`
      <div x-data="{ phone: '123456' }">
        <input x-mask="{ mask: '999-999', value: phone }" />
      </div>
    `)
    const input = el.querySelector('input')!
    expect(input.value).toBe('123-456')
  })

  it('dispatches mask-change when the user types', async () => {
    const el = mount(`
      <div x-data="{ phone: '' }">
        <input x-mask="{ mask: '999-999', value: phone }" x-on:mask-change="phone = $event.detail" />
        <span x-text="phone"></span>
      </div>
    `)
    const input = el.querySelector('input')!
    const onValueChange = vi.fn()
    input.addEventListener('mask-change', (e) => onValueChange((e as CustomEvent).detail))

    input.value = '123456'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    await Alpine.nextTick()

    expect(onValueChange).toHaveBeenLastCalledWith('123-456')
    expect(el.querySelector('span')!.textContent).toBe('123-456')
  })

  it('rebinds and reformats when the reactive mask changes', async () => {
    const el = mount(`
      <div x-data="{ pattern: '999-999', phone: '123456' }">
        <input x-mask="{ mask: pattern, value: phone }" x-on:mask-change="phone = $event.detail" />
        <button x-on:click="pattern = '99/99/99'">change</button>
      </div>
    `)
    const input = el.querySelector('input')!
    expect(input.value).toBe('123-456')

    el.querySelector('button')!.click()
    await Alpine.nextTick()

    expect(input.value).toBe('12/34/56')
  })

  it('reformats when the bound value changes externally', async () => {
    const el = mount(`
      <div x-data="{ phone: '123456' }">
        <input x-mask="{ mask: '999-999', value: phone }" x-on:mask-change="phone = $event.detail" />
        <button x-on:click="phone = '999888'">change</button>
      </div>
    `)
    const input = el.querySelector('input')!
    expect(input.value).toBe('123-456')

    el.querySelector('button')!.click()
    await Alpine.nextTick()

    expect(input.value).toBe('999-888')
  })

  it('does not rebind for a mask-change echo', async () => {
    const el = mount(`
      <div x-data="{ phone: '' }">
        <input x-mask="{ mask: '999-999', value: phone }" x-on:mask-change="phone = $event.detail" />
      </div>
    `)
    const input = el.querySelector('input')!
    input.value = '123456'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    await Alpine.nextTick()
    expect(input.value).toBe('123-456')

    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    await Alpine.nextTick()
    expect(removeEventListener).not.toHaveBeenCalled()
  })

  it('disposes the binding when the element is removed', () => {
    const el = mount(`
      <div x-data="{ phone: '123456' }">
        <input x-mask="{ mask: '999-999', value: phone }" />
      </div>
    `)
    const input = el.querySelector('input')!
    const removeEventListener = vi.spyOn(input, 'removeEventListener')

    // Alpine normally tears down a removed subtree via a MutationObserver
    // (async, on a microtask); `destroyTree` is its synchronous equivalent,
    // used here so the assertion below doesn't need to await that observer.
    Alpine.destroyTree(el)
    el.remove()
    root = undefined

    expect(removeEventListener).toHaveBeenCalled()
    input.value = 'abcdef'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    expect(input.value).toBe('abcdef')
  })
})

describe('x-mask.decimal', () => {
  it('formats the initial value and sets inputmode="decimal" is left to the author (no forced attribute)', () => {
    const el = mount(`
      <div x-data="{ amount: '123456' }">
        <input x-mask.decimal="{ value: amount }" />
      </div>
    `)
    expect(el.querySelector('input')!.value).toBe('123,456')
  })

  it('dispatches mask-change and mask-numeric-change when the user types', () => {
    const el = mount(`
      <div x-data="{ amount: '' }">
        <input x-mask.decimal="{ value: amount }" x-on:mask-change="amount = $event.detail" />
      </div>
    `)
    const input = el.querySelector('input')!
    const onValueChange = vi.fn()
    const onNumeric = vi.fn()
    input.addEventListener('mask-change', (e) => onValueChange((e as CustomEvent).detail))
    input.addEventListener('mask-numeric-change', (e) => onNumeric((e as CustomEvent).detail))

    input.value = '123456'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))

    expect(onValueChange).toHaveBeenLastCalledWith('123,456')
    expect(onNumeric).toHaveBeenLastCalledWith(123456)
  })

  it('rebinds and reformats when the reactive options change', async () => {
    const el = mount(`
      <div x-data="{ opts: {}, amount: '123456' }">
        <input x-mask.decimal="{ options: opts, value: amount }" x-on:mask-change="amount = $event.detail" />
        <button x-on:click="opts = { prefix: '$' }">change</button>
      </div>
    `)
    const input = el.querySelector('input')!
    expect(input.value).toBe('123,456')

    el.querySelector('button')!.click()
    await Alpine.nextTick()

    expect(input.value).toBe('$123,456')
  })

  it('disposes the binding when the element is removed', () => {
    const el = mount(`
      <div x-data="{ amount: '123456' }">
        <input x-mask.decimal="{ value: amount }" />
      </div>
    `)
    const input = el.querySelector('input')!
    const removeEventListener = vi.spyOn(input, 'removeEventListener')

    Alpine.destroyTree(el)
    el.remove()
    root = undefined

    expect(removeEventListener).toHaveBeenCalled()
  })
})
