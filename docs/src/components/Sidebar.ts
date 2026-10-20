import { NavLinks } from './NavLinks.ts'

export function Sidebar() {
  return aside({ className: 'sidebar' }, NavLinks('primary-nav sidebar-nav'))
}
