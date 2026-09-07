import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import * as core from '../src/index'
import * as vueApi from '../src/vue/index'
import { InputDecimal, InputMask } from '../src/vue/index'

let wrapper: ReturnType<typeof mount> | undefined

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  vi.restoreAllMocks()
})

it('aliases every core export without exposing Vue components from core', () => {
  for (const name of Object.keys(core) as Array<keyof typeof core>) {
    expect(vueApi[name]).toBe(core[name])
  }
  expect(core).not.toHaveProperty('InputMask')
  expect(core).not.toHaveProperty('InputDecimal')
})

describe('InputMask', () => {
  it('formats the initial modelValue on mount', () => {
    wrapper = mount(InputMask, { props: { mask: '999-999', modelValue: '123456' } })
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('123-456')
  })

  it('emits update:modelValue when the user types', async () => {
    wrapper = mount(InputMask, { props: { mask: '999-999', modelValue: '' } })
    const input = wrapper.find('input').element as HTMLInputElement
    input.value = '123456'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['123-456'])
  })

  it('rebinds when the mask changes and reformats the current value', async () => {
    wrapper = mount(InputMask, { props: { mask: '999-999', modelValue: '123456' } })
    await wrapper.setProps({ mask: '99/99/99' })
    await nextTick()
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('12/34/56')
  })

  it('reformats when modelValue is set externally without a mask change', async () => {
    wrapper = mount(InputMask, { props: { mask: '999-999', modelValue: '123456' } })
    await wrapper.setProps({ modelValue: '999888' })
    await nextTick()
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('999-888')
  })

  it('does not rebind for a modelValue update that echoes the current input value', async () => {
    wrapper = mount(InputMask, { props: { mask: '999-999', modelValue: '' } })
    const input = wrapper.find('input').element as HTMLInputElement
    input.value = '123456'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    await nextTick()
    expect(input.value).toBe('123-456')

    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    await wrapper.setProps({ modelValue: '123-456' })
    await nextTick()
    // No rebind means no listener churn (dispose+rebind would remove/re-add).
    expect(removeEventListener).not.toHaveBeenCalled()
  })

  it('does not rebind when a modelValue update formats to the current input value', async () => {
    wrapper = mount(InputMask, { props: { mask: '999-999', modelValue: '999-888' } })
    const input = wrapper.find('input').element as HTMLInputElement
    expect(input.value).toBe('999-888')

    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    // Textually differs from input.value ('999888' vs '999-888'), but
    // formats to the same string.
    await wrapper.setProps({ modelValue: '999888' })
    await nextTick()
    expect(removeEventListener).not.toHaveBeenCalled()
  })

  it('disposes the binding on unmount so no listeners remain', () => {
    wrapper = mount(InputMask, { props: { mask: '999-999', modelValue: '123456' } })
    const input = wrapper.find('input').element as HTMLInputElement
    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    wrapper.unmount()
    expect(removeEventListener).toHaveBeenCalled()
    // A disposed input is no longer tracked as bound, so re-binding elsewhere
    // (or leaking a listener) would show up as a second bind taking effect.
    input.value = 'abcdef'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    expect(input.value).toBe('abcdef')
  })

  it('exposes the underlying input element ref', () => {
    const Harness = defineComponent({
      setup() {
        const maskRef = ref<InstanceType<typeof InputMask> | null>(null)
        return () => h('div', [h(InputMask, { ref: maskRef, mask: '999-999', modelValue: '1' })])
      },
    })
    wrapper = mount(Harness)
    expect(wrapper.find('input').exists()).toBe(true)
  })
})

describe('InputDecimal', () => {
  it('formats the initial modelValue on mount', () => {
    wrapper = mount(InputDecimal, { props: { modelValue: '123456' } })
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('123,456')
  })

  it('emits update:modelValue with the formatted value and numeric value', async () => {
    wrapper = mount(InputDecimal, { props: { modelValue: '' } })
    const input = wrapper.find('input').element as HTMLInputElement
    input.value = '123456'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['123,456', 123456])
  })

  it('sets inputmode="decimal" on the native input', () => {
    wrapper = mount(InputDecimal, { props: { modelValue: '' } })
    expect(wrapper.find('input').attributes('inputmode')).toBe('decimal')
  })

  it('rebinds when options change', async () => {
    wrapper = mount(InputDecimal, { props: { modelValue: '123456' } })
    await wrapper.setProps({ options: { prefix: '$' } })
    await nextTick()
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('$123,456')
  })

  it('reformats when modelValue is set externally', async () => {
    wrapper = mount(InputDecimal, { props: { modelValue: '123456' } })
    await wrapper.setProps({ modelValue: '999888' })
    await nextTick()
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('999,888')
  })

  it('does not rebind for a modelValue update that echoes the current input value', async () => {
    wrapper = mount(InputDecimal, { props: { modelValue: '' } })
    const input = wrapper.find('input').element as HTMLInputElement
    input.value = '123456'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    await nextTick()
    expect(input.value).toBe('123,456')

    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    await wrapper.setProps({ modelValue: '123,456' })
    await nextTick()
    expect(removeEventListener).not.toHaveBeenCalled()
  })

  it('does not rebind when a modelValue update formats to the current input value', async () => {
    wrapper = mount(InputDecimal, { props: { modelValue: '999,888' } })
    const input = wrapper.find('input').element as HTMLInputElement
    expect(input.value).toBe('999,888')

    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    // Textually differs from input.value ('999888' vs '999,888'), but
    // formats to the same string.
    await wrapper.setProps({ modelValue: '999888' })
    await nextTick()
    expect(removeEventListener).not.toHaveBeenCalled()
  })

  it('disposes the binding on unmount', () => {
    wrapper = mount(InputDecimal, { props: { modelValue: '123456' } })
    const input = wrapper.find('input').element as HTMLInputElement
    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    wrapper.unmount()
    expect(removeEventListener).toHaveBeenCalled()
  })
})
