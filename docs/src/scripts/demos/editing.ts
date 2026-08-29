import { bind } from 'mother-mask'
import { $ } from '../hint'

bind($('ex-phone-edit'), '(999) 999-9999')
bind($('ex-phone-edit-lazy'), '(999) 999-9999', { eager: false })
