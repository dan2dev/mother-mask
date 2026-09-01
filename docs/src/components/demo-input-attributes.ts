/**
 * Keep interactive documentation examples out of browser and password-manager
 * autofill. The vendor-specific attributes are intentionally combined because
 * each extension recognizes only its own opt-out marker.
 */
export const demoInputAttributes = {
  autocomplete: 'off',
  className: 'keeper-ignore',
  'data-1p-ignore': 'true',
  'data-op-ignore': 'true',
  'data-bwignore': 'true',
  'data-form-type': 'other',
  'data-lpignore': 'true',
  'data-protonpass-ignore': 'true',
} as const
