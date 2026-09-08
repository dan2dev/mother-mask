import { afterEach, describe, expect, it, vi } from 'vitest'
import { createComponentVNode, render } from 'inferno'
import type { ComponentType, VNode } from 'inferno'
import * as core from '../src/index'
import * as infernoApi from '../src/inferno/index'
import { InputDecimal, InputMask } from '../src/inferno/index'
import type { InputDecimalProps } from '../src/inferno/InputDecimal'
import type { InputMaskProps } from '../src/inferno/InputMask'

let host: HTMLDivElement | undefined

afterEach(() => {
  if (host) {
    render(null, host)
    host.remove()
    host = undefined
  }
  vi.restoreAllMocks()
})

// VNodeFlags.ComponentClass (= 4) hardcoded: it isn't exported as a runtime
// value from 'inferno' itself (only as a type), and pulling in the separate
// `inferno-vnode-flags` package for one numeric constant, used only here in
// tests, isn't worth the extra dependency.
function component<P>(Type: ComponentType<P>, props: P): VNode {
  return createComponentVNode(4, Type, props)
}

function mount(vnode: VNode): HTMLInputElement {
  host = document.createElement('div')
  document.body.append(host)
  render(vnode, host)
  return host.querySelector('input')!
}

function edit(input: HTMLInputElement, value: string) {
  input.value = value
  input.setSelectionRange(value.length, value.length)
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
}

it('aliases every core export without exposing Inferno components from core', () => {
  for (const name of Object.keys(core) as Array<keyof typeof core>) {
    expect(infernoApi[name]).toBe(core[name])
  }
  expect(core).not.toHaveProperty('InputMask')
  expect(core).not.toHaveProperty('InputDecimal')
})

describe('InputMask', () => {
  it('formats the initial value on mount', () => {
    const input = mount(component<InputMaskProps>(InputMask, { mask: '999-999', defaultValue: '123456' }))
    expect(input.value).toBe('123-456')
  })

  it('calls onValueChange when the user types', () => {
    const onValueChange = vi.fn()
    const input = mount(component<InputMaskProps>(InputMask, { mask: '999-999', value: '', onValueChange }))
    edit(input, '123456')
    expect(onValueChange).toHaveBeenLastCalledWith('123-456')
  })

  it('rebinds and reformats when the mask prop changes', () => {
    mount(component<InputMaskProps>(InputMask, { mask: '999-999', value: '123456', onValueChange: () => {} }))
    const input = mount(
      component<InputMaskProps>(InputMask, { mask: '99/99/99', value: '123456', onValueChange: () => {} }),
    )
    expect(input.value).toBe('12/34/56')
  })

  it('reformats when a controlled value prop is updated externally', () => {
    mount(component<InputMaskProps>(InputMask, { mask: '999-999', value: '123456', onValueChange: () => {} }))
    const input = mount(
      component<InputMaskProps>(InputMask, { mask: '999-999', value: '999888', onValueChange: () => {} }),
    )
    expect(input.value).toBe('999-888')
  })

  it('disposes the binding on unmount', () => {
    const input = mount(component<InputMaskProps>(InputMask, { mask: '999-999', defaultValue: '123456' }))
    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    render(null, host!)
    expect(removeEventListener).toHaveBeenCalled()
  })
})

describe('InputDecimal', () => {
  it('formats the initial value on mount', () => {
    const input = mount(component<InputDecimalProps>(InputDecimal, { defaultValue: '123456' }))
    expect(input.value).toBe('123,456')
  })

  it('sets inputMode="decimal" by default', () => {
    const input = mount(component<InputDecimalProps>(InputDecimal, { defaultValue: '' }))
    expect(input.getAttribute('inputmode')).toBe('decimal')
  })

  it('calls onValueChange with the formatted value and numeric value', () => {
    const onValueChange = vi.fn()
    const input = mount(component<InputDecimalProps>(InputDecimal, { value: '', onValueChange }))
    edit(input, '123456')
    expect(onValueChange).toHaveBeenLastCalledWith('123,456', 123456)
  })

  it('disposes the binding on unmount', () => {
    const input = mount(component<InputDecimalProps>(InputDecimal, { defaultValue: '123456' }))
    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    render(null, host!)
    expect(removeEventListener).toHaveBeenCalled()
  })
})
