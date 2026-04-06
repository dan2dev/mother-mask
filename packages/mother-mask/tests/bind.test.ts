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
