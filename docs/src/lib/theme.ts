/**
 * Light/dark toggle.
 *
 * The theme is decided before first paint by the inline script in the HTML
 * shell — see `THEME_BOOT` in prerender.ts — because a stylesheet cannot be
 * consulted early enough to avoid a flash of the wrong background. This module
 * only handles what happens after: the button, the stored preference, and
 * following the OS until someone makes an explicit choice.
 *
 * Keep `applyTheme` in step with that inline script; both set the same two
 * things, and the inline style has to be re-set here because it outranks the
 * stylesheet's `:root[data-theme]` rule.
 */
export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'theme'

function applyTheme(theme: Theme, toggle: HTMLButtonElement): void {
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.colorScheme = theme

  // The icon shows the mode a click switches *to*.
  toggle.querySelector('use')?.setAttribute('href', theme === 'dark' ? '#sun-icon' : '#moon-icon')
  toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')
}

export function initTheme(): void {
  const toggle = document.querySelector<HTMLButtonElement>('#theme-toggle')
  if (!toggle) return

  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
  const stored = localStorage.getItem(STORAGE_KEY)
  let current: Theme = stored === 'dark' || stored === 'light' ? stored : systemTheme.matches ? 'dark' : 'light'

  applyTheme(current, toggle)

  toggle.addEventListener('click', () => {
    current = current === 'dark' ? 'light' : 'dark'
    localStorage.setItem(STORAGE_KEY, current)
    applyTheme(current, toggle)
  })

  // Follow the OS live, but only until the reader picks a theme explicitly.
  systemTheme.addEventListener('change', (event) => {
    if (localStorage.getItem(STORAGE_KEY)) return
    current = event.matches ? 'dark' : 'light'
    applyTheme(current, toggle)
  })
}
