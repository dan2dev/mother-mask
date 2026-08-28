import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { applyMask, bind, bindDecimal, process as processMask } from '../src/index'

// ---------------------------------------------------------------------------
// Anything a long-lived page accumulates: the module-level compiled-mask
// cache, event listeners, and requestAnimationFrame callbacks that outlive
// the element they close over.
// ---------------------------------------------------------------------------

async function flushRafs(times = 3): Promise<void> {
  for (let i = 0; i < times; i++) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  }
}

function setupInput(): HTMLInputElement {
  const input = document.createElement('input')
  document.body.appendChild(input)
  return input
}

/** Every event `bind()`/`bindDecimal()` listen for, as the browser would fire them. */
function fireEveryHandledEvent(input: HTMLInputElement): void {
  input.dispatchEvent(new Event('paste', { bubbles: true }))
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '9' }))
  input.dispatchEvent(new Event('compositionstart', { bubbles: true }))
  input.dispatchEvent(new Event('compositionend', { bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keydown', { key: '9', bubbles: true, cancelable: true }))
  input.dispatchEvent(new KeyboardEvent('keyup', { key: '9', bubbles: true, cancelable: true }))
}

describe('compiled-mask cache stays bounded', () => {
  it('keeps masking correctly after far more distinct masks than it can hold', () => {
    // Caller-supplied mask strings are the cache key, so an app generating
    // them dynamically must not grow the map forever. Eviction is invisible
    // from outside except that an evicted mask has to be recompiled — which
    // must produce exactly the same result as the first time.
    const first = '999.999.999-99'
    const before = applyMask('01215344139', first, 11)

    for (let i = 0; i < 500; i++) {
      expect(processMask('123456', `99.${'9'.repeat((i % 40) + 1)}.99-${i % 10}9`)).toBeTypeOf('string')
      processMask('1234', `9${'-'.repeat((i % 5) + 1)}999${i}`)
    }

    // The very first mask was evicted long ago; recompiling must be identical.
    expect(applyMask('01215344139', first, 11)).toEqual(before)
    expect(applyMask('015-39', first, 3)).toEqual({ value: '015.-39', caret: 4 })
  })

  it('is unaffected by interleaving many masks with a hot one', () => {
    const hot = '(99) 99999-9999'
    for (let i = 0; i < 300; i++) {
      processMask('1234567', `9${'9'.repeat(i % 30)}-99`)
      expect(processMask('11999887766', hot)).toBe('(11) 99988-7766')
    }
  })
})

describe('bind() releases everything it holds on dispose', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    input = setupInput()
  })

  afterEach(() => {
    input.remove()
    vi.restoreAllMocks()
  })

  it('detaches every listener it attached', () => {
    const added: string[] = []
    const removed: string[] = []
    vi.spyOn(input, 'addEventListener').mockImplementation(function (this: HTMLInputElement, ...args: unknown[]) {
      added.push(args[0] as string)
      return HTMLInputElement.prototype.addEventListener.apply(this, args as never)
    } as never)
    vi.spyOn(input, 'removeEventListener').mockImplementation(function (this: HTMLInputElement, ...args: unknown[]) {
      removed.push(args[0] as string)
      return HTMLInputElement.prototype.removeEventListener.apply(this, args as never)
    } as never)

    bind(input, '999.999.999-99')()

    expect(added.length).toBeGreaterThan(0)
    expect([...removed].sort()).toEqual([...added].sort())
  })

  it('stops reacting to every event it used to handle', async () => {
    const onChange = vi.fn()
    const dispose = bind(input, '999.999.999-99', { onChange })
    input.value = '01215344139'
    dispose()
    onChange.mockClear()

    fireEveryHandledEvent(input)
    await flushRafs()

    // Untouched — no reformat, no callback, after dispose.
    expect(input.value).toBe('01215344139')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('cancels a reformat frame still in flight when the field unmounts', async () => {
    const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame')
    const onChange = vi.fn()
    const dispose = bind(input, '999.999.999-99', { onChange })

    // keydown schedules a rAF that closes over the element; dispose before it fires.
    input.value = '01215344139'
    input.setSelectionRange(11, 11)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: '9', bubbles: true, cancelable: true }))
    dispose()
    await flushRafs()

    expect(cancel).toHaveBeenCalled()
    expect(input.value).toBe('01215344139') // the cancelled frame never reformatted
    expect(onChange).not.toHaveBeenCalled()
  })

  it('does not accumulate listeners across repeated bind/dispose cycles', async () => {
    let live = 0
    vi.spyOn(input, 'addEventListener').mockImplementation(function (this: HTMLInputElement, ...args: unknown[]) {
      live++
      return HTMLInputElement.prototype.addEventListener.apply(this, args as never)
    } as never)
    vi.spyOn(input, 'removeEventListener').mockImplementation(function (this: HTMLInputElement, ...args: unknown[]) {
      live--
      return HTMLInputElement.prototype.removeEventListener.apply(this, args as never)
    } as never)

    for (let i = 0; i < 100; i++) {
      const dispose = bind(input, i % 2 === 0 ? '999.999.999-99' : '99/99/9999')
      input.value = '1234'
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '4' }))
      dispose()
    }
    await flushRafs()

    expect(live).toBe(0)
  })

  it('leaves no attributes behind, so the element is reusable', () => {
    const dispose = bind(input, '999.999.999-99')
    dispose()
    for (const attr of ['data-masked', 'maxlength', 'autocomplete', 'autocorrect', 'autocapitalize', 'spellcheck']) {
      expect({ attr, present: input.hasAttribute(attr) }).toEqual({ attr, present: false })
    }
  })
})

describe('bindDecimal() releases everything it holds on dispose', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    input = setupInput()
  })

  afterEach(() => {
    input.remove()
    vi.restoreAllMocks()
  })

  it('detaches every listener it attached', () => {
    const added: string[] = []
    const removed: string[] = []
    vi.spyOn(input, 'addEventListener').mockImplementation(function (this: HTMLInputElement, ...args: unknown[]) {
      added.push(args[0] as string)
      return HTMLInputElement.prototype.addEventListener.apply(this, args as never)
    } as never)
    vi.spyOn(input, 'removeEventListener').mockImplementation(function (this: HTMLInputElement, ...args: unknown[]) {
      removed.push(args[0] as string)
      return HTMLInputElement.prototype.removeEventListener.apply(this, args as never)
    } as never)

    bindDecimal(input, { decimalPlaces: 2, prefix: '$' })()

    expect(added.length).toBeGreaterThan(0)
    expect([...removed].sort()).toEqual([...added].sort())
  })

  it('stops reacting to every event it used to handle', async () => {
    const onChange = vi.fn()
    const dispose = bindDecimal(input, { decimalPlaces: 2, onChange })
    input.value = '123456'
    dispose()
    onChange.mockClear()

    fireEveryHandledEvent(input)
    await flushRafs()

    expect(input.value).toBe('123456')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('cancels a reformat frame still in flight when the field unmounts', async () => {
    const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame')
    const onChange = vi.fn()
    const dispose = bindDecimal(input, { decimalPlaces: 2, onChange })

    input.value = '123456'
    input.setSelectionRange(6, 6)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: '6', bubbles: true, cancelable: true }))
    dispose()
    await flushRafs()

    expect(cancel).toHaveBeenCalled()
    expect(input.value).toBe('123456')
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('custom tokens and resolvers are scoped to a disposable binding', () => {
  it('repeated disposal cancels callbacks and rebinding never reuses prior definitions', async () => {
    const input = setupInput()
    const match = vi.fn((c: string) => /[a-z]/i.test(c))
    const transform = vi.fn((c: string) => c.toUpperCase())
    const resolveMask = vi.fn(() => 'UU-UU')
    for (let cycle = 0; cycle < 100; cycle++) {
      const dispose = bind(input, 'UU-UU', { tokens: { U: { match, transform } }, resolveMask })
      input.value = 'abcd'
      input.setSelectionRange(4, 4)
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
      expect(input.value).toBe('AB-CD')
      input.dispatchEvent(new Event('paste', { bubbles: true }))
      dispose()
      const counts = [match.mock.calls.length, transform.mock.calls.length, resolveMask.mock.calls.length]
      dispose()
      fireEveryHandledEvent(input)
      await flushRafs(1)
      expect([match.mock.calls.length, transform.mock.calls.length, resolveMask.mock.calls.length]).toEqual(counts)
      const second = bind(input, 'UU-UU', { tokens: { U: /[0-9]/ } })
      input.value = 'ab12'
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
      expect(input.value).toBe('12-')
      second()
    }
    input.remove()
  })
})
