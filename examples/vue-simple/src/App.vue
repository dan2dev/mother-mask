<script setup lang="ts">
import { ref } from 'vue'
import { formatDecimalValue, InputDecimal, InputMask } from 'mother-mask/vue'

// Keep option objects outside the component so they stay stable across renders.
const amountOptions = { decimalPlaces: 2, prefix: '$', allowNegative: true }
const realOptions = { decimalPlaces: 2, separator: '.', decimalSeparator: ',', prefix: 'R$ ' }
const percentOptions = { decimalPlaces: 2, suffix: '%', segmented: false }

const phone = ref('')
const date = ref('')
const amount = ref('')
const amountNumeric = ref(0)
const real = ref('')
const percent = ref('')

function fillExamples() {
  phone.value = '(11) 98765-4321'
  date.value = '25/12/2026'
  amount.value = formatDecimalValue(1234.5, amountOptions)
  amountNumeric.value = 1234.5
  real.value = formatDecimalValue(1234.5, realOptions)
  percent.value = formatDecimalValue(12.5, percentOptions)
}

function clearExamples() {
  phone.value = ''
  date.value = ''
  amount.value = ''
  amountNumeric.value = 0
  real.value = ''
  percent.value = ''
}
</script>

<template>
  <main>
    <p class="eyebrow">mother-mask + Vue</p>
    <h1>Simple input examples</h1>
    <p>Try a phone number, a date, or a decimal format. Type, paste, or fill all the examples below.</p>

    <div class="actions">
      <button type="button" @click="fillExamples">Fill example values</button>
      <button type="button" @click="clearExamples">Clear</button>
    </div>

    <h2>Phone and date</h2>
    <div class="examples">
      <section aria-labelledby="phone-title">
        <label id="phone-title" for="phone">Phone number</label>
        <InputMask
          id="phone"
          name="phone"
          mask="(99) 99999-9999"
          v-model="phone"
          inputmode="tel"
          autocomplete="tel"
          placeholder="(11) 98765-4321"
          aria-describedby="phone-hint"
        />
        <p id="phone-hint">11 digits, including the area code.</p>
        <p>Vue state: <output>{{ phone || 'Empty' }}</output></p>
      </section>

      <section aria-labelledby="date-title">
        <label id="date-title" for="date">Date</label>
        <InputMask
          id="date"
          name="date"
          mask="99/99/9999"
          v-model="date"
          inputmode="numeric"
          placeholder="DD/MM/YYYY"
          aria-describedby="date-hint"
        />
        <p id="date-hint">Formats digits as DD/MM/YYYY; it does not validate the date.</p>
        <p>Vue state: <output>{{ date || 'Empty' }}</output></p>
      </section>
    </div>

    <h2>Decimal formats</h2>
    <div class="examples">
      <section aria-labelledby="amount-title">
        <label id="amount-title" for="amount">Amount</label>
        <InputDecimal
          id="amount"
          name="amount"
          :options="amountOptions"
          v-model="amount"
          @update:model-value="(_, numeric) => (amountNumeric = numeric)"
          placeholder="$1,234.50"
          aria-describedby="amount-hint"
        />
        <p id="amount-hint">US dollars with two decimal places. Try a negative amount, too.</p>
        <p>Vue state: <output>{{ amount || 'Empty' }}</output></p>
        <p>Numeric value: <output>{{ amountNumeric }}</output></p>
      </section>

      <section aria-labelledby="real-title">
        <label id="real-title" for="real">Brazilian real</label>
        <InputDecimal
          id="real"
          name="real"
          :options="realOptions"
          v-model="real"
          placeholder="R$ 1.234,50"
          aria-describedby="real-hint"
        />
        <p id="real-hint">Periods group thousands; a comma separates the two decimal places.</p>
        <p>Vue state: <output>{{ real || 'Empty' }}</output></p>
      </section>

      <section aria-labelledby="percent-title">
        <label id="percent-title" for="percent">Percentage</label>
        <InputDecimal
          id="percent"
          name="percent"
          :options="percentOptions"
          v-model="percent"
          placeholder="12.50%"
          aria-describedby="percent-hint"
        />
        <p id="percent-hint">Two decimal places and a % suffix. Values are not limited to 100.</p>
        <p>Vue state: <output>{{ percent || 'Empty' }}</output></p>
      </section>
    </div>
  </main>
</template>
