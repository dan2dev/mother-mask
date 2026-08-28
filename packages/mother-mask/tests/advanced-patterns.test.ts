import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyMask, bind, buildMask, getMaxLength, Mask, process } from '../src/index'
import type { ApplyMaskOptions, MaskPattern, MaskResolver, MaskTokenDefinition, MaskTokens, TokenMatcher } from '../src/index'

const upper: MaskTokenDefinition = { match: /[a-z]/i, transform: c => c.toUpperCase() }
const tokens: MaskTokens = { U: upper, H: /[0-9a-f]/i, L: /\p{L}/u }
const card: MaskResolver = value => value.startsWith('34') || value.startsWith('37')
  ? '9999 999999 99999' : value.startsWith('62') ? '9999 9999 9999 9999 999' : '9999 9999 9999 9999'
const disposers: Array<() => void> = []
afterEach(() => { for (const dispose of disposers.splice(0)) dispose(); document.body.replaceChildren(); vi.restoreAllMocks() })

function field(mask: MaskPattern, options?: ApplyMaskOptions, value = ''): HTMLInputElement {
  const input = document.createElement('input')
  input.value = value
  document.body.append(input)
  disposers.push(bind(input, mask, options))
  return input
}
function edit(input: HTMLInputElement, text: string, start = input.selectionStart!, end = input.selectionEnd!, inputType = 'insertText'): void {
  input.value = input.value.slice(0, start) + text + input.value.slice(end)
  input.setSelectionRange(start + text.length, start + text.length)
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType, data: text }))
}
function state(input: HTMLInputElement, value: string, caret: number): void {
  expect({ value: input.value, start: input.selectionStart, end: input.selectionEnd }).toEqual({ value, start: caret, end: caret })
}

for (const segmented of [true, false]) {
  describe(`advanced patterns (segmented=${segmented})`, () => {
    const options = { tokens, segmented }
    it.each([
      ['HH:HH:HH:HH:HH:HH', 'a1b2c3d4e5f6', 'a1:b2:c3:d4:e5:f6'],
      ['HH-HH', 'g1', '1'],
      ['UUU-999', 'abc123', 'ABC-123'],
      ['LLLLLLLLL', 'ÁÇÉñüøЖλ𐐀', 'ÁÇÉñüøЖλ𐐀'],
      ['\\A-999999', '123456', 'A-123456'],
      ['\\9-99', '12', '9-12'],
      ['\\Z-99', '12', 'Z-12'],
      ['\\\\99', '12', '\\12'],
      ['\\H-HH', 'ab', 'H-ab'],
      ['LL-LL', '𐐀Жλé', '𐐀Ж-λé'],
    ])('pure APIs and bind agree: %s', (mask, raw, expected) => {
      expect(applyMask(raw, mask, raw.length, options)).toEqual({ value: expected, caret: expected.length })
      expect(process(raw, mask, options)).toBe(expected)
      const built = buildMask(raw, mask, raw.length, options)
      expect(built.process()).toBe(expected)
      expect(built.caret).toBe(expected.length)
      expect(new Mask(raw, mask, raw.length, options).process()).toBe(expected)
      const input = field(mask, options)
      edit(input, raw)
      state(input, expected, expected.length)
      expect(process(expected, mask, options)).toBe(expected)
    })
    it('transforms after every keystroke, including insertions and selection replacement', () => {
      const input = field('UUU-999', options)
      const expected = ['A', 'AB', 'ABC-', 'ABC-1', 'ABC-12', 'ABC-123']
      Array.from('abc123').forEach((char, i) => { edit(input, char); state(input, expected[i], expected[i].length) })
      edit(input, 'x', 1, 2)
      state(input, 'AXC-123', 2)
      edit(input, 'yz', 0, 3, 'insertFromPaste')
      state(input, segmented ? 'YZ-123' : 'YZ', 2)
    })
    it('lowercases and supports function matchers', () => {
      const match: TokenMatcher = c => /^[A-Z]$/i.test(c)
      expect(process('AbC', 'LLL', { segmented, tokens: { L: { match, transform: c => c.toLowerCase() } } })).toBe('abc')
    })
    it('supports code-point width changes without losing source-to-output caret mapping', () => {
      const opts = { segmented, tokens: { X: { match: /[a𐐀]/u, transform: () => '𐐀' } } }
      expect(applyMask('aa', 'XX', 1, opts)).toEqual({ value: '𐐀𐐀', caret: 2 })
      const input = field('XX', opts)
      edit(input, 'a'); state(input, '𐐀', 2)
      edit(input, 'a', 0, 0); state(input, '𐐀𐐀', 2)
      edit(input, '', 0, 2, 'deleteContentForward'); state(input, '𐐀', 0)
      expect(applyMask('𐐀a', 'XX', 2, { segmented, tokens: { X: { match: /[a𐐀]/u, transform: () => 'a' } } })).toEqual({ value: 'aa', caret: 1 })
    })
    it.each(['', 'AB', 'e\u0301'])('rejects a transform that returns %j', transformed => {
      expect(() => process('a', 'U', { tokens: { U: { match: /a/, transform: () => transformed } }, segmented })).toThrow(RangeError)
    })
    it('does not split a supplementary code point at a supplied mid-surrogate caret', () => {
      expect(applyMask('𐐀Ж', 'LL', 1, options)).toEqual({ value: '𐐀Ж', caret: 0 })
    })
    it('treats one supplementary token key as one slot', () => {
      expect(process('ab', '🟩-🟩', { tokens: { '🟩': /[a-z]/ }, segmented })).toBe('a-b')
    })
    it('counts custom token capacity in ordered arrays, excluding invalid data', () => {
      expect(process('g1234', ['HH-HH', 'HH-HH-HH'], options)).toBe('12-34')
      expect(process('12345', ['HH-HH', 'HH-HH-HH'], options)).toBe('12-34-5')
      expect(process('𐐀Жλ', ['LL', 'LL-LL'], options)).toBe('𐐀Ж-λ')
    })
    it('uses parsed escapes for array capacity and keeps formatted inputs stable', () => {
      const masks = ['\\A-99', '\\A-99.99']
      expect(process('12', masks, { segmented })).toBe('A-12')
      expect(process('A-12', masks, { segmented })).toBe('A-12')
      expect(process('A-123', masks, { segmented })).toBe('A-12.3')
    })
    it('preserves non-token and trailing backslashes, and parses literal-only masks', () => {
      expect(process('12', '\\x99\\', { segmented })).toBe('\\x12\\')
      expect(process('1', '\\A\\9\\Z\\\\', { segmented })).toBe('A9Z\\')
      expect(process('1', '\\A', { segmented, eager: false })).toBe('')
      expect(process('', '\\A', { segmented })).toBe('')
    })
    it('does not feed an escaped prefix back into matching letter slots', () => {
      const input = field('\\A-UUU', options)
      edit(input, 'bc'); state(input, 'A-BC', 4)
      edit(input, 'a', 0, 0); state(input, 'A-ABC', 3)
    })
    it('also consumes an ordinary literal prefix after a beginning insertion', () => {
      const input = field('Q-UUU', options, 'Q-BC')
      edit(input, 'a', 0, 0); state(input, 'Q-ABC', 3)
    })
    it('keeps escaped data-looking separators out of an under-filled segment', () => {
      const input = field('UU\\A-99', options, 'ABA-12')
      edit(input, 'a', 0, 2)
      state(input, segmented ? 'AA-12' : 'A', 1)
      expect(process(input.value, 'UU\\A-99', options)).toBe(input.value)
    })
    it.each([true, false])('eager literals agree with escaped/custom capacity (eager=%s)', eager => {
      const opts = { ...options, eager }
      const input = field('\\A-HH\\Z-HH', opts)
      edit(input, 'ab')
      state(input, eager ? 'A-abZ-' : 'A-ab', eager ? 6 : 4)
      expect(getMaxLength('\\A-HH\\Z-HH', opts)).toBe(12)
    })
  })
}

it('custom tokens override locally without changing another operation or binding', () => {
  const first = field('999', { tokens: { '9': /[a-z]/ } })
  const second = field('999')
  edit(first, 'abc123'); state(first, 'abc', 3)
  edit(second, 'abc123'); state(second, '123', 3)
  expect(process('ÁÇЖ12ab', 'ZZ-AA')).toBe('ab-')
  expect(process('ÁÇЖ', 'AAA')).toBe('')
})
it.each(['', 'AB', '\\'])('rejects invalid token key %j before binding side effects', key => {
  const input = document.createElement('input')
  expect(() => bind(input, '999', { tokens: { [key]: /./ } })).toThrow(RangeError)
  expect(input.hasAttribute('data-masked')).toBe(false)
})
it('allows stateful/frozen regexes without reading or modifying lastIndex', () => {
  for (const regex of [/[a-z]/g, /[a-z]/y, /[a-z]/gy]) {
    regex.lastIndex = 17
    Object.freeze(regex)
    const input = field('HH-HH', { tokens: { H: regex } })
    for (let i = 0; i < 200; i++) {
      expect(process('abcd', 'HH-HH', { tokens: { H: regex } })).toBe('ab-cd')
      edit(input, 'abcd', 0, input.value.length)
      state(input, 'ab-cd', 5)
      expect(regex.lastIndex).toBe(17)
    }
  }
})
it('computes parsed UTF-16 maxima and leaves unbounded bindings free to grow', () => {
  expect(getMaxLength('\\A-999999')).toBe(8)
  expect(getMaxLength(['\\9', '\\\\99'])).toBe(3)
  expect(getMaxLength('LL-LL', { tokens })).toBe(9)
  expect(getMaxLength([], { tokens })).toBe(0)
  expect(getMaxLength('99', { resolveMask: card })).toBe(Infinity)
  const dynamic = field('99', { resolveMask: card })
  expect(dynamic.hasAttribute('maxlength')).toBe(false)
  edit(dynamic, '6212345678901234567')
  state(dynamic, '6212 3456 7890 1234 567', 23)
  const custom = field('L', { tokens })
  expect(custom.hasAttribute('maxlength')).toBe(false)
})
it('restores rebind attributes and preserves an author-supplied maxlength', () => {
  const input = document.createElement('input')
  const dispose = bind(input, '99')
  expect(input.maxLength).toBe(2)
  dispose()
  const dynamic = bind(input, '99', { resolveMask: card })
  expect(input.hasAttribute('maxlength')).toBe(false)
  dynamic()
  input.maxLength = 40
  bind(input, '99', { resolveMask: card })()
  expect(input.maxLength).toBe(40)
  input.removeAttribute('maxlength')
  bind(input, '\\A-999')
  expect(input.maxLength).toBe(5)
})

for (const segmented of [true, false]) {
  for (const eager of [true, false]) {
    describe(`resolver edits (segmented=${segmented}, eager=${eager})`, () => {
      const options = { segmented, eager, resolveMask: card }
      const mask = '9999 9999 9999 9999'
      it('formats forward typing with natural caret movement through a switch', () => {
        const input = field(mask, options)
        let data = ''
        for (const char of '341234567890123') {
          data += char
          edit(input, char)
          const expected = data.length <= 4 ? data : data.length <= 10 ? `${data.slice(0, 4)} ${data.slice(4)}` : `${data.slice(0, 4)} ${data.slice(4, 10)} ${data.slice(10)}`
          const value = eager && [4, 10].includes(data.length) ? expected + ' ' : expected
          state(input, value, value.length)
        }
      })
      it('switches back on prefix replacement, then edits the middle without an end jump', () => {
        const input = field(mask, options, '3412 345678 90123')
        edit(input, '51', 0, 2)
        state(input, '5112 3456 7890 123', 2)
        edit(input, '9', 7, 7)
        state(input, '5112 3495 6789 0123', 8)
        edit(input, '37', 0, 2, 'insertFromPaste')
        state(input, '3712 349567 89012', 2)
      })
      it('switches on backspace, forward Delete, and cross-segment replacement', () => {
        const input = field(mask, options, '3412 345678 90123')
        edit(input, '', 1, 2, 'deleteContentBackward')
        state(input, '3123 4567 8901 23', 1)
        edit(input, '', 0, 1, 'deleteContentForward')
        state(input, '1234 5678 9012 3', 0)
        edit(input, '34', 0, 10)
        state(input, '3490 123', 2)
      })
      it('switches equal-capacity layouts even while partially filled', () => {
        const opts = { segmented, eager, resolveMask: (v: string) => v.startsWith('1') ? '9-999' : '99-99' }
        const input = field('9999', opts, '1-2')
        edit(input, '2', 0, 1)
        state(input, eager ? '22-' : '22', 1)
        edit(input, '1', 0, 1)
        state(input, '1-2', 1)
      })
      it('removes invalid paste characters consistently across all APIs', () => {
        const value = '!?34x12 345678 90123'
        const expected = '3412 345678 90123'
        expect(process(value, mask, options)).toBe(expected)
        expect(buildMask(value, mask, value.length, options).process()).toBe(expected)
        expect(applyMask(value, mask, value.length, options)).toEqual({ value: expected, caret: expected.length })
        const input = field(mask, options)
        edit(input, value, 0, 0, 'insertFromPaste')
        state(input, expected, expected.length)
      })
    })
  }
}
it('resolver sees the same candidate data in pure and DOM paths, and runs only once per application', () => {
  const resolveMask = vi.fn(() => ['HH-HH', 'HH-HH-HH'])
  const options = { tokens, resolveMask }
  const expected = 'ab-cd-ef'
  expect(process('g ab:cd-ef', 'HHHHHH', options)).toBe(expected)
  expect(resolveMask.mock.calls).toEqual([['abcdef']])
  resolveMask.mockClear()
  const input = field('HHHHHH', options)
  edit(input, 'g ab:cd-ef')
  state(input, expected, 8)
  expect(resolveMask.mock.calls).toEqual([['abcdef']])
})
it('resolver transformations and escaped literals round-trip', () => {
  const resolveMask = vi.fn((value: string) => value.toUpperCase().startsWith('AB') ? '\\A-UU-UU' : '\\A-UUUU')
  const options = { tokens, resolveMask }
  expect(process('abcd', '\\A-UUUU', options)).toBe('A-AB-CD')
  expect(process('A-AB-CD', '\\A-UUUU', options)).toBe('A-AB-CD')
  expect(resolveMask.mock.calls).toEqual([['abcd'], ['ABCD']])
})
it('an empty array is an empty pattern, including when returned by a resolver', () => {
  expect(process('123', [])).toBe('')
  expect(process('123', '99', { resolveMask: () => [] })).toBe('')
})
it('resolver array selection does not parse an already-normalized stream as formatted text again', () => {
  expect(process('AB', '\\A-HHH', {
    tokens: { H: /[A-F]/ }, resolveMask: () => ['\\AH', '\\AHH'],
  })).toBe('AAB')
})

it('an unidentified invalid insertion cannot strand a caret inside a surrogate pair', () => {
  const input = field('LLL', { tokens }, '𐐀Ж')
  edit(input, '#', 0, 0, '')
  state(input, '𐐀Ж', 0)
})
it('input without a mutation and premature paste fallback preserve an untouched selection', async () => {
  const input = field('UUU-999', { tokens }, 'ABC-123')
  input.setSelectionRange(1, 5)
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
  expect([input.value, input.selectionStart, input.selectionEnd]).toEqual(['ABC-123', 1, 5])
  input.dispatchEvent(new Event('paste', { bubbles: true }))
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  expect([input.value, input.selectionStart, input.selectionEnd]).toEqual(['ABC-123', 1, 5])
})
it('resolver fallback maps a backwards edit across a changing prefix without native input', async () => {
  const input = field('9999 9999 9999 9999', { resolveMask: card }, '3412 345678 90123')
  input.setSelectionRange(2, 2)
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }))
  input.value = '312 345678 90123'
  input.setSelectionRange(1, 1)
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  state(input, '3123 4567 8901 23', 1)
})
it('fallback paste preserves the transformed insertion caret, including repeated calls', async () => {
  const input = field('UUU-UUU', { tokens }, 'AB-DE')
  input.dispatchEvent(new Event('paste', { bubbles: true }))
  input.value = 'ABc-DE'
  input.setSelectionRange(3, 3)
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
  state(input, 'ABC-DE', 3)
})
