import { bind, process } from 'mother-mask'
import type { BindOptions, MaskPattern } from 'mother-mask'
import type { RiotPureComponent } from 'riot'

export interface MaskInputProps {
  mask: MaskPattern
  options?: Omit<BindOptions, 'onChange'>
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  name?: string
  placeholder?: string
  inputMode?: string
  autocomplete?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
}

const PASSTHROUGH_ATTRS = ['name', 'placeholder', 'inputMode', 'autocomplete'] as const
const PASSTHROUGH_BOOL_ATTRS = ['disabled', 'readonly', 'required'] as const

/**
 * A Riot "pure component" factory wrapping {@link bind} —
 * `riot.pure(maskInput)`. Pure components are Riot's own documented
 * escape hatch for mounting non-Riot-templated content (third-party
 * libraries, plain DOM) as a node in a Riot component tree, bypassing the
 * usual `.riot`-file/compiler pipeline entirely — a real fit here, since
 * this wrapper's only job is to own one plain `<input>` imperatively,
 * exactly like every other framework entry in this package.
 *
 * `riot.pure`'s own lifecycle names — `mount`/`update`/`unmount` — serve
 * the same purpose as `onMounted`/`onUnmounted` in a full `.riot` component
 * (both fire only once the host element is actually in a live document),
 * with one difference: `update()` isn't automatically re-invoked by
 * reactive tracking the way a full component's `onUpdated` is. A parent
 * component must call this component's own `update(props)` explicitly
 * (from its own `onUpdated`, or right after changing props) to reformat
 * for new `mask`/`options`/`value` — see the README for the exact pattern.
 * `unmount` fires when Riot's own component tree removes this node (a
 * parent's `unmount()`, or a conditional/list update dropping it), and
 * whenever a real Riot app calls it during server-side work: Riot has no
 * built-in SSR renderer of its own, so in practice this only ever runs on
 * the client — no `typeof window` guard is needed regardless.
 *
 * Renders into light DOM: the `<input>` is appended as a real child of the
 * host element Riot mounts this component onto, so a page's own
 * `<label for>` and global CSS reach it directly, the same as this
 * package's Lit/Stencil/Web Components entries. A host `id` is moved onto
 * the `<input>` once, right after mounting, for the same reason those
 * entries do it.
 */
export function maskInput({ props }: { props?: MaskInputProps }): RiotPureComponent<MaskInputProps> {
  const inputEl = document.createElement('input')
  inputEl.type = 'text'

  let dispose: (() => void) | null = null
  let lastEmitted: string | null = null
  let lastMask: MaskPattern | undefined
  let lastOptions: Omit<BindOptions, 'onChange'> | undefined

  const release = () => {
    dispose?.()
    dispose = null
  }

  const sync = (current: MaskInputProps) => {
    const { mask, options, value, defaultValue, onValueChange } = current

    for (const attr of PASSTHROUGH_ATTRS) {
      const attrValue = current[attr]
      if (typeof attrValue === 'string') inputEl.setAttribute(attr === 'inputMode' ? 'inputmode' : attr, attrValue)
    }
    for (const attr of PASSTHROUGH_BOOL_ATTRS) {
      if (current[attr]) inputEl.setAttribute(attr, '')
      else inputEl.removeAttribute(attr)
    }

    const maskChanged = mask !== lastMask
    const optionsChanged = options !== lastOptions
    // An echo of our own onValueChange shows up as a re-sync with an
    // unchanged mask/options and a value we just emitted — leave the live
    // binding and its editing state alone.
    if (!maskChanged && !optionsChanged && value === lastEmitted) return

    release()
    const next = process(value ?? defaultValue ?? inputEl.value, mask, options)
    if (inputEl.value !== next) inputEl.value = next

    dispose = bind(inputEl, mask, {
      ...options,
      onChange: (maskedValue) => {
        lastEmitted = maskedValue
        onValueChange?.(maskedValue)
      },
    })
    lastMask = mask
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
      sync({ ...props, ...context } as MaskInputProps)
    },
    update(context) {
      sync({ ...props, ...context } as MaskInputProps)
    },
    unmount(keepRootElement) {
      release()
      if (!keepRootElement) inputEl.remove()
    },
  }
}
