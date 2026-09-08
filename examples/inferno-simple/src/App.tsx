import { Component } from 'inferno'
import { InputDecimal, InputMask, formatDecimalValue } from 'mother-mask/inferno'

const amountOptions = { decimalPlaces: 2, prefix: '$', allowNegative: true }

interface AppState {
  phone: string
  amount: string
  amountNumeric: number
}

export class App extends Component<Record<string, never>, AppState> {
  state: AppState = { phone: '', amount: '', amountNumeric: 0 }

  fill = () => {
    this.setState({
      phone: '(11) 98765-4321',
      amount: formatDecimalValue(1234.5, amountOptions),
      amountNumeric: 1234.5,
    })
  }

  clear = () => {
    this.setState({ phone: '', amount: '', amountNumeric: 0 })
  }

  render() {
    const { phone, amount, amountNumeric } = this.state

    return (
      <main>
        <p class="eyebrow">mother-mask + Inferno</p>
        <h1>Simple input examples</h1>
        <p>Type, paste, or fill both examples below.</p>

        <div class="actions">
          <button type="button" onClick={this.fill}>Fill example values</button>
          <button type="button" onClick={this.clear}>Clear</button>
        </div>

        <div class="examples">
          <section>
            <label for="phone">Phone number</label>
            <InputMask
              id="phone"
              name="phone"
              mask="(99) 99999-9999"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(11) 98765-4321"
              value={phone}
              onValueChange={(v: string) => this.setState({ phone: v })}
            />
            <p>Value: <output>{phone || 'Empty'}</output></p>
          </section>

          <section>
            <label for="amount">Amount</label>
            <InputDecimal
              id="amount"
              name="amount"
              options={amountOptions}
              placeholder="$1,234.50"
              value={amount}
              onValueChange={(v: string, n: number) => this.setState({ amount: v, amountNumeric: n })}
            />
            <p>Value: <output>{amount || 'Empty'}</output></p>
            <p>Numeric value: <output>{amountNumeric}</output></p>
          </section>
        </div>
      </main>
    )
  }
}
