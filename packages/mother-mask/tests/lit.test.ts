import { afterEach, describe, expect, it, vi } from 'vitest'
import * as core from '../src/index'
import * as litApi from '../src/lit/index'
import '../src/lit/mask-input'
import '../src/lit/decimal-input'
import type { LitMaskInput } from '../src/lit/mask-input'
import type { LitMaskDecimal } from '../src/lit/decimal-input'

let host: LitMaskInput | LitMaskDecimal | undefined

afterEach(() => {
  host?.remove()
  host = undefined
  vi.restoreAllMocks()
})

it('aliases every core export without exposing Lit elements from core', () => {
  for (const name of Object.keys(core) as Array<keyof typeof core>) {
    expect(litApi[name]).toBe(core[name])
  }
  expect(core).not.toHaveProperty('LitMaskInput')
  expect(core).not.toHaveProperty('LitMaskDecimal')
})

it('registers both custom elements exactly once', () => {
  expect(customElements.get('lit-mask-input')).toBeDefined()
  expect(customElements.get('lit-mask-decimal')).toBeDefined()
})

describe('<lit-mask-input>', () => {
  // Properties are assigned before the element connects, so `firstUpdated`'s
  // initial `sync()` already sees the real `mask` instead of `undefined`.
  async function mount(props: Partial<LitMaskInput> = {}): Promise<LitMaskInput> {
    const el = document.createElement('lit-mask-input') as LitMaskInput
    Object.assign(el, { mask: '999-999', ...props })
    document.body.append(el)
    await el.updateComplete
    host = el
    return el
  }

  it('formats the initial value on firstUpdated', async () => {
    const el = await mount({ value: '123456' })
    const input = el.querySelector('input')!
    expect(input.value).toBe('123-456')
  })

  it('does not throw and leaves the input unbound when mask is unset', async () => {
    const el = document.createElement('lit-mask-input') as LitMaskInput
    el.value = '123456'
    document.body.append(el)
    host = el
    await expect(el.updateComplete).resolves.toBe(true)
    // No mask means `sync()` never ran — the mask binder owns `input.value`
    // once bound, so an unbound input stays at its native default (empty).
    expect(el.querySelector('input')!.value).toBe('')
  })

  it('emits value-change when the user types', async () => {
    const el = await mount()
    const input = el.querySelector('input')!
    const onValueChange = vi.fn()
    el.addEventListener('value-change', (e) => onValueChange((e as CustomEvent).detail))

    input.value = '123456'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))

    expect(onValueChange).toHaveBeenLastCalledWith('123-456')
    expect(el.value).toBe('123-456')
  })

  it('rebinds and reformats when the mask property changes', async () => {
    const el = await mount({ value: '123456' })
    el.mask = '99/99/99'
    await el.updateComplete
    const input = el.querySelector('input')!
    expect(input.value).toBe('12/34/56')
  })

  it('reformats when the value property is set externally', async () => {
    const el = await mount({ value: '123456' })
    el.value = '999888'
    await el.updateComplete
    const input = el.querySelector('input')!
    expect(input.value).toBe('999-888')
  })

  it('does not rebind for a value update echoing its own value-change', async () => {
    const el = await mount()
    const input = el.querySelector('input')!

    input.value = '123456'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    await el.updateComplete
    expect(input.value).toBe('123-456')

    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    el.value = '123-456'
    await el.updateComplete
    expect(removeEventListener).not.toHaveBeenCalled()
  })

  it('moves a host id onto the rendered input so <label for> still resolves to it', async () => {
    const el = document.createElement('lit-mask-input') as LitMaskInput
    el.id = 'phone'
    el.mask = '999-999'
    document.body.append(el)
    host = el
    await el.updateComplete

    expect(el.hasAttribute('id')).toBe(false)
    const input = el.querySelector('input')!
    expect(input.id).toBe('phone')
    expect(document.getElementById('phone')).toBe(input)
  })

  it('forwards placeholder/disabled/readonly/required/name to the native input', async () => {
    const el = await mount({ name: 'phone', placeholder: 'Phone', disabled: true })
    const input = el.querySelector('input')!
    expect(input.name).toBe('phone')
    expect(input.placeholder).toBe('Phone')
    expect(input.disabled).toBe(true)
  })

  it('disposes the binding on disconnectedCallback', async () => {
    const el = await mount({ value: '123456' })
    const input = el.querySelector('input')!
    const removeEventListener = vi.spyOn(input, 'removeEventListener')

    el.remove()
    host = undefined

    expect(removeEventListener).toHaveBeenCalled()
    input.value = 'abcdef'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    expect(input.value).toBe('abcdef')
  })
})

describe('<lit-mask-decimal>', () => {
  async function mount(): Promise<LitMaskDecimal> {
    const el = document.createElement('lit-mask-decimal') as LitMaskDecimal
    document.body.append(el)
    await el.updateComplete
    host = el
    return el
  }

  it('formats the initial value and sets inputmode="decimal"', async () => {
    const el = await mount()
    el.value = '123456'
    await el.updateComplete
    const input = el.querySelector('input')!
    expect(input.value).toBe('123,456')
    expect(input.getAttribute('inputmode')).toBe('decimal')
  })

  it('emits value-change and numeric-value-change when the user types', async () => {
    const el = await mount()
    await el.updateComplete
    const input = el.querySelector('input')!
    const onValueChange = vi.fn()
    const onNumeric = vi.fn()
    el.addEventListener('value-change', (e) => onValueChange((e as CustomEvent).detail))
    el.addEventListener('numeric-value-change', (e) => onNumeric((e as CustomEvent).detail))

    input.value = '123456'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))

    expect(onValueChange).toHaveBeenLastCalledWith('123,456')
    expect(onNumeric).toHaveBeenLastCalledWith(123456)
  })

  it('rebinds and reformats when the options property changes', async () => {
    const el = await mount()
    el.value = '123456'
    await el.updateComplete
    el.options = { prefix: '$' }
    await el.updateComplete
    const input = el.querySelector('input')!
    expect(input.value).toBe('$123,456')
  })

  it('moves a host id onto the rendered input so <label for> still resolves to it', async () => {
    const el = document.createElement('lit-mask-decimal') as LitMaskDecimal
    el.id = 'amount'
    document.body.append(el)
    host = el
    await el.updateComplete

    expect(el.hasAttribute('id')).toBe(false)
    const input = el.querySelector('input')!
    expect(input.id).toBe('amount')
  })

  it('disposes the binding on disconnectedCallback', async () => {
    const el = await mount()
    el.value = '123456'
    await el.updateComplete
    const input = el.querySelector('input')!
    const removeEventListener = vi.spyOn(input, 'removeEventListener')

    el.remove()
    host = undefined

    expect(removeEventListener).toHaveBeenCalled()
  })
})
