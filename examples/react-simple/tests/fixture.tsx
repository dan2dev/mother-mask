import { Activity, StrictMode, createRef } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import type { BindDecimalOptions, BindOptions } from 'mother-mask'
import { InputDecimal } from '../src/InputDecimal'
import { InputMask } from '../src/InputMask'

type Options = Omit<BindOptions & BindDecimalOptions, 'onChange'>
interface Settings {
  kind: 'pattern' | 'decimal'
  value?: string
  defaultValue?: string
  mask?: string
  options?: Options
  acceptEdits?: boolean
  callbackVersion?: string
  hidden?: boolean
  probe?: boolean
}

const root = createRoot(document.getElementById('root')!)
const inputRef = createRef<HTMLInputElement>()
let active: Settings | null = null
const probes: WeakRef<object>[] = []
const events: Array<{ value: string; numeric?: number; version?: string }> = []
const pending = new Map<number, FrameRequestCallback>()
let nextFrame = 1
let added = 0
let removed = 0

// Count only the mask's listeners on test inputs, not React's delegated root
// listeners. Counters and WeakRefs deliberately do not retain DOM elements.
const listenerNames = new Set(['input', 'paste', 'compositionstart', 'compositionend', 'keydown', 'keyup'])
const realAdd = EventTarget.prototype.addEventListener
const realRemove = EventTarget.prototype.removeEventListener
EventTarget.prototype.addEventListener = function (type, listener, options) {
  if (this instanceof HTMLInputElement && listenerNames.has(type)) added++
  return realAdd.call(this, type, listener, options)
}
EventTarget.prototype.removeEventListener = function (type, listener, options) {
  if (this instanceof HTMLInputElement && listenerNames.has(type)) removed++
  return realRemove.call(this, type, listener, options)
}

function render() {
  const settings = active
  if (!settings) return
  const onValueChange = (value: string, numeric?: number) => {
    events.push({ value, numeric, version: settings.callbackVersion })
    if (settings.value !== undefined && settings.acceptEdits !== false) {
      fixture.update({ value })
    }
  }
  if (settings.probe) {
    probes.push(new WeakRef(onValueChange))
    if (settings.options) probes.push(new WeakRef(settings.options))
  }
  const props = {
    ref: inputRef,
    'aria-label': 'Test input',
    value: settings.value,
    defaultValue: settings.defaultValue,
    options: settings.options,
    onValueChange,
  }
  flushSync(() => root.render(
    <StrictMode>
      <Activity mode={settings.hidden ? 'hidden' : 'visible'}>
        {settings.kind === 'pattern'
          ? <InputMask {...props} mask={settings.mask ?? '999-999'} />
          : <InputDecimal {...props} />}
      </Activity>
    </StrictMode>,
  ))
}

const fixture = {
  events,
  mount(settings: Settings) {
    active = settings
    render()
  },
  update(settings: Partial<Settings>) {
    if (!active) throw new Error('Mount a field before updating it')
    active = { ...active, ...settings }
    render()
  },
  unmount() {
    flushSync(() => root.render(null))
    active = null
  },
  focus() { inputRef.current?.focus() },
  stats() {
    return { added, removed, pending: pending.size, refCleared: inputRef.current === null }
  },
  parkFrames() {
    // Keep this registry reachable, as a browser would while a tab is hidden.
    // A forgotten cancellation must retain its callback and fail the test.
    window.requestAnimationFrame = (callback) => {
      const id = nextFrame++
      pending.set(id, callback)
      return id
    }
    window.cancelAnimationFrame = (id) => { pending.delete(id) }
  },
  queueAndUnmount() {
    const input = inputRef.current!
    probes.push(new WeakRef(input))
    input.dispatchEvent(new Event('paste', { bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
    const queued = pending.size
    this.unmount()
    // Retaining the detached node temporarily must not leave active listeners.
    input.value = '42'
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    return { queued, detachedValue: input.value }
  },
  retained() { return probes.filter(probe => probe.deref() !== undefined).length },
  flushDeletionHistory() {
    // React development keeps the last deleted fiber's _debugStack on the
    // root. V8's stack retains the render closure and its props until another
    // commit. Rotate that bounded debug history using only a native element;
    // leaked mask listeners/frames would still retain our probes afterward.
    flushSync(() => root.render(<span />))
    flushSync(() => root.render(null))
  },
  cycles(count: number) {
    for (let i = 0; i < count; i++) {
      for (const kind of ['pattern', 'decimal'] as const) {
        this.mount({ kind, defaultValue: '123', options: { segmented: true }, probe: true })
        this.update({ options: { segmented: false }, callbackVersion: 'updated' })
        this.queueAndUnmount()
      }
    }
  },
}

window.maskFixture = fixture

declare global {
  interface Window { maskFixture: typeof fixture }
}
