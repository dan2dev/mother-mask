import { afterEach, describe, expect, it, vi } from 'vitest'
import m from 'mithril'
import * as core from '../src/index'
import * as mithrilApi from '../src/mithril/index'
import { InputDecimal, InputMask } from '../src/mithril/index'
import type { InputDecimalAttrs } from '../src/mithril/InputDecimal'
import type { InputMaskAttrs } from '../src/mithril/InputMask'

let host: HTMLDivElement | undefined

afterEach(() => {
  if (host) {
    m.render(host, null)
    host.remove()
    host = undefined
  }
  vi.restoreAllMocks()
})

function mount<A extends Record<string, unknown>>(Component: m.FactoryComponent<A>, attrs: A): HTMLInputElement {
  host = document.createElement('div')
  document.body.append(host)
  m.render(host, m(Component, attrs))
  return host.querySelector('input')!
}

function rerender<A extends Record<string, unknown>>(Component: m.FactoryComponent<A>, attrs: A): HTMLInputElement {
  m.render(host!, m(Component, attrs))
  return host!.querySelector('input')!
}

function edit(input: HTMLInputElement, value: string) {
  input.value = value
  input.setSelectionRange(value.length, value.length)
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
}

it('aliases every core export without exposing Mithril components from core', () => {
  for (const name of Object.keys(core) as Array<keyof typeof core>) {
    expect(mithrilApi[name]).toBe(core[name])
  }
  expect(core).not.toHaveProperty('InputMask')
  expect(core).not.toHaveProperty('InputDecimal')
})

describe('InputMask', () => {
  it('formats the initial value on mount', () => {
    const input = mount<InputMaskAttrs>(InputMask, { mask: '999-999', defaultValue: '123456' })
    expect(input.value).toBe('123-456')
  })

  it('calls onValueChange when the user types', () => {
    const onValueChange = vi.fn()
    const input = mount<InputMaskAttrs>(InputMask, { mask: '999-999', value: '', onValueChange })
    edit(input, '123456')
    expect(onValueChange).toHaveBeenLastCalledWith('123-456')
  })

  it('rebinds and reformats when the mask attr changes', () => {
    mount<InputMaskAttrs>(InputMask, { mask: '999-999', value: '123456', onValueChange: () => {} })
    const input = rerender<InputMaskAttrs>(InputMask, {
      mask: '99/99/99',
      value: '123456',
      onValueChange: () => {},
    })
    expect(input.value).toBe('12/34/56')
  })

  it('reformats when a controlled value attr is updated externally', () => {
    mount<InputMaskAttrs>(InputMask, { mask: '999-999', value: '123456', onValueChange: () => {} })
    const input = rerender<InputMaskAttrs>(InputMask, {
      mask: '999-999',
      value: '999888',
      onValueChange: () => {},
    })
    expect(input.value).toBe('999-888')
  })

  it('does not rebind on a redraw with unchanged mask/options/value', () => {
    const input = mount<InputMaskAttrs>(InputMask, { mask: '999-999', value: '123456', onValueChange: () => {} })
    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    rerender<InputMaskAttrs>(InputMask, { mask: '999-999', value: '123456', onValueChange: () => {} })
    expect(removeEventListener).not.toHaveBeenCalled()
  })

  it('disposes the binding on removal', () => {
    const input = mount<InputMaskAttrs>(InputMask, { mask: '999-999', defaultValue: '123456' })
    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    m.render(host!, null)
    expect(removeEventListener).toHaveBeenCalled()
  })
})

describe('InputDecimal', () => {
  it('formats the initial value on mount', () => {
    const input = mount<InputDecimalAttrs>(InputDecimal, { defaultValue: '123456' })
    expect(input.value).toBe('123,456')
  })

  it('sets inputMode="decimal"', () => {
    const input = mount<InputDecimalAttrs>(InputDecimal, { defaultValue: '' })
    expect(input.getAttribute('inputmode')).toBe('decimal')
  })

  it('calls onValueChange with the formatted value and numeric value', () => {
    const onValueChange = vi.fn()
    const input = mount<InputDecimalAttrs>(InputDecimal, { value: '', onValueChange })
    edit(input, '123456')
    expect(onValueChange).toHaveBeenLastCalledWith('123,456', 123456)
  })

  it('rebinds when options change', () => {
    const currency = { prefix: '$' }
    mount<InputDecimalAttrs>(InputDecimal, { value: '1234', onValueChange: () => {} })
    const input = rerender<InputDecimalAttrs>(InputDecimal, {
      options: currency,
      value: '1234',
      onValueChange: () => {},
    })
    expect(input.value).toBe('$1,234')
  })

  it('disposes the binding on removal', () => {
    const input = mount<InputDecimalAttrs>(InputDecimal, { defaultValue: '123456' })
    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    m.render(host!, null)
    expect(removeEventListener).toHaveBeenCalled()
  })
})
