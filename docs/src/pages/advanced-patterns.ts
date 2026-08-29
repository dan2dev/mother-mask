import '../common'
import { bind } from 'mother-mask'
import { $, uppercaseLetter } from '../common'

bind($('ex-hex'), 'HH:HH:HH:HH:HH:HH', { tokens: { H: /[0-9A-Fa-f]/ } })
bind($('ex-upper'), 'UUU-999', {
  tokens: { U: uppercaseLetter },
})
bind($('ex-dynamic-card'), '9999 9999 9999 9999', {
  resolveMask: (value) => (value.startsWith('34') || value.startsWith('37') ? '9999 999999 99999' : '9999 9999 9999 9999'),
})
bind($('ex-escaped'), '\\A-999999')
bind($('ex-unicode'), 'LLLL', { tokens: { L: /\p{L}/u } })
