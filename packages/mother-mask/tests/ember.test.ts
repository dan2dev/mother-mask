import { describe, expect, it, vi } from 'vitest'
import { maskInputModifier } from '../src/ember/mask-input-handler'
import { maskDecimalModifier } from '../src/ember/mask-decimal-handler'

// These import the handler modules directly, never `../src/ember/index` or
// `./mask-input`/`./mask-decimal` — those pull in `ember-modifier`, which
// itself imports Ember framework internals (`@ember/application`,
// `@ember/modifier`, `@ember/destroyable`) that only resolve inside a real
// Ember app's build (Embroider/ember-cli provide those specifiers; they
// aren't separately installable npm packages). See the doc comment on
// `maskInputModifier` in `../src/ember/mask-input-handler.ts` for why the
// masking logic is split out this way, and why the `modifier()`-wrapped
// default exports are verified at the type level (`tsc --noEmit`) instead
// of here. `ember-modifier` itself calls handlers with exactly this shape
// — `(element, positional, named)` — so these tests call them the same way.

function input(): HTMLInputElement {
  const el = document.createElement('input')
  document.body.append(el)
  return el
}

function edit(el: HTMLInputElement, value: string) {
  el.value = value
  el.setSelectionRange(value.length, value.length)
  el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
}

describe('maskInputModifier', () => {
  it('formats the initial value in place', () => {
    const el = input()
    el.value = '123456'
    maskInputModifier(el, ['999-999'], {})
    expect(el.value).toBe('123-456')
  })

  it("prefers an explicit value over the element's own current value", () => {
    const el = input()
    el.value = 'stale'
    maskInputModifier(el, ['999-999'], { value: '123456' })
    expect(el.value).toBe('123-456')
  })

  it('calls onValueChange when the user types', () => {
    const el = input()
    const onValueChange = vi.fn()
    maskInputModifier(el, ['999-999'], { onValueChange })
    edit(el, '123456')
    expect(onValueChange).toHaveBeenLastCalledWith('123-456')
  })

  it('returns a destructor that disposes the binding', () => {
    const el = input()
    const removeEventListener = vi.spyOn(el, 'removeEventListener')
    const destroy = maskInputModifier(el, ['999-999'], {})
    destroy()
    expect(removeEventListener).toHaveBeenCalled()
  })

  it('re-invoking after the destructor rebinds cleanly (mirrors ember-modifier rerunning on an arg change)', () => {
    const el = input()
    const firstDestroy = maskInputModifier(el, ['999-999'], { value: '123456' })
    firstDestroy()
    const secondDestroy = maskInputModifier(el, ['99/99/99'], { value: '123456' })
    expect(el.value).toBe('12/34/56')
    secondDestroy()
  })

  it('leaves an already-formatted value untouched, so an echoed rebind never moves the caret', () => {
    const el = input()
    el.value = '123-456'
    const setter = vi.spyOn(el, 'value', 'set')
    maskInputModifier(el, ['999-999'], { value: '123-456' })
    expect(setter).not.toHaveBeenCalled()
  })
})

describe('maskDecimalModifier', () => {
  it('formats the initial value in place and sets inputmode="decimal"', () => {
    const el = input()
    el.value = '123456'
    maskDecimalModifier(el, [], {})
    expect(el.value).toBe('123,456')
    expect(el.inputMode).toBe('decimal')
  })

  it('calls onValueChange with the formatted value and numeric value', () => {
    const el = input()
    const onValueChange = vi.fn()
    maskDecimalModifier(el, [], { onValueChange })
    edit(el, '123456')
    expect(onValueChange).toHaveBeenLastCalledWith('123,456', 123456)
  })

  it('returns a destructor that disposes the binding', () => {
    const el = input()
    const removeEventListener = vi.spyOn(el, 'removeEventListener')
    const destroy = maskDecimalModifier(el, [], {})
    destroy()
    expect(removeEventListener).toHaveBeenCalled()
  })
})
