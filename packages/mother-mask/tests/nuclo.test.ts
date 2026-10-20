import { afterEach, describe, expect, it, vi } from 'vitest'
import 'nuclo'
import { renderToString } from 'nuclo/ssr'
import * as core from '../src/index'
import * as nucloApi from '../src/nuclo/index'
import { motherMask } from '../src/nuclo/mask-mod'
import { motherMaskDecimal } from '../src/nuclo/decimal-mod'

let shown = true

afterEach(() => {
  // Tear the tree down through Nuclo so destroy hooks run, then drop the root.
  shown = false
  update()
  document.body.replaceChildren()
  shown = true
  vi.restoreAllMocks()
})

/** Mount `input(...mods)` inside a `when()` so the afterEach can destroy it. */
function mount(...mods: NodeModLike<'input'>[]): HTMLInputElement {
  render(() => div(when(() => shown, input(...mods))), document.body)
  return document.querySelector('input')!
}

function type(element: HTMLInputElement, value: string): void {
  element.value = value
  element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
}

it('aliases every core export without exposing Nuclo mods from core', () => {
  for (const name of Object.keys(core) as Array<keyof typeof core>) {
    expect(nucloApi[name]).toBe(core[name])
  }
  expect(core).not.toHaveProperty('motherMask')
  expect(core).not.toHaveProperty('motherMaskDecimal')
})

describe('motherMask mod', () => {
  it('formats the initial value before mount and sets type="text"', () => {
    const element = mount(motherMask('999-999', { value: () => '123456' }))
    expect(element.value).toBe('123-456')
    expect(element.type).toBe('text')
  })

  it('binds on mount and calls onChange when the user types', () => {
    const onChange = vi.fn()
    const element = mount(motherMask('999-999', { onChange }))
    type(element, '123456')
    expect(element.value).toBe('123-456')
    expect(onChange).toHaveBeenLastCalledWith('123-456')
  })

  it('works without onChange or value', () => {
    const element = mount(motherMask('999-999'))
    expect(() => type(element, '123456')).not.toThrow()
    expect(element.value).toBe('123-456')
  })

  it('formats an externally set value on update()', () => {
    let phone = ''
    const element = mount(motherMask('999-999', { value: () => phone, onChange: (next) => { phone = next } }))
    phone = '654321'
    update()
    expect(element.value).toBe('654-321')
  })

  it('leaves the input alone when update() echoes its own onChange', () => {
    let phone = ''
    const element = mount(motherMask('999-999', { value: () => phone, onChange: (next) => { phone = next } }))
    type(element, '12')
    element.setSelectionRange(1, 1)
    const setter = vi.spyOn(HTMLInputElement.prototype, 'value', 'set')
    update()
    // The dynamic value hands back the live DOM value, so even if Nuclo
    // writes it the write is a no-op and the caret does not move.
    for (const call of setter.mock.calls) expect(call[0]).toBe('12')
    expect(element.value).toBe('12')
    expect(element.selectionStart).toBe(1)
  })

  it('keeps extra attributes and a sibling onMount hook', () => {
    const onMount = vi.fn()
    const element = mount({ id: 'phone', inputMode: 'tel', onMount }, motherMask('999-999'))
    expect(element.id).toBe('phone')
    expect(element.inputMode).toBe('tel')
    expect(onMount).toHaveBeenCalledTimes(1)
    type(element, '123456')
    expect(element.value).toBe('123-456')
  })

  it('disposes the binding when Nuclo removes the element', () => {
    const element = mount(motherMask('999-999'))
    const removeListener = vi.spyOn(element, 'removeEventListener')
    shown = false
    update()
    expect(removeListener).toHaveBeenCalled()
    // A disposed input can be bound again; a still-bound one is a no-op.
    type(element, '1234')
    expect(element.value).toBe('1234')
  })
})

describe('motherMaskDecimal mod', () => {
  it('formats the initial value and sets inputmode="decimal"', () => {
    const element = mount(motherMaskDecimal({ decimalPlaces: 2, prefix: '$', value: () => '1234.5' }))
    expect(element.value).toBe('$1,234.50')
    expect(element.inputMode).toBe('decimal')
    expect(element.type).toBe('text')
  })

  it('reports the masked string and numeric value', () => {
    const onChange = vi.fn()
    const element = mount(motherMaskDecimal({ decimalPlaces: 2, onChange }))
    type(element, '1234.5')
    expect(onChange).toHaveBeenLastCalledWith('1,234.50', 1234.5)
  })

  it('works without onChange or value', () => {
    const element = mount(motherMaskDecimal())
    expect(() => type(element, '1234')).not.toThrow()
    expect(element.value).toBe('1,234')
  })

  it('formats an externally set value but not an echo', () => {
    let amount = ''
    const element = mount(motherMaskDecimal({ decimalPlaces: 2, value: () => amount, onChange: (next) => { amount = next } }))
    amount = '42'
    update()
    expect(element.value).toBe('42.00')
    type(element, '7')
    expect(amount).toBe('7.00')
    update()
    expect(element.value).toBe('7.00')
  })

  it('disposes the binding when Nuclo removes the element', () => {
    const element = mount(motherMaskDecimal({ decimalPlaces: 2 }))
    shown = false
    update()
    type(element, '12')
    expect(element.value).toBe('12')
  })
})

describe('options and attributes', () => {
  it('passes every BindOptions through, for typing and for the value getter', () => {
    const tokens = { U: { match: /[a-z]/i, transform: (char: string) => char.toUpperCase() } }
    let value = 'ab12'
    const element = mount(motherMask('UU-99', { tokens, value: () => value, onChange: (next) => { value = next } }))
    expect(element.value).toBe('AB-12')
    type(element, 'cd34')
    expect(element.value).toBe('CD-34')
    expect(value).toBe('CD-34')
  })

  it('selects from an ordered mask array', () => {
    const element = mount(motherMask(['999-999', '9999-9999']))
    type(element, '12345678')
    expect(element.value).toBe('1234-5678')
  })

  it('lets a later attributes object override the type the mod sets', () => {
    const element = mount(motherMask('999-999'), { type: 'tel' })
    expect(element.type).toBe('tel')
    type(element, '123456')
    expect(element.value).toBe('123-456')
  })

  it('keeps the binding attributes bind() adds', () => {
    const element = mount(motherMask('999-999'))
    expect(element.getAttribute('autocomplete')).toBe('off')
    expect(element.getAttribute('maxlength')).toBe('7')
  })
})

describe('several fields', () => {
  it('keeps per-field state apart across one update()', () => {
    let phone = ''
    let code = ''
    render(() => div(when(() => shown,
      input({ id: 'phone' }, motherMask('(99) 9999-9999', { value: () => phone, onChange: (next) => { phone = next } })),
      input({ id: 'code' }, motherMask('AAA-999', { value: () => code, onChange: (next) => { code = next } })),
    )), document.body)
    const phoneInput = document.querySelector<HTMLInputElement>('#phone')!
    const codeInput = document.querySelector<HTMLInputElement>('#code')!

    type(phoneInput, '11987654321')
    phoneInput.setSelectionRange(3, 3)
    code = 'abc123'
    update()

    expect(codeInput.value).toBe('abc-123')
    expect(phoneInput.value).toBe('(11) 9876-5432')
    expect(phoneInput.selectionStart).toBe(3)
  })

  it('disposes each list() row on its own', () => {
    let rows = [{ id: 1 }, { id: 2 }]
    render(() => div(when(() => shown, list(() => rows, (row) =>
      input({ id: `row-${row.id}` }, motherMask('999-999')),
    ))), document.body)
    const first = document.querySelector<HTMLInputElement>('#row-1')!
    const second = document.querySelector<HTMLInputElement>('#row-2')!
    const removeListener = vi.spyOn(first, 'removeEventListener')

    rows = [rows[1]!]
    update()

    expect(removeListener).toHaveBeenCalled()
    type(first, '123456')
    expect(first.value).toBe('123456')
    type(second, '123456')
    expect(second.value).toBe('123-456')
  })
})

describe('server rendering and hydration', () => {
  it('renders the formatted initial value and static attributes without binding', () => {
    const onMount = vi.fn()
    const html = renderToString(() => div(
      input({ id: 'phone' }, motherMask('999-999', { value: () => '123456' })),
      input({ id: 'amount' }, motherMaskDecimal({ decimalPlaces: 2, prefix: '$', value: () => '1234.5' })),
      input({ id: 'plain', onMount }, motherMask('999-999')),
    ))
    expect(html).toContain('value="123-456"')
    expect(html).toContain('value="$1,234.50"')
    expect(html).toContain('type="text"')
    expect(html).toContain('inputmode="decimal"')
    // Hooks never run on the server, and bind()'s own attributes are a client-side effect.
    expect(onMount).not.toHaveBeenCalled()
    expect(html).not.toContain('autocomplete')
  })

  it('binds after hydrate() and keeps the server-rendered value', () => {
    let phone = '123456'
    const onChange = vi.fn((next: string) => { phone = next })
    const App = () => div(when(() => shown, input({ id: 'phone' }, motherMask('999-999', { value: () => phone, onChange }))))

    const container = document.createElement('div')
    container.innerHTML = renderToString(App)
    document.body.append(container)
    const element = container.querySelector('input')!
    expect(element.value).toBe('123-456')

    hydrate(App, container)
    expect(container.querySelector('input')).toBe(element)
    expect(element.getAttribute('autocomplete')).toBe('off')

    type(element, '654321')
    expect(onChange).toHaveBeenLastCalledWith('654-321')
    phone = '111111'
    update()
    expect(element.value).toBe('111-111')
  })
})
