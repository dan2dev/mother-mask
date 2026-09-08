// @vitest-environment node
/** @jsxImportSource @builder.io/qwik */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { $, component$, useSignal } from '@builder.io/qwik'
import { createDOM } from '@builder.io/qwik/testing'
import * as core from '../src/index'
import * as qwikApi from '../src/qwik/index'
import { InputDecimal, InputMask } from '../src/qwik/index'

afterEach(() => {
  vi.restoreAllMocks()
})

it('aliases every core export without exposing Qwik components from core', () => {
  for (const name of Object.keys(core) as Array<keyof typeof core>) {
    expect(qwikApi[name]).toBe(core[name])
  }
  expect(core).not.toHaveProperty('InputMask')
  expect(core).not.toHaveProperty('InputDecimal')
})

function dispatchInput(input: HTMLInputElement, value: string): void {
  input.value = value
  // `@vitest-environment node` (required for Qwik's own testing DOM — see
  // above) means no global `InputEvent`, and Qwik's own mock document
  // rejects an event built with the modern `new Event(...)` constructor
  // (`INVALID_STATE_ERR`) — its `createEvent`/`initEvent` legacy pair is
  // what its `_dispatchEvent` actually expects.
  const event = input.ownerDocument.createEvent('Event') as Event & { inputType?: string }
  event.initEvent('input', true, true)
  event.inputType = 'insertText'
  input.dispatchEvent(event)
}

describe('InputMask', () => {
  it('formats the initial value once visible', async () => {
    const { screen, render } = await createDOM()
    await render(<InputMask mask="999-999" value="123456" />)
    const input = screen.querySelector('input')!
    expect(input.value).toBe('123-456')
  })

  it('calls onValueChange$ when the user types', async () => {
    const { screen, render } = await createDOM()
    // A plain array, not `vi.fn()`: Qwik's dev-mode serializability check
    // for QRL captures rejects mock-function instances (they carry internal
    // state that isn't plain-object serializable), which real resumability
    // requires but a mock never needs to satisfy.
    const calls: string[] = []
    await render(<InputMask mask="999-999" value="" onValueChange$={$((value) => calls.push(value))} />)
    const input = screen.querySelector('input')!

    // `bind()` attaches a plain native `addEventListener('input', ...)`, not
    // one of Qwik's own `on:input$` synthetic handlers, so a real DOM event
    // (not the `userEvent` test helper, which drives Qwik's own delegation)
    // is what reaches it here — same as every other framework's tests.
    dispatchInput(input, '123456')

    expect(calls.at(-1)).toBe('123-456')
  })

  it('rebinds and reformats when the mask prop changes', async () => {
    // `createDOM().render()` performs the *initial* render only — a second
    // call errors ("You can render over a existing q:container"). Testing a
    // prop change means re-rendering the same container by mutating a
    // signal, the way Qwik's own docs test reactive updates.
    const Harness = component$(() => {
      const mask = useSignal('999-999')
      return (
        <>
          <InputMask mask={mask.value} value="123456" />
          <button onClick$={() => (mask.value = '99/99/99')}>change</button>
        </>
      )
    })
    const { screen, render, userEvent } = await createDOM()
    await render(<Harness />)
    const input = screen.querySelector('input')!
    expect(input.value).toBe('123-456')

    await userEvent('button', 'click')
    expect(input.value).toBe('12/34/56')
  })

  it('reformats when the value prop is updated externally', async () => {
    const Harness = component$(() => {
      const value = useSignal('123456')
      return (
        <>
          <InputMask mask="999-999" value={value.value} />
          <button onClick$={() => (value.value = '999888')}>change</button>
        </>
      )
    })
    const { screen, render, userEvent } = await createDOM()
    await render(<Harness />)
    const input = screen.querySelector('input')!
    expect(input.value).toBe('123-456')

    await userEvent('button', 'click')
    expect(input.value).toBe('999-888')
  })

  it('disposes the binding when the component unmounts', async () => {
    const Harness = component$(() => {
      const show = useSignal(true)
      return (
        <>
          {show.value && <InputMask mask="999-999" value="123456" />}
          <button onClick$={() => (show.value = false)}>hide</button>
        </>
      )
    })
    const { screen, render, userEvent } = await createDOM()
    await render(<Harness />)
    const input = screen.querySelector('input')!
    const removeEventListener = vi.spyOn(input, 'removeEventListener')

    await userEvent('button', 'click')

    expect(removeEventListener).toHaveBeenCalled()
    dispatchInput(input, 'abcdef')
    expect(input.value).toBe('abcdef')
  })
})

describe('InputDecimal', () => {
  it('formats the initial value and sets inputMode="decimal"', async () => {
    const { screen, render } = await createDOM()
    await render(<InputDecimal value="123456" />)
    const input = screen.querySelector('input')!
    expect(input.value).toBe('123,456')
    expect(input.getAttribute('inputmode')).toBe('decimal')
  })

  it('calls onValueChange$ with the formatted value and numeric value', async () => {
    const { screen, render } = await createDOM()
    const calls: Array<[string, number]> = []
    await render(
      <InputDecimal value="" onValueChange$={$((value, numeric) => calls.push([value, numeric]))} />,
    )
    const input = screen.querySelector('input')!

    dispatchInput(input, '123456')

    expect(calls.at(-1)).toEqual(['123,456', 123456])
  })

  it('rebinds and reformats when options change', async () => {
    const Harness = component$(() => {
      const prefix = useSignal('')
      return (
        <>
          <InputDecimal options={{ prefix: prefix.value }} value="123456" />
          <button onClick$={() => (prefix.value = '$')}>change</button>
        </>
      )
    })
    const { screen, render, userEvent } = await createDOM()
    await render(<Harness />)
    const input = screen.querySelector('input')!
    expect(input.value).toBe('123,456')

    await userEvent('button', 'click')
    expect(input.value).toBe('$123,456')
  })

  it('disposes the binding when the component unmounts', async () => {
    const Harness = component$(() => {
      const show = useSignal(true)
      return (
        <>
          {show.value && <InputDecimal value="123456" />}
          <button onClick$={() => (show.value = false)}>hide</button>
        </>
      )
    })
    const { screen, render, userEvent } = await createDOM()
    await render(<Harness />)
    const input = screen.querySelector('input')!
    const removeEventListener = vi.spyOn(input, 'removeEventListener')

    await userEvent('button', 'click')

    expect(removeEventListener).toHaveBeenCalled()
  })
})
