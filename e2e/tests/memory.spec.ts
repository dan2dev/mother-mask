import { test, expect } from '@playwright/test'
import type { CDPSession, Page } from '@playwright/test'

/**
 * Real-browser leak coverage. jsdom can prove the listeners come off and the
 * frames get cancelled, but it cannot tell you whether the objects are
 * actually collectable — only a real heap with a real GC can.
 *
 * Every measurement here forces a full GC first (`HeapProfiler.collectGarbage`
 * over CDP), so what's left is retained, not merely uncollected. Chromium-only:
 * these metrics have no cross-browser equivalent.
 */

interface Sample {
  heapBytes: number
  nodes: number
  listeners: number
}

async function startMetrics(page: Page): Promise<CDPSession> {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Performance.enable')
  await cdp.send('HeapProfiler.enable')
  return cdp
}

/** Force a full GC, then read the retained heap / DOM node / listener counts. */
async function sample(cdp: CDPSession): Promise<Sample> {
  // Twice: the first pass can leave objects that only become unreachable once
  // the first pass has run (weak refs, detached-node parents).
  await cdp.send('HeapProfiler.collectGarbage')
  await cdp.send('HeapProfiler.collectGarbage')
  const { metrics } = await cdp.send('Performance.getMetrics')
  const read = (name: string): number => metrics.find((m) => m.name === name)?.value ?? 0
  return {
    heapBytes: read('JSHeapUsedSize'),
    nodes: read('Nodes'),
    listeners: read('JSEventListeners'),
  }
}

const MB = 1024 * 1024

test.describe('memory', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'CDP heap metrics are Chromium-only')

  test('an unmounted field with a reformat frame in flight is still collectable', async ({ page }) => {
    await page.goto('/')
    const cdp = await startMetrics(page)

    // A *pending* requestAnimationFrame callback is a GC root the browser
    // holds until it fires, and bind()'s callback closes over the input. On a
    // backgrounded tab a frame may not come for a very long time, so a field
    // that unmounts with a frame still scheduled would stay pinned — element,
    // listeners, closure and all — unless dispose() cancels it.
    //
    // rAF is swapped for a faithful stand-in (a registry that `cancel`
    // removes from) so the frame is guaranteed to still be pending at the
    // moment we measure; otherwise a real frame fires during the CDP round
    // trip, releases the closure on its own, and the test proves nothing.
    const pendingAfterDispose = await page.evaluate(() => {
      // Parked on `window` so it stays reachable after this evaluate returns,
      // the way the browser's real frame queue does. If the registry itself
      // became garbage, a leaked callback would be collected along with it and
      // the WeakRef check below would pass no matter what dispose() did.
      const pending = new Map<number, FrameRequestCallback>()
      ;(window as unknown as { __raf: unknown }).__raf = pending
      let nextId = 1
      const realRequest = window.requestAnimationFrame
      const realCancel = window.cancelAnimationFrame
      window.requestAnimationFrame = (cb: FrameRequestCallback): number => {
        const id = nextId++
        pending.set(id, cb)
        return id
      }
      window.cancelAnimationFrame = (id: number): void => {
        pending.delete(id)
      }

      let input: HTMLInputElement | null = document.createElement('input')
      document.body.appendChild(input)
      const dispose = window.motherMask.bind(input, '(99) 99999-9999', { onChange: () => {} })
      input.value = '11999887766'
      input.setSelectionRange(11, 11)
      // Schedules a reformat frame that closes over the element…
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '6', bubbles: true, cancelable: true }))
      // …and the field unmounts before that frame can ever fire.
      dispose()
      input.remove()

      ;(window as unknown as { __probe: WeakRef<HTMLInputElement> }).__probe = new WeakRef(input)
      input = null

      window.requestAnimationFrame = realRequest
      window.cancelAnimationFrame = realCancel
      return pending.size
    })

    // Nothing left holding the callback…
    expect(pendingAfterDispose, 'rAF callbacks still pending after dispose()').toBe(0)

    // …and the element itself is genuinely gone from the heap.
    await sample(cdp)
    const stillAlive = await page.evaluate(
      () => (window as unknown as { __probe: WeakRef<HTMLInputElement> }).__probe.deref() !== undefined,
    )
    expect(stillAlive, 'unmounted input still reachable after dispose()').toBe(false)
  })

  test('sustained typing into one field does not grow the heap', async ({ page }) => {
    await page.goto('/')
    const cdp = await startMetrics(page)

    const burst = () =>
      page.evaluate(() => {
        const input = document.querySelector<HTMLInputElement>('#cpf')!
        for (let i = 0; i < 20000; i++) {
          if (i % 15 === 0) {
            input.value = ''
            input.setSelectionRange(0, 0)
          }
          const ch = String(i % 10)
          const start = input.selectionStart ?? input.value.length
          input.value = input.value.slice(0, start) + ch + input.value.slice(start)
          input.setSelectionRange(start + 1, start + 1)
          input.dispatchEvent(
            new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ch }),
          )
        }
      })

    await burst()
    const before = await sample(cdp)
    await burst()
    await burst()
    const after = await sample(cdp)

    expect((after.heapBytes - before.heapBytes) / MB, 'heap growth (MB) over 40k keystrokes').toBeLessThan(2)
  })

  test('dynamically generated mask strings do not grow the compiled-mask cache forever', async ({
    page,
  }) => {
    await page.goto('/')
    const cdp = await startMetrics(page)

    // The cache key is a caller-supplied string, so this is the shape that
    // would pin memory for the lifetime of the page if it were unbounded.
    // Every mask here is distinct — `i` and the padding are literals, only
    // the "9"s are slots — so nothing can be served from cache twice.
    const compileMany = (from: number, count: number) =>
      page.evaluate(
        ({ from, count }) => {
          for (let i = from; i < from + count; i++) {
            const unique = `${i}${'x'.repeat(200)}`
            window.motherMask.buildMask('123456789', `999.${unique}-99`, 0).process()
          }
        },
        { from, count },
      )

    await compileMany(0, 20000)
    const before = await sample(cdp)
    await compileMany(20000, 20000)
    await compileMany(40000, 20000)
    const after = await sample(cdp)

    expect((after.heapBytes - before.heapBytes) / MB, 'heap growth (MB) over 40k distinct masks').toBeLessThan(2)
  })
})
