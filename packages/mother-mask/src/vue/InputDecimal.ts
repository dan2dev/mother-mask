import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { PropType } from 'vue'
import { bindDecimal, processDecimal } from 'mother-mask'
import type { BindDecimalOptions } from 'mother-mask'

export type InputDecimalEmits = {
  'update:modelValue': [value: string, numericValue: number]
}

/**
 * Vue wrapper around {@link bindDecimal}. Same lifecycle contract as
 * {@link InputMask}: bind in `onMounted`, dispose in `onBeforeUnmount`/before
 * every rebind. `onMounted` never runs during SSR, so no manual `window`
 * check is required.
 */
export const InputDecimal = defineComponent({
  name: 'InputDecimal',
  inheritAttrs: false,
  props: {
    options: { type: Object as PropType<Omit<BindDecimalOptions, 'onChange'>>, default: undefined },
    modelValue: { type: String, default: undefined },
  },
  emits: ['update:modelValue'],
  setup(props, { attrs, emit, expose }) {
    const inputRef = ref<HTMLInputElement | null>(null)
    let dispose: (() => void) | null = null

    const release = () => {
      dispose?.()
      dispose = null
    }

    const bindInput = () => {
      const input = inputRef.value
      if (!input) return
      release()
      const source = props.modelValue ?? input.value
      const next = processDecimal(source, props.options)
      if (input.value !== next) input.value = next
      dispose = bindDecimal(input, {
        ...props.options,
        onChange: (maskedValue, numericValue) => emit('update:modelValue', maskedValue, numericValue),
      })
    }

    onMounted(bindInput)
    onBeforeUnmount(release)

    watch(
      () => props.options,
      () => bindInput(),
    )

    watch(
      () => props.modelValue,
      (value) => {
        const input = inputRef.value
        if (!input || value === undefined || value === input.value) return
        const next = processDecimal(value, props.options)
        if (next === input.value) return
        bindInput()
      },
    )

    expose({ inputRef })

    return () => h('input', { inputmode: 'decimal', ...attrs, ref: inputRef, type: 'text' })
  },
})

export default InputDecimal
