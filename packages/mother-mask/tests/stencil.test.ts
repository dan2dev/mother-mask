import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { StencilMaskInputElement } from '../stencil-src/types/stencil-mask-input'
import type { StencilMaskDecimalElement } from '../stencil-src/types/stencil-mask-decimal'

// These tests exercise the *built* dist-custom-elements output (not the raw
// .tsx source, which `@stencil/core` decorators cannot run outside the
// Stencil compiler) — run `bun run build` first if `dist/stencil` is
// missing or stale.

let host: HTMLElement | undefined

beforeAll(async () => {
  await import('../dist/stencil/stencil-mask-input.js')
  await import('../dist/stencil/stencil-mask-decimal.js')
})

afterEach(() => {
  host?.remove()
  host = undefined
  vi.restoreAllMocks()
})

it('registers both custom elements as an import side effect', () => {
  expect(customElements.get('stencil-mask-input')).toBeDefined()
  expect(customElements.get('stencil-mask-decimal')).toBeDefined()
})

describe('<stencil-mask-input>', () => {
  async function mount(props: Partial<StencilMaskInputElement> = {}): Promise<StencilMaskInputElement> {
    const el = document.createElement('stencil-mask-input') as StencilMaskInputElement
    Object.assign(el, { mask: '999-999', ...props })
    document.body.append(el)
    host = el
    // Stencil renders asynchronously (a microtask/rAF-scheduled update);
    // wait for the input to actually exist before returning.
    await vi.waitFor(() => {
      if (!el.querySelector('input')) throw new Error('not rendered yet')
    })
    return el
  }

  it('formats the initial value once rendered', async () => {
    const el = await mount({ value: '123456' })
    await vi.waitFor(() => {
      expect(el.querySelector('input')!.value).toBe('123-456')
    })
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
    await vi.waitFor(() => {
      expect(el.querySelector('input')!.value).toBe('12/34/56')
    })
  })

  it('reformats when the value property is set externally', async () => {
    const el = await mount({ value: '123456' })
    el.value = '999888'
    await vi.waitFor(() => {
      expect(el.querySelector('input')!.value).toBe('999-888')
    })
  })

  it('moves a host id onto the rendered input so <label for> still resolves to it', async () => {
    const el = document.createElement('stencil-mask-input') as StencilMaskInputElement
    el.id = 'phone'
    el.mask = '999-999'
    document.body.append(el)
    host = el
    await vi.waitFor(() => {
      if (!el.querySelector('input')) throw new Error('not rendered yet')
    })

    expect(el.hasAttribute('id')).toBe(false)
    const input = el.querySelector('input')!
    expect(input.id).toBe('phone')
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

describe('<stencil-mask-decimal>', () => {
  async function mount(props: Partial<StencilMaskDecimalElement> = {}): Promise<StencilMaskDecimalElement> {
    const el = document.createElement('stencil-mask-decimal') as StencilMaskDecimalElement
    Object.assign(el, props)
    document.body.append(el)
    host = el
    await vi.waitFor(() => {
      if (!el.querySelector('input')) throw new Error('not rendered yet')
    })
    return el
  }

  it('formats the initial value and sets inputmode="decimal"', async () => {
    const el = await mount({ value: '123456' })
    await vi.waitFor(() => {
      expect(el.querySelector('input')!.value).toBe('123,456')
    })
    expect(el.querySelector('input')!.getAttribute('inputmode')).toBe('decimal')
  })

  it('emits value-change and numeric-value-change when the user types', async () => {
    const el = await mount()
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
    const el = await mount({ value: '123456' })
    el.options = { prefix: '$' }
    await vi.waitFor(() => {
      expect(el.querySelector('input')!.value).toBe('$123,456')
    })
  })

  it('disposes the binding on disconnectedCallback', async () => {
    const el = await mount({ value: '123456' })
    const input = el.querySelector('input')!
    const removeEventListener = vi.spyOn(input, 'removeEventListener')

    el.remove()
    host = undefined

    expect(removeEventListener).toHaveBeenCalled()
  })
})
