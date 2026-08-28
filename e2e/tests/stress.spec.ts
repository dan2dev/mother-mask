import { test, expect } from '@playwright/test'

/**
 * Stress coverage for the "typing faster than the browser can commit
 * characters" hypothesis behind the reported Android caret bug: dispatch a
 * long burst of native `input` events back-to-back, synchronously, with zero
 * time between them and no `requestAnimationFrame` yield in between — the
 * most aggressive timing a real browser (not jsdom) can produce short of an
 * actual fast Android typist. Runs entirely inside the page via
 * `page.evaluate` so there's no CDP round-trip latency between keystrokes.
 */

interface BurstResult {
  finalValue: string
  /** true iff selectionStart === value.length after every single keystroke. */
  caretAlwaysAtEnd: boolean
  /** The first index (if any) where the caret was NOT at the end. */
  firstDriftIndex: number
  typedDigits: string
}

async function burstTypeDigits(
  page: import('@playwright/test').Page,
  mask: string | string[],
  digits: string,
): Promise<BurstResult> {
  return page.evaluate(
    ({ mask, digits }) => {
      const input = document.createElement('input')
      input.id = `dyn-${Math.random().toString(36).slice(2)}`
      document.body.appendChild(input)
      window.motherMask.bind(input, mask)

      let firstDriftIndex = -1
      for (let i = 0; i < digits.length; i++) {
        const ch = digits[i]
        const start = input.selectionStart ?? input.value.length
        const end = input.selectionEnd ?? start
        input.value = input.value.slice(0, start) + ch + input.value.slice(end)
        input.setSelectionRange(start + 1, start + 1)
        const event = new Event('input', { bubbles: true, cancelable: false })
        Object.defineProperty(event, 'data', { value: ch, configurable: true })
        Object.defineProperty(event, 'inputType', { value: 'insertText', configurable: true })
        input.dispatchEvent(event)

        if (firstDriftIndex === -1 && input.selectionStart !== input.value.length) {
          firstDriftIndex = i
        }
      }

      const result = {
        finalValue: input.value,
        caretAlwaysAtEnd: firstDriftIndex === -1,
        firstDriftIndex,
        typedDigits: digits,
      }
      input.remove()
      return result
    },
    { mask, digits },
  )
}

test.describe('synthetic fast-typing stress (zero-delay input-event bursts)', () => {
  test('100 randomized 11-digit bursts into a phone mask never drop, duplicate, or misplace a digit', async ({
    page,
  }) => {
    await page.goto('/')

    for (let trial = 0; trial < 100; trial++) {
      const digits = Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('')
      const result = await burstTypeDigits(page, ['(99) 9999-9999', '(99) 99999-9999'], digits)

      expect(result.finalValue.replace(/\D/g, ''), `trial ${trial}: digits`).toBe(digits)
      expect(result.caretAlwaysAtEnd, `trial ${trial}: caret drifted at char ${result.firstDriftIndex}`).toBe(
        true,
      )
    }
  })

  test('50 randomized 11-digit bursts into a CPF mask never drop, duplicate, or misplace a digit', async ({
    page,
  }) => {
    await page.goto('/')

    for (let trial = 0; trial < 50; trial++) {
      const digits = Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('')
      const result = await burstTypeDigits(page, '999.999.999-99', digits)

      expect(result.finalValue.replace(/\D/g, ''), `trial ${trial}: digits`).toBe(digits)
      expect(result.caretAlwaysAtEnd, `trial ${trial}: caret drifted at char ${result.firstDriftIndex}`).toBe(
        true,
      )
    }
  })

  test('a very long single burst (60 chars) keeps caret pinned to the end throughout', async ({ page }) => {
    await page.goto('/')
    const digits = Array.from({ length: 60 }, () => Math.floor(Math.random() * 10)).join('')
    const result = await burstTypeDigits(page, '999.999.999-99', digits)

    // Mask only holds 11 digits — everything past that is expected to be dropped,
    // but the caret must never have drifted from the end while it was filling.
    expect(result.finalValue.replace(/\D/g, '')).toBe(digits.slice(0, 11))
    expect(result.caretAlwaysAtEnd, `caret drifted at char ${result.firstDriftIndex}`).toBe(true)
  })
})

test('advanced pattern stress: 8000 seeded edits across transforms, escapes, Unicode and resolver layouts', async ({ page }) => {
  await page.goto('/')
  const count = await page.evaluate(() => {
    let seed = 0x1234abcd
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000 }
    const tokens = { U: { match: /[a-z]/gi, transform: (c: string) => c.toUpperCase() }, H: /[0-9a-f]/iy, L: /\p{L}/u }
    const configs = [
      { mask: 'UUU-UUU', chars: [...'abcXYZ#1'], valid: /^[A-Z-]*$/, resolveMask: undefined },
      { mask: '\\A-HH:HH', chars: [...'12afg#'], valid: /^(?:A-)?[a-f0-9:]*$/i, resolveMask: undefined },
      { mask: 'LL-LL', chars: [...'Жλ𐐀é#1'], valid: /^[\p{L}-]*$/u, resolveMask: undefined },
      { mask: 'UUUUUU', chars: [...'abcXYZ#1'], valid: /^[A-Z-]*$/, resolveMask: (v: string) => v.toUpperCase().startsWith('A') ? 'UU-UUUU' : 'UUU-UUU' },
    ]
    let count = 0
    for (const [index, cfg] of configs.entries()) {
      const input = document.createElement('input')
      document.body.append(input)
      const options = { tokens, resolveMask: cfg.resolveMask, segmented: index % 2 === 0 }
      const dispose = window.motherMask.bind(input, cfg.mask, options)
      try {
        for (let step = 0; step < 2000; step++) {
          const boundaries = [0]
          for (const char of input.value) boundaries.push(boundaries[boundaries.length - 1] + char.length)
          let a = Math.floor(random() * boundaries.length)
          let b = Math.floor(random() * boundaries.length)
          if (a > b) [a, b] = [b, a]
          const operation = Math.floor(random() * 6)
          if (operation === 0) b = a
          if (operation === 5) { a = 0; b = boundaries.length - 1 }
          const deleting = operation === 1 || operation === 2
          if (deleting && a === b) {
            if (operation === 1) a = Math.max(0, a - 1)
            else b = Math.min(boundaries.length - 1, b + 1)
          }
          const kind = operation === 1 ? 'deleteContentBackward' : operation === 2 ? 'deleteContentForward' : operation >= 4 ? 'insertFromPaste' : 'insertText'
          let text = ''
          if (!deleting) for (let n = 0; n < (operation >= 4 ? 3 : 1); n++) text += cfg.chars[Math.floor(random() * cfg.chars.length)]
          const raw = input.value.slice(0, boundaries[a]) + text + input.value.slice(boundaries[b])
          const pos = boundaries[a] + text.length
          input.value = raw
          input.setSelectionRange(pos, pos)
          input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: kind, data: text }))
          const formatted = window.motherMask.buildMask(input.value, cfg.mask, input.selectionStart!, { ...options, eager: !deleting }).process()
          if (!cfg.valid.test(input.value) || formatted !== input.value || input.selectionStart! < 0 || input.selectionStart! > input.value.length || input.selectionStart !== input.selectionEnd) {
            throw new Error(`seed=0x1234abcd mask=${cfg.mask} step=${step} ${kind} [${a},${b}] ${JSON.stringify(text)}: ${JSON.stringify(input.value)}@${input.selectionStart},${input.selectionEnd}; reapplied=${formatted}`)
          }
          count++
        }
      } finally { dispose(); input.remove() }
    }
    return count
  })
  expect(count).toBe(8000)
})
