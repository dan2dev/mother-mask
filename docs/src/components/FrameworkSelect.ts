import { FRAMEWORKS } from '../content/frameworks.ts'

export function FrameworkSelect() {
  return div(
    { className: 'framework-select-bar' },
    label({ for: 'framework-select' }, 'Code examples'),
    select(
      { id: 'framework-select', 'aria-describedby': 'framework-status' },
      ...FRAMEWORKS.map((framework) => option({ value: framework.id }, framework.label)),
    ),
    span({ id: 'framework-status', className: 'framework-status', role: 'status', 'aria-live': 'polite' }),
  )
}
