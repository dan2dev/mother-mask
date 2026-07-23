import { test, expect, type Page } from '@playwright/test'

/**
 * Regression coverage for a real-Firefox bug: select all text in a field,
 * then type over it. The `keydown` + `requestAnimationFrame` fallback frame
 * (see `onKey` in `bind.ts`/`bind-decimal.ts`) can fire *before* the browser
 * has actually applied the keystroke's default action — at that point
 * `target.value` is still unchanged and the selection is still the full
 * pre-edit range, not a post-edit collapsed caret. The library used to
 * blindly reformat and collapse that range, so the browser's own pending
 * replace-selection edit landed on a collapsed caret instead — dropping or
 * corrupting the keystroke instead of replacing the selection.
 *
 * Deterministic tests below dispatch only `keydown` (never `input`) with the
 * selection still spanning a real range, exactly what a premature frame
 * observes in the real bug — no reliance on winning or losing a real timing
 * race. A best-effort real-keyboard test at the end exercises the actual
 * event pipeline end to end.
 */

async function freshMaskedInput(
  page: Page,
  mask: string | string[],
  initialValue: string,
  options?: { segmented?: boolean },
): Promise<void> {
  await page.evaluate(
    ({ mask, initialValue, options }) => {
      const old = document.querySelector('#race-input')
      if (old) old.remove()
      const input = document.createElement('input')
      input.id = 'race-input'
      document.body.appendChild(input)
      window.motherMask.bind(input, mask, options ?? null)
      input.value = initialValue
      ;(window as unknown as { __changeCount: number }).__changeCount = 0
    },
    { mask, initialValue, options },
  )
}

async function freshDecimalInput(
  page: Page,
  decimalOptions: Record<string, unknown>,
  initialValue: string,
): Promise<void> {
  await page.evaluate(
    ({ decimalOptions, initialValue }) => {
      const old = document.querySelector('#race-input')
      if (old) old.remove()
      const input = document.createElement('input')
      input.id = 'race-input'
      document.body.appendChild(input)
      window.motherMask.bindDecimal(input, decimalOptions)
      input.value = initialValue
    },
    { decimalOptions, initialValue },
  )
}

/** Dispatch a real `keydown` on `#race-input` without simulating the browser's default action. */
async function dispatchPrematureKeydown(
  page: Page,
  init: { key: string; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean },
): Promise<void> {
  await page.evaluate((init) => {
    const input = document.querySelector<HTMLInputElement>('#race-input')!
    input.focus()
    const ev = new KeyboardEvent('keydown', { ...init, bubbles: true, cancelable: true })
    input.dispatchEvent(ev)
  }, init)
}

async function selectionAndValue(page: Page): Promise<{ start: number; end: number; value: string }> {
  return page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>('#race-input')!
    return { start: input.selectionStart ?? -1, end: input.selectionEnd ?? -1, value: input.value }
  })
}

async function waitAnimationFrames(page: Page, times = 3): Promise<void> {
  await page.evaluate(async (times) => {
    for (let i = 0; i < times; i++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    }
  }, times)
}

test.describe('select-and-replace race: keydown fallback frame vs. browser default action (bind)', () => {
  test('character insert: selection is not collapsed while the edit has not landed', async ({ page }) => {
    await page.goto('/')
    await freshMaskedInput(page, '999.999.999-99', '098.098.098-08')
    await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('#race-input')!
      input.setSelectionRange(0, 14)
    })
    await dispatchPrematureKeydown(page, { key: '0' })
    await waitAnimationFrames(page)

    const state = await selectionAndValue(page)
    expect(state).toEqual({ start: 0, end: 14, value: '098.098.098-08' })
  })

  test('Backspace: a real selection range is left untouched while the edit has not landed', async ({ page }) => {
    await page.goto('/')
    await freshMaskedInput(page, '999-999', '123-456')
    await page.evaluate(() => document.querySelector<HTMLInputElement>('#race-input')!.setSelectionRange(1, 5))
    await dispatchPrematureKeydown(page, { key: 'Backspace' })
    await waitAnimationFrames(page)

    const state = await selectionAndValue(page)
    expect(state).toEqual({ start: 1, end: 5, value: '123-456' })
  })

  test('Delete: a real selection range is left untouched while the edit has not landed', async ({ page }) => {
    await page.goto('/')
    await freshMaskedInput(page, '999-999', '123-456')
    await page.evaluate(() => document.querySelector<HTMLInputElement>('#race-input')!.setSelectionRange(2, 6))
    await dispatchPrematureKeydown(page, { key: 'Delete' })
    await waitAnimationFrames(page)

    const state = await selectionAndValue(page)
    expect(state).toEqual({ start: 2, end: 6, value: '123-456' })
  })

  test('array mask (mask-switching pattern): selection survives a premature frame', async ({ page }) => {
    await page.goto('/')
    await freshMaskedInput(page, ['(99) 9999-9999', '(99) 99999-9999'], '(11) 99988-7766')
    await page.evaluate(() => document.querySelector<HTMLInputElement>('#race-input')!.setSelectionRange(0, 15))
    await dispatchPrematureKeydown(page, { key: '5' })
    await waitAnimationFrames(page)

    const state = await selectionAndValue(page)
    expect(state).toEqual({ start: 0, end: 15, value: '(11) 99988-7766' })
  })

  test('recovers correctly once the browser applies the edit and fires `input`, even after the frame bailed', async ({
    page,
  }) => {
    await page.goto('/')
    await freshMaskedInput(page, '999.999.999-99', '098.098.098-08')
    await page.evaluate(() => document.querySelector<HTMLInputElement>('#race-input')!.setSelectionRange(0, 14))
    await dispatchPrematureKeydown(page, { key: '0' })
    await waitAnimationFrames(page)
    // Selection must still be the full range — the frame bailed.
    expect(await selectionAndValue(page)).toEqual({ start: 0, end: 14, value: '098.098.098-08' })

    // Browser now (slightly late) applies the actual edit.
    await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('#race-input')!
      input.value = '0'
      input.setSelectionRange(1, 1)
      input.dispatchEvent(
        new (window as unknown as { InputEvent: typeof InputEvent }).InputEvent('input', {
          bubbles: true,
          inputType: 'insertText',
          data: '0',
        }),
      )
    })

    const state = await selectionAndValue(page)
    expect(state.value).toBe('0')
    expect(state.start).toBe(1)
  })

  test('navigation/shortcut keys never touch a real selection (Ctrl+A, arrows, Home/End)', async ({ page }) => {
    await page.goto('/')
    const keys: Array<{ key: string; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean }> = [
      { key: 'a', ctrlKey: true },
      { key: 'a', metaKey: true },
      { key: 'ArrowLeft' },
      { key: 'ArrowRight' },
      { key: 'Home' },
      { key: 'End' },
      { key: 'ArrowRight', shiftKey: true },
    ]
    for (const init of keys) {
      await freshMaskedInput(page, '999.999.999-99', '123.456.789-01')
      await page.evaluate(() => document.querySelector<HTMLInputElement>('#race-input')!.setSelectionRange(3, 9))
      await dispatchPrematureKeydown(page, init)
      await waitAnimationFrames(page)
      const state = await selectionAndValue(page)
      expect(state, `key=${JSON.stringify(init)}`).toEqual({ start: 3, end: 9, value: '123.456.789-01' })
    }
  })

  test('real keyboard end to end: select-all then fast retype always lands the correct final value', async ({
    page,
  }) => {
    await page.goto('/')
    const input = page.locator('#phone')
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => {
        const el = document.querySelector<HTMLInputElement>('#phone')!
        el.value = '(11) 99988-7766'
      })
      await input.click()
      await page.keyboard.press('Control+a')
      await page.keyboard.type('5551234567', { delay: 0 })
      await page.waitForTimeout(20)
      const value = await input.inputValue()
      const sel = await input.evaluate((el: HTMLInputElement) => el.selectionStart)
      expect(value.replace(/\D/g, ''), `iteration ${i}`).toBe('5551234567')
      expect(sel, `iteration ${i}`).toBe(value.length)
    }
  })
})

test.describe('select-and-replace race: keydown fallback frame vs. browser default action (bindDecimal)', () => {
  test('character insert: selection is not collapsed while the edit has not landed', async ({ page }) => {
    await page.goto('/')
    await freshDecimalInput(page, { decimalPlaces: 2, prefix: '$' }, '$1,234.00')
    await page.evaluate(() => document.querySelector<HTMLInputElement>('#race-input')!.setSelectionRange(0, 9))
    await dispatchPrematureKeydown(page, { key: '5' })
    await waitAnimationFrames(page)

    const state = await selectionAndValue(page)
    expect(state).toEqual({ start: 0, end: 9, value: '$1,234.00' })
  })

  test('Backspace: a real selection range is left untouched while the edit has not landed', async ({ page }) => {
    await page.goto('/')
    await freshDecimalInput(page, { decimalPlaces: 2 }, '1,234.00')
    await page.evaluate(() => document.querySelector<HTMLInputElement>('#race-input')!.setSelectionRange(1, 5))
    await dispatchPrematureKeydown(page, { key: 'Backspace' })
    await waitAnimationFrames(page)

    const state = await selectionAndValue(page)
    expect(state).toEqual({ start: 1, end: 5, value: '1,234.00' })
  })

  test('real keyboard end to end: select-all then fast retype in the currency field lands the correct value', async ({
    page,
  }) => {
    await page.goto('/')
    const input = page.locator('#usd')
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => {
        const el = document.querySelector<HTMLInputElement>('#usd')!
        el.value = '$1,234.00'
      })
      await input.click()
      await page.keyboard.press('Control+a')
      await page.keyboard.type('999', { delay: 0 })
      await page.waitForTimeout(20)
      const value = await input.inputValue()
      expect(value, `iteration ${i}`).toBe('$999.00')
    }
  })
})
