import { test, expect, type Page } from '@playwright/test'

/**
 * Real-browser coverage for bounded quantifiers (`9{1,2}/9{1,2}/9{4}`).
 *
 * The whole point of the feature is an interaction jsdom can only simulate:
 * the user typing the separator themselves to close a segment that is still
 * one character short of its maximum. That involves a real key event, the
 * browser's own default action inserting the "/", and the reformat that
 * follows it — so the separator being swallowed, or the caret landing behind
 * it, only shows up under a genuine engine. `tests/quantifier.test.ts` in the
 * library package runs the same scenarios against jsdom.
 */

const FLEX_DATE = '9{1,2}/9{1,2}/9{4}'

/** `value` with `|` marking the caret, so a failure reads as what the user sees. */
async function withCaret(page: Page, selector: string): Promise<string> {
  return page.locator(selector).evaluate((el) => {
    const input = el as HTMLInputElement
    const caret = input.selectionStart ?? 0
    return `${input.value.slice(0, caret)}|${input.value.slice(caret)}`
  })
}

test.describe('bounded quantifiers — typing a one-or-two-digit date', () => {
  test('typing "3/4/1986" keeps every separator and the caret at the end', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#flexdate')
    await field.click()

    const seen: string[] = []
    for (const ch of '3/4/1986') {
      await page.keyboard.type(ch)
      seen.push(await withCaret(page, '#flexdate'))
    }

    expect(seen).toEqual([
      '3|', '3/|', '3/4|', '3/4/|', '3/4/1|', '3/4/19|', '3/4/198|', '3/4/1986|',
    ])
    await expect(field).toHaveValue('3/4/1986')
  })

  test('typing "3/12/1986" reveals the separator on its own once the month is full', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#flexdate')
    await field.click()

    const seen: string[] = []
    for (const ch of '3/12/1986') {
      await page.keyboard.type(ch)
      seen.push(await withCaret(page, '#flexdate'))
    }

    expect(seen).toEqual([
      '3|', '3/|', '3/1|', '3/12/|',
      // The "/" the user types here is already on screen; it must not double up.
      '3/12/|', '3/12/1|', '3/12/19|', '3/12/198|', '3/12/1986|',
    ])
    await expect(field).toHaveValue('3/12/1986')
  })

  test('typing "12/4/1986" mixes a two-digit day with a one-digit month', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#flexdate')
    await field.click()
    await page.keyboard.type('12/4/1986')

    await expect(field).toHaveValue('12/4/1986')
    expect(await withCaret(page, '#flexdate')).toBe('12/4/1986|')
  })

  test('typing "12/12/1986" needs no explicit separators at all', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#flexdate')
    await field.click()
    await page.keyboard.type('12121986')

    await expect(field).toHaveValue('12/12/1986')
    expect(await withCaret(page, '#flexdate')).toBe('12/12/1986|')
  })

  test('a zero-delay burst of "3/4/1986" gives the same result as deliberate typing', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#flexdate')
    await field.click()
    await field.pressSequentially('3/4/1986', { delay: 0 })

    await expect(field).toHaveValue('3/4/1986')
    expect(await withCaret(page, '#flexdate')).toBe('3/4/1986|')
  })

  test('a zero-delay burst of "3/12/1986" survives the eager separator too', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#flexdate')
    await field.click()
    await field.pressSequentially('3/12/1986', { delay: 0 })

    await expect(field).toHaveValue('3/12/1986')
    expect(await withCaret(page, '#flexdate')).toBe('3/12/1986|')
  })

  test('backspacing drains the value one character at a time', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#flexdate')
    await field.click()
    await field.pressSequentially('3/4/1986', { delay: 0 })

    const seen: string[] = []
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Backspace')
      seen.push(await withCaret(page, '#flexdate'))
    }
    expect(seen).toEqual(['3/4/198|', '3/4/19|', '3/4/1|', '3/4/|', '3/4|', '3/|', '3|', '|'])
  })
})

test.describe('bounded quantifiers — editing without disturbing later segments', () => {
  test('replacing a two-digit day with one digit leaves month and year alone', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#flexdate')
    await field.click()
    await field.pressSequentially('12121986', { delay: 0 })
    await expect(field).toHaveValue('12/12/1986')

    await field.evaluate((el) => (el as HTMLInputElement).setSelectionRange(0, 2))
    await page.keyboard.type('3')

    expect(await withCaret(page, '#flexdate')).toBe('3|/12/1986')
  })

  test('replacing a two-digit month with one digit does not pull the year apart', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#flexdate')
    await field.click()
    await field.pressSequentially('12121986', { delay: 0 })
    await expect(field).toHaveValue('12/12/1986')

    await field.evaluate((el) => (el as HTMLInputElement).setSelectionRange(3, 5))
    await page.keyboard.type('4')

    expect(await withCaret(page, '#flexdate')).toBe('12/4|/1986')
  })

  test('deleting a whole ranged segment keeps the year anchored, and refilling works', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#flexdate')
    await field.click()
    await field.pressSequentially('12121986', { delay: 0 })

    await field.evaluate((el) => (el as HTMLInputElement).setSelectionRange(3, 5))
    await page.keyboard.press('Delete')
    expect(await withCaret(page, '#flexdate')).toBe('12/|/1986')

    await page.keyboard.type('7')
    expect(await withCaret(page, '#flexdate')).toBe('12/7|/1986')
  })

  test('the maxlength attribute comes from the compiled maximum, not the pattern text', async ({ page }) => {
    await page.goto('/')
    const attr = await page.locator('#flexdate').getAttribute('maxlength')
    expect(attr).toBe('10')
    expect(String(FLEX_DATE.length)).not.toBe(attr)
  })
})

test.describe('bounded quantifiers — a full value refuses more input', () => {
  // `maxlength` is 10 here, but "3/12/1986" is finished at nine characters,
  // so the browser really does deliver a tenth keystroke. Before the engine
  // held committed boundaries, that keystroke withdrew the day's boundary and
  // repacked every field into "31/21/9861".
  for (const full of ['3/4/1986', '3/12/1986', '12/4/1986', '12/12/1986']) {
    test(`typing another digit at the end of "${full}" changes nothing`, async ({ page }) => {
      await page.goto('/')
      const field = page.locator('#flexdate')
      await field.click()
      await field.pressSequentially(full, { delay: 0 })
      await expect(field).toHaveValue(full)

      await page.keyboard.type('7')
      expect(await withCaret(page, '#flexdate')).toBe(`${full}|`)
    })
  }

  test('holding the key down against a full value never scrambles it', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#flexdate')
    await field.click()
    await field.pressSequentially('3/12/1986', { delay: 0 })

    for (let i = 0; i < 6; i++) await page.keyboard.press('7')
    expect(await withCaret(page, '#flexdate')).toBe('3/12/1986|')
  })

  test('typing well past capacity in one burst stops at the mask maximum', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#flexdate')
    await field.click()
    await field.pressSequentially('1212198677777', { delay: 0 })

    await expect(field).toHaveValue('12/12/1986')
    expect(await withCaret(page, '#flexdate')).toBe('12/12/1986|')
  })

  test('a segment with a free slot still grows instead of refusing', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#flexdate')
    await field.click()
    await field.pressSequentially('3/12/1986', { delay: 0 })

    await field.evaluate((el) => (el as HTMLInputElement).setSelectionRange(1, 1))
    await page.keyboard.type('7')
    expect(await withCaret(page, '#flexdate')).toBe('37|/12/1986')
  })
})

test.describe('bounded quantifiers — replacing a selection keeps later fields in place', () => {
  // Every separator in this mask reads alike, so once the edit swallows one
  // there is nothing left in the value to say which field the survivor
  // belongs to. `bind()` puts the swallowed divider back, which is what stops
  // the untouched year from breaking apart into "4/19/86".
  test('selecting "3/12" and typing "4" leaves the year untouched', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#flexdate')
    await field.click()
    await field.pressSequentially('3/12/1986', { delay: 0 })
    await expect(field).toHaveValue('3/12/1986')

    await field.evaluate((el) => (el as HTMLInputElement).setSelectionRange(0, 4))
    await page.keyboard.type('4')

    expect(await withCaret(page, '#flexdate')).toBe('4/|/1986')
  })

  test('the month can then be typed straight into the gap', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#flexdate')
    await field.click()
    await field.pressSequentially('3/12/1986', { delay: 0 })

    await field.evaluate((el) => (el as HTMLInputElement).setSelectionRange(0, 4))
    await page.keyboard.type('4')
    await page.keyboard.type('7')

    expect(await withCaret(page, '#flexdate')).toBe('4/7|/1986')
    await expect(field).toHaveValue('4/7/1986')
  })

  test('the same edit on the fixed 99/99/9999 field behaves identically', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#date')
    await field.click()
    await field.pressSequentially('25122025', { delay: 0 })
    await expect(field).toHaveValue('25/12/2025')

    await field.evaluate((el) => (el as HTMLInputElement).setSelectionRange(0, 5))
    await page.keyboard.type('4')

    expect(await withCaret(page, '#date')).toBe('4/|/2025')
  })

  test('replacing only the month keeps the day and year exactly where they are', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#flexdate')
    await field.click()
    await field.pressSequentially('3/12/1986', { delay: 0 })

    await field.evaluate((el) => (el as HTMLInputElement).setSelectionRange(2, 5))
    await page.keyboard.type('7')

    expect(await withCaret(page, '#flexdate')).toBe('3/7|/1986')
  })

  test('a CPF, whose separators differ, is unaffected by the rescue', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#cpf')
    await field.click()
    await field.pressSequentially('01215344139', { delay: 0 })
    await expect(field).toHaveValue('012.153.441-39')

    await field.evaluate((el) => (el as HTMLInputElement).setSelectionRange(0, 11))
    await page.keyboard.type('015153441')

    expect(await withCaret(page, '#cpf')).toBe('015.153.441|-39')
  })
})
