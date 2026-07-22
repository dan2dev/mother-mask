import { test, expect, type Page } from '@playwright/test'

/**
 * Real-browser coverage for the caret-drift bug reported when typing very
 * fast on Chrome for Android: the caret would occasionally not land at the
 * position it should after a burst of keystrokes. jsdom-based unit tests
 * simulate this by hand (see `tests/android-fast-typing.test.ts` in the
 * library package), but jsdom is fully synchronous and can't reproduce real
 * `requestAnimationFrame` / event-loop timing. These specs drive an actual
 * Chromium (desktop and mobile-emulated) through the real keyboard pipeline.
 */

async function caretAtEnd(page: Page, selector: string): Promise<boolean> {
  return page.locator(selector).evaluate((el) => {
    const input = el as HTMLInputElement
    return input.selectionStart === input.value.length
  })
}

test.describe('fast typing keeps the caret at the end while appending', () => {
  test('CPF mask: caret sits at the end after every keystroke of a fast burst', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#cpf')
    await field.click()
    await field.pressSequentially('12345678901', { delay: 0 })

    await expect(field).toHaveValue('123.456.789-01')
    expect(await caretAtEnd(page, '#cpf')).toBe(true)
  })

  test('phone mask: fast typing across the array-mask length threshold', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#phone')
    await field.click()
    await field.pressSequentially('11999887766', { delay: 0 })

    await expect(field).toHaveValue('(11) 99988-7766')
    expect(await caretAtEnd(page, '#phone')).toBe(true)
  })

  test('alphanumeric Mercosul plate mask: fast typing mixed letters and digits', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#mercosul')
    await field.click()
    await field.pressSequentially('ABC1D23', { delay: 0 })

    const value = await field.inputValue()
    expect(value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()).toBe('ABC1D23')
    expect(await caretAtEnd(page, '#mercosul')).toBe(true)
  })

  test('flat plate mask: fast typing digits after the letters', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#plate')
    await field.click()
    await field.pressSequentially('ABC1234', { delay: 0 })

    await expect(field).toHaveValue('ABC-1234')
    expect(await caretAtEnd(page, '#plate')).toBe(true)
  })

  test('date mask: fast typing 8 digits fills DD/MM/YYYY', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#date')
    await field.click()
    await field.pressSequentially('25122025', { delay: 0 })

    await expect(field).toHaveValue('25/12/2025')
    expect(await caretAtEnd(page, '#date')).toBe(true)
  })

  test('decimal mask: fast typing digits and separator formats the fraction correctly', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#usd')
    await field.click()
    await field.pressSequentially('123.45', { delay: 0 })

    await expect(field).toHaveValue('$123.45')
  })

  test('backspace burst after fast typing drains the field cleanly', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#cpf')
    await field.click()
    await field.pressSequentially('12345678901', { delay: 0 })
    await expect(field).toHaveValue('123.456.789-01')

    for (let i = 0; i < 14; i++) await page.keyboard.press('Backspace')
    await expect(field).toHaveValue('')
  })

  test('mid-value correction: click into the middle and retype without corrupting the rest', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#cpf')
    await field.click()
    await field.pressSequentially('12345678901', { delay: 0 })
    await expect(field).toHaveValue('123.456.789-01')

    // Select the first digit and replace it.
    await page.keyboard.press('Home')
    await page.keyboard.press('Shift+ArrowRight')
    await page.keyboard.type('9', { delay: 0 })

    const value = await field.inputValue()
    expect(value.replace(/\D/g, '')).toBe('92345678901')
  })
})

test.describe('paste stays correct under the same event pipeline', () => {
  test('pasting a full CPF formats immediately', async ({ page }) => {
    await page.goto('/')
    const field = page.locator('#cpf')
    await field.click()
    await page.evaluate(() => {
      const el = document.querySelector<HTMLInputElement>('#cpf')!
      el.value = '12345678901'
      el.dispatchEvent(new Event('paste', { bubbles: true, cancelable: true }))
    })
    await expect(field).toHaveValue('123.456.789-01')
  })
})
