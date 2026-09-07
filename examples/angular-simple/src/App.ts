import { Component } from '@angular/core'
import { MotherMaskDecimalDirective, MotherMaskDirective, formatDecimalValue } from 'mother-mask/angular'

// Keep option objects outside change detection so they stay stable across renders.
const amountOptions = { decimalPlaces: 2, prefix: '$', allowNegative: true }
const realOptions = { decimalPlaces: 2, separator: '.', decimalSeparator: ',', prefix: 'R$ ' }
const percentOptions = { decimalPlaces: 2, suffix: '%', segmented: false }

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MotherMaskDirective, MotherMaskDecimalDirective],
  template: `
    <main>
      <p class="eyebrow">mother-mask + Angular</p>
      <h1>Simple input examples</h1>
      <p>Try a phone number, a date, or a decimal format. Type, paste, or fill all the examples below.</p>

      <div class="actions">
        <button type="button" (click)="fillExamples()">Fill example values</button>
        <button type="button" (click)="clearExamples()">Clear</button>
      </div>

      <h2>Phone and date</h2>
      <div class="examples">
        <section aria-labelledby="phone-title">
          <label id="phone-title" for="phone">Phone number</label>
          <input
            id="phone"
            name="phone"
            motherMask="(99) 99999-9999"
            [(value)]="phone"
            inputmode="tel"
            autocomplete="tel"
            placeholder="(11) 98765-4321"
            aria-describedby="phone-hint"
          />
          <p id="phone-hint">11 digits, including the area code.</p>
          <p>Angular state: <output>{{ phone || 'Empty' }}</output></p>
        </section>

        <section aria-labelledby="date-title">
          <label id="date-title" for="date">Date</label>
          <input
            id="date"
            name="date"
            motherMask="99/99/9999"
            [(value)]="date"
            inputmode="numeric"
            placeholder="DD/MM/YYYY"
            aria-describedby="date-hint"
          />
          <p id="date-hint">Formats digits as DD/MM/YYYY; it does not validate the date.</p>
          <p>Angular state: <output>{{ date || 'Empty' }}</output></p>
        </section>
      </div>

      <h2>Decimal formats</h2>
      <div class="examples">
        <section aria-labelledby="amount-title">
          <label id="amount-title" for="amount">Amount</label>
          <input
            id="amount"
            name="amount"
            motherMaskDecimal
            [motherMaskDecimalOptions]="amountOptions"
            [(value)]="amount"
            (numericValueChange)="amountNumeric = $event"
            placeholder="$1,234.50"
            aria-describedby="amount-hint"
          />
          <p id="amount-hint">US dollars with two decimal places. Try a negative amount, too.</p>
          <p>Angular state: <output>{{ amount || 'Empty' }}</output></p>
          <p>Numeric value: <output>{{ amountNumeric }}</output></p>
        </section>

        <section aria-labelledby="real-title">
          <label id="real-title" for="real">Brazilian real</label>
          <input
            id="real"
            name="real"
            motherMaskDecimal
            [motherMaskDecimalOptions]="realOptions"
            [(value)]="real"
            placeholder="R$ 1.234,50"
            aria-describedby="real-hint"
          />
          <p id="real-hint">Periods group thousands; a comma separates the two decimal places.</p>
          <p>Angular state: <output>{{ real || 'Empty' }}</output></p>
        </section>

        <section aria-labelledby="percent-title">
          <label id="percent-title" for="percent">Percentage</label>
          <input
            id="percent"
            name="percent"
            motherMaskDecimal
            [motherMaskDecimalOptions]="percentOptions"
            [(value)]="percent"
            placeholder="12.50%"
            aria-describedby="percent-hint"
          />
          <p id="percent-hint">Two decimal places and a % suffix. Values are not limited to 100.</p>
          <p>Angular state: <output>{{ percent || 'Empty' }}</output></p>
        </section>
      </div>
    </main>
  `,
})
export class App {
  readonly amountOptions = amountOptions
  readonly realOptions = realOptions
  readonly percentOptions = percentOptions

  // Plain fields, not signals: MotherMaskDirective/MotherMaskDecimalDirective
  // use classic @Input/@Output (see their docs for why), so `[(value)]`
  // two-way binding assigns to this property directly on each change —
  // Angular's zoneless change detection still re-renders the template
  // afterward because the (valueChange)/(numericValueChange) output handlers
  // run as part of a DOM event dispatch, which schedules a check either way.
  phone = ''
  date = ''
  amount = ''
  amountNumeric = 0
  real = ''
  percent = ''

  fillExamples(): void {
    this.phone = '(11) 98765-4321'
    this.date = '25/12/2026'
    this.amount = formatDecimalValue(1234.5, amountOptions)
    this.amountNumeric = 1234.5
    this.real = formatDecimalValue(1234.5, realOptions)
    this.percent = formatDecimalValue(12.5, percentOptions)
  }

  clearExamples(): void {
    this.phone = ''
    this.date = ''
    this.amount = ''
    this.amountNumeric = 0
    this.real = ''
    this.percent = ''
  }
}
