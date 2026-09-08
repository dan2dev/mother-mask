import { afterEach, describe, expect, it, vi } from 'vitest'
import ko from 'knockout'
import * as core from '../src/index'
import * as knockoutApi from '../src/knockout/index'
import '../src/knockout/index'

let host: HTMLDivElement | undefined

afterEach(() => {
  if (host) {
    ko.cleanNode(host)
    host.remove()
    host = undefined
  }
  vi.restoreAllMocks()
})

function mount(dataBind: string, viewModel: Record<string, unknown>): HTMLInputElement {
  host = document.createElement('div')
  host.innerHTML = `<input data-bind="${dataBind}">`
  document.body.append(host)
  ko.applyBindings(viewModel, host)
  return host.querySelector('input')!
}

function edit(input: HTMLInputElement, value: string) {
  input.value = value
  input.setSelectionRange(value.length, value.length)
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
}

it('aliases every core export without exposing Knockout binding handlers from core', () => {
  for (const name of Object.keys(core) as Array<keyof typeof core>) {
    expect(knockoutApi[name]).toBe(core[name])
  }
  expect(core).not.toHaveProperty('maskBindingHandler')
  expect(core).not.toHaveProperty('maskDecimalBindingHandler')
})

it('registers the mask and maskDecimal binding handlers on ko.bindingHandlers', () => {
  expect(ko.bindingHandlers.mask).toBe(knockoutApi.maskBindingHandler)
  expect(ko.bindingHandlers.maskDecimal).toBe(knockoutApi.maskDecimalBindingHandler)
})

describe('mask binding', () => {
  it('formats the initial value on apply', () => {
    const input = mount('mask: config', { config: { mask: '999-999', value: '123456' } })
    expect(input.value).toBe('123-456')
  })

  it('calls onValueChange when the user types', () => {
    const onValueChange = vi.fn()
    const input = mount('mask: config', { config: { mask: '999-999', value: '', onValueChange } })
    edit(input, '123456')
    expect(onValueChange).toHaveBeenLastCalledWith('123-456')
  })

  it('unwraps an observable value and reformats when it changes externally', () => {
    const phone = ko.observable('123456')
    const input = mount('mask: config', { config: { mask: '999-999', value: phone } })
    expect(input.value).toBe('123-456')
    phone('999888')
    expect(input.value).toBe('999-888')
  })

  it('rebinds and reformats when the mask changes', () => {
    const mask = ko.observable('999-999')
    const input = mount('mask: config', { config: ko.pureComputed(() => ({ mask: mask(), value: '123456' })) })
    expect(input.value).toBe('123-456')
    mask('99/99/99')
    expect(input.value).toBe('12/34/56')
  })

  it('does not rebind on a redundant recompute with unchanged mask/options/value', () => {
    const unrelated = ko.observable(0)
    const input = mount('mask: config', {
      config: ko.pureComputed(() => {
        void unrelated()
        return { mask: '999-999', value: '123456' }
      }),
    })
    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    unrelated(1)
    expect(removeEventListener).not.toHaveBeenCalled()
  })

  it('disposes the binding when the node is cleaned up', () => {
    const input = mount('mask: config', { config: { mask: '999-999', value: '123456' } })
    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    ko.cleanNode(host!)
    expect(removeEventListener).toHaveBeenCalled()
  })
})

describe('maskDecimal binding', () => {
  it('formats the initial value and sets inputmode="decimal"', () => {
    const input = mount('maskDecimal: config', { config: { value: '123456' } })
    expect(input.value).toBe('123,456')
    expect(input.getAttribute('inputmode')).toBe('decimal')
  })

  it('calls onValueChange with the formatted value and numeric value', () => {
    const onValueChange = vi.fn()
    const input = mount('maskDecimal: config', { config: { value: '', onValueChange } })
    edit(input, '123456')
    expect(onValueChange).toHaveBeenLastCalledWith('123,456', 123456)
  })

  it('disposes the binding when the node is cleaned up', () => {
    const input = mount('maskDecimal: config', { config: { value: '123456' } })
    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    ko.cleanNode(host!)
    expect(removeEventListener).toHaveBeenCalled()
  })
})
