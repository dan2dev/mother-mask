import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/** Flush nested `requestAnimationFrame` chains used by `bind()`. */
async function flushRafs(times = 2): Promise<void> {
  for (let i = 0; i < times; i++) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  }
}

describe('bind() — event handlers', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    input = document.createElement('input')
    document.body.appendChild(input)
  })

  afterEach(() => {
    input.remove()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('masks pasted value on next animation frame', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999.999.999-99')
    input.value = '12345678901'
    input.dispatchEvent(new Event('paste', { bubbles: true }))
    await flushRafs(1)
    expect(input.value).toBe('123.456.789-01')
  })

  it('invokes onChange from options object after paste', async () => {
    const { bind } = await import('../src/index')
    const cb = vi.fn()
    bind(input, '999.999.999-99', { onChange: cb })
    input.value = '12345678901'
    input.dispatchEvent(new Event('paste', { bubbles: true }))
    await flushRafs(1)
    expect(cb).toHaveBeenCalledWith('123.456.789-01')
  })

  it('invokes callback after paste', async () => {
    const { bind } = await import('../src/index')
    const cb = vi.fn()
    bind(input, '999.999.999-99', cb)
    input.value = '12345678901'
    input.dispatchEvent(new Event('paste', { bubbles: true }))
    await flushRafs(1)
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith('123.456.789-01')
  })

  it('masks value after printable keydown (non-iOS)', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    // Browser applies the character before keydown handlers run; rAF then reads masked value.
    input.value = '1'
    input.setSelectionRange(1, 1)
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true }),
    )
    await flushRafs()
    expect(input.value).toBe('1')
  })

  it('invokes callback after keydown processing', async () => {
    const { bind } = await import('../src/index')
    const cb = vi.fn()
    bind(input, '999', cb)
    // Simulate browser inserting the character before our handler runs
    input.value = '5'
    input.setSelectionRange(1, 1)
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: '5', bubbles: true, cancelable: true }),
    )
    await flushRafs()
    expect(cb).toHaveBeenCalledWith('5')
  })

  it('ignores Meta key without locking or mutating value', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999')
    input.value = ''
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Meta', bubbles: true, cancelable: true }),
    )
    await flushRafs()
    expect(input.value).toBe('')
  })

  it('prevents default when inserting past max length (desktop)', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999')
    input.value = '123'
    input.setSelectionRange(3, 3)
    const e = new KeyboardEvent('keydown', { key: '4', bubbles: true, cancelable: true })
    input.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(true)
  })

  it('does not prevent default at max length on iOS (keyup listener)', async () => {
    vi.stubGlobal('navigator', { userAgent: 'iPhone OS 17_0 like Mac OS X' })
    const { bind } = await import('../src/index')
    bind(input, '999')
    input.value = '123'
    input.setSelectionRange(3, 3)
    const e = new KeyboardEvent('keyup', { key: '4', bubbles: true, cancelable: true })
    input.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(false)
  })

  it('uses keyup instead of keydown when userAgent matches iOS', async () => {
    vi.stubGlobal('navigator', { userAgent: 'iPad; CPU OS 16_0 like Mac OS X' })
    const { bind } = await import('../src/index')
    bind(input, '99-999')
    const spyKeydown = vi.fn()
    const spyKeyup = vi.fn()
    input.addEventListener('keydown', spyKeydown)
    input.addEventListener('keyup', spyKeyup)
    // After typing "3", value is three digits (bind listens to keyup on iOS).
    input.value = '123'
    input.setSelectionRange(3, 3)
    input.dispatchEvent(
      new KeyboardEvent('keyup', { key: '3', bubbles: true, cancelable: true }),
    )
    await flushRafs()
    expect(spyKeydown).not.toHaveBeenCalled()
    expect(spyKeyup).toHaveBeenCalled()
    expect(input.value).toBe('12-3')
  })

  it('fast typing: second keydown is never swallowed while first rAF is pending', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    // Simulate the browser inserting both characters before any rAF fires.
    input.value = '12'
    input.setSelectionRange(2, 2)
    const first = new KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true })
    const second = new KeyboardEvent('keydown', { key: '2', bubbles: true, cancelable: true })
    input.dispatchEvent(first)
    input.dispatchEvent(second)
    // Neither event should be cancelled — fast typing must not drop characters.
    expect(first.defaultPrevented).toBe(false)
    expect(second.defaultPrevented).toBe(false)
    await flushRafs()
    expect(input.value).toBe('12')
  })

  it('handles keydown with missing key (Android WebView style)', async () => {
    const { bind } = await import('../src/index')
    bind(input, '99')
    input.value = '1'
    input.setSelectionRange(1, 1)
    const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true })
    Object.defineProperty(ev, 'key', { value: undefined, configurable: true })
    input.dispatchEvent(ev)
    await flushRafs()
    expect(input.value).toMatch(/^1/)
  })

  it('Backspace resets selection to caret position after mask', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.value = '12'
    input.setSelectionRange(2, 2)
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }),
    )
    await flushRafs()
    expect(input.selectionStart).toBe(2)
    expect(input.selectionEnd).toBe(2)
  })

  it('Delete key adjusts selection when length unchanged', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999-999')
    input.value = '12-345'
    input.setSelectionRange(2, 2)
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }),
    )
    await flushRafs()
    expect(input.selectionStart).toBe(3)
  })

  it('Unidentified key uses caret heuristic when value grows', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999')
    input.value = '12'
    input.setSelectionRange(2, 2)
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Unidentified', bubbles: true, cancelable: true }),
    )
    await flushRafs()
    expect(input.selectionStart).toBeGreaterThanOrEqual(0)
  })

  it('idempotent second bind returns noop dispose', async () => {
    const { bind } = await import('../src/index')
    bind(input, '999')
    const noop = bind(input, '999')
    expect(noop()).toBeUndefined()
  })

  it('dispose removes listeners and data-masked so bind can run again', async () => {
    const { bind } = await import('../src/index')
    const unbind = bind(input, '999')
    expect(input.getAttribute('data-masked')).toBe('999')
    unbind()
    expect(input.getAttribute('data-masked')).toBeNull()
    bind(input, '99-99')
    expect(input.getAttribute('data-masked')).toBe('99-99')
    expect(input.getAttribute('maxlength')).toBe('5')
  })

  it('masks array pattern on paste', async () => {
    const { bind } = await import('../src/index')
    bind(input, ['(99) 9999-9999', '(99) 99999-9999'])
    input.value = '(11) 99988-7765'
    input.dispatchEvent(new Event('paste', { bubbles: true }))
    await flushRafs(1)
    expect(input.value).toBe('(11) 99988-7765')
  })

  it('applies alphanumeric CNPJ mask on paste', async () => {
    const { bind } = await import('../src/index')
    bind(input, 'AA.AAA.AAA/AAAA-99')
    input.value = '1AB2C3D45E6F78'
    input.dispatchEvent(new Event('paste', { bubbles: true }))
    await flushRafs(1)
    expect(input.value).toBe('1A.B2C.3D4/5E6F-78')
  })
})

describe('bind() — select-and-replace race (keydown fallback frame vs. browser default action)', () => {
  // Regression coverage for a real-Firefox bug, captured via tracing: select
  // all text in a full field, then type over it. The `keydown` +
  // `requestAnimationFrame` fallback frame can fire *before* Firefox has
  // actually applied the keystroke's default action — at that point
  // `target.value` is still unchanged and the selection is still the full
  // pre-edit range, not a post-edit collapsed caret. The old code blindly
  // reformatted and called `setSelectionRange`/`setCaret`, collapsing that
  // range before the browser's own pending replace-selection edit could use
  // it, so the character got inserted at the now-collapsed point instead of
  // replacing the selection (or was dropped entirely).
  //
  // Every test below simulates the race by dispatching only `keydown` (never
  // `input`) with the selection still spanning a real range and the value
  // still at its pre-keystroke content — exactly what a premature frame
  // observes in the real bug.
  let input: HTMLInputElement

  beforeEach(() => {
    input = document.createElement('input')
    document.body.appendChild(input)
  })

  afterEach(() => {
    input.remove()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('character insert: does not collapse the selection when the frame fires before the edit lands', async () => {
    const { bind } = await import('../src/index')
    const cb = vi.fn()
    bind(input, '999.999.999-99', cb)
    input.value = '098.098.098-08'
    input.setSelectionRange(0, 14)
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: '0', bubbles: true, cancelable: true }),
    )
    await flushRafs()
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(14)
    expect(input.value).toBe('098.098.098-08')
    expect(cb).not.toHaveBeenCalled()
  })

  it('Backspace: does not collapse a real selection when the frame fires before the edit lands', async () => {
    const { bind } = await import('../src/index')
    const cb = vi.fn()
    bind(input, '999-999', cb)
    input.value = '123-456'
    input.setSelectionRange(1, 5) // "23-4" selected
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }),
    )
    await flushRafs()
    expect(input.selectionStart).toBe(1)
    expect(input.selectionEnd).toBe(5)
    expect(input.value).toBe('123-456')
    expect(cb).not.toHaveBeenCalled()
  })

  it('Delete: does not collapse a real selection when the frame fires before the edit lands', async () => {
    const { bind } = await import('../src/index')
    const cb = vi.fn()
    bind(input, '999-999', cb)
    input.value = '123-456'
    input.setSelectionRange(2, 6) // "3-45" selected
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }),
    )
    await flushRafs()
    expect(input.selectionStart).toBe(2)
    expect(input.selectionEnd).toBe(6)
    expect(input.value).toBe('123-456')
    expect(cb).not.toHaveBeenCalled()
  })

  it('Unidentified key: does not collapse a real selection when the frame fires before the edit lands', async () => {
    const { bind } = await import('../src/index')
    const cb = vi.fn()
    bind(input, '999-999', cb)
    input.value = '123-456'
    input.setSelectionRange(0, 7) // full selection
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Unidentified', bubbles: true, cancelable: true }),
    )
    await flushRafs()
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(7)
    expect(input.value).toBe('123-456')
    expect(cb).not.toHaveBeenCalled()
  })

  it('Android missing-key path: does not collapse a real selection and releases lockInput when the edit has not landed', async () => {
    const { bind } = await import('../src/index')
    const cb = vi.fn()
    bind(input, '999-999', cb)
    input.value = '123-456'
    input.setSelectionRange(0, 7)
    const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true })
    Object.defineProperty(ev, 'key', { value: undefined, configurable: true })
    input.dispatchEvent(ev)
    await flushRafs()
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(7)
    expect(input.value).toBe('123-456')
    expect(cb).not.toHaveBeenCalled()

    // Bailing must still release `lockInput` — a normal keystroke right
    // after must not be blocked forever by the abandoned async path.
    input.value = '1'
    input.setSelectionRange(1, 1)
    const next = new KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true })
    input.dispatchEvent(next)
    expect(next.defaultPrevented).toBe(false)
    await flushRafs()
    expect(cb).toHaveBeenCalled()
  })

  it('does not bail when the selection is already collapsed, even if the value looks unchanged (the common, always-tested case)', async () => {
    // Every other test in this file pre-sets `input.value` to the "already
    // edited" state before dispatching keydown, so `oldValue` captured
    // inside `onKey` already equals what the frame later reads — i.e.
    // `target.value === oldValue` is true by construction. This must NOT
    // bail, because the selection is collapsed (a real post-edit caret, not
    // a pre-edit range), which is the ordinary, extensively-tested path.
    const { bind } = await import('../src/index')
    const cb = vi.fn()
    bind(input, '999', cb)
    input.value = '5'
    input.setSelectionRange(1, 1)
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: '5', bubbles: true, cancelable: true }),
    )
    await flushRafs()
    expect(cb).toHaveBeenCalledWith('5')
  })

  it('does not bail when the value has already changed, even if the resulting selection happens to be a range', async () => {
    // The bail condition requires BOTH "value unchanged" AND "selection is a
    // real range" — if the value differs from `oldValue`, the edit has
    // landed, and formatting must proceed regardless of what the selection
    // looks like at frame time.
    const { bind } = await import('../src/index')
    const cb = vi.fn()
    bind(input, '999-999', cb)
    input.value = '123-456'
    input.setSelectionRange(0, 7)
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: '9', bubbles: true, cancelable: true }),
    )
    // Simulate the browser having applied a *different* edit than the one
    // read at keydown time (e.g. autocorrect/IME), landing on a value that
    // differs from oldValue, but leaving a non-collapsed selection.
    input.value = '999-456'
    input.setSelectionRange(0, 3)
    await flushRafs()
    expect(cb).toHaveBeenCalled()
  })

  it('recovers correctly once the browser applies the edit and fires `input`, even after the fallback frame bailed', async () => {
    // End-to-end version of the real bug's full lifecycle: the fallback
    // frame observes the edit hasn't landed and bails (selection preserved);
    // the browser then actually applies the edit slightly late and fires the
    // authoritative `input` event, which must still format correctly.
    const { bind } = await import('../src/index')
    const cb = vi.fn()
    bind(input, '999.999.999-99', cb)
    input.value = '098.098.098-08'
    input.setSelectionRange(0, 14)
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: '0', bubbles: true, cancelable: true }),
    )
    await flushRafs()
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(14)

    // Browser now applies the real edit: selection replaced with '0'.
    input.value = '0'
    input.setSelectionRange(1, 1)
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: '0' }))

    expect(input.value).toBe('0')
    expect(input.selectionStart).toBe(1)
    expect(cb).toHaveBeenCalledWith('0')
  })

  it('fast typing into a full field after select-all: every keystroke lands and the final value is correct', async () => {
    // Realistic end-to-end repro: select-all over a full CPF, then type the
    // whole new number. Some keydowns' fallback frames race the (never
    // dispatched, in this synchronous test) browser mutation and bail; the
    // real `input` events — dispatched here to simulate the browser
    // eventually catching up — are what actually drive the formatting, and
    // must produce the correct final result regardless of what the bailed
    // frames did or didn't touch.
    const { bind } = await import('../src/index')
    bind(input, '999.999.999-99')
    input.value = '098.098.098-08'
    input.setSelectionRange(0, 14)

    const digits = '11122233344'
    let raw = ''
    for (const digit of digits) {
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: digit, bubbles: true, cancelable: true }),
      )
      // Browser applies the keystroke and fires `input` before the next one.
      raw = raw === '' ? digit : input.value.replace(/[^0-9]/g, '') + digit
      const pos = raw.length
      input.value = raw
      input.setSelectionRange(pos, pos)
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: digit }))
    }
    await flushRafs()
    expect(input.value).toBe('111.222.333-44')
    expect(input.selectionStart).toBe(14)
  })
})

describe('bind() — navigation and shortcut keys never schedule a reformat', () => {
  // Ctrl/Cmd+A, arrows, Home/End, Tab, etc. don't edit text. Scheduling a
  // reformat frame for them anyway was the other half of the real-Firefox
  // bug: Ctrl+A's own keydown scheduled a frame that's never cancelled
  // (select-all fires no `input` event), and that frame's blind
  // `setSelectionRange` call could stomp on the selection the user just
  // made. None of these keys should touch the value, the selection, or
  // invoke `onChange`.
  let input: HTMLInputElement

  beforeEach(() => {
    input = document.createElement('input')
    document.body.appendChild(input)
  })

  afterEach(() => {
    input.remove()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  const cases: Array<{ name: string; init: () => KeyboardEventInit }> = [
    { name: 'Ctrl+A', init: () => ({ key: 'a', ctrlKey: true }) },
    { name: 'Cmd+A (Meta)', init: () => ({ key: 'a', metaKey: true }) },
    { name: 'Ctrl+C', init: () => ({ key: 'c', ctrlKey: true }) },
    { name: 'ArrowLeft', init: () => ({ key: 'ArrowLeft' }) },
    { name: 'ArrowRight', init: () => ({ key: 'ArrowRight' }) },
    { name: 'ArrowUp', init: () => ({ key: 'ArrowUp' }) },
    { name: 'ArrowDown', init: () => ({ key: 'ArrowDown' }) },
    { name: 'Home', init: () => ({ key: 'Home' }) },
    { name: 'End', init: () => ({ key: 'End' }) },
    { name: 'Tab', init: () => ({ key: 'Tab' }) },
    { name: 'Escape', init: () => ({ key: 'Escape' }) },
    { name: 'Shift+ArrowRight', init: () => ({ key: 'ArrowRight', shiftKey: true }) },
    { name: 'Shift+Home', init: () => ({ key: 'Home', shiftKey: true }) },
    { name: 'Shift+End', init: () => ({ key: 'End', shiftKey: true }) },
    { name: 'Alt+ArrowLeft', init: () => ({ key: 'ArrowLeft', altKey: true }) },
  ]

  for (const { name, init } of cases) {
    it(`${name}: leaves value, selection, and onChange untouched`, async () => {
      const { bind } = await import('../src/index')
      const cb = vi.fn()
      bind(input, '999.999.999-99', cb)
      input.value = '123.456.789-01'
      input.setSelectionRange(3, 9) // a real, arbitrary selection
      input.dispatchEvent(
        new KeyboardEvent('keydown', { ...init(), bubbles: true, cancelable: true }),
      )
      await flushRafs()
      expect(input.value).toBe('123.456.789-01')
      expect(input.selectionStart).toBe(3)
      expect(input.selectionEnd).toBe(9)
      expect(cb).not.toHaveBeenCalled()
    })
  }

  it('Ctrl+A immediately followed by a real character keydown: only the character keydown schedules a frame', async () => {
    const { bind } = await import('../src/index')
    const cb = vi.fn()
    bind(input, '999.999.999-99', cb)
    input.value = '098.098.098-08'
    input.setSelectionRange(0, 14)

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true, cancelable: true }),
    )
    // Ctrl+A must not have disturbed anything on its own.
    await flushRafs()
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(14)
    expect(input.value).toBe('098.098.098-08')
    expect(cb).not.toHaveBeenCalled()

    // Now the actual retype: still selected, browser hasn't applied it yet.
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: '0', bubbles: true, cancelable: true }),
    )
    await flushRafs()
    // Selection must still be intact — untouched by either keydown.
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(14)
    expect(cb).not.toHaveBeenCalled()
  })
})

describe('bind() — caret / selection vs applyMask', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    input = document.createElement('input')
    document.body.appendChild(input)
  })

  afterEach(() => {
    input.remove()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('selection matches applyMask caret after digit keydown (simulated post-input value)', async () => {
    const { bind, applyMask } = await import('../src/index')
    const mask = '99-99'
    bind(input, mask)
    input.value = '1'
    input.setSelectionRange(1, 1)
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: '1', bubbles: true, cancelable: true }),
    )
    await flushRafs()
    expect(input.selectionStart).toBe(applyMask('1', mask, 1).caret)
  })

  it('selection at end of masked value matches applyMask', async () => {
    const { bind, applyMask } = await import('../src/index')
    const mask = '99-99'
    bind(input, mask)
    input.value = '12-34'
    const pos = 5
    input.setSelectionRange(pos, pos)
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true }),
    )
    await flushRafs()
    expect(input.selectionStart).toBe(applyMask(input.value, mask, pos).caret)
  })

  it('CNPJ alfanumérico: selection after keydown matches applyMask for displayed value', async () => {
    const { bind, applyMask } = await import('../src/index')
    const mask = 'AA.AAA.AAA/AAAA-99'
    bind(input, mask)
    // Simula o valor já mascarado após o último dígito verificador (como no próximo rAF).
    input.value = '1A.B2C.3D4/5E6F-78'
    const pos = input.value.length
    input.setSelectionRange(pos, pos)
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: '8', bubbles: true, cancelable: true }),
    )
    await flushRafs()
    expect(input.selectionStart).toBe(applyMask(input.value, mask, pos).caret)
  })
})
