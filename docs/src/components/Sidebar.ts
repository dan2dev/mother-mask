import { NavLinks } from './NavLinks.ts'

export function Sidebar() {
  return aside({ className: 'sidebar' }, span({ className: 'sidebar-label' }, 'Docs'), NavLinks('primary-nav sidebar-nav'))
}
