import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { applyMask, bind, getMaxLength } from '../src/index'
import type { MaskTokens } from '../src/index'

// ---------------------------------------------------------------------------
// Regression suite for the reported bug: a custom token whose alphabet is
// ASCII-only (e.g. `{ match: /[a-z]/i, transform: c => c.toUpperCase() }`)
// used to reserve 2 UTF-16 units per slot unconditionally, inflating the
// mask's computed `maxLength` past its real formatted capacity. `bind()`
// shares that number between the DOM `maxlength` attribute and the
// desktop "block a keystroke once the mask is full" guard in `onKey`
// (see bind.ts), so the inflated value let typing continue past a
// genuinely full segmented mask instead of being rejected — corrupting the
// segment (dropping/overwriting characters, eating separators) rather than
// just refusing the keystroke. This is what the report saw as "possible to
// type over the chars [as they] are moving to the right".
//
// The fix (pattern.ts) only reserves the second unit for a custom token
// whose alphabet could actually accept a non-BMP code point (probed the
// same way `hasComposingRisk` already probes for CJK/Hangul/Kana).
// ---------------------------------------------------------------------------

/** Simulate one keystroke: dispatch keydown, then apply the browser's default action. */
function press(input: HTMLInputElement, key: string, valueAfter: string, caretAfter: number): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  input.dispatchEvent(e)
  if (!e.defaultPrevented) {
    input.value = valueAfter
    input.setSelectionRange(caretAfter, caretAfter)
  }
  return e
}

function setupInput(): HTMLInputElement {
  const input = document.createElement('input')
  document.body.appendChild(input)
  return input
}

describe('reported bug: "Z9Z 9Z9" with an ASCII-only transforming custom token', () => {
  const tokens: MaskTokens = { Z: { match: /[a-z]/i, transform: (c: string) => c.toUpperCase() } }
  const mask = 'Z9Z 9Z9'

  it('sizes maxLength at the true formatted capacity (7), not the old inflated 10', () => {
    expect(getMaxLength(mask, { tokens })).toBe(7)
  })

  it('reformats without dropping data once fully typed', () => {
    expect(applyMask('a1b 2c3', mask, 7, { tokens })).toEqual({ value: 'A1B 2C3', caret: 7 })
  })

  let input: HTMLInputElement
  beforeEach(() => { input = setupInput() })
  afterEach(() => { input.remove() })

  it('sets the native maxlength attribute to the real capacity', () => {
    const dispose = bind(input, mask, { tokens })
    expect(input.getAttribute('maxlength')).toBe('7')
    dispose()
  })

  it('blocks a keystroke in the middle of an already-full value instead of corrupting it', () => {
    bind(input, mask, { tokens })
    input.value = 'A1B 2C3'
    input.setSelectionRange(3, 3) // collapsed caret right before "B"
    const e = press(input, 'x', 'A1xB 2C3', 4)
    expect(e.defaultPrevented).toBe(true)
    // Nothing shifted, nothing got silently dropped or overwritten.
    expect(input.value).toBe('A1B 2C3')
  })

  it('blocks an append at the end of an already-full value', () => {
    bind(input, mask, { tokens })
    input.value = 'A1B 2C3'
    input.setSelectionRange(7, 7)
    const e = press(input, 'z', 'A1B 2C3z', 8)
    expect(e.defaultPrevented).toBe(true)
    expect(input.value).toBe('A1B 2C3')
  })

  it('still accepts a keystroke that only replaces a selection inside a full value', () => {
    bind(input, mask, { tokens })
    input.value = 'A1B 2C3'
    input.setSelectionRange(2, 3) // "B" selected, not a collapsed caret
    const e = press(input, 'z', 'A1z 2C3', 3)
    expect(e.defaultPrevented).toBe(false)
  })

  it('types out the full sequence char by char with correct uppercasing and no corruption', () => {
    bind(input, mask, { tokens })
    let raw = ''
    for (const ch of 'a1b2c3') {
      raw += ch
      input.dispatchEvent(new KeyboardEvent('keydown', { key: ch, bubbles: true, cancelable: true }))
      input.value = raw
      input.setSelectionRange(raw.length, raw.length)
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ch }))
    }
    expect(input.value).toBe('A1B 2C3')
    // Mask is now genuinely full: one more letter must be rejected, not shifted in.
    input.setSelectionRange(input.value.length, input.value.length)
    const e = press(input, 'q', `${input.value}q`, input.value.length + 1)
    expect(e.defaultPrevented).toBe(true)
    expect(input.value).toBe('A1B 2C3')
  })
})

describe('custom-token maxLength sizing — general edge cases', () => {
  it('sizes a plain ASCII/BMP regex token at one UTF-16 unit per slot', () => {
    expect(getMaxLength('HH-HH', { tokens: { H: /[0-9a-f]/i } })).toBe(5)
  })

  it('sizes a plain ASCII/BMP function-predicate token at one UTF-16 unit per slot', () => {
    const isVowel = (ch: string) => 'aeiouAEIOU'.includes(ch)
    expect(getMaxLength('VVV', { tokens: { V: isVowel } })).toBe(3)
  })

  it('reserves two units when the alphabet can hold a non-BMP letter', () => {
    // Real astral letters exist (e.g. Deseret, Osage) and `\p{L}` matches them.
    expect(getMaxLength('LL', { tokens: { L: /\p{L}/u } })).toBe(4)
  })

  it('reserves two units when the alphabet can hold a non-BMP number', () => {
    expect(getMaxLength('NN', { tokens: { N: /\p{N}/u } })).toBe(4)
  })

  it('reserves two units when the alphabet can hold a non-BMP symbol/emoji', () => {
    expect(getMaxLength('EE', { tokens: { E: /\p{Emoji}/u } })).toBe(4)
  })

  it('reserves two units for a function predicate that accepts anything', () => {
    expect(getMaxLength('AA', { tokens: { A: () => true } })).toBe(4)
  })

  it('treats a throwing predicate as unsafe and reserves two units', () => {
    const throwsOnAstral = (ch: string) => {
      if (Array.from(ch).length > 1 || ch.codePointAt(0)! > 0xffff) throw new Error('nope')
      return ch >= '0' && ch <= '9'
    }
    expect(getMaxLength('TT', { tokens: { T: throwsOnAstral } })).toBe(4)
  })

  it('mixes built-in and ASCII-only custom slots correctly in one run', () => {
    // "9" (built-in, 1 unit) and "Z" (custom, ASCII-only, 1 unit) merge into
    // a single 3-slot run — every slot here costs exactly one unit.
    const tokens: MaskTokens = { Z: { match: /[a-z]/i, transform: (c: string) => c.toUpperCase() } }
    expect(getMaxLength('Z9Z', { tokens })).toBe(3)
  })

  it('sizes an escaped-literal mask with two ASCII-only custom runs (regression for the exact reported shape)', () => {
    expect(getMaxLength('\\A-HH\\Z-HH', { tokens: { H: /[0-9a-f]/i } })).toBe(8)
  })

  it('sizes an ordered array mask by its longest member under ASCII-only custom tokens', () => {
    expect(getMaxLength(['XX', 'XX-XX'], { tokens: { X: /[0-9]/ } })).toBe(5)
  })

  it('a resolver mask stays unbounded regardless of token alphabet', () => {
    expect(getMaxLength('99', { tokens: { X: /[0-9]/ }, resolveMask: () => '999' })).toBe(Infinity)
  })

  it('a composing-risk custom token (e.g. matching CJK) is left to bind()\'s own Infinity path, unaffected by slot sizing', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    const dispose = bind(input, 'LL', { tokens: { L: /\p{L}/u } })
    // hasComposingRisk defers to Infinity — no maxlength attribute at all,
    // independent of whatever per-slot maxLength this token would size to.
    expect(input.hasAttribute('maxlength')).toBe(false)
    dispose()
    input.remove()
  })
})
