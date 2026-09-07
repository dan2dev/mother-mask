import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { PropType } from 'vue'
import { bind, process } from 'mother-mask'
import type { BindOptions, MaskPattern } from 'mother-mask'

export type InputMaskEmits = {
  'update:modelValue': [value: string]
}

/**
 * Vue wrapper around {@link bind}. Binds on `onMounted` (a client-only
 * lifecycle hook — it never runs during SSR, so this component is safe to
 * render on the server) and disposes on `onUnmounted`/before a rebind.
 */
export const InputMask = defineComponent({
  name: 'InputMask',
  inheritAttrs: false,
  props: {
    mask: { type: [String, Array, Object, Function] as PropType<MaskPattern>, required: true },
    options: { type: Object as PropType<Omit<BindOptions, 'onChange'>>, default: undefined },
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
      const next = process(source, props.mask, props.options)
      if (input.value !== next) input.value = next
      dispose = bind(input, props.mask, {
        ...props.options,
        onChange: (maskedValue) => emit('update:modelValue', maskedValue),
      })
    }

    // Runs client-side only; a no-op during SSR, so no `typeof window` guard
    // is needed here — the component never touches the DOM off the client.
    onMounted(bindInput)
    onBeforeUnmount(release)

    // Mask/options changes need a fresh binding (handlers close over them).
    watch(
      () => [props.mask, props.options],
      () => bindInput(),
    )

    // An external `modelValue` update (v-model) reformats and rebinds so the
    // mask's internal edit history restarts from the new value.
    watch(
      () => props.modelValue,
      (value) => {
        const input = inputRef.value
        if (!input || value === undefined || value === input.value) return
        const next = process(value, props.mask, props.options)
        if (next === input.value) return
        bindInput()
      },
    )

    expose({ inputRef })

    return () => h('input', { ...attrs, ref: inputRef, type: 'text' })
  },
})

export default InputMask
