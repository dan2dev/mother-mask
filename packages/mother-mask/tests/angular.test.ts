import './angular-setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Component, provideZonelessChangeDetection, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import type { ComponentFixture } from '@angular/core/testing'
import * as core from '../src/index'
import * as angularApi from '../src/angular/index'
import { MotherMaskDecimalDirective, MotherMaskDirective } from '../src/angular/index'

let fixture: ComponentFixture<unknown> | undefined

beforeEach(() => {
  TestBed.resetTestingModule()
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] })
})

afterEach(() => {
  fixture?.destroy()
  fixture = undefined
})

it('aliases every core export without exposing Angular directives from core', () => {
  for (const name of Object.keys(core) as Array<keyof typeof core>) {
    expect(angularApi[name]).toBe(core[name])
  }
  expect(core).not.toHaveProperty('MotherMaskDirective')
  expect(core).not.toHaveProperty('MotherMaskDecimalDirective')
})

describe('MotherMaskDirective', () => {
  @Component({
    standalone: true,
    imports: [MotherMaskDirective],
    template: `<input motherMask="999-999" [(value)]="phone" />`,
  })
  class Host {
    readonly phone = signal('123456')
  }

  @Component({
    standalone: true,
    imports: [MotherMaskDirective],
    template: `<input [motherMask]="mask()" [motherMaskOptions]="options()" [(value)]="phone" />`,
  })
  class ConfigurableHost {
    readonly mask = signal('999-999')
    readonly options = signal<{ eager?: boolean } | undefined>(undefined)
    readonly phone = signal('123456')
  }

  it('formats the initial value on render', async () => {
    fixture = TestBed.createComponent(Host)
    await fixture.whenStable()
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement
    expect(input.value).toBe('123-456')
  })

  it('updates the model signal when the user types', async () => {
    fixture = TestBed.createComponent(Host)
    await fixture.whenStable()
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement

    input.value = '654321'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    await fixture.whenStable()

    expect((fixture.componentInstance as Host).phone()).toBe('654-321')
    expect(input.value).toBe('654-321')
  })

  it('reformats when the model signal is set externally', async () => {
    fixture = TestBed.createComponent(Host)
    await fixture.whenStable()
    const host = fixture.componentInstance as Host
    host.phone.set('999888')
    await fixture.whenStable()

    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement
    expect(input.value).toBe('999-888')
  })

  it('disposes the binding when the host is destroyed', async () => {
    fixture = TestBed.createComponent(Host)
    await fixture.whenStable()
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement
    const removeEventListener = vi.spyOn(input, 'removeEventListener')

    fixture.destroy()
    fixture = undefined

    expect(removeEventListener).toHaveBeenCalled()
    input.value = 'abcdef'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    expect(input.value).toBe('abcdef')
  })

  it('rebinds and reformats when the mask input changes', async () => {
    const configurableFixture = TestBed.createComponent(ConfigurableHost)
    fixture = configurableFixture
    await configurableFixture.whenStable()
    configurableFixture.componentInstance.mask.set('99/99/99')
    await configurableFixture.whenStable()
    const input = configurableFixture.nativeElement.querySelector('input') as HTMLInputElement
    expect(input.value).toBe('12/34/56')
  })

  it('rebinds when the options input changes', async () => {
    const configurableFixture = TestBed.createComponent(ConfigurableHost)
    fixture = configurableFixture
    await configurableFixture.whenStable()
    const input = configurableFixture.nativeElement.querySelector('input') as HTMLInputElement
    const removeEventListener = vi.spyOn(input, 'removeEventListener')
    configurableFixture.componentInstance.options.set({ eager: true })
    await configurableFixture.whenStable()
    expect(removeEventListener).toHaveBeenCalled()
  })
})

describe('MotherMaskDecimalDirective', () => {
  @Component({
    standalone: true,
    imports: [MotherMaskDecimalDirective],
    template: `<input motherMaskDecimal [(value)]="amount" (numericValueChange)="onNumeric($event)" />`,
  })
  class Host {
    readonly amount = signal('123456')
    numeric: number | undefined
    onNumeric(value: number) {
      this.numeric = value
    }
  }

  @Component({
    standalone: true,
    imports: [MotherMaskDecimalDirective],
    template: `<input motherMaskDecimal [motherMaskDecimalOptions]="options()" [(value)]="amount" />`,
  })
  class ConfigurableHost {
    readonly options = signal<{ prefix?: string } | undefined>(undefined)
    readonly amount = signal('123456')
  }

  it('formats the initial value and sets inputmode="decimal"', async () => {
    fixture = TestBed.createComponent(Host)
    await fixture.whenStable()
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement
    expect(input.value).toBe('123,456')
    expect(input.getAttribute('inputmode')).toBe('decimal')
  })

  it('emits the numeric value alongside the formatted model update', async () => {
    fixture = TestBed.createComponent(Host)
    await fixture.whenStable()
    const host = fixture.componentInstance as Host
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement

    input.value = '9999'
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
    await fixture.whenStable()

    expect(host.amount()).toBe('9,999')
    expect(host.numeric).toBe(9999)
  })

  it('disposes the binding when the host is destroyed', async () => {
    fixture = TestBed.createComponent(Host)
    await fixture.whenStable()
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement
    const removeEventListener = vi.spyOn(input, 'removeEventListener')

    fixture.destroy()
    fixture = undefined

    expect(removeEventListener).toHaveBeenCalled()
  })

  it('rebinds and reformats when the options input changes', async () => {
    const configurableFixture = TestBed.createComponent(ConfigurableHost)
    fixture = configurableFixture
    await configurableFixture.whenStable()
    configurableFixture.componentInstance.options.set({ prefix: '$' })
    await configurableFixture.whenStable()
    const input = configurableFixture.nativeElement.querySelector('input') as HTMLInputElement
    expect(input.value).toBe('$123,456')
  })
})
