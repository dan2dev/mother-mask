import { bindDecimal, processDecimal } from 'mother-mask'
import type { BindDecimalOptions } from 'mother-mask'
import type { RiotPureComponent } from 'riot'

export interface MaskDecimalProps {
  options?: Omit<BindDecimalOptions, 'onChange'>
  value?: string
  defaultValue?: string
  onValueChange?: (value: string, numericValue: number) => void
  name?: string
  placeholder?: string
  autocomplete?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
}

const PASSTHROUGH_ATTRS = ['name', 'placeholder', 'autocomplete'] as const
const PASSTHROUGH_BOOL_ATTRS = ['disabled', 'readonly', 'required'] as const

/**
 * A Riot pure-component factory wrapping {@link bindDecimal} — see
 * {@link maskInput} in `./mask-input.ts` for the full lifecycle and
 * light-DOM notes. Always sets `inputmode="decimal"`.
 */
export function maskDecimal({ props }: { props?: MaskDecimalProps }): RiotPureComponent<MaskDecimalProps> {
  const inputEl = document.createElement('input')
  inputEl.type = 'text'
  inputEl.inputMode = 'decimal'

  let dispose: (() => void) | null = null
  let lastEmitted: string | null = null
  let lastOptions: Omit<BindDecimalOptions, 'onChange'> | undefined

  const release = () => {
    dispose?.()
    dispose = null
  }

  const sync = (current: MaskDecimalProps) => {
    const { options, value, defaultValue, onValueChange } = current

    for (const attr of PASSTHROUGH_ATTRS) {
      const attrValue = current[attr]
      if (typeof attrValue === 'string') inputEl.setAttribute(attr, attrValue)
    }
    for (const attr of PASSTHROUGH_BOOL_ATTRS) {
      if (current[attr]) inputEl.setAttribute(attr, '')
      else inputEl.removeAttribute(attr)
    }

    const optionsChanged = options !== lastOptions
    if (!optionsChanged && value === lastEmitted) return

    release()
    const next = processDecimal(value ?? defaultValue ?? inputEl.value, options)
    if (inputEl.value !== next) inputEl.value = next

    dispose = bindDecimal(inputEl, {
      ...options,
      onChange: (maskedValue, numericValue) => {
        lastEmitted = maskedValue
        onValueChange?.(maskedValue, numericValue)
      },
    })
    lastOptions = options
    lastEmitted = value ?? lastEmitted
  }

  return {
    mount(element, context) {
      const host = element as HTMLElement
      host.append(inputEl)
      if (host.id) {
        inputEl.id = host.id
        host.removeAttribute('id')
      }
      sync({ ...props, ...context } as MaskDecimalProps)
    },
    update(context) {
      sync({ ...props, ...context } as MaskDecimalProps)
    },
    unmount(keepRootElement) {
      release()
      if (!keepRootElement) inputEl.remove()
    },
  }
}
