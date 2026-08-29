import { describe, it, expect, afterEach } from 'vitest'
import { applyMask, bind } from '../src/index'
import type { ApplyMaskOptions, MaskPattern } from '../src/index'

// ---------------------------------------------------------------------------
// Edge cases for the three mechanisms that decide where characters land when
// an edit damages a divider:
//
//   1. divider *fragments* — a selection ending inside a multi-character
//      divider leaves its tail behind, and that tail still anchors.
//   2. the restored *frame* — a mask-opening literal comes back when the
//      structure around it survived, and stays gone when it did not.
//   3. the *caret boundary* — when a divider was swallowed whole there is
//      nothing positional left, so the caret plus an exact capacity fit is
//      the only evidence for where the untouched tail belongs.
//
// `tests/divider-fragments.test.ts` covers the reported interactions. This
// file covers the shapes and inputs around them: masks that cannot fragment,
// masks with no frame to restore, every place the caret rule may and may not
// fire, every `inputType` `bind()` can see, and the generative invariants
// (idempotence above all) that the whole design rests on.
// ---------------------------------------------------------------------------

const PHONE = '(999) 999-9999'
const FULL = '(555) 123-4567'
const CPF = '999.999.999-99'
const DATE = '99/99/9999'
/** Three-character divider — fragments at two different lengths. */
const SPACED = '99 - 99'
/** Divider made of a repeated character, so its tail is a prefix of itself. */
const REPEATED = '99--99'
/** The tail of "--" reads exactly like the whole "-" divider further along. */
const COLLIDING = '99--9-9'

const HEX: ApplyMaskOptions = { tokens: { H: /[0-9a-f]/i } }
const UPPER: ApplyMaskOptions = { tokens: { U: { match: /[a-z]/i, transform: (c) => c.toUpperCase() } } }

/** `bind()` masks every deletion with eager off, so both settings must agree. */
const EAGER_SETTINGS = [true, false] as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let createdInputs: HTMLInputElement[] = []

afterEach(() => {
  for (const el of createdInputs) el.remove()
  createdInputs = []
})

function setupInput(value = ''): HTMLInputElement {
  const input = document.createElement('input')
  input.value = value
  document.body.appendChild(input)
  createdInputs.push(input)
  return input
}

async function flushRafs(times = 2): Promise<void> {
  for (let i = 0; i < times; i++) {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  }
}

/** Render `applyMask`'s result with the caret marked. */
function mask(value: string, pattern: MaskPattern, caret: number, options?: ApplyMaskOptions): string {
  const m = applyMask(value, pattern, caret, options)
  return `${m.value.slice(0, m.caret)}|${m.value.slice(m.caret)}`
}

/** Same rendering for a bound input. */
function marked(input: HTMLInputElement): string {
  const c = input.selectionStart ?? 0
  return `${input.value.slice(0, c)}|${input.value.slice(c)}`
}

/** Replace the current selection with `text` and fire the `input` event a browser would. */
function typeOver(input: HTMLInputElement, text: string, inputType = 'insertText'): void {
  const start = input.selectionStart ?? 0
  const end = input.selectionEnd ?? start
  input.value = input.value.slice(0, start) + text + input.value.slice(end)
  input.setSelectionRange(start + text.length, start + text.length)
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType, data: text }))
}

/** Delete the current selection and fire `input` with the given `inputType`. */
function deleteSelection(input: HTMLInputElement, inputType = 'deleteContentBackward'): void {
  const start = input.selectionStart ?? 0
  const end = input.selectionEnd ?? start
  input.value = input.value.slice(0, start) + input.value.slice(end)
  input.setSelectionRange(start, start)
  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType }))
}

/** Characters of `value` that any slot of `pattern` would accept. */
function dataChars(value: string): string {
  return value.replace(/[^0-9A-Za-z]/g, '')
}

/** Is `small` obtainable from `large` by deleting characters? */
function isSubsequence(small: string, large: string): boolean {
  let i = 0
  for (const ch of large) if (i < small.length && small[i] === ch) i++
  return i === small.length
}

// ---------------------------------------------------------------------------
// 1. Mask shapes with nothing to fragment, frame or anchor
// ---------------------------------------------------------------------------

describe('mask shapes with no divider to damage', () => {
  // Each of these exercises an index the new lookups could run off the end of:
  // the divider that closes the first field (`t + 2`) and the field behind it
  // (`after + 1`) simply do not exist here.
  const shapes: [name: string, pattern: string, value: string, caret: number, eager: string, lazy: string][] = [
    ['single run, opening and closing literal', '(999)', '5)', 1, '(5', '(5'],
    ['single run, opening literal only left', '(999)', '5', 1, '(5', '(5'],
    ['closing literal only', '999)', '12', 2, '12', '12'],
    ['trailing literal', '99-', '12', 2, '12-', '12'],
    ['no leading literal', SPACED, '2 34', 1, '2 - 34', '2 - 34'],
    ['no slots at all', '--', '--', 1, '--', ''],
    ['a single slot', '9', '5', 1, '5', '5'],
    ['adjacent single-character dividers', '9..9', '1..2', 1, '1..2', '1..2'],
  ]

  for (const [name, pattern, value, caret, eager, lazy] of shapes) {
    it(name, () => {
      expect(applyMask(value, pattern, caret).value, 'eager').toBe(eager)
      expect(applyMask(value, pattern, caret, { eager: false }).value, 'lazy').toBe(lazy)
    })
  }

  it('never invents a frame for a mask that opens with a slot', () => {
    // `frameIntact` keys off a literal with no run in front of it; these have
    // none, so nothing may appear before the first digit at any caret.
    for (const pattern of [SPACED, REPEATED, CPF, DATE, '9', '99-']) {
      for (let caret = 0; caret <= 4; caret++) {
        for (const eager of EAGER_SETTINGS) {
          const out = applyMask('12', pattern, caret, { eager }).value
          expect(out.startsWith('1'), `${pattern}@${caret} eager=${eager} -> ${out}`).toBe(true)
        }
      }
    }
  })

  it('renders nothing but the frame for a value with no data in it', () => {
    for (const value of ['', ' ', ') ', '-', '()', 'xyz']) {
      expect(applyMask(value, PHONE, 0, { eager: false }).value, JSON.stringify(value)).toBe('')
    }
  })
})

// ---------------------------------------------------------------------------
// 2. Fragment matching precision
// ---------------------------------------------------------------------------

describe('divider fragments', () => {
  it('matches a tail of a divider built from one repeated character', () => {
    // The proper suffixes of "--" are just "-", which is also its own prefix.
    for (const eager of EAGER_SETTINGS) {
      expect(applyMask('1-23', REPEATED, 3, { eager }).value).toBe('1--23')
      expect(applyMask('-23', REPEATED, 0, { eager }).value).toBe('--23')
    }
  })

  it('lets a whole divider further along beat a tail sitting right here', () => {
    // At index 1 of "1-23" the "-" is both the "- " tail of run 1's " - " and
    // the entire "-" that introduces run 2 of `COLLIDING`. Intact wins, and
    // when it cannot hold what is left the character is treated as noise
    // rather than falling through to the weaker reading.
    for (const eager of EAGER_SETTINGS) {
      expect(applyMask('- 34', '99 - 99-99', 0, { eager }).value).toBe('-34')
      expect(applyMask('1--2', COLLIDING, 2, { eager }).value).toBe(eager ? '1--2-' : '1--2')
    }
  })

  it('accepts a fragment sitting at the very end of the value', () => {
    expect(applyMask('12 -', SPACED, 4).value).toBe('12 - ')
    expect(applyMask('12 -', SPACED, 4, { eager: false }).value).toBe('12')
  })

  it('rejects a fragment that cannot hold what is left after it', () => {
    for (const eager of EAGER_SETTINGS) {
      expect(applyMask(' 12345', SPACED, 0, { eager }).value).toBe('12 - 34')
    }
  })

  it('cannot fragment a single-character divider, for any mask', () => {
    // Every render below must be reachable without the fragment pass, which
    // is what keeps CPF/date/plate masks bit-for-bit unchanged by it.
    for (const pattern of [CPF, DATE, '999-999', '99999-999', 'ZZZ-9999']) {
      for (const value of ['1', '12', '123456', '1-2', '1.2', '1/2', 'A-1']) {
        for (let caret = 0; caret <= value.length; caret++) {
          for (const eager of EAGER_SETTINGS) {
            const out = applyMask(value, pattern, caret, { eager })
            expect(
              applyMask(out.value, pattern, out.caret, { eager }).value,
              `${pattern} ${JSON.stringify(value)}@${caret} eager=${eager}`,
            ).toBe(out.value)
          }
        }
      }
    }
  })
})

// ---------------------------------------------------------------------------
// 3. Where the caret boundary fires
// ---------------------------------------------------------------------------

describe('the caret boundary fires', () => {
  it('on a field in the middle of the mask', () => {
    // "25/12/2025", select "12/", type "9" — the year must not slide left.
    for (const eager of EAGER_SETTINGS) {
      expect(mask('25/92025', DATE, 4, { eager })).toBe('25/9|/2025')
    }
  })

  it('across several untouched fields at once', () => {
    // CPF "012.153.441-39", select "012." and type "9": everything after the
    // caret fills the remaining fields exactly, so none of it moves. Distinct
    // dividers are what make this readable — see the same-divider limit below.
    for (const eager of EAGER_SETTINGS) {
      expect(mask('9123-4567', PHONE, 1, { eager })).toBe('(9|) 123-4567')
    }
  })

  it('for custom token alphabets', () => {
    for (const eager of EAGER_SETTINGS) {
      expect(mask('fb2c3', 'HH:HH:HH', 1, { ...HEX, eager })).toBe('f|:b2:c3')
    }
  })

  it('for transforming tokens, on the transformed output', () => {
    for (const eager of EAGER_SETTINGS) {
      expect(mask('x123', 'UUU-999', 1, { ...UPPER, eager })).toBe('X|-123')
    }
  })

  it('using the capacity of the pattern an array mask actually picked', () => {
    const array = ['(99) 9999-9999', '(99) 99999-9999']
    for (const eager of EAGER_SETTINGS) {
      expect(mask('999988776', array, 1, { eager })).toBe('(9|) 9998-8776')
      // One digit fewer is no longer an exact fit, so it packs from the left.
      expect(mask('99998877', array, 1, { eager })).toBe('(9|9) 9988-77')
    }
  })

  it('for resolver masks, whose value stream has no literals at all', () => {
    const options: ApplyMaskOptions = { resolveMask: () => PHONE }
    for (const eager of EAGER_SETTINGS) {
      expect(mask('9123-4567', PHONE, 1, { ...options, eager })).toBe('(9|) 123-4567')
    }
  })

  it('never in flat mode, which is defined to repack from the left', () => {
    for (const eager of EAGER_SETTINGS) {
      expect(applyMask('9123-4567', PHONE, 1, { segmented: false, eager }).value).toBe('(912) 345-67')
    }
  })
})

// ---------------------------------------------------------------------------
// 4. Where the caret boundary must not fire
// ---------------------------------------------------------------------------

describe('the caret boundary stays out of the way', () => {
  it('when the caret carries no information', () => {
    // Caret 0 is the pure API's default and says nothing about an edit; a
    // caret past the end says the value was appended to, not split.
    for (const caret of [0, 9, 99, -1, -99]) {
      expect(applyMask('9123-4567', PHONE, caret).value, `caret=${caret}`).toBe('(912) 3-4567')
    }
  })

  it('when the caret sits on a field boundary rather than inside a field', () => {
    // "123-4567" after deleting "(555) ": the first field is empty, so there
    // is nothing the caret can be *behind* and the digits pack from the left.
    // A documented limit — typing over that same selection works, deleting it
    // does not, because only the typed character gives the caret meaning.
    expect(applyMask('123-4567', PHONE, 0).value).toBe('(123) -4567')
    expect(applyMask('123-4567', PHONE, 0, { eager: false }).value).toBe('(123-4567')
  })

  it('when a copy of the divider is still somewhere after the caret', () => {
    // The anchoring already knows where these belong. Overruling it here is
    // what broke idempotence: re-masking "82--2" has to give "82--2" back.
    for (const eager of EAGER_SETTINGS) {
      expect(mask('82--2', REPEATED, 1, { eager })).toBe('8|2--2')
      expect(mask('9) 123-4567', PHONE, 1, { eager })).toBe('(9|) 123-4567')
      expect(mask('25/9/2025', DATE, 4, { eager })).toBe('25/9|/2025')
    }
  })

  it('when the tail is not an exact fit for what is left of the mask', () => {
    // One digit short of filling "999-9999" (the ") " only differs by eager,
    // which decides whether an empty field keeps its divider showing).
    expect(mask('923-456', PHONE, 1)).toBe('(9|23) -456')
    expect(mask('923-456', PHONE, 1, { eager: false })).toBe('(9|23-456')
    // One digit too many — the "-" still anchors "5678" to the last field,
    // but the caret cannot move "1234" out of the one being typed into.
    for (const eager of EAGER_SETTINGS) {
      expect(mask('91234-5678', PHONE, 1, { eager })).toBe('(9|12) 34-5678')
    }
  })

  it('cannot cascade a value through several fields at once', () => {
    // Each further field has strictly less capacity behind it, so at most one
    // boundary can ever match. "39" must not walk to the end of a CPF.
    for (let caret = 0; caret <= 2; caret++) {
      for (const eager of EAGER_SETTINGS) {
        expect(applyMask('39', CPF, caret, { eager }).value, `caret=${caret}`).toBe('39')
      }
    }
  })

  it('declines while an identical divider survives, even a different one', () => {
    // A CPF's three "." dividers all read the same, so a survivor cannot be
    // told apart from the one the edit destroyed and the caret is not
    // trusted: "012." deleted and "9" typed still packs from the left.
    for (const eager of EAGER_SETTINGS) {
      expect(mask('9153.441-39', CPF, 1, { eager })).toBe('9|15.3.441-39')
    }
  })

  it('but a same-divider mask still fires once every copy is gone', () => {
    // The guard is about surviving evidence, not about the mask's shape. With
    // no "/" left after the caret there is nothing to contradict it.
    for (const eager of EAGER_SETTINGS) {
      expect(mask('25/92025', '99/99/99/99', 4, { eager })).toBe('25/9|/20/25')
    }
  })
})

// ---------------------------------------------------------------------------
// 5. Generative invariants
// ---------------------------------------------------------------------------

describe('invariants over generated values', () => {
  const ALPHABET = '0123456789abAB.-/:() '
  /**
   * Array masks pick their pattern by counting data characters, and `isData`
   * counts letters even for a digits-only mask — so a letter in the source
   * can select the longer pattern and then vanish from the render, which
   * re-selects the shorter one. That is a pre-existing quirk of pattern
   * selection rather than anything about dividers; it is pinned on its own
   * below, and swept here over the digits an array mask really receives.
   */
  const DIGITS_ONLY = '0123456789.-/:() '

  const MASKS: [MaskPattern, ApplyMaskOptions, string?][] = [
    [PHONE, {}], [CPF, {}], [DATE, {}], [SPACED, {}], [REPEATED, {}], [COLLIDING, {}],
    ['(999)', {}], ['99-', {}], ['9..9', {}], ['99 - 99-99', {}], ['\\A-99.99', {}],
    [['(99) 9999-9999', '(99) 99999-9999'], {}, DIGITS_ONLY], ['HH:HH:HH', HEX],
  ]

  function* generated(): Generator<{ pattern: MaskPattern; options: ApplyMaskOptions; value: string; caret: number; eager: boolean }> {
    let seed = 987654321
    const rnd = (): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed / 0x7fffffff
    }
    for (let i = 0; i < 12000; i++) {
      const [pattern, options, alphabet = ALPHABET] = MASKS[Math.floor(rnd() * MASKS.length)]
      let value = ''
      const length = Math.floor(rnd() * 16)
      for (let j = 0; j < length; j++) value += alphabet[Math.floor(rnd() * alphabet.length)]
      yield {
        pattern,
        options,
        value,
        caret: Math.floor(rnd() * (value.length + 1)),
        eager: rnd() < 0.5,
      }
    }
  }

  it('re-masking a render at its own caret is always a no-op', () => {
    // The invariant everything else depends on: `bind()` feeds its own output
    // back through the mask on the very next keystroke, so any drift here
    // would shuffle characters while the user types.
    const failures: string[] = []
    for (const { pattern, options, value, caret, eager } of generated()) {
      const first = applyMask(value, pattern, caret, { ...options, eager })
      const second = applyMask(first.value, pattern, first.caret, { ...options, eager })
      if (second.value !== first.value) {
        failures.push(`${pattern} ${JSON.stringify(value)}@${caret} eager=${eager}: ${JSON.stringify(first.value)} -> ${JSON.stringify(second.value)}`)
      }
      if (failures.length >= 5) break
    }
    expect(failures).toEqual([])
  })

  it('keeps the caret inside the render and off a surrogate half', () => {
    const failures: string[] = []
    for (const { pattern, options, value, caret, eager } of generated()) {
      const m = applyMask(value, pattern, caret, { ...options, eager })
      const split = /[\uDC00-\uDFFF]/.test(m.value[m.caret] ?? '')
      if (m.caret < 0 || m.caret > m.value.length || split) {
        failures.push(`${pattern} ${JSON.stringify(value)}@${caret}: caret ${m.caret} of ${JSON.stringify(m.value)}`)
      }
      if (failures.length >= 5) break
    }
    expect(failures).toEqual([])
  })

  it('only ever reorders data characters by dropping them, never by inventing them', () => {
    const failures: string[] = []
    for (const { pattern, options, value, caret, eager } of generated()) {
      // "\\A-99.99" renders a literal "A" that `dataChars` cannot tell from a
      // typed letter, and transforms rewrite the character itself.
      if (options === UPPER || pattern === '\\A-99.99') continue
      const m = applyMask(value, pattern, caret, { ...options, eager })
      const out = dataChars(m.value)
      if (!isSubsequence(out, dataChars(value))) {
        failures.push(`${pattern} ${JSON.stringify(value)}@${caret}: ${JSON.stringify(m.value)}`)
      }
      if (failures.length >= 5) break
    }
    expect(failures).toEqual([])
  })

  it('documents where array masks are not idempotent, independent of dividers', () => {
    // `isData` accepts letters even when every slot is a digit, so a stray
    // letter counts toward the data length an array mask selects its pattern
    // by. The render drops the letter, the count falls, and the next pass
    // picks the shorter pattern. Pre-existing and unrelated to divider
    // handling — pinned here so the sweep above can exclude it honestly and
    // a future fix has something to delete.
    const array = ['(99) 9999-9999', '(99) 99999-9999']
    const first = applyMask('a9438360524', array, 1)
    expect(first.value).toBe('(94) 38360-524')
    expect(applyMask(first.value, array, first.caret).value).toBe('(94) 3836-0524')
    // Digits alone round-trip cleanly, which is what the sweep asserts.
    const clean = applyMask('9438360524', array, 1)
    expect(applyMask(clean.value, array, clean.caret).value).toBe(clean.value)
  })

  it('holds the same invariants under a resolver, where literals never reach the mask', () => {
    const failures: string[] = []
    const options: ApplyMaskOptions = { resolveMask: (data) => (data.length <= 10 ? PHONE : CPF) }
    for (const { value, caret, eager } of generated()) {
      const first = applyMask(value, PHONE, caret, { ...options, eager })
      const second = applyMask(first.value, PHONE, first.caret, { ...options, eager })
      if (second.value !== first.value || first.caret > first.value.length) {
        failures.push(`${JSON.stringify(value)}@${caret}: ${JSON.stringify(first.value)}@${first.caret} -> ${JSON.stringify(second.value)}`)
      }
      if (failures.length >= 5) break
    }
    expect(failures).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 6. Every edit signal `bind()` can receive
// ---------------------------------------------------------------------------

describe('bind() reaches the same place from every edit signal', () => {
  const DELETE_TYPES = [
    'deleteContentBackward', 'deleteContentForward', 'deleteByCut', 'deleteByDrag',
    'deleteWordBackward', 'deleteSoftLineBackward', 'deleteHardLineBackward', 'deleteContent',
  ]
  const INSERT_TYPES = [
    'insertText', 'insertFromPaste', 'insertFromDrop', 'insertCompositionText', 'insertReplacementText',
  ]

  for (const inputType of DELETE_TYPES) {
    it(`restores the frame after ${inputType}`, () => {
      for (const eager of EAGER_SETTINGS) {
        const input = setupInput(FULL)
        bind(input, PHONE, { eager })
        input.setSelectionRange(0, 5) // "(555)", leaving the " " of ") "
        deleteSelection(input, inputType)
        expect(marked(input), `eager=${eager}`).toBe('(|) 123-4567')
      }
    })
  }

  for (const inputType of INSERT_TYPES) {
    it(`holds the untouched tail after ${inputType}`, () => {
      for (const eager of EAGER_SETTINGS) {
        const input = setupInput(FULL)
        bind(input, PHONE, { eager })
        input.setSelectionRange(0, 6) // "(555) ", divider and all
        typeOver(input, '9', inputType)
        expect(marked(input), `eager=${eager}`).toBe('(9|) 123-4567')
      }
    })
  }

  it('does the same on the keydown/rAF fallback path', async () => {
    for (const eager of EAGER_SETTINGS) {
      const input = setupInput(FULL)
      bind(input, PHONE, { eager })
      input.setSelectionRange(0, 6)
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '9', bubbles: true, cancelable: true }))
      input.value = '9123-4567'
      input.setSelectionRange(1, 1)
      await flushRafs()
      expect(marked(input), `eager=${eager}`).toBe('(9|) 123-4567')
    }
  })

  it('does the same on the paste path', async () => {
    for (const eager of EAGER_SETTINGS) {
      const input = setupInput(FULL)
      bind(input, PHONE, { eager })
      input.setSelectionRange(0, 6)
      input.dispatchEvent(new Event('paste', { bubbles: true }))
      input.value = '9123-4567'
      input.setSelectionRange(1, 1)
      await flushRafs()
      expect(marked(input), `eager=${eager}`).toBe('(9|) 123-4567')
    }
  })

  it('does the same through a composition session', () => {
    for (const eager of EAGER_SETTINGS) {
      const input = setupInput(FULL)
      bind(input, PHONE, { eager })
      input.setSelectionRange(0, 6)
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
      input.value = '9123-4567'
      input.setSelectionRange(1, 1)
      input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '9' }))
      expect(marked(input), `eager=${eager}`).toBe('(9|) 123-4567')
    }
  })

  it('reports exactly one onChange with the final value', () => {
    for (const [range, expected] of [[[0, 5], '() 123-4567'], [[0, 6], '(9) 123-4567']] as const) {
      const seen: string[] = []
      const input = setupInput(FULL)
      bind(input, PHONE, (value) => seen.push(value))
      input.setSelectionRange(range[0], range[1])
      if (range[1] === 5) deleteSelection(input)
      else typeOver(input, '9')
      expect(seen).toEqual([expected])
    }
  })
})

// ---------------------------------------------------------------------------
// 7. Nothing wedges
// ---------------------------------------------------------------------------

describe('editing always makes progress', () => {
  const CASES: [name: string, pattern: MaskPattern, full: string][] = [
    ['phone', PHONE, FULL],
    ['spaced', SPACED, '12 - 34'],
    ['repeated', REPEATED, '12--34'],
    ['colliding', COLLIDING, '12--3-4'],
    ['cpf', CPF, '012.153.441-39'],
    ['escaped prefix', '\\A-99.99', 'A-12.34'],
  ]

  for (const [name, pattern, full] of CASES) {
    it(`${name}: typing from any selection settles in one pass`, () => {
      // Whatever a keystroke lands on, the very next recompute must agree —
      // otherwise the value would keep shifting under the user's cursor.
      for (const eager of EAGER_SETTINGS) {
        for (let start = 0; start <= full.length; start++) {
          for (let end = start; end <= full.length; end++) {
            const input = setupInput(full)
            bind(input, pattern, { eager })
            input.setSelectionRange(start, end)
            typeOver(input, '9')
            const settled = marked(input)
            const caret = input.selectionStart ?? 0
            input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
            input.setSelectionRange(caret, caret)
            expect(marked(input), `${name} [${start},${end}) eager=${eager}`).toBe(settled)
          }
        }
      }
    })

    it(`${name}: backspacing from any caret reaches empty`, () => {
      for (const eager of EAGER_SETTINGS) {
        const input = setupInput(full)
        bind(input, pattern, { eager })
        input.setSelectionRange(full.length, full.length)
        for (let step = 0; step < full.length * 2 + 4; step++) {
          if (input.value === '') break
          const before = `${input.value}@${input.selectionStart}`
          const pos = input.selectionStart ?? 0
          const width = Array.from(input.value.slice(0, pos)).pop()?.length ?? 0
          input.value = input.value.slice(0, pos - width) + input.value.slice(pos)
          input.setSelectionRange(pos - width, pos - width)
          input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }))
          expect(`${input.value}@${input.selectionStart}`, `${name} eager=${eager} stuck at ${before}`).not.toBe(before)
        }
        expect(input.value, `${name} eager=${eager}`).toBe('')
      }
    })
  }
})
