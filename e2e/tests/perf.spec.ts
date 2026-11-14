import { test, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'

/**
 * Low-end device benchmark: the published UMD bundle under CDP CPU throttling.
 * Opt-in (`PERF=1 bunx playwright test perf --project=desktop-chromium`), Chromium only.
 * Prints one `PERF {json}` line per throttle rate.
 *
 * Keystroke time is the main-thread time mother-mask itself spends per key:
 * its input listeners plus the animation frames it schedules. Waiting for
 * vsync is not work, so it is not counted.
 */

const UMD = fileURLToPath(new URL('../../packages/mother-mask/dist/mother-mask.umd.js', import.meta.url))
const REPEATS = 5

test.skip(!process.env.PERF, 'set PERF=1 to run')

declare global {
  interface Window {
    MotherMask: typeof import('mother-mask')
    __work: number
    __frame: () => Promise<void>
  }
}

// Runs before bind(): time every listener added to an <input> and every rAF callback.
function instrument() {
  window.__work = 0
  const timed = (fn: Function) => function (this: unknown, ...args: unknown[]) {
    const t = performance.now()
    try { return fn.apply(this, args) } finally { window.__work += performance.now() - t }
  }
  const add = EventTarget.prototype.addEventListener
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    add.call(this, type, this instanceof HTMLInputElement && typeof listener === 'function' ? timed(listener) as EventListener : listener, options)
  }
  const raf = window.requestAnimationFrame.bind(window)
  window.requestAnimationFrame = cb => raf(timed(cb) as FrameRequestCallback)
  window.__frame = () => new Promise(r => raf(() => raf(() => r())))
}

async function setup(page: Page, rate: number) {
  await page.setContent('<input id="cpf" /><input id="phone" /><input id="date" /><input id="usd" />')
  await page.evaluate(instrument)
  await page.addScriptTag({ path: UMD })
  await page.evaluate(() => {
    const { bind, bindDecimal } = window.MotherMask
    const $ = (id: string) => document.getElementById(id) as HTMLInputElement
    bind($('cpf'), '999.999.999-99')
    bind($('phone'), ['(99) 9999-9999', '(99) 99999-9999'])
    bind($('date'), '9{1,2}/9{1,2}/9{4}')
    bindDecimal($('usd'), { decimalPlaces: 2, prefix: '$' })
  })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate })
}

const opsPerSec = (page: Page) => page.evaluate(() => {
  const { applyMask, processDecimal } = window.MotherMask
  const run = (fn: () => void) => {
    for (let i = 0; i < 2000; i++) fn()
    let n = 0
    const end = performance.now() + 1000
    while (performance.now() < end) { fn(); fn(); fn(); fn(); n += 4 }
    return Math.round(n)
  }
  return {
    applyMaskCpf: run(() => { applyMask('12345678901', '999.999.999-99', 11) }),
    applyMaskPhoneArray: run(() => { applyMask('11999887766', ['(99) 9999-9999', '(99) 99999-9999'], 11) }),
    processDecimal: run(() => { processDecimal('1234567,89', { decimalPlaces: 2, prefix: '$' }) }),
  }
})

async function keystrokeSamples(page: Page) {
  const samples: number[] = []
  const key = async (k: string) => {
    await page.evaluate(() => { window.__work = 0 })
    await page.keyboard.press(k)
    samples.push(await page.evaluate(async () => { await window.__frame(); return window.__work }))
  }
  for (let r = 0; r < REPEATS; r++) {
    for (const [id, chars] of [['cpf', '12345678901'], ['phone', '11999887766'], ['date', '3/4/1986'], ['usd', '123456']]) {
      await page.evaluate(i => { const el = document.getElementById(i) as HTMLInputElement; el.value = ''; el.focus() }, id)
      for (const ch of chars) await key(ch)
      for (let i = 0; i < 3; i++) await key('Backspace')
    }
  }
  return samples.sort((a, b) => a - b)
}

const pct = (s: number[], p: number) => +s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)].toFixed(3)

for (const rate of [1, 4, 6]) {
  test(`perf at ${rate}x CPU throttle`, async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'CDP throttling is Chromium only')
    test.setTimeout(180_000)
    await setup(page, rate)
    const ops = await opsPerSec(page)
    const s = await keystrokeSamples(page)
    console.log('PERF', JSON.stringify({ rate, ops, keystroke: { n: s.length, p50: pct(s, 0.5), p95: pct(s, 0.95), max: pct(s, 1) } }))
  })
}
