import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot, createSignal } from 'solid-js'
import * as core from '../src/index'
import * as solidApi from '../src/solid/index'
import { motherMask } from '../src/solid/mask-directive'
import { motherMaskDecimal } from '../src/solid/decimal-directive'

let host: HTMLInputElement | undefined
let disposeRoot: (() => void) | undefined

afterEach(() => {
  disposeRoot?.()
  disposeRoot = undefined
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

// Solid batches an effect's (re)run onto a microtask, even its first run
// inside a bare `createRoot` (no `render()` wrapper doing a synchronous
// initial flush) — flush that queue before asserting on its side effects.
const flush = () => Promise.resolve()

it('aliases every core export without exposing Solid directives from core', () => {
  for (const name of Object.keys(core) as Array<keyof typeof core>) {
    expect(solidApi[name]).toBe(core[name])
  }
  expect(core).not.toHaveProperty('motherMask')
  expect(core).not.toHaveProperty('motherMaskDecimal')
})

describe('motherMask directive', () => {
  it('formats the initial value on mount', async () => {
    const input = mountInput()
    createRoot((d) => {
      disposeRoot = d
      motherMask(input, () => ({ mask: '999-999', value: '123456' }))
    })
    await flush()
    expect(input.value).toBe('123-456')
  })

  it('calls onValueChange when the user types', async () => {
    const input = mountInput()
    const onValueChange = vi.fn()
    createRoot((d) => {
      disposeRoot = d
      motherMask(input, () => ({ mask: '999-999', value: '', onValueChange }))
    })
    await flush()

    input.value = '123456'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))

    expect(onValueChange).toHaveBeenLastCalledWith('123-456')
  })

  it('rebinds and reformats when the tracked signal changes the mask', async () => {
    const input = mountInput()
    const [mask, setMask] = createSignal('999-999')
    createRoot((d) => {
      disposeRoot = d
      motherMask(input, () => ({ mask: mask(), value: '123456' }))
    })
    await flush()
    setMask('99/99/99')
    await flush()
    expect(input.value).toBe('12/34/56')
  })

  it('reformats when the tracked value signal changes externally', async () => {
    const input = mountInput()
    const [value, setValue] = createSignal('123456')
    createRoot((d) => {
      disposeRoot = d
      motherMask(input, () => ({ mask: '999-999', value: value() }))
    })
    await flush()
    setValue('999888')
    await flush()
    expect(input.value).toBe('999-888')
  })

  it('rebinds when the tracked options signal changes', async () => {
    const input = mountInput()
    const [options, setOptions] = createSignal<{ eager?: boolean }>({})
    createRoot((d) => {
      disposeRoot = d
      motherMask(input, () => ({ mask: '999-999', options: options(), value: '123456' }))
    })
    await flush()
    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    setOptions({ eager: true })
    await flush()
    expect(removeEventListener).toHaveBeenCalled()
  })

  it('does not rebind for an accessor rerun echoing its own onValueChange', async () => {
    const input = mountInput()
    const [value, setValue] = createSignal('')
    createRoot((d) => {
      disposeRoot = d
      motherMask(input, () => ({ mask: '999-999', value: value(), onValueChange: setValue }))
    })
    await flush()

    input.value = '123456'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    await flush()
    expect(input.value).toBe('123-456')

    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    await flush()
    expect(removeEventListener).not.toHaveBeenCalled()
  })

  it('works without an onValueChange callback', async () => {
    const input = mountInput()
    createRoot((d) => {
      disposeRoot = d
      motherMask(input, () => ({ mask: '999-999', value: '' }))
    })
    await flush()
    input.value = '123456'
    expect(() =>
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' })),
    ).not.toThrow()
    expect(input.value).toBe('123-456')
  })

  it('disposes the binding when the reactive root is disposed', async () => {
    const input = mountInput()
    createRoot((d) => {
      disposeRoot = d
      motherMask(input, () => ({ mask: '999-999', value: '123456' }))
    })
    await flush()
    const removeEventListener = vi.spyOn(input, 'removeEventListener')

    disposeRoot?.()
    disposeRoot = undefined

    expect(removeEventListener).toHaveBeenCalled()
    input.value = 'abcdef'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    expect(input.value).toBe('abcdef')
  })
})

describe('motherMaskDecimal directive', () => {
  it('formats the initial value and sets inputmode="decimal"', async () => {
    const input = mountInput()
    createRoot((d) => {
      disposeRoot = d
      motherMaskDecimal(input, () => ({ value: '123456' }))
    })
    await flush()
    expect(input.value).toBe('123,456')
    expect(input.getAttribute('inputmode')).toBe('decimal')
  })

  it('calls onValueChange with the formatted value and numeric value', async () => {
    const input = mountInput()
    const onValueChange = vi.fn()
    createRoot((d) => {
      disposeRoot = d
      motherMaskDecimal(input, () => ({ value: '', onValueChange }))
    })
    await flush()

    input.value = '123456'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))

    expect(onValueChange).toHaveBeenLastCalledWith('123,456', 123456)
  })

  it('rebinds and reformats when the tracked options signal changes', async () => {
    const input = mountInput()
    const [options, setOptions] = createSignal<{ prefix?: string }>({})
    createRoot((d) => {
      disposeRoot = d
      motherMaskDecimal(input, () => ({ options: options(), value: '123456' }))
    })
    await flush()
    setOptions({ prefix: '$' })
    await flush()
    expect(input.value).toBe('$123,456')
  })

  it('reformats when the tracked value signal changes externally', async () => {
    const input = mountInput()
    const [value, setValue] = createSignal('123456')
    createRoot((d) => {
      disposeRoot = d
      motherMaskDecimal(input, () => ({ value: value() }))
    })
    await flush()
    setValue('999888')
    await flush()
    expect(input.value).toBe('999,888')
  })

  it('does not rebind for an accessor rerun echoing its own onValueChange', async () => {
    const input = mountInput()
    const [value, setValue] = createSignal('')
    createRoot((d) => {
      disposeRoot = d
      motherMaskDecimal(input, () => ({ value: value(), onValueChange: setValue }))
    })
    await flush()

    input.value = '123456'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    await flush()
    expect(input.value).toBe('123,456')

    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    await flush()
    expect(removeEventListener).not.toHaveBeenCalled()
  })

  it('disposes the binding when the reactive root is disposed', async () => {
    const input = mountInput()
    createRoot((d) => {
      disposeRoot = d
      motherMaskDecimal(input, () => ({ value: '123456' }))
    })
    await flush()
    const removeEventListener = vi.spyOn(input, 'removeEventListener')

    disposeRoot?.()
    disposeRoot = undefined

    expect(removeEventListener).toHaveBeenCalled()
  })
})
