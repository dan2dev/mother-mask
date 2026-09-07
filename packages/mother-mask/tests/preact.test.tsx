/** @jsxImportSource preact */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'preact'
import type { ComponentChild } from 'preact'
import * as core from '../src/index'
import * as preactApi from '../src/preact/index'
import { InputDecimal, InputMask } from '../src/preact/index'

let host: HTMLDivElement

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
})

afterEach(() => {
  render(null, host)
  host.remove()
  vi.restoreAllMocks()
})

function mount(children: ComponentChild) {
  render(children, host)
  return host.querySelector('input')!
}

function edit(input: HTMLInputElement, value: string) {
  input.value = value
  input.setSelectionRange(value.length, value.length)
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
}

it('aliases every core export without exposing Preact components from core', () => {
  for (const name of Object.keys(core) as Array<keyof typeof core>) {
    expect(preactApi[name]).toBe(core[name])
  }
  expect(core).not.toHaveProperty('InputMask')
  expect(core).not.toHaveProperty('InputDecimal')
})

describe('InputMask', () => {
  it('formats the initial value on mount', () => {
    const input = mount(<InputMask mask="999-999" defaultValue="123456" />)
    expect(input.value).toBe('123-456')
  })

  it('calls onValueChange when the user types', () => {
    const onValueChange = vi.fn()
    const input = mount(<InputMask mask="999-999" value="" onValueChange={onValueChange} />)
    edit(input, '123456')
    expect(onValueChange).toHaveBeenLastCalledWith('123-456')
  })

  it('rebinds and reformats when the mask prop changes', () => {
    const input = mount(<InputMask mask="999-999" value="123456" onValueChange={() => {}} />)
    mount(<InputMask mask="99/99/99" value="123456" onValueChange={() => {}} />)
    expect(input.value).toBe('12/34/56')
  })

  it('reformats when a controlled value prop is updated externally', () => {
    mount(<InputMask mask="999-999" value="123456" onValueChange={() => {}} />)
    const input = mount(<InputMask mask="999-999" value="999888" onValueChange={() => {}} />)
    expect(input.value).toBe('999-888')
  })

  it('does not call onValueChange for a disabled field', () => {
    const onValueChange = vi.fn()
    const input = mount(<InputMask mask="999-999" value="" onValueChange={onValueChange} disabled />)
    edit(input, '123456')
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('disposes the binding on unmount', () => {
    const input = mount(<InputMask mask="999-999" defaultValue="123456" />)
    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    render(null, host)
    expect(removeEventListener).toHaveBeenCalled()
  })

  it('forwards a function inputRef to the underlying input element', () => {
    let refValue: HTMLInputElement | null = null
    mount(<InputMask mask="999-999" defaultValue="1" inputRef={(el) => { refValue = el }} />)
    expect(refValue).toBeInstanceOf(HTMLInputElement)
  })

  it('forwards an object inputRef to the underlying input element', () => {
    const inputRef = { current: null as HTMLInputElement | null }
    mount(<InputMask mask="999-999" defaultValue="1" inputRef={inputRef} />)
    expect(inputRef.current).toBeInstanceOf(HTMLInputElement)
  })
})

describe('InputDecimal', () => {
  it('formats the initial value on mount', () => {
    const input = mount(<InputDecimal defaultValue="123456" />)
    expect(input.value).toBe('123,456')
  })

  it('sets inputMode="decimal" by default', () => {
    const input = mount(<InputDecimal defaultValue="" />)
    expect(input.getAttribute('inputmode')).toBe('decimal')
  })

  it('calls onValueChange with the formatted value and numeric value', () => {
    const onValueChange = vi.fn()
    const input = mount(<InputDecimal value="" onValueChange={onValueChange} />)
    edit(input, '123456')
    expect(onValueChange).toHaveBeenLastCalledWith('123,456', 123456)
  })

  it('rebinds and reformats when the options prop changes', () => {
    mount(<InputDecimal value="123456" options={{}} onValueChange={() => {}} />)
    const input = mount(<InputDecimal value="123456" options={{ prefix: '$' }} onValueChange={() => {}} />)
    expect(input.value).toBe('$123,456')
  })

  it('reformats when a controlled value prop is updated externally', () => {
    mount(<InputDecimal value="123456" onValueChange={() => {}} />)
    const input = mount(<InputDecimal value="999888" onValueChange={() => {}} />)
    expect(input.value).toBe('999,888')
  })

  it('does not call onValueChange for a read-only field', () => {
    const onValueChange = vi.fn()
    const input = mount(<InputDecimal value="" onValueChange={onValueChange} readOnly />)
    edit(input, '123456')
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('forwards a function inputRef to the underlying input element', () => {
    let refValue: HTMLInputElement | null = null
    mount(<InputDecimal defaultValue="1" inputRef={(el) => { refValue = el }} />)
    expect(refValue).toBeInstanceOf(HTMLInputElement)
  })

  it('forwards an object inputRef to the underlying input element', () => {
    const inputRef = { current: null as HTMLInputElement | null }
    mount(<InputDecimal defaultValue="1" inputRef={inputRef} />)
    expect(inputRef.current).toBeInstanceOf(HTMLInputElement)
  })

  it('disposes the binding on unmount', () => {
    const input = mount(<InputDecimal defaultValue="123456" />)
    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    render(null, host)
    expect(removeEventListener).toHaveBeenCalled()
  })
})
