import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * The reported gesture, driven by a real mouse and a real keyboard: click into
 * a currency field, send the caret to the far left with Home — landing it
 * *before* the "$" — and type. That has to produce the same thing as typing
 * with the caret one position to the right, which is where it visually looks
 * like it already is.
 */

/** Bind a fresh decimal input in the page and return its selector. */
async function freshDecimalInput(
  page: Page,
  options: Record<string, unknown>,
  value: string,
): Promise<string> {
  await page.evaluate(
    ({ options, value }) => {
      document.querySelector('#affix-input')?.remove()
      const input = document.createElement('input')
      input.id = 'affix-input'
      document.body.appendChild(input)
      window.motherMask.bindDecimal(input, options)
      input.value = value
    },
    { options, value },
  )
  return '#affix-input'
}

async function state(page: Page, selector: string): Promise<string> {
  return page.locator(selector).evaluate((el) => {
    const input = el as HTMLInputElement
    const caret = input.selectionStart ?? 0
    return `${input.value.slice(0, caret)}|${input.value.slice(caret)}`
  })
}

test.describe('decimal affixes are inert to real typing', () => {
  test('caret sent to the far left with Home types into the number, not in front of the prefix', async ({
    page,
  }) => {
    await page.goto('/')
    const selector = await freshDecimalInput(page, { prefix: '$', decimalPlaces: 2, allowNegative: true }, '$0.00')
    const input = page.locator(selector)

    await input.click()
    await page.keyboard.press('Home')
    // Confirm the browser really parked the caret before the "$" — otherwise
    // this test would pass without exercising the case at all.
    expect(await input.evaluate((el: HTMLInputElement) => el.selectionStart)).toBe(0)

    await page.keyboard.type('2')
    expect(await state(page, selector)).toBe('$2|.00')
  })

  test('the far left and just-after-the-prefix agree', async ({ page }) => {
    await page.goto('/')
    const options = { prefix: '$', decimalPlaces: 2, allowNegative: true }

    const selector = await freshDecimalInput(page, options, '$0.00')
    await page.locator(selector).click()
    await page.keyboard.press('Home')
    await page.keyboard.type('2')
    const fromFarLeft = await state(page, selector)

    await freshDecimalInput(page, options, '$0.00')
    await page.locator(selector).click()
    await page.keyboard.press('Home')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.type('2')
    const fromAfterPrefix = await state(page, selector)

    expect(fromFarLeft).toBe(fromAfterPrefix)
    expect(fromFarLeft).toBe('$2|.00')
  })

  test('typing a whole amount from the far left builds the right number', async ({ page }) => {
    await page.goto('/')
    const selector = await freshDecimalInput(page, { prefix: 'R$ ', decimalPlaces: 2 }, 'R$ 0.00')
    await page.locator(selector).click()
    await page.keyboard.press('Home')
    await page.keyboard.type('1234', { delay: 0 })
    expect(await state(page, selector)).toBe('R$ 1,234|.00')
  })

  test('End puts the caret past a suffix without stranding it there', async ({ page }) => {
    await page.goto('/')
    const selector = await freshDecimalInput(page, { suffix: ' kg' }, '1.5 kg')
    const input = page.locator(selector)

    await input.click()
    await page.keyboard.press('End')
    expect(await input.evaluate((el: HTMLInputElement) => el.selectionStart)).toBe(6)

    await page.keyboard.type('7')
    expect(await state(page, selector)).toBe('1.57| kg')
  })

  test('a prefix carrying a digit does not inflate the value as you type', async ({ page }) => {
    await page.goto('/')
    const selector = await freshDecimalInput(page, { prefix: 'Q1 ', decimalPlaces: 2 }, 'Q1 0.00')
    await page.locator(selector).click()
    await page.keyboard.press('Home')
    await page.keyboard.type('1234', { delay: 0 })
    expect(await state(page, selector)).toBe('Q1 1,234|.00')
  })
})
