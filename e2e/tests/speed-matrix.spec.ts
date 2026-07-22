import { test, expect, type Page } from '@playwright/test'

/**
 * Real-browser coverage across the "speed" dimension: the same typing
 * session replayed at several genuine timing profiles, from an impossible
 * zero-delay burst down to slow, deliberate keystrokes, plus randomized
 * jitter in between. Delays here are real (`setTimeout` inside the page, or
 * Playwright's own per-key `delay`), so — unlike the jsdom unit suite —
 * this exercises the actual browser event loop, timers, and animation
 * frame scheduling under each speed.
 */

const SPEEDS = [0, 1, 5, 15, 50] as const

interface MaskConfig {
  name: string
  mask: string | string[]
  digits: string
  /** The fully-formatted value typing `digits` end-to-end must produce. */
  expected: string
}

const MASKS: MaskConfig[] = [
  { name: 'CPF', mask: '999.999.999-99', digits: '12345678901', expected: '123.456.789-01' },
  {
    name: 'phone array',
    mask: ['(99) 9999-9999', '(99) 99999-9999'],
    digits: '11999887766',
    expected: '(11) 99988-7766',
  },
  { name: 'date', mask: '99/99/9999', digits: '25122025', expected: '25/12/2025' },
  { name: 'mercosul plate', mask: 'ZZZ-9Z99', digits: 'ABC1D23', expected: 'ABC-1D23' },
]

interface TypingSessionResult {
  finalValue: string
  finalDigits: string
  caretAlwaysAtEnd: boolean
  firstDriftIndex: number
}

/**
 * Type `chars` into a freshly bound, freshly created input one at a time,
 * waiting `delayMs` (a real `setTimeout` inside the page) between each
 * keystroke, checking the caret sits at the end of the value after every
 * single one — not just at the end of the whole session.
 */
async function typingSession(
  page: Page,
  mask: string | string[],
  chars: string,
  delayMs: number | 'jitter',
): Promise<TypingSessionResult> {
  return page.evaluate(
    async ({ mask, chars, delayMs }) => {
      const input = document.createElement('input')
      document.body.appendChild(input)
      window.motherMask.bind(input, mask)

      const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

      let firstDriftIndex = -1
      for (let i = 0; i < chars.length; i++) {
        const delay = delayMs === 'jitter' ? Math.floor(Math.random() * 40) : delayMs
        if (delay > 0) await wait(delay)

        const ch = chars[i]
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

      const result: TypingSessionResult = {
        finalValue: input.value,
        finalDigits: input.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase(),
        caretAlwaysAtEnd: firstDriftIndex === -1,
        firstDriftIndex,
      }
      input.remove()
      return result
    },
    { mask, chars, delayMs },
  )
}

test.describe('typing speed matrix (real browser timers)', () => {
  for (const cfg of MASKS) {
    for (const speed of SPEEDS) {
      test(`${cfg.name} @ ${speed}ms/keystroke — caret stays at the end throughout`, async ({ page }) => {
        await page.goto('/')
        const result = await typingSession(page, cfg.mask, cfg.digits, speed)

        expect(result.finalValue).toBe(cfg.expected)
        expect(result.finalDigits).toBe(cfg.digits.toUpperCase())
        expect(result.caretAlwaysAtEnd, `drifted at char ${result.firstDriftIndex}`).toBe(true)
      })
    }

    test(`${cfg.name} @ randomized jitter (0-40ms/keystroke) — caret stays at the end throughout`, async ({
      page,
    }) => {
      await page.goto('/')
      // Several independent sessions — jitter is random, run it more than once.
      for (let trial = 0; trial < 5; trial++) {
        const result = await typingSession(page, cfg.mask, cfg.digits, 'jitter')
        expect(result.finalValue, `trial ${trial}`).toBe(cfg.expected)
        expect(result.finalDigits, `trial ${trial}`).toBe(cfg.digits.toUpperCase())
        expect(result.caretAlwaysAtEnd, `trial ${trial}: drifted at char ${result.firstDriftIndex}`).toBe(true)
      }
    })
  }
})

test.describe('real keyboard-driven typing at multiple Playwright delays', () => {
  const KEYBOARD_DELAYS = [0, 10, 40, 120] as const

  for (const delay of KEYBOARD_DELAYS) {
    test(`CPF typed via real keyboard at ${delay}ms/keystroke lands the caret at the end`, async ({ page }) => {
      await page.goto('/')
      const field = page.locator('#cpf')
      await field.click()
      await field.pressSequentially('12345678901', { delay })

      await expect(field).toHaveValue('123.456.789-01')
      const caretAtEnd = await field.evaluate((el) => {
        const input = el as HTMLInputElement
        return input.selectionStart === input.value.length
      })
      expect(caretAtEnd).toBe(true)
    })
  }
})

test.describe('mid-session speed changes — slow, then a fast burst, then slow again', () => {
  for (const cfg of MASKS) {
    test(`${cfg.name}: variable-speed session (slow/fast/slow) still lands every digit`, async ({ page }) => {
      await page.goto('/')
      const result = await page.evaluate(
        async ({ mask, chars }) => {
          const input = document.createElement('input')
          document.body.appendChild(input)
          window.motherMask.bind(input, mask)
          const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

          const typeOne = (ch: string) => {
            const start = input.selectionStart ?? input.value.length
            const end = input.selectionEnd ?? start
            input.value = input.value.slice(0, start) + ch + input.value.slice(end)
            input.setSelectionRange(start + 1, start + 1)
            const event = new Event('input', { bubbles: true, cancelable: false })
            Object.defineProperty(event, 'data', { value: ch, configurable: true })
            Object.defineProperty(event, 'inputType', { value: 'insertText', configurable: true })
            input.dispatchEvent(event)
          }

          const third = Math.ceil(chars.length / 3)
          for (let i = 0; i < chars.length; i++) {
            if (i < third) await wait(60) // slow, deliberate
            else if (i < 2 * third) {
              /* fast burst: no wait at all */
            } else await wait(30) // back to moderate
            typeOne(chars[i])
          }

          return {
            value: input.value,
            digits: input.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase(),
            caretAtEnd: input.selectionStart === input.value.length,
          }
        },
        { mask: cfg.mask, chars: cfg.digits },
      )

      expect(result.value).toBe(cfg.expected)
      expect(result.digits).toBe(cfg.digits.toUpperCase())
      expect(result.caretAtEnd).toBe(true)
    })
  }
})
