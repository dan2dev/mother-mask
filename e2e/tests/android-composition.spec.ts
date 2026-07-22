import { test, expect } from '@playwright/test'

/**
 * Regression coverage for the reported bug: typing with the normal Android
 * keyboard did nothing on letter-accepting masks (e.g. the Mercosul plate
 * example, `ZZZ-9Z99`) that don't set `inputmode`.
 *
 * Root cause: Android's on-screen keyboard wraps essentially all typing
 * into a full-QWERTY `<input>` in an IME composition session — for
 * autocorrect/suggestion-strip bookkeeping, not just genuine multi-candidate
 * input (Pinyin, Kana, …) — and only ends that session on a word boundary
 * (space/punctuation) or blur. `bind()` used to defer all formatting until
 * `compositionend`, so typing a space-less value like a plate number left
 * the field completely unmasked for the whole entry. These tests replay
 * that exact sequence — `compositionstart`, a run of composing `input`
 * events with `isComposing: true`, and only a very late (or no)
 * `compositionend` — and assert the mask is applied live, not deferred.
 */

test.describe('Android IME composition wrapping plain-text typing', () => {
  test('Mercosul plate mask formats live while a single un-ended composition session is active', async ({
    page,
  }) => {
    await page.goto('/')

    const snapshots = await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('#plate')!
      const snaps: string[] = []

      input.dispatchEvent(new Event('compositionstart', { bubbles: true }))

      for (const ch of 'ABC1234') {
        const start = input.selectionStart ?? input.value.length
        const end = input.selectionEnd ?? start
        input.value = input.value.slice(0, start) + ch + input.value.slice(end)
        input.setSelectionRange(start + 1, start + 1)
        const event = new Event('input', { bubbles: true, cancelable: false })
        Object.defineProperty(event, 'data', { value: ch, configurable: true })
        Object.defineProperty(event, 'inputType', { value: 'insertCompositionText', configurable: true })
        Object.defineProperty(event, 'isComposing', { value: true, configurable: true })
        input.dispatchEvent(event)
        snaps.push(input.value)
      }

      // Deliberately no `compositionend` — this mirrors Android never
      // reaching a word boundary while the user is still typing.
      return snaps
    })

    // The dash must show up the moment the 4th character lands — live,
    // not only once composition eventually ends (which, on Android typing
    // a space-less plate number, may never happen while typing at all).
    expect(snapshots[2]).toBe('ABC')
    expect(snapshots[3]).toBe('ABC-1')
    expect(snapshots[6]).toBe('ABC-1234')

    await expect(page.locator('#plate')).toHaveValue('ABC-1234')
  })

  test('Mercosul alnum mask (ZZZ-9Z99) formats live mid-composition', async ({ page }) => {
    await page.goto('/')

    const snapshots = await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('#mercosul')!
      const snaps: string[] = []
      input.dispatchEvent(new Event('compositionstart', { bubbles: true }))

      for (const ch of 'ABC1D23') {
        const start = input.selectionStart ?? input.value.length
        const end = input.selectionEnd ?? start
        input.value = input.value.slice(0, start) + ch + input.value.slice(end)
        input.setSelectionRange(start + 1, start + 1)
        const event = new Event('input', { bubbles: true, cancelable: false })
        Object.defineProperty(event, 'data', { value: ch, configurable: true })
        Object.defineProperty(event, 'inputType', { value: 'insertCompositionText', configurable: true })
        Object.defineProperty(event, 'isComposing', { value: true, configurable: true })
        input.dispatchEvent(event)
        snaps.push(input.value)
      }

      return snaps
    })

    expect(snapshots[2]).toBe('ABC')
    expect(snapshots[3]).toBe('ABC-1')
    expect(snapshots[6]).toBe('ABC-1D23')
    await expect(page.locator('#mercosul')).toHaveValue('ABC-1D23')
  })

  test('a late compositionend (word boundary reached eventually) does not double-format or move the caret', async ({
    page,
  }) => {
    await page.goto('/')
    const field = page.locator('#mercosul')

    await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('#mercosul')!
      input.dispatchEvent(new Event('compositionstart', { bubbles: true }))
      for (const ch of 'ABC1D23') {
        const start = input.selectionStart ?? input.value.length
        input.value = input.value.slice(0, start) + ch + input.value.slice(start)
        input.setSelectionRange(start + 1, start + 1)
        const event = new Event('input', { bubbles: true, cancelable: false })
        Object.defineProperty(event, 'data', { value: ch, configurable: true })
        Object.defineProperty(event, 'inputType', { value: 'insertCompositionText', configurable: true })
        Object.defineProperty(event, 'isComposing', { value: true, configurable: true })
        input.dispatchEvent(event)
      }
      input.dispatchEvent(new Event('compositionend', { bubbles: true }))
    })

    await expect(field).toHaveValue('ABC-1D23')
    const caretAtEnd = await field.evaluate((el) => {
      const input = el as HTMLInputElement
      return input.selectionStart === input.value.length
    })
    expect(caretAtEnd).toBe(true)
  })

  test('CNPJ alnum mask formats live through a whole un-ended composition session', async ({ page }) => {
    await page.goto('/')

    const result = await page.evaluate(() => {
      const input = document.createElement('input')
      document.body.appendChild(input)
      window.motherMask.bind(input, 'AA.AAA.AAA/AAAA-99')
      input.dispatchEvent(new Event('compositionstart', { bubbles: true }))

      const snaps: string[] = []
      for (const ch of '1AB2C3D45E6F78') {
        const start = input.selectionStart ?? input.value.length
        input.value = input.value.slice(0, start) + ch + input.value.slice(start)
        input.setSelectionRange(start + 1, start + 1)
        const event = new Event('input', { bubbles: true, cancelable: false })
        Object.defineProperty(event, 'data', { value: ch, configurable: true })
        Object.defineProperty(event, 'inputType', { value: 'insertCompositionText', configurable: true })
        Object.defineProperty(event, 'isComposing', { value: true, configurable: true })
        input.dispatchEvent(event)
        snaps.push(input.value)
      }

      const final = input.value
      input.remove()
      return { snaps, final }
    })

    // Literal separators must already show up mid-session — not only once
    // composition (which never explicitly ends in this test) eventually
    // finishes. If formatting were still deferred, none of the snapshots
    // before the very last character would contain any "." or "-" at all.
    const firstFormattedIndex = result.snaps.findIndex((s) => /[./-]/.test(s))
    expect(firstFormattedIndex).toBeGreaterThan(-1)
    expect(firstFormattedIndex).toBeLessThan(result.snaps.length - 1)
    expect(result.final).toBe('1A.B2C.3D4/5E6F-78')
  })
})
