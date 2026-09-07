import { afterEach, describe, expect, it, vi } from 'vitest'
import * as core from '../src/index'
import * as svelteApi from '../src/svelte/index'
import { motherMask } from '../src/svelte/mask-action'
import { motherMaskDecimal } from '../src/svelte/decimal-action'

let host: HTMLInputElement | undefined
let action: { update(params: any): void; destroy(): void } | undefined

afterEach(() => {
  action?.destroy()
  action = undefined
  host?.remove()
  host = undefined
  vi.restoreAllMocks()
})

function mountInput(): HTMLInputElement {
  const input = document.createElement('input')
  document.body.append(input)
  host = input
  return input
}

it('aliases every core export without exposing Svelte actions from core', () => {
  for (const name of Object.keys(core) as Array<keyof typeof core>) {
    expect(svelteApi[name]).toBe(core[name])
  }
  expect(core).not.toHaveProperty('motherMask')
  expect(core).not.toHaveProperty('motherMaskDecimal')
})

describe('motherMask action', () => {
  it('formats the initial value on mount', () => {
    const input = mountInput()
    action = motherMask(input, { mask: '999-999', value: '123456' })
    expect(input.value).toBe('123-456')
  })

  it('calls onValueChange when the user types', () => {
    const input = mountInput()
    const onValueChange = vi.fn()
    action = motherMask(input, { mask: '999-999', value: '', onValueChange })

    input.value = '123456'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))

    expect(onValueChange).toHaveBeenLastCalledWith('123-456')
  })

  it('works without an onValueChange callback', () => {
    const input = mountInput()
    action = motherMask(input, { mask: '999-999', value: '' })
    input.value = '123456'
    expect(() =>
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' })),
    ).not.toThrow()
    expect(input.value).toBe('123-456')
  })

  it('rebinds and reformats when update() changes the mask', () => {
    const input = mountInput()
    action = motherMask(input, { mask: '999-999', value: '123456' })
    action.update({ mask: '99/99/99', value: '123456' })
    expect(input.value).toBe('12/34/56')
  })

  it('reformats when update() sets an external value', () => {
    const input = mountInput()
    action = motherMask(input, { mask: '999-999', value: '123456' })
    action.update({ mask: '999-999', value: '999888' })
    expect(input.value).toBe('999-888')
  })

  it('does not rebind for an update() echoing its own onValueChange', () => {
    const input = mountInput()
    const params: any = { mask: '999-999', value: '', onValueChange: (v: string) => { params.value = v } }
    action = motherMask(input, params)

    input.value = '123456'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    expect(input.value).toBe('123-456')

    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    action.update({ ...params })
    // No rebind means no listener churn (dispose+rebind would remove/re-add).
    expect(removeEventListener).not.toHaveBeenCalled()
  })

  it('disposes the binding on destroy()', () => {
    const input = mountInput()
    action = motherMask(input, { mask: '999-999', value: '123456' })
    const removeEventListener = vi.spyOn(input, 'removeEventListener')

    action.destroy()
    action = undefined

    expect(removeEventListener).toHaveBeenCalled()
    input.value = 'abcdef'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    expect(input.value).toBe('abcdef')
  })
})

describe('motherMaskDecimal action', () => {
  it('formats the initial value and sets inputmode="decimal"', () => {
    const input = mountInput()
    action = motherMaskDecimal(input, { value: '123456' })
    expect(input.value).toBe('123,456')
    expect(input.getAttribute('inputmode')).toBe('decimal')
  })

  it('calls onValueChange with the formatted value and numeric value', () => {
    const input = mountInput()
    const onValueChange = vi.fn()
    action = motherMaskDecimal(input, { value: '', onValueChange })

    input.value = '123456'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))

    expect(onValueChange).toHaveBeenLastCalledWith('123,456', 123456)
  })

  it('rebinds and reformats when update() changes the options', () => {
    const input = mountInput()
    action = motherMaskDecimal(input, { value: '123456' })
    action.update({ value: '123456', options: { prefix: '$' } })
    expect(input.value).toBe('$123,456')
  })

  it('reformats when update() sets an external value', () => {
    const input = mountInput()
    action = motherMaskDecimal(input, { value: '123456' })
    action.update({ value: '999888' })
    expect(input.value).toBe('999,888')
  })

  it('does not rebind for an update() echoing its own onValueChange', () => {
    const input = mountInput()
    const params: any = { value: '', onValueChange: (v: string) => { params.value = v } }
    action = motherMaskDecimal(input, params)

    input.value = '123456'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    expect(input.value).toBe('123,456')

    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    action.update({ ...params })
    expect(removeEventListener).not.toHaveBeenCalled()
  })

  it('disposes the binding on destroy()', () => {
    const input = mountInput()
    action = motherMaskDecimal(input, { value: '123456' })
    const removeEventListener = vi.spyOn(input, 'removeEventListener')

    action.destroy()
    action = undefined

    expect(removeEventListener).toHaveBeenCalled()
  })
})
