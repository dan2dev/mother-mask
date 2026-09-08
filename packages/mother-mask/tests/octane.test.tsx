/** @jsxImportSource octane */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createRoot } from 'octane'
import type { Root } from 'octane'
import * as core from '../src/index'
import * as octaneApi from '../src/octane/index'
import { InputDecimal, InputMask } from '../src/octane/index'
import type { InputDecimalProps } from '../src/octane/InputDecimal'
import type { InputMaskProps } from '../src/octane/InputMask'

let host: HTMLDivElement | undefined
let root: Root | undefined

afterEach(() => {
  if (root) act(() => root!.unmount())
  host?.remove()
  host = undefined
  root = undefined
  vi.restoreAllMocks()
})

function mount<P extends Record<string, unknown>>(Component: (props: P) => unknown, props: P): HTMLInputElement {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root!.render(Component, props))
  return host.querySelector('input')!
}

function rerender<P extends Record<string, unknown>>(Component: (props: P) => unknown, props: P): HTMLInputElement {
  act(() => root!.render(Component, props))
  return host!.querySelector('input')!
}

function edit(input: HTMLInputElement, value: string) {
  act(() => {
    input.value = value
    input.setSelectionRange(value.length, value.length)
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
  })
}

it('aliases every core export without exposing Octane components from core', () => {
  for (const name of Object.keys(core) as Array<keyof typeof core>) {
    expect(octaneApi[name]).toBe(core[name])
  }
  expect(core).not.toHaveProperty('InputMask')
  expect(core).not.toHaveProperty('InputDecimal')
})

describe('InputMask', () => {
  it('formats the initial value on mount', () => {
    const input = mount<InputMaskProps>(InputMask, { mask: '999-999', defaultValue: '123456' })
    expect(input.value).toBe('123-456')
  })

  it('calls onValueChange when the user types', () => {
    const onValueChange = vi.fn()
    const input = mount<InputMaskProps>(InputMask, { mask: '999-999', value: '', onValueChange })
    edit(input, '123456')
    expect(onValueChange).toHaveBeenLastCalledWith('123-456')
  })

  it('rebinds and reformats when the mask prop changes', () => {
    mount<InputMaskProps>(InputMask, { mask: '999-999', value: '123456', onValueChange: () => {} })
    const input = rerender<InputMaskProps>(InputMask, {
      mask: '99/99/99',
      value: '123456',
      onValueChange: () => {},
    })
    expect(input.value).toBe('12/34/56')
  })

  it('reformats when a controlled value prop is updated externally', () => {
    mount<InputMaskProps>(InputMask, { mask: '999-999', value: '123456', onValueChange: () => {} })
    const input = rerender<InputMaskProps>(InputMask, {
      mask: '999-999',
      value: '999888',
      onValueChange: () => {},
    })
    expect(input.value).toBe('999-888')
  })

  it('disposes the binding on unmount', () => {
    const input = mount<InputMaskProps>(InputMask, { mask: '999-999', defaultValue: '123456' })
    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    act(() => root!.unmount())
    expect(removeEventListener).toHaveBeenCalled()
  })
})

describe('InputDecimal', () => {
  it('formats the initial value on mount', () => {
    const input = mount<InputDecimalProps>(InputDecimal, { defaultValue: '123456' })
    expect(input.value).toBe('123,456')
  })

  it('sets inputMode="decimal" by default', () => {
    const input = mount<InputDecimalProps>(InputDecimal, { defaultValue: '' })
    expect(input.getAttribute('inputmode')).toBe('decimal')
  })

  it('calls onValueChange with the formatted value and numeric value', () => {
    const onValueChange = vi.fn()
    const input = mount<InputDecimalProps>(InputDecimal, { value: '', onValueChange })
    edit(input, '123456')
    expect(onValueChange).toHaveBeenLastCalledWith('123,456', 123456)
  })

  it('disposes the binding on unmount', () => {
    const input = mount<InputDecimalProps>(InputDecimal, { defaultValue: '123456' })
    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    act(() => root!.unmount())
    expect(removeEventListener).toHaveBeenCalled()
  })
})
