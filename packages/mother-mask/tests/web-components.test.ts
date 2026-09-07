import { afterEach, describe, expect, it, vi } from 'vitest'
import * as core from '../src/index'
import * as webComponentsApi from '../src/web-components/index'
import '../src/web-components/mask-input'
import '../src/web-components/decimal-input'
import type { MotherMaskInputElement } from '../src/web-components/mask-input'
import type { MotherMaskDecimalElement } from '../src/web-components/decimal-input'

let host: HTMLElement | undefined

afterEach(() => {
  host?.remove()
  host = undefined
  vi.restoreAllMocks()
})

it('aliases every core export without exposing the custom elements from core', () => {
  for (const name of Object.keys(core) as Array<keyof typeof core>) {
    expect(webComponentsApi[name]).toBe(core[name])
  }
  expect(core).not.toHaveProperty('MotherMaskInputElement')
  expect(core).not.toHaveProperty('MotherMaskDecimalElement')
})

it('registers both custom elements exactly once', () => {
  expect(customElements.get('mm-mask-input')).toBeDefined()
  expect(customElements.get('mm-mask-decimal')).toBeDefined()
})

describe('<mm-mask-input>', () => {
  function mount(attrs: Record<string, string> = {}): MotherMaskInputElement {
    const el = document.createElement('mm-mask-input') as MotherMaskInputElement
    el.setAttribute('mask', '999-999')
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
    document.body.append(el)
    host = el
    return el
  }

  it('formats the initial value from the value attribute', () => {
    const el = mount({ value: '123456' })
    expect(el.querySelector('input')!.value).toBe('123-456')
  })

  it('emits value-change when the user types', () => {
    const el = mount()
    const input = el.querySelector('input')!
    const onValueChange = vi.fn()
    el.addEventListener('value-change', (e) => onValueChange((e as CustomEvent).detail))

    input.value = '123456'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))

    expect(onValueChange).toHaveBeenLastCalledWith('123-456')
    expect(el.value).toBe('123-456')
  })

  it('rebinds and reformats when the mask attribute changes', () => {
    const el = mount({ value: '123456' })
    el.setAttribute('mask', '99/99/99')
    expect(el.querySelector('input')!.value).toBe('12/34/56')
  })

  it('rebinds and reformats when the mask property is set', () => {
    const el = mount({ value: '123456' })
    el.mask = '99/99/99'
    expect(el.mask).toBe('99/99/99')
    expect(el.querySelector('input')!.value).toBe('12/34/56')
  })

  it('reformats when the value property is set externally', () => {
    const el = mount({ value: '123456' })
    el.value = '999888'
    expect(el.value).toBe('999888')
    expect(el.querySelector('input')!.value).toBe('999-888')
  })

  it('exposes the options getter after setting the options property', () => {
    const el = mount({ value: '123456' })
    el.options = { eager: false }
    expect(el.options).toEqual({ eager: false })
  })

  it('reformats when the value attribute is set externally', () => {
    const el = mount({ value: '123456' })
    el.setAttribute('value', '999888')
    expect(el.querySelector('input')!.value).toBe('999-888')
  })

  it('does not rebind for a value update echoing its own value-change', () => {
    const el = mount()
    const input = el.querySelector('input')!

    input.value = '123456'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    expect(input.value).toBe('123-456')

    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    el.setAttribute('value', '123-456')
    expect(removeEventListener).not.toHaveBeenCalled()
  })

  it('forwards name/placeholder/disabled/input-mode/autocomplete/readonly/required to the native input', () => {
    const el = mount({
      name: 'phone',
      placeholder: 'Phone',
      disabled: '',
      readonly: '',
      required: '',
      'input-mode': 'tel',
      autocomplete: 'tel',
    })
    const input = el.querySelector('input')!
    expect(input.name).toBe('phone')
    expect(input.placeholder).toBe('Phone')
    expect(input.disabled).toBe(true)
    expect(input.readOnly).toBe(true)
    expect(input.required).toBe(true)
    expect(input.getAttribute('inputmode')).toBe('tel')
    expect(input.getAttribute('autocomplete')).toBe('tel')
  })

  it('removes forwarded attributes from the native input when they are removed from the host', () => {
    const el = mount({ name: 'phone', disabled: '' })
    el.removeAttribute('name')
    el.removeAttribute('disabled')
    const input = el.querySelector('input')!
    expect(input.hasAttribute('name')).toBe(false)
    expect(input.disabled).toBe(false)
  })

  it('rebinds and reformats when the options property changes', () => {
    const el = mount({ value: '123456' })
    el.options = { eager: false }
    expect(el.querySelector('input')!.value).toBe('123-456')
  })

  it('moves a host id onto the rendered input so <label for> still resolves to it', () => {
    const el = document.createElement('mm-mask-input') as MotherMaskInputElement
    el.id = 'phone'
    el.setAttribute('mask', '999-999')
    document.body.append(el)
    host = el

    expect(el.hasAttribute('id')).toBe(false)
    const input = el.querySelector('input')!
    expect(input.id).toBe('phone')
    expect(document.getElementById('phone')).toBe(input)
  })

  it('does not throw and leaves the input unbound when mask is unset', () => {
    const el = document.createElement('mm-mask-input') as MotherMaskInputElement
    el.setAttribute('value', '123456')
    expect(() => document.body.append(el)).not.toThrow()
    host = el
    expect(el.querySelector('input')!.value).toBe('')
  })

  it('disposes the binding on disconnectedCallback', () => {
    const el = mount({ value: '123456' })
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

describe('<mm-mask-decimal>', () => {
  function mount(attrs: Record<string, string> = {}): MotherMaskDecimalElement {
    const el = document.createElement('mm-mask-decimal') as MotherMaskDecimalElement
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value)
    document.body.append(el)
    host = el
    return el
  }

  it('formats the initial value and sets inputmode="decimal"', () => {
    const el = mount({ value: '123456' })
    const input = el.querySelector('input')!
    expect(input.value).toBe('123,456')
    expect(input.getAttribute('inputmode')).toBe('decimal')
  })

  it('emits value-change and numeric-value-change when the user types', () => {
    const el = mount()
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

  it('rebinds and reformats when the options property changes', () => {
    const el = mount({ value: '123456' })
    el.options = { prefix: '$' }
    expect(el.options).toEqual({ prefix: '$' })
    expect(el.querySelector('input')!.value).toBe('$123,456')
  })

  it('reformats when the value property is set externally', () => {
    const el = mount({ value: '123456' })
    el.value = '999888'
    expect(el.value).toBe('999888')
    expect(el.querySelector('input')!.value).toBe('999,888')
  })

  it('does not rebind for a value update echoing its own value-change', () => {
    const el = mount()
    const input = el.querySelector('input')!

    input.value = '123456'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    expect(input.value).toBe('123,456')

    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    el.setAttribute('value', '123,456')
    expect(removeEventListener).not.toHaveBeenCalled()
  })

  it('forwards name/placeholder/readonly/required to the native input and removes them', () => {
    const el = mount({ name: 'amount', placeholder: '$0.00', readonly: '', required: '' })
    const input = el.querySelector('input')!
    expect(input.name).toBe('amount')
    expect(input.placeholder).toBe('$0.00')
    expect(input.readOnly).toBe(true)
    expect(input.required).toBe(true)

    el.removeAttribute('name')
    el.removeAttribute('readonly')
    expect(input.hasAttribute('name')).toBe(false)
    expect(input.readOnly).toBe(false)
  })

  it('moves a host id onto the rendered input so <label for> still resolves to it', () => {
    const el = document.createElement('mm-mask-decimal') as MotherMaskDecimalElement
    el.id = 'amount'
    document.body.append(el)
    host = el

    expect(el.hasAttribute('id')).toBe(false)
    expect(el.querySelector('input')!.id).toBe('amount')
  })

  it('disposes the binding on disconnectedCallback', () => {
    const el = mount({ value: '123456' })
    const input = el.querySelector('input')!
    const removeEventListener = vi.spyOn(input, 'removeEventListener')

    el.remove()
    host = undefined

    expect(removeEventListener).toHaveBeenCalled()
  })
})
