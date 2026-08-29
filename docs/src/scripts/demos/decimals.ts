import { bindDecimal } from 'mother-mask'
import { $ } from '../hint'

bindDecimal($('ex-decimal-free'))
bindDecimal($('ex-decimal-usd'), { decimalPlaces: 2, prefix: '$' })
bindDecimal($('ex-decimal-brl'), { decimalPlaces: 2, separator: '.', decimalSeparator: ',', prefix: 'R$ ' })
bindDecimal($('ex-decimal-eur'), { decimalPlaces: 2, separator: '.', decimalSeparator: ',', suffix: ' €' })
bindDecimal($('ex-decimal-units'), { decimalPlaces: 0, suffix: ' units' })
bindDecimal($('ex-decimal-negative'), { decimalPlaces: 2, prefix: '$', allowNegative: true })
bindDecimal($('ex-decimal-plain'), { decimalPlaces: 2, segmented: false })
bindDecimal($('ex-decimal-width'), { numberPlaces: 2, decimalPlaces: 2 })
bindDecimal($('ex-decimal-callback'), {
  suffix: ' kg',
  onChange: (masked, numeric) => {
    $('ex-decimal-masked').textContent = masked || '—'
    $('ex-decimal-numeric').textContent = String(numeric)
  },
})
