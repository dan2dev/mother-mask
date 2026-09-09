import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, reactive, withDirectives } from 'vue'
import type { Directive } from 'vue'
import * as core from '../src/index'
import * as vueApi from '../src/vue/index'
import { vMotherMask } from '../src/vue/mask-directive'
import type { MaskDirectiveParams } from '../src/vue/mask-directive'
import { vMotherMaskDecimal } from '../src/vue/decimal-directive'
import type { DecimalDirectiveParams } from '../src/vue/decimal-directive'

let container: HTMLDivElement | undefined
let app: ReturnType<typeof createApp> | undefined

afterEach(() => {
  app?.unmount()
  app = undefined
  container?.remove()
  container = undefined
  vi.restoreAllMocks()
})

/**
 * Mounts a single `<input>` bound to `directive` via `withDirectives` — the
 * runtime helper the template compiler itself expands `v-mother-mask="..."`
 * into — since these tests build vnodes directly with no SFC compile step.
 * `params` is expected to already be reactive (built with `reactive()`):
 * mutating one of its properties re-renders the root, which re-spreads
 * `params` into a fresh object and patches the same `<input>`, running the
 * directive's `updated` hook exactly as a template re-render would.
 */
function mount<P extends object>(directive: Directive<HTMLInputElement, P>, params: P): HTMLInputElement {
  container = document.createElement('div')
  document.body.append(container)
  app = createApp({
    render: () => withDirectives(h('input'), [[directive, { ...params }]]),
  })
  app.mount(container)
  return container.querySelector('input') as HTMLInputElement
}

it('aliases every core export without exposing Vue directives from core', () => {
  for (const name of Object.keys(core) as Array<keyof typeof core>) {
    expect(vueApi[name]).toBe(core[name])
  }
  expect(core).not.toHaveProperty('vMotherMask')
  expect(core).not.toHaveProperty('vMotherMaskDecimal')
})

describe('vMotherMask directive', () => {
  it('formats the initial value on mount', () => {
    const input = mount(vMotherMask, reactive<MaskDirectiveParams>({ mask: '999-999', value: '123456' }))
    expect(input.value).toBe('123-456')
  })

  it('calls onValueChange when the user types', () => {
    const onValueChange = vi.fn()
    const input = mount(vMotherMask, reactive<MaskDirectiveParams>({ mask: '999-999', value: '', onValueChange }))

    input.value = '123456'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))

    expect(onValueChange).toHaveBeenLastCalledWith('123-456')
  })

  it('works without an onValueChange callback', () => {
    const input = mount(vMotherMask, reactive<MaskDirectiveParams>({ mask: '999-999', value: '' }))
    input.value = '123456'
    expect(() =>
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' })),
    ).not.toThrow()
    expect(input.value).toBe('123-456')
  })

  it('rebinds and reformats when the mask changes', async () => {
    const params = reactive<MaskDirectiveParams>({ mask: '999-999', value: '123456' })
    const input = mount(vMotherMask, params)
    params.mask = '99/99/99'
    await nextTick()
    expect(input.value).toBe('12/34/56')
  })

  it('reformats when value is set externally', async () => {
    const params = reactive<MaskDirectiveParams>({ mask: '999-999', value: '123456' })
    const input = mount(vMotherMask, params)
    params.value = '999888'
    await nextTick()
    expect(input.value).toBe('999-888')
  })

  it('rebinds when options change', async () => {
    const params = reactive<MaskDirectiveParams>({ mask: '999-999', value: '123456', options: {} })
    const input = mount(vMotherMask, params)
    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    params.options = { eager: true }
    await nextTick()
    expect(removeEventListener).toHaveBeenCalled()
  })

  it('does not rebind for an update echoing its own onValueChange', async () => {
    let params!: MaskDirectiveParams
    params = reactive({
      mask: '999-999',
      value: '',
      onValueChange: (v: string) => { params.value = v },
    })
    const input = mount(vMotherMask, params)

    input.value = '123456'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    await nextTick()
    expect(input.value).toBe('123-456')

    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    await nextTick()
    expect(removeEventListener).not.toHaveBeenCalled()
  })

  it('disposes the binding on unmount so no listeners remain', () => {
    const input = mount(vMotherMask, reactive<MaskDirectiveParams>({ mask: '999-999', value: '123456' }))
    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    app?.unmount()
    expect(removeEventListener).toHaveBeenCalled()
    // A disposed input is no longer tracked as bound, so re-binding elsewhere
    // (or leaking a listener) would show up as a second bind taking effect.
    input.value = 'abcdef'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    expect(input.value).toBe('abcdef')
  })
})

describe('vMotherMaskDecimal directive', () => {
  it('formats the initial value and sets inputmode="decimal"', () => {
    const input = mount(vMotherMaskDecimal, reactive<DecimalDirectiveParams>({ value: '123456' }))
    expect(input.value).toBe('123,456')
    expect(input.getAttribute('inputmode')).toBe('decimal')
  })

  it('calls onValueChange with the formatted value and numeric value', () => {
    const onValueChange = vi.fn()
    const input = mount(vMotherMaskDecimal, reactive<DecimalDirectiveParams>({ value: '', onValueChange }))

    input.value = '123456'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))

    expect(onValueChange).toHaveBeenLastCalledWith('123,456', 123456)
  })

  it('rebinds and reformats when options change', async () => {
    const params = reactive<DecimalDirectiveParams>({ value: '123456' })
    const input = mount(vMotherMaskDecimal, params)
    params.options = { prefix: '$' }
    await nextTick()
    expect(input.value).toBe('$123,456')
  })

  it('reformats when value is set externally', async () => {
    const params = reactive<DecimalDirectiveParams>({ value: '123456' })
    const input = mount(vMotherMaskDecimal, params)
    params.value = '999888'
    await nextTick()
    expect(input.value).toBe('999,888')
  })

  it('does not rebind for an update echoing its own onValueChange', async () => {
    let params!: DecimalDirectiveParams
    params = reactive({
      value: '',
      onValueChange: (v: string) => { params.value = v },
    })
    const input = mount(vMotherMaskDecimal, params)

    input.value = '123456'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    await nextTick()
    expect(input.value).toBe('123,456')

    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    await nextTick()
    expect(removeEventListener).not.toHaveBeenCalled()
  })

  it('disposes the binding on unmount', () => {
    const input = mount(vMotherMaskDecimal, reactive<DecimalDirectiveParams>({ value: '123456' }))
    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    app?.unmount()
    expect(removeEventListener).toHaveBeenCalled()
  })
})
