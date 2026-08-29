import '../common'
import { bindDecimal } from 'mother-mask'
import { $ } from '../common'

bindDecimal($('ex-decimal-free'))
bindDecimal($('ex-decimal-width'), { numberPlaces: 2, decimalPlaces: 2 })
