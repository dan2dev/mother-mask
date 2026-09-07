import { Directive, ElementRef, EventEmitter, Input, Output, afterRenderEffect, inject, signal } from '@angular/core'
import type { OnChanges, OnDestroy, SimpleChanges, ɵɵDirectiveDeclaration, ɵɵFactoryDeclaration } from '@angular/core'
import { bind, process } from 'mother-mask'
import type { BindOptions, MaskPattern } from 'mother-mask'

interface MaskConfig {
  mask: MaskPattern
  options: Omit<BindOptions, 'onChange'> | undefined
  value: string
}

/**
 * Standalone attribute directive wrapping {@link bind}.
 *
 * Inputs/outputs use the classic `@Input`/`@Output` decorators — recognized
 * purely at class-decoration time, unlike the functional `input()`/`model()`
 * API, which Angular can only wire up to template bindings through the
 * ngtsc compiler's static analysis (unavailable in a plain esbuild/Vite
 * pipeline without the Angular CLI build toolchain). The binding lifecycle
 * itself is still Signals-driven: `ngOnChanges` pushes the latest
 * mask/options/value into a `signal`, and `afterRenderEffect` — which only
 * ever runs on the browser, never during SSR, so no `typeof window` guard
 * is needed — reactively (re)binds whenever that signal changes. Its
 * `onCleanup` callback, invoked before every re-run and on directive
 * destroy, guarantees `dispose()` runs exactly once per binding.
 *
 * ```html
 * <input motherMask="999-999" [(value)]="phone" />
 * ```
 */
@Directive({
  selector: 'input[motherMask]',
  standalone: true,
})
export class MotherMaskDirective implements OnChanges, OnDestroy {
  private readonly elementRef = inject<ElementRef<HTMLInputElement>>(ElementRef)
  private readonly config = signal<MaskConfig | null>(null)
  private dispose: (() => void) | null = null
  private lastEmitted: string | null = null

  @Input('motherMask') mask!: MaskPattern
  @Input() motherMaskOptions?: Omit<BindOptions, 'onChange'>
  @Input() value = ''
  @Output() readonly valueChange = new EventEmitter<string>()

  constructor() {
    afterRenderEffect((onCleanup) => {
      const config = this.config()
      if (!config) return
      const { mask, options, value } = config
      const element = this.elementRef.nativeElement

      this.release()
      const next = process(value, mask, options)
      if (element.value !== next) element.value = next

      this.dispose = bind(element, mask, {
        ...options,
        onChange: (maskedValue) => {
          this.lastEmitted = maskedValue
          this.value = maskedValue
          this.valueChange.emit(maskedValue)
        },
      })

      onCleanup(() => this.release())
    })
  }

  ngOnChanges(changes: SimpleChanges): void {
    // An echo of our own onChange (parent re-binds `value` from the
    // `valueChange` we just emitted) shows up as the only changed input,
    // already reflecting what the live binder produced — skip the rebind.
    const onlyValueChanged = Object.keys(changes).length === 1 && 'value' in changes
    if (onlyValueChanged && changes['value'].currentValue === this.lastEmitted) return

    this.config.set({ mask: this.mask, options: this.motherMaskOptions, value: this.value })
  }

  ngOnDestroy(): void {
    this.release()
  }

  private release(): void {
    this.dispose?.()
    this.dispose = null
  }

  // Type-only: our build runs plain esbuild/rolldown (tsdown), not the
  // Angular compiler-cli (`ngc`), so the emitted `.d.ts` never gets the
  // `ɵdir`/`ɵfac` static members ngtsc's template type checker (and the
  // Angular Language Service) look for when validating an `imports: [...]`
  // entry as a real directive — without them, a consuming app's IDE reports
  // "Component imports must be standalone components, directives, pipes,
  // or must be NgModules." even though the directive works correctly at
  // runtime (the real `@Directive` JIT decorator already attaches the real
  // `ɵdir` to this class when `@angular/compiler` is loaded). `declare`
  // adds only the type-level description ngtsc reads from the `.d.ts` — it
  // emits no code and cannot conflict with that real runtime assignment.
  declare static ɵfac: ɵɵFactoryDeclaration<MotherMaskDirective, never>
  declare static ɵdir: ɵɵDirectiveDeclaration<
    MotherMaskDirective,
    'input[motherMask]',
    never,
    {
      mask: { alias: 'motherMask'; required: false }
      motherMaskOptions: { alias: 'motherMaskOptions'; required: false }
      value: { alias: 'value'; required: false }
    },
    { valueChange: 'valueChange' },
    never,
    never,
    true,
    never
  >
}
