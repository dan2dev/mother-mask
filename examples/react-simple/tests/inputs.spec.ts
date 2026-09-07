import { test, expect } from '@playwright/test'
import type { CDPSession } from '@playwright/test'
import type {} from './fixture'

async function sample(cdp: CDPSession) {
  await cdp.send('HeapProfiler.collectGarbage')
  await cdp.send('HeapProfiler.collectGarbage')
  const { metrics } = await cdp.send('Performance.getMetrics')
  const read = (name: string) => metrics.find(metric => metric.name === name)!.value
  return { heap: read('JSHeapUsedSize'), nodes: read('Nodes'), listeners: read('JSEventListeners') }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixture.html')
  await page.waitForFunction(() => !!window.maskFixture)
})

for (const kind of ['pattern', 'decimal'] as const) {
  test(`${kind}: controlled edits, current callbacks, refs and Activity cleanup`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.evaluate(kind => window.maskFixture.mount({
      kind, value: '', options: { allowNegative: true }, callbackVersion: 'first',
    }), kind)
    const input = page.getByRole('textbox', { name: 'Test input' })
    const beforeTyping = await page.evaluate(() => window.maskFixture.stats())
    await input.pressSequentially('1234')
    await expect(input).toHaveValue(kind === 'pattern' ? '123-4' : '1,234')
    expect(await page.evaluate(() => window.maskFixture.stats())).toEqual(beforeTyping)
    const beforeCallbackUpdate = await page.evaluate(() => window.maskFixture.stats())
    await page.evaluate(() => window.maskFixture.update({ callbackVersion: 'latest' }))
    expect(await page.evaluate(() => window.maskFixture.stats())).toEqual(beforeCallbackUpdate)
    await input.pressSequentially('5')
    expect(await page.evaluate(() => window.maskFixture.events.at(-1)?.version)).toBe('latest')

    await page.evaluate(() => window.maskFixture.update({ value: '654321', acceptEdits: false }))
    const accepted = kind === 'pattern' ? '654-321' : '654,321'
    await expect(input).toHaveValue(accepted)
    await input.fill('42')
    await expect(input).toHaveValue(accepted)
    await page.evaluate(() => window.maskFixture.update({ value: '' }))
    await expect(input).toHaveValue('')

    await page.evaluate(() => window.maskFixture.update({ hidden: true }))
    const hidden = await page.evaluate(() => window.maskFixture.stats())
    expect(hidden.added).toBe(hidden.removed)
    expect(hidden.resetsAdded).toBe(hidden.resetsRemoved)
    expect(hidden.refCleared).toBe(true)
    await page.evaluate(() => window.maskFixture.update({ hidden: false, acceptEdits: true }))
    const shown = await page.evaluate(() => window.maskFixture.stats())
    expect(shown.added - shown.removed).toBe(7)
    expect(shown.resetsAdded - shown.resetsRemoved).toBe(1)
    await page.evaluate(() => window.maskFixture.focus())
    await expect(input).toBeFocused()
    await input.pressSequentially('12')
    await expect(input).toHaveValue('12')
    await page.evaluate(() => window.maskFixture.unmount())
    const unmounted = await page.evaluate(() => window.maskFixture.stats())
    expect(unmounted.added).toBe(unmounted.removed)
    expect(unmounted.resetsAdded).toBe(unmounted.resetsRemoved)
    expect(unmounted.refCleared).toBe(true)
    expect(errors).toEqual([])
  })

  test(`${kind}: uncontrolled defaults and changing mask options`, async ({ page }) => {
    await page.evaluate(kind => window.maskFixture.mount({
      kind, defaultValue: '123456', options: { segmented: true },
    }), kind)
    const input = page.getByRole('textbox', { name: 'Test input' })
    const initial = kind === 'pattern' ? '123-456' : '123,456'
    await expect(input).toHaveValue(initial)
    await page.evaluate(() => window.maskFixture.update({ defaultValue: '42' }))
    await expect(input).toHaveValue(initial)
    await page.evaluate(() => window.maskFixture.update({ mask: '99/99/99', options: { segmented: false } }))
    await expect(input).toHaveValue(kind === 'pattern' ? '12/34/56' : '123456')
    await input.fill('42')
    expect(await page.evaluate(() => window.maskFixture.events.at(-1)?.value)).toBe(await input.inputValue())
    const current = await page.evaluate(() => window.maskFixture.stats())
    expect(current.added - current.removed).toBe(7)
  })

  test(`${kind}: queued frames and detached inputs are released on unmount`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Forced garbage collection uses Chromium CDP')
    await page.evaluate(kind => {
      window.maskFixture.parkFrames()
      window.maskFixture.mount({ kind, defaultValue: '123', options: {}, probe: true })
    }, kind)
    const detached = await page.evaluate(() => window.maskFixture.queueAndUnmount())
    expect(detached.queued).toBeGreaterThan(0)
    expect(detached.detachedValue).toBe('42')
    const disposed = await page.evaluate(() => window.maskFixture.stats())
    expect(disposed.pending).toBe(0)
    expect(disposed.added).toBe(disposed.removed)
    expect(disposed.resetsAdded).toBe(disposed.resetsRemoved)
    expect(disposed.refCleared).toBe(true)
    expect(await page.evaluate(() => window.maskFixture.events)).toEqual([])
    await page.evaluate(() => window.maskFixture.flushDeletionHistory())

    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Performance.enable')
    await sample(cdp)
    expect(await page.evaluate(() => window.maskFixture.retained()), 'inputs, callbacks or options retained after GC').toBe(0)
    await cdp.detach()
  })

  test(`${kind}: native form reset honors current values, configuration and cancellation`, async ({ page }) => {
    await page.evaluate(kind => window.maskFixture.mount({ kind, value: '123456' }), kind)
    const input = page.getByRole('textbox', { name: 'Test input' })
    await page.evaluate(() => window.maskFixture.update({ value: '654321' }))
    await page.evaluate(() => (document.querySelector('#test-form') as HTMLFormElement).reset())
    await expect(input).toHaveValue(kind === 'pattern' ? '654-321' : '654,321')
    expect(await page.evaluate(() => window.maskFixture.events)).toEqual([])
    await page.evaluate(kind => {
      window.maskFixture.unmount()
      window.maskFixture.mount({ kind, defaultValue: '123456' })
      window.maskFixture.update({ mask: '99/99/99', options: { segmented: false } })
    }, kind)
    await input.fill('42')
    const edited = await input.inputValue()
    await page.evaluate(() => {
      const form = document.querySelector('#test-form') as HTMLFormElement
      form.addEventListener('reset', event => event.preventDefault(), { once: true })
      form.reset()
    })
    await expect(input).toHaveValue(edited)
    await page.evaluate(() => (document.querySelector('#test-form') as HTMLFormElement).reset())
    await expect(input).toHaveValue(kind === 'pattern' ? '12/34/56' : '123456')
    await input.press('ControlOrMeta+a')
    await input.pressSequentially('78')
    await expect(input).toHaveValue(kind === 'pattern' ? '78/' : '78')
  })

  test(`${kind}: IME drafts survive rerenders and native attributes survive rebinding`, async ({ page }) => {
    await page.evaluate(kind => window.maskFixture.mount({
      kind, value: '', mask: 'UUUU',
      options: kind === 'pattern' ? { tokens: { U: { match: /\p{L}/u } } } : undefined,
    }), kind)
    const input = page.getByRole('textbox', { name: 'Test input' })
    const draft = kind === 'pattern' ? 'に' : '12.'
    await input.evaluate((node, draft) => {
      const input = node as HTMLInputElement
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
      input.value = draft
      input.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true, inputType: 'insertCompositionText', data: draft }))
    }, draft)
    await page.evaluate(() => window.maskFixture.update({ callbackVersion: 'updated', inputProps: { autoComplete: 'email', spellCheck: true, maxLength: 20 } }))
    await expect(input).toHaveValue(draft)
    await input.dispatchEvent('compositionend', { data: draft })
    await expect(input).toHaveValue(draft)
    await page.evaluate(() => window.maskFixture.update({ value: '', mask: '999-999', options: { segmented: false } }))
    await expect(input).toHaveAttribute('autocomplete', 'email')
    await expect(input).toHaveAttribute('spellcheck', 'true')
    await expect(input).toHaveAttribute('maxlength', '20')
  })

  test(`${kind}: readOnly and disabled fields reject keyboard edits`, async ({ page }) => {
    await page.evaluate(kind => window.maskFixture.mount({ kind, value: '123456', inputProps: { readOnly: true } }), kind)
    const input = page.getByRole('textbox', { name: 'Test input' })
    await input.focus()
    await input.press('Home')
    // Backspace in a readonly field navigates history in desktop WebKit.
    // Forward Delete exercises the mask's fallback without leaving the page.
    await input.press('Delete')
    // Wait through the library's keyboard fallback frame.
    await page.evaluate(() => new Promise(requestAnimationFrame))
    await expect(input).toHaveValue(kind === 'pattern' ? '123-456' : '123,456')
    expect(await page.evaluate(() => window.maskFixture.events)).toEqual([])
    await page.evaluate(() => window.maskFixture.update({ inputProps: { disabled: true } }))
    await expect(input).toBeDisabled()
  })
}

test('repeated mounts, rebinding and unmounts do not accumulate retained memory', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Forced garbage collection uses Chromium CDP')
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Performance.enable')
  await page.evaluate(() => {
    window.maskFixture.parkFrames()
    window.maskFixture.cycles(50)
    window.maskFixture.flushDeletionHistory()
  })
  const before = await sample(cdp)
  // 600 mounts, each with a configuration change and pending formatting work.
  await page.evaluate(() => {
    window.maskFixture.cycles(300)
    window.maskFixture.flushDeletionHistory()
  })
  const after = await sample(cdp)
  const stats = await page.evaluate(() => window.maskFixture.stats())
  expect(stats.pending).toBe(0)
  expect(stats.added).toBe(stats.removed)
  expect(stats.resetsAdded).toBe(stats.resetsRemoved)
  expect(await page.evaluate(() => window.maskFixture.retained())).toBe(0)
  expect(after.listeners - before.listeners).toBeLessThanOrEqual(0)
  expect(after.nodes - before.nodes).toBeLessThanOrEqual(0)
  // Permit small React/Vite bookkeeping and the test's own WeakRef array.
  expect(after.heap - before.heap).toBeLessThan(1024 * 1024)
  await test.info().attach('memory-samples', { body: JSON.stringify({ before, after, stats }), contentType: 'application/json' })
  await cdp.detach()
})

test('demo keeps controlled caret, decimal callbacks and programmatic values working', async ({ page }) => {
  await page.goto('/')
  const date = page.getByRole('textbox', { name: 'Date', exact: true })
  await date.pressSequentially('12')
  await date.press('Backspace')
  await expect(date).toHaveValue('12')
  await page.getByRole('button', { name: 'Fill example values' }).click()
  await date.focus()
  await date.evaluate(input => (input as HTMLInputElement).setSelectionRange(0, 2))
  await date.pressSequentially('1')
  await expect(date).toHaveValue('1/12/2026')
  expect(await date.evaluate(input => (input as HTMLInputElement).selectionStart)).toBe(1)
  const amount = page.getByRole('textbox', { name: 'Amount', exact: true })
  await amount.fill('-9876.54')
  await expect(amount).toHaveValue('-$9,876.54')
  await expect(page.locator('#amount-numeric')).toHaveText('-9876.54')
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  await expect(amount).toHaveValue('')
  await expect(date).toHaveValue('')
  await expect(page.locator('#amount-numeric')).toHaveText('0')
})
