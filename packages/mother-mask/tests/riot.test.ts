import { afterEach, describe, expect, it, vi } from 'vitest'
import * as core from '../src/index'
import * as riotApi from '../src/riot/index'
import { maskDecimal, maskInput } from '../src/riot/index'
import type { MaskDecimalProps } from '../src/riot/mask-decimal'
import type { MaskInputProps } from '../src/riot/mask-input'

let host: HTMLDivElement | undefined

afterEach(() => {
  host?.remove()
  host = undefined
  vi.restoreAllMocks()
})

function mount<P extends object>(
  factory: (args: { props?: P }) => { mount: (el: HTMLElement, ctx?: P) => void },
  props: P,
): HTMLInputElement {
  host = document.createElement('div')
  document.body.append(host)
  const component = factory({ props })
  component.mount(host)
  return host.querySelector('input')!
}

function edit(input: HTMLInputElement, value: string) {
  input.value = value
  input.setSelectionRange(value.length, value.length)
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
}

it('aliases every core export without exposing Riot components from core', () => {
  for (const name of Object.keys(core) as Array<keyof typeof core>) {
    expect(riotApi[name]).toBe(core[name])
  }
  expect(core).not.toHaveProperty('maskInput')
  expect(core).not.toHaveProperty('maskDecimal')
})

describe('maskInput', () => {
  it('formats the initial value on mount', () => {
    const input = mount<MaskInputProps>(maskInput, { mask: '999-999', defaultValue: '123456' })
    expect(input.value).toBe('123-456')
  })

  it('calls onValueChange when the user types', () => {
    const onValueChange = vi.fn()
    const input = mount<MaskInputProps>(maskInput, { mask: '999-999', value: '', onValueChange })
    edit(input, '123456')
    expect(onValueChange).toHaveBeenLastCalledWith('123-456')
  })

  it('applies name, placeholder, inputMode, autocomplete, and boolean attributes', () => {
    const input = mount<MaskInputProps>(maskInput, {
      mask: '999-999',
      defaultValue: '',
      name: 'phone',
      placeholder: 'Phone',
      inputMode: 'tel',
      autocomplete: 'tel',
      required: true,
    })
    expect(input.name).toBe('phone')
    expect(input.placeholder).toBe('Phone')
    expect(input.inputMode).toBe('tel')
    expect(input.autocomplete).toBe('tel')
    expect(input.required).toBe(true)
  })

  it('rebinds and reformats when update() is called with a new mask', () => {
    const component = maskInput({ props: { mask: '999-999', value: '123456' } })
    host = document.createElement('div')
    document.body.append(host)
    component.mount(host)
    component.update?.({ mask: '99/99/99', value: '123456' } as MaskInputProps)
    expect(host.querySelector('input')!.value).toBe('12/34/56')
  })

  it('moves a host id onto the rendered input', () => {
    host = document.createElement('div')
    host.id = 'phone'
    document.body.append(host)
    const component = maskInput({ props: { mask: '999-999', defaultValue: '' } })
    component.mount(host)
    const input = host.querySelector('input')!
    expect(input.id).toBe('phone')
    expect(host.id).toBe('')
  })

  it('disposes the binding on unmount', () => {
    const component = maskInput({ props: { mask: '999-999', defaultValue: '123456' } })
    host = document.createElement('div')
    document.body.append(host)
    component.mount(host)
    const input = host.querySelector('input')!
    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    component.unmount(false)
    expect(removeEventListener).toHaveBeenCalled()
    expect(host.querySelector('input')).toBeNull()
  })

  it('keeps the input element when unmounting with keepRootElement', () => {
    const component = maskInput({ props: { mask: '999-999', defaultValue: '123456' } })
    host = document.createElement('div')
    document.body.append(host)
    component.mount(host)
    component.unmount(true)
    expect(host.querySelector('input')).not.toBeNull()
  })
})

describe('maskDecimal', () => {
  it('formats the initial value on mount and sets inputmode="decimal"', () => {
    const input = mount<MaskDecimalProps>(maskDecimal, { defaultValue: '123456' })
    expect(input.value).toBe('123,456')
    expect(input.getAttribute('inputmode')).toBe('decimal')
  })

  it('calls onValueChange with the formatted value and numeric value', () => {
    const onValueChange = vi.fn()
    const input = mount<MaskDecimalProps>(maskDecimal, { value: '', onValueChange })
    edit(input, '123456')
    expect(onValueChange).toHaveBeenLastCalledWith('123,456', 123456)
  })

  it('applies name, placeholder, autocomplete, and boolean attributes', () => {
    const input = mount<MaskDecimalProps>(maskDecimal, {
      defaultValue: '',
      name: 'amount',
      placeholder: 'Amount',
      autocomplete: 'off',
      required: true,
    })
    expect(input.name).toBe('amount')
    expect(input.placeholder).toBe('Amount')
    expect(input.autocomplete).toBe('off')
    expect(input.required).toBe(true)
  })

  it('disposes the binding on unmount', () => {
    const component = maskDecimal({ props: { defaultValue: '123456' } })
    host = document.createElement('div')
    document.body.append(host)
    component.mount(host)
    const input = host.querySelector('input')!
    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    component.unmount(false)
    expect(removeEventListener).toHaveBeenCalled()
  })
})
