import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Activity, StrictMode, act, createRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import type { Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import * as core from '../src/index'
import * as reactApi from '../src/react/index'
import { InputDecimal, InputMask } from '../src/react/index'
import type { InputDecimalProps } from '../src/react/index'
import type { BindOptions, BindDecimalOptions, MaskPattern } from '../src/index'

type Props = Omit<InputDecimalProps, 'onValueChange' | 'options'> & {
  mask?: MaskPattern
  options?: Omit<BindOptions & BindDecimalOptions, 'onChange'>
  onValueChange?: (value: string, numeric?: number) => void
}

const cases = [
  {
    name: 'InputMask',
    field: (props: Props) => <InputMask {...props} mask={props.mask ?? '999-999'} />,
    formatted: '123-456',
    updated: '654-321',
    reconfigured: '12/34/56',
  },
  {
    name: 'InputDecimal',
    field: (props: Props) => <InputDecimal {...props} />,
    formatted: '123,456',
    updated: '654,321',
    reconfigured: '123456',
  },
]

let root: Root
let host: HTMLDivElement
let frames: Map<number, FrameRequestCallback>
let frameId = 0

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  frames = new Map()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback)
    return frameId
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id) })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function render(children: ReactNode) {
  act(() => root.render(<StrictMode>{children}</StrictMode>))
  return host.querySelector('input')!
}

function edit(input: HTMLInputElement, value: string) {
  act(() => {
    input.value = value
    input.setSelectionRange(value.length, value.length)
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
  })
}

it('aliases every core export without exposing React components from core', () => {
  for (const name of Object.keys(core) as Array<keyof typeof core>) {
    expect(reactApi[name]).toBe(core[name])
  }
  expect(core).not.toHaveProperty('InputMask')
  expect(core).not.toHaveProperty('InputDecimal')
})

for (const { name, field, formatted, updated, reconfigured } of cases) {
  describe(name, () => {
    it('formats an uncontrolled default once and forwards native props and refs', () => {
      const ref = createRef<HTMLInputElement>()
      const onBlur = vi.fn()
      const callback = vi.fn()
      const props = { ref, defaultValue: '123456', name: 'amount', required: true, autoComplete: 'on', 'aria-label': 'Amount', onBlur, onValueChange: callback }
      const input = render(field(props))
      expect(input.value).toBe(formatted)
      expect(ref.current).toBe(input)
      expect(input.name).toBe('amount')
      expect(input.required).toBe(true)
      expect(input.autocomplete).toBe('on')
      expect(input.getAttribute('aria-label')).toBe('Amount')
      expect(input.type).toBe('text')
      act(() => { ref.current?.focus(); ref.current?.blur() })
      expect(onBlur).toHaveBeenCalledOnce()
      render(field({ ...props, defaultValue: '654321' }))
      expect(input.value).toBe(formatted)
      expect(callback).not.toHaveBeenCalled()
      edit(input, '42')
      expect(callback.mock.calls.at(-1)?.[0]).toBe('42')
    })

    it('supports controlled edits without rewriting the echoed value or rebinding', () => {
      function Parent() {
        const [value, setValue] = useState('')
        return field({ value, onValueChange: setValue })
      }
      const input = render(<Parent />)
      const add = vi.spyOn(input, 'addEventListener')
      edit(input, '123456')
      expect(input.value).toBe(formatted)
      input.setSelectionRange(1, 1)
      render(<Parent />)
      expect(input.selectionStart).toBe(1)
      expect(add).not.toHaveBeenCalled()
    })

    it('restores a rejected edit even when the parent does not render', () => {
      const callback = vi.fn()
      const input = render(field({ value: '123456', onValueChange: callback }))
      edit(input, '42')
      expect(callback.mock.calls[0]?.[0]).toBe('42')
      expect(input.value).toBe(formatted)
    })

    it('updates and clears externally without firing a change callback', () => {
      const callback = vi.fn()
      const input = render(field({ value: '123456', onValueChange: callback }))
      render(field({ value: '654321', onValueChange: callback }))
      expect(input.value).toBe(updated)
      render(field({ value: '', onValueChange: callback }))
      expect(input.value).toBe('')
      expect(callback).not.toHaveBeenCalled()
    })

    it('uses the latest callback without reattaching listeners', () => {
      const first = vi.fn()
      const latest = vi.fn()
      const input = render(field({ onValueChange: first }))
      const add = vi.spyOn(input, 'addEventListener')
      render(field({ onValueChange: latest }))
      edit(input, '42')
      expect(first).not.toHaveBeenCalled()
      expect(latest).toHaveBeenCalledOnce()
      expect(add).not.toHaveBeenCalled()
    })

    it('replaces a binding when the configuration changes', () => {
      const input = render(field({ defaultValue: '123456' }))
      const remove = vi.spyOn(input, 'removeEventListener')
      render(field({ mask: '99/99/99', options: { segmented: false } }))
      expect(input.value).toBe(reconfigured)
      expect(remove).toHaveBeenCalledTimes(5)
      edit(input, '42')
      expect(input.value).toBe('42' + (name === 'InputMask' ? '/' : ''))
    })

    it('detaches listeners, cancels queued frames, and clears refs on unmount', () => {
      const ref = createRef<HTMLInputElement>()
      const callback = vi.fn()
      const input = render(field({ ref, onValueChange: callback }))
      const remove = vi.spyOn(input, 'removeEventListener')
      act(() => {
        input.dispatchEvent(new Event('paste', { bubbles: true }))
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
      })
      expect(frames.size).toBeGreaterThan(0)
      render(null)
      expect(remove).toHaveBeenCalledTimes(7)
      expect(frames.size).toBe(0)
      expect(ref.current).toBeNull()
      expect(input.hasAttribute('data-masked')).toBe(false)
      expect(input.hasAttribute('autocomplete')).toBe(false)
      edit(input, '123456')
      expect(input.value).toBe('123456')
      expect(callback).not.toHaveBeenCalled()
    })

    it('cancels pending work on external changes and supports missing callbacks', () => {
      const input = render(field({ value: '123456' }))
      act(() => input.dispatchEvent(new Event('paste', { bubbles: true })))
      expect(frames.size).toBeGreaterThan(0)
      render(field({ value: '654321' }))
      expect(frames.size).toBe(0)
      edit(input, '42')
      expect(input.value).toBe(updated)
      render(field({}))
      edit(input, '42')
      expect(input.value).toBe('42')
    })

    it('cleans up and reattaches when Activity hides and restores the field', () => {
      const ref = createRef<HTMLInputElement>()
      const callback = vi.fn()
      const input = render(<Activity mode="visible">{field({ ref, onValueChange: callback })}</Activity>)
      render(<Activity mode="hidden">{field({ ref, onValueChange: callback })}</Activity>)
      expect(input.hasAttribute('data-masked')).toBe(false)
      expect(ref.current).toBeNull()
      render(<Activity mode="visible">{field({ ref, onValueChange: callback })}</Activity>)
      expect(input.hasAttribute('data-masked')).toBe(true)
      expect(ref.current).toBe(input)
      edit(input, '42')
      expect(callback).toHaveBeenCalledOnce()
    })

    it('renders the initial value on the server without binding DOM listeners', () => {
      const html = renderToString(field({ defaultValue: '123456' }))
      expect(html).toContain(`value="${formatted}"`)
      expect(html).not.toContain('data-masked')
    })

    it('preserves an IME draft across unrelated controlled renders', () => {
      const options = name === 'InputMask' ? { tokens: { U: { match: /\p{L}/u } } } : undefined
      const draft = name === 'InputMask' ? 'に' : '12.'
      function Parent({ label }: { label: string }) {
        const [value, setValue] = useState('')
        return field({ mask: 'UUUU', options, value, onValueChange: setValue, 'aria-label': label })
      }
      const input = render(<Parent label="before" />)
      act(() => {
        input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
        input.value = draft
        input.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true, inputType: 'insertCompositionText', data: draft }))
      })
      render(<Parent label="after" />)
      expect(input.value).toBe(draft)
      act(() => input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: draft })))
      expect(input.value).toBe(draft)
    })

    it('formats new configuration when an uncontrolled Activity is restored', () => {
      const input = render(<Activity mode="visible">{field({ defaultValue: '123456' })}</Activity>)
      render(<Activity mode="hidden">{field({ defaultValue: '123456' })}</Activity>)
      render(<Activity mode="visible">{field({ mask: '99/99/99', options: { segmented: false } })}</Activity>)
      expect(input.value).toBe(reconfigured)
    })

    it('preserves native attributes added by React after the initial binding', () => {
      const input = render(field({}))
      render(field({ autoComplete: 'email', spellCheck: true, maxLength: 20 }))
      render(field({ autoComplete: 'email', spellCheck: true, maxLength: 20, options: { segmented: false } }))
      expect(input.autocomplete).toBe('email')
      expect(input.getAttribute('spellcheck')).toBe('true')
      expect(input.maxLength).toBe(20)
    })

    it('restores the controlled value after a native form reset', async () => {
      const callback = vi.fn()
      const input = render(<form>{field({ value: '123456', onValueChange: callback })}</form>)
      render(<form>{field({ value: '654321', onValueChange: callback })}</form>)
      await act(async () => { input.form!.reset(); await Promise.resolve() })
      expect(input.value).toBe(updated)
      expect(callback).not.toHaveBeenCalled()
    })

    it('resets an uncontrolled field using its current configuration', async () => {
      const input = render(<form>{field({ defaultValue: '123456' })}</form>)
      render(<form>{field({ defaultValue: '123456', mask: '99/99/99', options: { segmented: false } })}</form>)
      edit(input, '42')
      await act(async () => { input.form!.reset(); await Promise.resolve() })
      expect(input.value).toBe(reconfigured)
    })

    it('ignores unrelated and canceled form resets, including external form owners', async () => {
      const callback = vi.fn()
      const view = (cancel = false) => <>
        <form id="owner" onReset={event => { if (cancel) event.preventDefault() }} />
        <form id="unrelated" />
        {field({ form: 'owner', defaultValue: '123456', onValueChange: callback })}
      </>
      const input = render(view())
      edit(input, '42')
      const remove = vi.spyOn(input, 'removeEventListener')
      await act(async () => { host.querySelector<HTMLFormElement>('#unrelated')!.reset(); await Promise.resolve() })
      expect(input.value).toBe('42')
      render(view(true))
      await act(async () => { input.form!.reset(); await Promise.resolve() })
      expect(input.value).toBe('42')
      expect(remove).not.toHaveBeenCalled()
      render(view())
      await act(async () => { input.form!.reset(); await Promise.resolve() })
      expect(input.value).toBe(formatted)
      expect(callback).toHaveBeenCalledOnce()
    })

    it('does not recreate bindings when unmounted before reset finishes', async () => {
      const callback = vi.fn()
      const input = render(<form>{field({ defaultValue: '123456', onValueChange: callback })}</form>)
      const add = vi.spyOn(input, 'addEventListener')
      await act(async () => {
        input.form!.reset()
        flushSync(() => root.render(null))
        await Promise.resolve()
      })
      expect(input.hasAttribute('data-masked')).toBe(false)
      expect(add).not.toHaveBeenCalled()
      expect(callback).not.toHaveBeenCalled()
    })

    it('cleans up a callback ref before replacing it and again on unmount', () => {
      const firstCleanup = vi.fn()
      const secondCleanup = vi.fn()
      const first = vi.fn(() => firstCleanup)
      const second = vi.fn(() => secondCleanup)
      const input = render(field({ ref: first }))
      const before = firstCleanup.mock.calls.length
      render(field({ ref: second }))
      expect(firstCleanup).toHaveBeenCalledTimes(before + 1)
      expect(second).toHaveBeenLastCalledWith(input)
      render(null)
      expect(secondCleanup).toHaveBeenCalledOnce()
    })

    it('allows a change callback to synchronously remove its own component', () => {
      const callback = vi.fn(() => render(null))
      const input = render(field({ value: '', onValueChange: callback }))
      edit(input, '42')
      expect(callback).toHaveBeenCalledOnce()
      expect(host.querySelector('input')).toBeNull()
      expect(input.hasAttribute('data-masked')).toBe(false)
      expect(frames.size).toBe(0)
    })

    it('isolates multiple fields and supports remounting with a new key', () => {
      const callback = vi.fn()
      render(<>{field({ defaultValue: '123456' })}{field({ defaultValue: '', onValueChange: callback })}</>)
      const [first, second] = host.querySelectorAll('input')
      edit(second, '42')
      expect(first.value).toBe(formatted)
      expect(callback).toHaveBeenCalledOnce()
      render(<div key="new">{field({ defaultValue: '654321' })}</div>)
      expect(first.hasAttribute('data-masked')).toBe(false)
      expect(second.hasAttribute('data-masked')).toBe(false)
      expect(host.querySelector('input')!.value).toBe(updated)
    })

    it('keeps controlled empty values and zero distinct', () => {
      const input = render(field({ value: '', defaultValue: '123456' }))
      expect(input.value).toBe('')
      render(field({ value: '0' }))
      expect(input.value).toBe('0')
      render(field({ value: '' }))
      expect(input.value).toBe('')
    })

    it('hydrates without mismatches or duplicate callbacks', async () => {
      const callback = vi.fn()
      const container = document.createElement('div')
      const element = field({ defaultValue: '123456', onValueChange: callback })
      container.innerHTML = renderToString(element)
      document.body.append(container)
      const recoverable = vi.fn()
      let hydrated: Root | undefined
      try {
        await act(async () => { hydrated = hydrateRoot(container, element, { onRecoverableError: recoverable }) })
        const input = container.querySelector('input')!
        expect(input.value).toBe(formatted)
        expect(recoverable).not.toHaveBeenCalled()
        expect(callback).not.toHaveBeenCalled()
        edit(input, '42')
        expect(callback).toHaveBeenCalledOnce()
      } finally {
        act(() => hydrated?.unmount())
        container.remove()
      }
    })

    it('does not notify while readOnly or disabled, and resumes when enabled', () => {
      const callback = vi.fn()
      const input = render(field({ value: '123456', readOnly: true, onValueChange: callback }))
      edit(input, '42')
      expect(input.value).toBe(formatted)
      render(field({ value: '123456', disabled: true, onValueChange: callback }))
      edit(input, '42')
      expect(input.value).toBe(formatted)
      expect(callback).not.toHaveBeenCalled()
      render(field({ value: '123456', onValueChange: callback }))
      edit(input, '42')
      expect(callback).toHaveBeenCalledOnce()
    })
  })
}

it('supports ordered patterns, custom tokens and resolver options', () => {
  const input = render(<InputMask mask={['99', '999-99']} />)
  edit(input, '12345')
  expect(input.value).toBe('123-45')
  const options = { tokens: { U: { match: /[a-z]/i, transform: (value: string) => value.toUpperCase() } }, resolveMask: () => 'UU-UU' }
  render(<InputMask mask="UUUU" options={options} />)
  edit(input, 'abcd')
  expect(input.value).toBe('AB-CD')
})

it('preserves a deleted eager separator when a controlled parent echoes the edit', () => {
  function Parent() {
    const [value, setValue] = useState('12/')
    return <InputMask mask="99/99/9999" value={value} onValueChange={setValue} />
  }
  const input = render(<Parent />)
  act(() => {
    input.value = '12'
    input.setSelectionRange(2, 2)
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }))
  })
  expect(input.value).toBe('12')
  expect(input.selectionStart).toBe(2)
})

it('reports numeric decimal values, locale separators, affixes, negative and empty values', () => {
  const callback = vi.fn()
  const options = { decimalPlaces: 2, separator: '.', decimalSeparator: ',', prefix: '€', allowNegative: true }
  const input = render(<InputDecimal options={options} onValueChange={callback} />)
  expect(input.inputMode).toBe('decimal')
  edit(input, '-1234,5')
  expect(input.value).toBe('-€1.234,50')
  expect(callback).toHaveBeenLastCalledWith('-€1.234,50', -1234.5)
  edit(input, '')
  expect(callback).toHaveBeenLastCalledWith('', 0)
})

it('preserves decimal drafts with a controlled value and allows an inputMode override', () => {
  const options = { allowNegative: true }
  function Parent() {
    const [value, setValue] = useState('')
    return <InputDecimal value={value} options={options} onValueChange={setValue} inputMode="text" />
  }
  const input = render(<Parent />)
  expect(input.inputMode).toBe('text')
  for (const value of ['-', '12.', '12.3456']) {
    edit(input, value)
    expect(input.value).toBe(value)
  }
})

it.each([
  [{ decimalPlaces: 0 }, '1234.56', '123,456'],
  [{ decimalPlaces: 2 }, '12.3456', '12.34'],
  [{ decimalPlaces: 2, allowNegative: false }, '-12.5', '12.50'],
  [{ decimalPlaces: 2, numberPlaces: 2, segmented: false }, '1.2', '01.20'],
  [{ suffix: ' €', separator: '.', decimalSeparator: ',' }, '1234,5678', '1.234,5678 €'],
  [{ segmented: false }, '9007199254740993', '9007199254740993'],
])('keeps decimal boundary values as strings (%j)', (options, value, expected) => {
  const input = render(<InputDecimal options={options} value={value} />)
  expect(input.value).toBe(expected)
})

it('updates decimal locale options together with an externally formatted value', () => {
  const input = render(<InputDecimal value="1,234.50" options={{ decimalPlaces: 2 }} />)
  render(<InputDecimal value="1.234,50 €" options={{ decimalPlaces: 2, separator: '.', decimalSeparator: ',', suffix: ' €' }} />)
  expect(input.value).toBe('1.234,50 €')
})

it('handles empty masks and supplementary Unicode tokens', () => {
  const input = render(<InputMask mask="" value="123" />)
  expect(input.value).toBe('')
  render(<InputMask mask={[]} value="123" />)
  expect(input.value).toBe('')
  render(<InputMask mask="UU-UU" value="𐐀abc" options={{ tokens: { U: { match: /\p{L}/u } } }} />)
  expect(input.value).toBe('𐐀a-bc')
})
