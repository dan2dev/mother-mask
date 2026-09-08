import type { PageTeardown } from '../router/page.ts'

interface FrameworkTab {
  id: string
  label: string
  content: NodeModLike<'div'>
}

/** Static, prerenderable samples with one visible panel and roving tab focus. */
export function FrameworkTabs(items: readonly FrameworkTab[]) {
  return div(
    { className: 'framework-switcher', id: 'framework-switcher' },
    div(
      { className: 'framework-tabs', role: 'tablist', 'aria-label': 'Framework' },
      ...items.map((item, index) => button(
        {
          type: 'button', role: 'tab', id: `tab-${item.id}`,
          'aria-controls': `panel-${item.id}`,
          'aria-selected': index === 0 ? 'true' : 'false',
          tabIndex: index === 0 ? 0 : -1,
        },
        item.label,
      )),
    ),
    ...items.map((item, index) => div(
      {
        id: `panel-${item.id}`, role: 'tabpanel',
        'aria-labelledby': `tab-${item.id}`, tabIndex: 0, hidden: index !== 0,
      },
      item.content,
    )),
  )
}

export function setupFrameworkTabs(): PageTeardown {
  const root = document.getElementById('framework-switcher')!
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[role="tabpanel"]'))

  function select(tab: HTMLButtonElement) {
    for (const item of tabs) {
      item.setAttribute('aria-selected', String(item === tab))
      item.tabIndex = item === tab ? 0 : -1
    }
    for (const panel of panels) panel.hidden = panel.id !== tab.getAttribute('aria-controls')
  }

  function onClick(event: MouseEvent) {
    const tab = (event.target as Element).closest<HTMLButtonElement>('[role="tab"]')
    if (tab && tabs.includes(tab)) select(tab)
  }

  function onKeydown(event: KeyboardEvent) {
    const index = tabs.indexOf(event.target as HTMLButtonElement)
    if (index < 0) return
    let next: number
    switch (event.key) {
      case 'ArrowRight': next = (index + 1) % tabs.length; break
      case 'ArrowLeft': next = (index + tabs.length - 1) % tabs.length; break
      case 'Home': next = 0; break
      case 'End': next = tabs.length - 1; break
      default: return
    }
    event.preventDefault()
    const tab = tabs[next]!
    select(tab)
    tab.focus()
  }

  root.addEventListener('click', onClick)
  root.addEventListener('keydown', onKeydown)
  return () => {
    root.removeEventListener('click', onClick)
    root.removeEventListener('keydown', onKeydown)
  }
}
