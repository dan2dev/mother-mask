import { Directive, ElementRef, EventEmitter, Input, Output, afterRenderEffect, inject, signal } from '@angular/core'
import type { OnChanges, OnDestroy, SimpleChanges, ɵɵDirectiveDeclaration, ɵɵFactoryDeclaration } from '@angular/core'
import { bindDecimal, processDecimal } from 'mother-mask'
import type { BindDecimalOptions } from 'mother-mask'

interface DecimalConfig {
  options: Omit<BindDecimalOptions, 'onChange'> | undefined
  value: string
}

/**
 * Standalone attribute directive wrapping {@link bindDecimal}. Same
 * `@Input`/`@Output` plus `signal`/`afterRenderEffect` lifecycle contract as
 * {@link MotherMaskDirective}: browser-only, reactive rebinding, guaranteed
 * `dispose()`.
 *
 * ```html
 * <input motherMaskDecimal [motherMaskDecimalOptions]="currency" [(value)]="amount"
 *        (numericValueChange)="onAmount($event)" />
 * ```
 */
@Directive({
  selector: 'input[motherMaskDecimal]',
  standalone: true,
  host: { '[attr.inputmode]': "'decimal'" },
})
export class MotherMaskDecimalDirective implements OnChanges, OnDestroy {
  private readonly elementRef = inject<ElementRef<HTMLInputElement>>(ElementRef)
  private readonly config = signal<DecimalConfig | null>(null)
  private dispose: (() => void) | null = null
  private lastEmitted: string | null = null

  @Input() motherMaskDecimalOptions?: Omit<BindDecimalOptions, 'onChange'>
  @Input() value = ''
  @Output() readonly valueChange = new EventEmitter<string>()
  @Output() readonly numericValueChange = new EventEmitter<number>()

  constructor() {
    afterRenderEffect((onCleanup) => {
      const config = this.config()
      if (!config) return
      const { options, value } = config
      const element = this.elementRef.nativeElement

      this.release()
      const next = processDecimal(value, options)
      if (element.value !== next) element.value = next

      this.dispose = bindDecimal(element, {
        ...options,
        onChange: (maskedValue, numericValue) => {
          this.lastEmitted = maskedValue
          this.value = maskedValue
          this.valueChange.emit(maskedValue)
          this.numericValueChange.emit(numericValue)
        },
      })

      onCleanup(() => this.release())
    })
  }

  ngOnChanges(changes: SimpleChanges): void {
    const onlyValueChanged = Object.keys(changes).length === 1 && 'value' in changes
    if (onlyValueChanged && changes['value'].currentValue === this.lastEmitted) return

    this.config.set({ options: this.motherMaskDecimalOptions, value: this.value })
  }

  ngOnDestroy(): void {
    this.release()
  }

  private release(): void {
    this.dispose?.()
    this.dispose = null
  }

  // Type-only — see the matching comment on `MotherMaskDirective` for why
  // this is hand-declared rather than emitted by `ngc`.
  declare static ɵfac: ɵɵFactoryDeclaration<MotherMaskDecimalDirective, never>
  declare static ɵdir: ɵɵDirectiveDeclaration<
    MotherMaskDecimalDirective,
    'input[motherMaskDecimal]',
    never,
    {
      motherMaskDecimalOptions: { alias: 'motherMaskDecimalOptions'; required: false }
      value: { alias: 'value'; required: false }
    },
    { valueChange: 'valueChange'; numericValueChange: 'numericValueChange' },
    never,
    never,
    true,
    never
  >
}
