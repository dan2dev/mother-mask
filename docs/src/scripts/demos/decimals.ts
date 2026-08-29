import { bindDecimal } from 'mother-mask'
import { $ } from '../hint'

bindDecimal($('ex-decimal-free'))
bindDecimal($('ex-decimal-width'), { numberPlaces: 2, decimalPlaces: 2 })
