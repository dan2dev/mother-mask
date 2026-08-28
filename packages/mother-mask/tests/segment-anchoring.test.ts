import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { applyMask, bind, buildMask, process } from '../src/index'
import type { ApplyMaskOptions, MaskPattern } from '../src/index'

// ---------------------------------------------------------------------------
// The separators still present in an edited value pin the characters around
// them to the segment they belong to, instead of every character being
// repacked from the left.
//
// Reported case: with "999.999.999-99" holding "012.153.441-39", selecting
// "012.153.441" and typing "015" produced "015.3.9" — the untouched "39" was
// dragged out of the last segment and scattered through the first two.
// ---------------------------------------------------------------------------

const CPF = '999.999.999-99'
const CNPJ = '99.999.999/9999-99'
const PHONE = '(99) 99999-9999'
const DATE = '99/99/9999'

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

async function flushRafs(times = 2): Promise<void> {
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

/** Type one character over the current selection the way a browser does, then fire `input`. */
function type(input: HTMLInputElement, ch: string): void {
  const start = input.selectionStart ?? 0
  const end = input.selectionEnd ?? start
  input.value = input.value.slice(0, start) + ch + input.value.slice(end)
  input.setSelectionRange(start + ch.length, start + ch.length)
  input.dispatchEvent(
    new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ch }),
  )
}

/** Apply a deletion the way a browser does (collapsed caret or selection), then fire `input`. */
function deleteWith(input: HTMLInputElement, inputType: 'deleteContentBackward' | 'deleteContentForward'): void {
  const start = input.selectionStart ?? 0
  const end = input.selectionEnd ?? start
  if (start !== end) {
    input.value = input.value.slice(0, start) + input.value.slice(end)
    input.setSelectionRange(start, start)
  } else if (inputType === 'deleteContentBackward') {
    const width = Array.from(input.value.slice(0, start)).pop()?.length ?? 0
    input.value = input.value.slice(0, start - width) + input.value.slice(start)
    input.setSelectionRange(start - width, start - width)
  } else {
    const width = Array.from(input.value.slice(start))[0]?.length ?? 0
    input.value = input.value.slice(0, start) + input.value.slice(start + width)
    input.setSelectionRange(start, start)
  }
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType }))
}

/** Dispatch a keydown and apply the browser's default action (the `keydown` fallback path). */
function press(input: HTMLInputElement, key: string, valueAfter: string, caretAfter: number): void {
  input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  input.value = valueAfter
  input.setSelectionRange(caretAfter, caretAfter)
}

/** Render the value with the caret marked, so failures read as what the user would see. */
function withCaret(input: HTMLInputElement): string {
  const c = input.selectionStart ?? 0
  return `${input.value.slice(0, c)}|${input.value.slice(c)}`
}

// ---------------------------------------------------------------------------
// The reported regression
// ---------------------------------------------------------------------------

describe('the reported regression — retyping everything but the last two digits', () => {
  it('keeps "39" in the final segment instead of scattering it', () => {
    // Browser state after selecting "012.153.441" out of "012.153.441-39"
    // and typing "015" over it.
    expect(applyMask('015-39', CPF, 3)).toEqual({ value: '015.-39', caret: 4 })
  })

  it('holds "39" in place through every keystroke of that replacement', () => {
    expect(applyMask('0-39', CPF, 1)).toEqual({ value: '0-39', caret: 1 })
    expect(applyMask('01-39', CPF, 2)).toEqual({ value: '01-39', caret: 2 })
    expect(applyMask('015-39', CPF, 3)).toEqual({ value: '015.-39', caret: 4 })
  })

  it('drives the whole interaction through bind() without the tail ever moving', () => {
    const input = setupInput()
    bind(input, CPF)
    input.value = '012.153.441-39'
    input.setSelectionRange(0, 11) // select "012.153.441"

    const seen: string[] = []
    for (const ch of '015153441') {
      type(input, ch)
      seen.push(withCaret(input))
    }

    expect(seen).toEqual([
      '0|-39',
      '01|-39',
      '015.|-39',
      '015.1|-39',
      '015.15|-39',
      '015.153.|-39',
      '015.153.4|-39',
      '015.153.44|-39',
      '015.153.441|-39',
    ])
    input.remove()
  })

  it('reaches the same place through the keydown fallback path', async () => {
    const input = setupInput()
    bind(input, CPF)
    input.value = '012.153.441-39'
    input.setSelectionRange(0, 11)
    // Browser replaces the selection, then our rAF pass reformats.
    press(input, '0', '0-39', 1)
    await flushRafs()
    expect(input.value).toBe('0-39')
    input.remove()
  })
})

// ---------------------------------------------------------------------------
// Anchoring
// ---------------------------------------------------------------------------

describe('applyMask() — separators anchor the characters that follow them', () => {
  it('pins a tail to the last segment across several empty ones', () => {
    expect(applyMask('015-39', CPF, 3).value).toBe('015.-39')
    expect(applyMask('-39', CPF, 0).value).toBe('-39')
  })

  it('works the same on a CNPJ mask, whose separators are all different', () => {
    expect(applyMask('012-39', CNPJ, 3)).toEqual({ value: '01.2-39', caret: 4 })
    expect(applyMask('0-39', CNPJ, 1)).toEqual({ value: '0-39', caret: 1 })
  })

  it('works across a multi-character separator', () => {
    expect(applyMask('11-7766', PHONE, 2)).toEqual({ value: '(11) -7766', caret: 5 })
    expect(applyMask('119-7766', PHONE, 3)).toEqual({ value: '(11) 9-7766', caret: 6 })
  })

  it('anchors on letter slots too', () => {
    expect(applyMask('A-1234', 'AAA-9999', 1)).toEqual({ value: 'A-1234', caret: 1 })
    expect(applyMask('AB-12', 'AAA-9999', 2)).toEqual({ value: 'AB-12', caret: 2 })
  })

  it('picks the nearest separator that matches, not the furthest', () => {
    // The "." could introduce either of two segments; the first one wins, so
    // "39" lands in segment 2 rather than being pushed to the end.
    expect(applyMask('012.39', CPF, 6)).toEqual({ value: '012.39', caret: 6 })
    expect(applyMask('0.39', CPF, 2)).toEqual({ value: '0.39', caret: 2 })
  })

  it('ignores a separator that would strand characters the mask can no longer hold', () => {
    // "-" introduces a 2-slot segment but 4 digits follow it, so honoring it
    // would silently drop two. Treated as noise and the digits reflow instead.
    expect(applyMask('015-3956', CPF, 3).value).toBe('015.395.6')
  })

  it('ignores characters that are not separators in this mask', () => {
    expect(applyMask('012/39', CPF, 3).value).toBe('012.39')
    expect(applyMask('12-3456', '99.99.99', 2).value).toBe('12.34.56')
  })

  it('skips stray characters that match no slot', () => {
    expect(applyMask('x-39', CPF, 0).value).toBe('-39')
    expect(applyMask('0x1-39', CPF, 3).value).toBe('01-39')
  })

  it('still reflows a run of raw characters across segments (paste, fast typing)', () => {
    expect(applyMask('01215344139', CPF, 11)).toEqual({ value: '012.153.441-39', caret: 14 })
    expect(applyMask('0123', CPF, 4)).toEqual({ value: '012.3', caret: 5 })
  })

  it('drops characters past the end of the mask', () => {
    expect(applyMask('012153441399', CPF, 12).value).toBe('012.153.441-39')
  })

  it('leaves a fully masked value untouched', () => {
    expect(applyMask('012.153.441-39', CPF, 14)).toEqual({ value: '012.153.441-39', caret: 14 })
    expect(applyMask('(11) 99988-7766', PHONE, 15).value).toBe('(11) 99988-7766')
  })
})

// ---------------------------------------------------------------------------
// Which separators get rendered
// ---------------------------------------------------------------------------

describe('applyMask() — separator visibility', () => {
  it('reveals the separator after a completely filled segment (eager)', () => {
    expect(applyMask('012', CPF, 3)).toEqual({ value: '012.', caret: 4 })
    expect(applyMask('11', PHONE, 2)).toEqual({ value: '(11) ', caret: 5 })
  })

  it('does not reveal it when the segment is still short', () => {
    expect(applyMask('01', CPF, 2)).toEqual({ value: '01', caret: 2 })
  })

  it('does not reveal it at all with { eager: false }', () => {
    expect(applyMask('012', CPF, 3, { eager: false })).toEqual({ value: '012', caret: 3 })
    expect(applyMask('015-39', CPF, 3, { eager: false })).toEqual({ value: '015-39', caret: 3 })
  })

  it('shows a separator that introduces a segment holding characters', () => {
    expect(applyMask('0123', CPF, 4).value).toBe('012.3')
    expect(applyMask('015-39', CPF, 3, { eager: false }).value).toBe('015-39')
  })

  it('drops the separators around segments that are simply empty', () => {
    // "015" + two empty segments + "39": only the eager "." after "015" and
    // the "-" introducing "39" earn their place.
    expect(applyMask('015-39', CPF, 3).value).toBe('015.-39')
    expect(applyMask('0-39', CPF, 1).value).toBe('0-39')
  })

  it('renders nothing for a value that is only separators', () => {
    expect(applyMask('.', CPF, 1)).toEqual({ value: '', caret: 0 })
    expect(applyMask('-', CPF, 1)).toEqual({ value: '', caret: 0 })
    expect(applyMask('--', CPF, 2)).toEqual({ value: '', caret: 0 })
    expect(applyMask('x', CPF, 1)).toEqual({ value: '', caret: 0 })
  })

  it('reveals a leading literal eagerly, but only with eager on', () => {
    expect(applyMask('1', PHONE, 1)).toEqual({ value: '(1', caret: 2 })
    expect(applyMask('1', PHONE, 1, { eager: false })).toEqual({ value: '(1', caret: 2 })
    // No data at all: the "(" is the eager reveal and nothing else.
    expect(applyMask('x', PHONE, 1).value).toBe('(')
    expect(applyMask('x', PHONE, 1, { eager: false }).value).toBe('')
  })

  it('reveals a trailing literal once the last segment fills', () => {
    expect(applyMask('123', '999-', 3)).toEqual({ value: '123-', caret: 4 })
    expect(applyMask('12', '999-', 2)).toEqual({ value: '12', caret: 2 })
    expect(applyMask('123', '999-', 3, { eager: false })).toEqual({ value: '123', caret: 3 })
  })
})

// ---------------------------------------------------------------------------
// Caret
// ---------------------------------------------------------------------------

describe('applyMask() — caret placement', () => {
  it('lands past a separator revealed by the segment just completed', () => {
    expect(applyMask('015-39', CPF, 3).caret).toBe(4) // "015.|-39"
    expect(applyMask('012', CPF, 3).caret).toBe(4) // "012.|"
    expect(applyMask('015.153-39', CPF, 7).caret).toBe(8) // "015.153.|-39"
  })

  it('stops before a separator that anchors text the user has not reached', () => {
    // The "-" belongs to the untouched "39"; jumping over it would put the
    // caret inside content that was never being edited.
    expect(applyMask('015-39', CPF, 3).value.slice(0, 4)).toBe('015.')
    expect(applyMask('0-39', CPF, 1).caret).toBe(1) // "0|-39"
    expect(applyMask('01-39', CPF, 2).caret).toBe(2) // "01|-39"
  })

  it('never drags the caret backwards over a separator already passed', () => {
    expect(applyMask('012.153.441-39', CPF, 4).caret).toBe(4)
    expect(applyMask('012.153.441-39', CPF, 8).caret).toBe(8)
    expect(applyMask('012.153.441-39', CPF, 12).caret).toBe(12)
    expect(applyMask('(11) 99988-7766', PHONE, 5).caret).toBe(5)
  })

  it('stays before the separator when inserting in the middle', () => {
    // "12-3" with '5' inserted after '1' → "15-23", caret after "15".
    expect(applyMask('152-3', '99-99', 2)).toEqual({ value: '15-23', caret: 2 })
    expect(applyMask('152-34-5', '99-99-99', 2)).toEqual({ value: '15-23-45', caret: 2 })
  })

  it('handles a caret at the very start and past the end of the value', () => {
    expect(applyMask('015-39', CPF, 0).caret).toBe(0)
    expect(applyMask('015-39', CPF, 99).caret).toBe(7)
    expect(applyMask('', CPF, 0)).toEqual({ value: '', caret: 0 })
  })
})

// ---------------------------------------------------------------------------
// Round-trip stability
//
// bind() feeds the rendered value straight back through the mask on the next
// keystroke, so anything that does not re-mask to itself makes characters
// drift while the user types.
// ---------------------------------------------------------------------------

describe('applyMask() — re-masking a masked value changes nothing', () => {
  const fixedPoints: [string, string][] = [
    [CPF, '015.-39'],
    [CPF, '0-39'],
    [CPF, '01-39'],
    [CPF, '015.1-39'],
    [CPF, '015.153.-39'],
    [CPF, '012.153.441-39'],
    [CPF, '012.'],
    [CPF, '012..44'],
    [CPF, '-39'],
    [CNPJ, '01.2-39'],
    [PHONE, '(11) -7766'],
    [PHONE, '(11) 99988-7766'],
    [PHONE, '(0-7766'],
    [DATE, '1//2025'],
    [DATE, '25/12/2025'],
    ['AAA-9999', 'A-1234'],
  ]

  for (const [mask, value] of fixedPoints) {
    it(`${mask} — "${value}"`, () => {
      const once = applyMask(value, mask, value.length)
      expect(once.value).toBe(value)
      const twice = applyMask(once.value, mask, once.caret)
      expect(twice.value).toBe(value)
    })
  }

  it('keeps a repeated separator that would otherwise be ambiguous', () => {
    // Hiding the first "/" would leave "1/2025", which re-reads as 1/20/25 —
    // the year would break apart on the next keystroke. Both are kept.
    expect(applyMask('1//2025', DATE, 3).value).toBe('1//2025')
    expect(applyMask('1//25', DATE, 3).value).toBe('1//25')
    // With every separator identical, how many are kept is what records which
    // segment the trailing "2" sits in — so each count is its own fixed point.
    expect(applyMask('1.2', '99.99.99.99', 3).value).toBe('1.2')
    expect(applyMask('1..2', '99.99.99.99', 4).value).toBe('1..2')
    expect(applyMask('1...2', '99.99.99.99', 5).value).toBe('1...2')
  })

  it('documents the limit of separator anchoring on same-separator masks', () => {
    // "1/2025" is genuinely ambiguous: with only one "/" left there is no way
    // to tell "year 2025" from "month 20, year 25". Masks whose separators
    // differ (CPF, CNPJ, phone) never hit this.
    expect(applyMask('1/2025', DATE, 2).value).toBe('1/20/25')
  })

  it('is a fixed point for randomly generated values', () => {
    const masks = [CPF, CNPJ, PHONE, DATE, '99:99', 'AAA-9999', 'ZZ-99.99', '99--99', '(99)', '9']
    const alphabet = '0123456789AByz./-: ()'
    let seed = 20240815
    const rnd = (): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }

    for (let i = 0; i < 20000; i++) {
      const mask = masks[Math.floor(rnd() * masks.length)]
      let value = ''
      const len = Math.floor(rnd() * 18)
      for (let j = 0; j < len; j++) value += alphabet[Math.floor(rnd() * alphabet.length)]
      const caret = Math.floor(rnd() * (value.length + 1))
      const eager = rnd() < 0.5

      const first = applyMask(value, mask, caret, { eager })
      const second = applyMask(first.value, mask, first.caret, { eager })
      expect({ mask, value, caret, eager, out: second.value }).toEqual({
        mask,
        value,
        caret,
        eager,
        out: first.value,
      })
    }
  })

  it('only ever emits mask characters in mask order', () => {
    const masks = [CPF, CNPJ, PHONE, DATE, '99:99', 'AAA-9999']
    const alphabet = '0123456789AByz./-: ()'
    let seed = 987654321
    const rnd = (): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }

    const isData = (ch: string): boolean =>
      (ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')
    const fitsSlot = (ch: string, slot: string): boolean => {
      if (slot === '9') return ch >= '0' && ch <= '9'
      if (slot === 'Z') return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')
      if (slot === 'A') return isData(ch)
      return false
    }

    for (let i = 0; i < 20000; i++) {
      const mask = masks[Math.floor(rnd() * masks.length)]
      let value = ''
      const len = Math.floor(rnd() * 18)
      for (let j = 0; j < len; j++) value += alphabet[Math.floor(rnd() * alphabet.length)]
      const out = applyMask(value, mask, value.length).value

      // Every emitted character must be consumable by a later mask position
      // than the previous one — literals as themselves, data in a slot.
      let m = 0
      for (const ch of out) {
        while (m < mask.length && !(fitsSlot(ch, mask[m]) || mask[m] === ch)) m++
        expect({ mask, value, out, ch, exhausted: m >= mask.length }).toEqual({
          mask,
          value,
          out,
          ch,
          exhausted: false,
        })
        m++
      }
    }
  })
})

// ---------------------------------------------------------------------------
// bind() interactions
// ---------------------------------------------------------------------------

describe('bind() — editing around a pinned tail', () => {
  let input: HTMLInputElement

  beforeEach(() => {
    input = setupInput()
  })

  afterEach(() => {
    input.remove()
  })

  it('replaces a multi-segment selection by paste without disturbing the tail', async () => {
    bind(input, CPF)
    input.value = '012.153.441-39'
    input.setSelectionRange(0, 11)
    input.value = `015${input.value.slice(11)}`
    input.setSelectionRange(3, 3)
    input.dispatchEvent(new Event('paste', { bubbles: true }))
    await flushRafs(1)
    expect(input.value).toBe('015.-39')
  })

  it('keeps typing forward from the pinned state until the mask is full', () => {
    bind(input, CPF)
    input.value = '015.-39'
    input.setSelectionRange(4, 4)
    for (const ch of '153441') type(input, ch)
    expect(withCaret(input)).toBe('015.153.441|-39')
  })

  it('backspacing the eagerly revealed separator does not bring it back', () => {
    bind(input, CPF)
    input.value = '015.-39'
    input.setSelectionRange(4, 4)
    deleteWith(input, 'deleteContentBackward')
    expect(input.value).toBe('015-39')
  })

  it('backspacing a digit leaves the tail where it is', () => {
    bind(input, CPF)
    input.value = '015-39'
    input.setSelectionRange(3, 3)
    deleteWith(input, 'deleteContentBackward')
    expect(input.value).toBe('01-39')
    deleteWith(input, 'deleteContentBackward')
    expect(input.value).toBe('0-39')
  })

  it('deleting a selection that spans segments keeps the surviving tail', () => {
    bind(input, CPF)
    input.value = '012.153.441-39'
    input.setSelectionRange(0, 11)
    deleteWith(input, 'deleteContentBackward')
    expect(input.value).toBe('-39')
  })

  it('retypes a middle segment without pulling digits across the separators', () => {
    bind(input, CPF)
    input.value = '012.153.441-39'
    input.setSelectionRange(4, 7) // select "153"
    for (const ch of '987') type(input, ch)
    expect(withCaret(input)).toBe('012.987|.441-39')
  })

  it('replaces the day of a date without breaking the year apart', () => {
    bind(input, DATE)
    input.value = '25/12/2025'
    input.setSelectionRange(0, 2) // select "25"
    for (const ch of '07') type(input, ch)
    expect(withCaret(input)).toBe('07|/12/2025')
  })
})

// ---------------------------------------------------------------------------
// Empty middle segments keep their surviving boundaries
// ---------------------------------------------------------------------------

interface EmptySegmentCase {
  name: string
  mask: MaskPattern
  left: string
  middle: string
  right: string
  refill: string
  expectedRefill?: string
  options?: ApplyMaskOptions
}

const EMPTY_SEGMENT_CASES: EmptySegmentCase[] = [
  { name: 'US phone', mask: '(999) 999-9999', left: '(111) ', middle: '222', right: '-3333', refill: '456' },
  { name: 'partial area code', mask: '(999) 999-9999', left: '(11) ', middle: '222', right: '-3333', refill: '456' },
  { name: 'empty area code', mask: '(999) 999-9999', left: '() ', middle: '222', right: '-3333', refill: '456' },
  { name: 'partial middle segment', mask: '(999) 999-9999', left: '(111) ', middle: '2', right: '-3333', refill: '456' },
  { name: 'phone array shrinking capacity', mask: ['(999) 999-9999', '(999) 9999-9999'], left: '(111) ', middle: '2222', right: '-3333', refill: '456' },
  { name: 'repeated dividers', mask: DATE, left: '25/', middle: '12', right: '/2025', refill: '07' },
  { name: 'distinct dividers', mask: '99:99-99', left: '1:', middle: '22', right: '-33', refill: '45' },
  { name: 'consecutive empty segments', mask: '99:99/99-99', left: '12:/', middle: '22', right: '-33', refill: '45' },
  { name: 'escaped literal token', mask: '99\\A-99-99', left: '1A-', middle: '22', right: '-33', refill: '45' },
  { name: 'transformed tokens', mask: 'UU::UU-UU', left: 'AB::', middle: 'CD', right: '-EF', refill: 'gh', expectedRefill: 'GH', options: { tokens: { U: { match: /[a-z]/i, transform: c => c.toUpperCase() } } } },
  { name: 'Unicode tokens', mask: 'LL::LL--LL', left: '𐐀λ::', middle: '𐐀Ж', right: '--ñø', refill: 'Çü', options: { tokens: { L: /\p{L}/u } } },
  { name: 'Unicode dividers', mask: '99🧭 99→99', left: '12🧭 ', middle: '34', right: '→56', refill: '78' },
]

for (const eager of [true, false]) {
  describe('empty middle segments retain existing dividers (eager=' + eager + ')', () => {
    for (const cfg of EMPTY_SEGMENT_CASES) {
      it(cfg.name + ': pure APIs preserve the empty segment and caret', () => {
        const value = cfg.left + cfg.right
        const options = { ...cfg.options, eager }
        const result = applyMask(value, cfg.mask, cfg.left.length, options)
        expect(result).toEqual({ value, caret: cfg.left.length })
        expect(process(value, cfg.mask, options)).toBe(value)
        const built = buildMask(value, cfg.mask, cfg.left.length, options)
        expect(built.process()).toBe(value)
        expect(built.caret).toBe(cfg.left.length)
        expect(applyMask(result.value, cfg.mask, result.caret, options)).toEqual(result)
      })

      for (const direction of ['deleteContentBackward', 'deleteContentForward'] as const) {
        it(cfg.name + ': ' + direction + ' empties and refills only the middle segment', () => {
          const input = setupInput()
          input.value = cfg.left + cfg.middle + cfg.right
          const dispose = bind(input, cfg.mask, { ...cfg.options, eager })
          const at = cfg.left.length + (direction === 'deleteContentBackward' ? cfg.middle.length : 0)
          input.setSelectionRange(at, at)
          try {
            const chars = Array.from(cfg.middle)
            for (let n = 1; n <= chars.length; n++) {
              deleteWith(input, direction)
              const remaining = (direction === 'deleteContentBackward' ? chars.slice(0, -n) : chars.slice(n)).join('')
              const caret = cfg.left.length + (direction === 'deleteContentBackward' ? remaining.length : 0)
              expect([input.value, input.selectionStart, input.selectionEnd]).toEqual([cfg.left + remaining + cfg.right, caret, caret])
            }
            // Invalid input in the gap must not remove dividers or move the caret.
            type(input, '#')
            expect([input.value, input.selectionStart, input.selectionEnd]).toEqual([cfg.left + cfg.right, cfg.left.length, cfg.left.length])
            for (const ch of cfg.refill) type(input, ch)
            const filled = cfg.expectedRefill ?? cfg.refill
            expect([input.value, input.selectionStart, input.selectionEnd]).toEqual([cfg.left + filled + cfg.right, cfg.left.length + filled.length, cfg.left.length + filled.length])
          } finally {
            dispose()
            input.remove()
          }
        })
      }
    }

    it('selection deletion/cut and invalid paste preserve the gap; select-all still clears it', () => {
      for (const inputType of ['deleteContentBackward', 'deleteContentForward', 'deleteByCut', 'deleteWordBackward', 'deleteWordForward']) {
        const input = setupInput()
        input.value = '(111) 222-3333'
        const dispose = bind(input, '(999) 999-9999', { eager })
        try {
          input.setSelectionRange(6, 9)
          input.value = '(111) -3333'
          input.setSelectionRange(6, 6)
          input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType }))
          expect([input.value, input.selectionStart, input.selectionEnd]).toEqual(['(111) -3333', 6, 6])
          input.value = '(111) #!?-3333'
          input.setSelectionRange(9, 9)
          input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste', data: '#!?' }))
          expect([input.value, input.selectionStart, input.selectionEnd]).toEqual(['(111) -3333', 6, 6])
          input.value = '(111) 45-3333'
          input.setSelectionRange(8, 8)
          input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertFromPaste', data: '45' }))
          expect([input.value, input.selectionStart, input.selectionEnd]).toEqual(['(111) 45-3333', 8, 8])
          input.setSelectionRange(0, input.value.length)
          deleteWith(input, 'deleteContentBackward')
          expect([input.value, input.selectionStart, input.selectionEnd]).toEqual(['', 0, 0])
        } finally {
          dispose()
          input.remove()
        }
      }
    })

    it('the keydown/rAF fallback preserves both dividers through all three Backspaces', async () => {
      const input = setupInput()
      input.value = '(111) 222-3333'
      const dispose = bind(input, '(999) 999-9999', { eager })
      input.setSelectionRange(9, 9)
      try {
        for (const middle of ['22', '2', '']) {
          const caret = 6 + middle.length
          press(input, 'Backspace', '(111) ' + middle + '-3333', caret)
          await flushRafs()
          expect([input.value, input.selectionStart, input.selectionEnd]).toEqual(['(111) ' + middle + '-3333', caret, caret])
        }
      } finally {
        dispose()
        input.remove()
      }
    })
  })
}

interface BackwardCaretCase {
  name: string
  mask: MaskPattern
  value: string
  caret: number
  expected: string
  expectedCaret: number
  options?: ApplyMaskOptions
}

const BACKWARD_CARET_CASES: BackwardCaretCase[] = [
  { name: 'US phone', mask: '(999) 999-9999', value: '(111) -4444', caret: 6, expected: '(111-4444', expectedCaret: 4 },
  { name: 'partial area code', mask: '(999) 999-9999', value: '(11) -4444', caret: 5, expected: '(11-4444', expectedCaret: 3 },
  { name: 'empty area code', mask: '(999) 999-9999', value: '() -4444', caret: 3, expected: '(-4444', expectedCaret: 1 },
  { name: 'phone array', mask: ['(999) 999-9999', '(999) 9999-9999'], value: '(111) -4444', caret: 6, expected: '(111-4444', expectedCaret: 4 },
  { name: 'long divider', mask: '99 / 99-99', value: '11 / -44', caret: 5, expected: '11-44', expectedCaret: 2 },
  { name: 'overlapping divider text', mask: '99 :: 99:99', value: '11 :: :44', caret: 6, expected: '11:44', expectedCaret: 2 },
  { name: 'Unicode divider', mask: '99🧭 99-99', value: '11🧭 -44', caret: 5, expected: '11-44', expectedCaret: 2 },
  { name: 'Unicode data', mask: 'LL :: LL--LL', value: '𐐀λ :: --Жé', caret: 7, expected: '𐐀λ--Жé', expectedCaret: 3, options: { tokens: { L: /\p{L}/u } } },
  { name: 'transformed data', mask: 'UU :: UU--UU', value: 'AB :: --CD', caret: 6, expected: 'AB--CD', expectedCaret: 2, options: { tokens: { U: { match: /[a-z]/i, transform: c => c.toUpperCase() } } } },
  { name: 'escaped token literal', mask: '99\\A:: 99-99', value: '11A:: -44', caret: 6, expected: '11-44', expectedCaret: 2 },
  { name: 'escaped divider overlaps the next one', mask: '99\\A- 99-99', value: '11A- -44', caret: 5, expected: '11-44', expectedCaret: 2 },
  { name: 'consecutive empty segments', mask: '99] 99/99-99', value: '11] /-44', caret: 4, expected: '11/-44', expectedCaret: 2 },
  { name: 'retained divider after a populated segment', mask: '(999) 999-9999', value: '(111) 222-4444', caret: 6, expected: '(111) 222-4444', expectedCaret: 5 },
  { name: 'inside a retained divider', mask: '(999) 999-9999', value: '(111) 222-4444', caret: 5, expected: '(111) 222-4444', expectedCaret: 4 },
  { name: 'trailing eager divider', mask: '999.999', value: '111.', caret: 4, expected: '111', expectedCaret: 3 },
  { name: 'single-character retained divider', mask: '99-99', value: '11-44', caret: 3, expected: '11-44', expectedCaret: 2 },
  { name: 'shorter array retains the left divider', mask: ['HH-HH', 'HH-HH-HH'], value: 'ab-c-ef', caret: 4, expected: 'ab-ef', expectedCaret: 3, options: { tokens: { H: /[a-f]/ } } },
  { name: 'unchanged prefix with punctuation removed later', mask: '(999) 999-9999', value: '(111) 222-4444#!?', caret: 6, expected: '(111) 222-4444', expectedCaret: 5 },
]

for (const eager of [true, false]) {
  describe('backward caret follows collapsed dividers (eager=' + eager + ')', () => {
    it('exhausts every prefix caret position without crossing into the untouched tail', () => {
      for (const cfg of BACKWARD_CARET_CASES) {
        const suffix = cfg.expected.slice(cfg.expectedCaret)
        let start = 0
        for (const ch of cfg.value.slice(0, cfg.caret)) {
          start += ch.length
          const input = setupInput()
          input.value = cfg.value
          const dispose = bind(input, cfg.mask, { ...cfg.options, eager })
          input.setSelectionRange(start, start)
          try {
            while (input.selectionStart! > 0) {
              const before = input.selectionStart!
              deleteWith(input, 'deleteContentBackward')
              const caret = input.selectionStart!
              expect(input.value.endsWith(suffix), JSON.stringify({ name: cfg.name, start, before, value: input.value, suffix })).toBe(true)
              expect(input.selectionEnd).toBe(caret)
              expect(caret).toBeLessThan(before)
              expect(caret).toBeLessThanOrEqual(input.value.length - suffix.length)
              expect(caret).toBeGreaterThanOrEqual(0)
              expect(/[\uDC00-\uDFFF]/.test(input.value[caret] ?? '')).toBe(false)
            }
          } finally {
            dispose()
            input.remove()
          }
        }
      }
    })

    for (const cfg of BACKWARD_CARET_CASES) {
      it(cfg.name, () => {
        const input = setupInput()
        input.value = cfg.value
        const dispose = bind(input, cfg.mask, { ...cfg.options, eager })
        input.setSelectionRange(cfg.caret, cfg.caret)
        try {
          deleteWith(input, 'deleteContentBackward')
          expect([input.value, input.selectionStart, input.selectionEnd]).toEqual([cfg.expected, cfg.expectedCaret, cfg.expectedCaret])
          expect(input.selectionStart).toBeLessThan(cfg.caret)
        } finally {
          dispose()
          input.remove()
        }
      })
    }

    for (const fallback of [false, true]) {
      it('keeps moving left through the complete phone sequence (fallback=' + fallback + ')', async () => {
        const input = setupInput()
        input.value = '(111) 222-4444'
        const dispose = bind(input, '(999) 999-9999', { eager })
        input.setSelectionRange(9, 9)
        const steps: [string, number][] = [
          ['(111) 22-4444', 8], ['(111) 2-4444', 7], ['(111) -4444', 6],
          ['(111-4444', 4], ['(11-4444', 3], ['(1-4444', 2], ['(-4444', 1], ['-4444', 0],
        ]
        try {
          for (const [value, caret] of steps) {
            if (fallback) {
              const pos = input.selectionStart!
              press(input, 'Backspace', input.value.slice(0, pos - 1) + input.value.slice(pos), pos - 1)
              await flushRafs()
            } else deleteWith(input, 'deleteContentBackward')
            expect([input.value, input.selectionStart, input.selectionEnd]).toEqual([value, caret, caret])
          }
          deleteWith(input, 'deleteContentBackward')
          expect([input.value, input.selectionStart, input.selectionEnd]).toEqual(['-4444', 0, 0])
        } finally {
          dispose()
          input.remove()
        }
      })
    }

    it('maps backwards selections at every boundary inside the disappearing divider', () => {
      for (const [start, end] of [[4, 5], [5, 6], [4, 6]]) {
        const input = setupInput()
        input.value = '(111) -4444'
        const dispose = bind(input, '(999) 999-9999', { eager })
        input.setSelectionRange(start, end, 'backward')
        try {
          deleteWith(input, 'deleteContentBackward')
          expect([input.value, input.selectionStart, input.selectionEnd]).toEqual(['(111-4444', 4, 4])
        } finally {
          dispose()
          input.remove()
        }
      }
    })

    it('handles backward word and line deletion input types without resurrecting dividers', () => {
      for (const [inputType, raw, caret, value, expectedCaret] of [
        ['deleteWordBackward', '(111 -4444', 5, '(111-4444', 4],
        ['deleteSoftLineBackward', '-4444', 0, '-4444', 0],
        ['deleteHardLineBackward', '-4444', 0, '-4444', 0],
      ] as const) {
        const input = setupInput()
        input.value = '(111) -4444'
        const dispose = bind(input, '(999) 999-9999', { eager })
        try {
          input.value = raw
          input.setSelectionRange(caret, caret)
          input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType }))
          expect([input.value, input.selectionStart, input.selectionEnd]).toEqual([value, expectedCaret, expectedCaret])
        } finally {
          dispose()
          input.remove()
        }
      }
    })

    it('uses the input event when Android key information is missing or unidentified', async () => {
      for (const key of ['', 'Unidentified', 'Backspace']) {
        const input = setupInput()
        input.value = '(111) -4444'
        const dispose = bind(input, '(999) 999-9999', { eager })
        input.setSelectionRange(6, 6)
        try {
          input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
          deleteWith(input, 'deleteContentBackward')
          expect([input.value, input.selectionStart, input.selectionEnd]).toEqual(['(111-4444', 4, 4])
          await flushRafs()
          expect([input.value, input.selectionStart, input.selectionEnd]).toEqual(['(111-4444', 4, 4])
        } finally {
          dispose()
          input.remove()
        }
      }
    })
  })
}

// Flat mode is deliberately untouched.
describe('{ segmented: false } still repacks everything from the left', () => {
  it('drags the tail forward, which is the whole point of flat mode', () => {
    expect(applyMask('015-39', CPF, 3, { segmented: false }).value).toBe('015.39')
    expect(applyMask('0-39', CPF, 1, { segmented: false }).value).toBe('039.')
  })

  it('is unaffected by the anchoring rules', () => {
    expect(applyMask('25/3/2025', DATE, 4, { segmented: false }).value).toBe('25/32/025')
  })
})
