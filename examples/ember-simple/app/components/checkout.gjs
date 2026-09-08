import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { on } from '@ember/modifier';
import { maskInput, maskDecimal } from 'mother-mask/ember';
import { formatDecimalValue } from 'mother-mask';

// Keep option objects outside the class body's reactive graph so they stay
// stable across renders — a fresh object literal here would read as a
// changed `options` argument on every re-render (see the mother-mask/ember
// README section).
const currency = { decimalPlaces: 2, prefix: '$', allowNegative: true };

export default class Checkout extends Component {
  currency = currency;

  @tracked phone = '';
  @tracked amount = '';
  @tracked amountNumeric = 0;

  @action
  setPhone(value) {
    this.phone = value;
  }

  @action
  setAmount(value, numeric) {
    this.amount = value;
    this.amountNumeric = numeric;
  }

  @action
  fill() {
    this.phone = '(11) 98765-4321';
    this.setAmount(formatDecimalValue(1234.5, currency), 1234.5);
  }

  @action
  clear() {
    this.phone = '';
    this.setAmount('', 0);
  }

  <template>
    <main>
      <p class="eyebrow">mother-mask + Ember.js</p>
      <h1>Simple input examples</h1>
      <p>Type, paste, or fill both examples below.</p>

      <div class="actions">
        <button type="button" {{on "click" this.fill}}>Fill example values</button>
        <button type="button" {{on "click" this.clear}}>Clear</button>
      </div>

      <div class="examples">
        <section>
          <label for="phone">Phone number</label>
          <input
            id="phone"
            name="phone"
            inputmode="tel"
            autocomplete="tel"
            placeholder="(11) 98765-4321"
            {{maskInput "(99) 99999-9999" value=this.phone onValueChange=this.setPhone}}
          />
          <p>Ember state: <output>{{if this.phone this.phone "Empty"}}</output></p>
        </section>

        <section>
          <label for="amount">Amount</label>
          <input
            id="amount"
            name="amount"
            placeholder="$1,234.50"
            {{maskDecimal options=this.currency value=this.amount onValueChange=this.setAmount}}
          />
          <p>Ember state: <output>{{if this.amount this.amount "Empty"}}</output></p>
          <p>Numeric value: <output>{{this.amountNumeric}}</output></p>
        </section>
      </div>
    </main>
  </template>
}
