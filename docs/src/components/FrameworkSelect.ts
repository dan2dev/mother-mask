import { FRAMEWORKS } from '../content/frameworks.ts'

// Lives on the Frameworks page only — it switches that page's own install and
// integration snippets, and nowhere else. The spinner and status message are
// both taken out of flow so a loading state never resizes or shifts the
// select itself.
export function FrameworkSelect() {
  return div(
    { className: 'framework-select' },
    label({ for: 'framework-select', className: 'framework-select-label' }, 'Code examples'),
    div(
      { className: 'framework-select-control' },
      select(
        { id: 'framework-select', 'aria-label': 'Code examples', 'aria-describedby': 'framework-status' },
        ...FRAMEWORKS.map((framework) => option({ value: framework.id }, framework.label)),
      ),
      span({ className: 'framework-spinner', 'aria-hidden': 'true' }),
    ),
    span({ id: 'framework-status', className: 'framework-status', role: 'status', 'aria-live': 'polite' }),
  )
}
