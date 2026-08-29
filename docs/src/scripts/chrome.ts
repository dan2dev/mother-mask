// Site-wide chrome, loaded on every page via Layout.astro: theme toggle,
// in-page smooth scroll, and copy buttons on code blocks / the install box.
// Code samples are highlighted at build time by Astro's <Code> component
// (Shiki), so there's no client-side highlighting pass here.

// ── Theme toggle ─────────────────────────────────────────────────────────────

type Theme = 'light' | 'dark'

const themeToggle = document.querySelector<HTMLButtonElement>('#theme-toggle')!
const themeIconUse = themeToggle.querySelector('use')!
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  // Matches the inline pre-paint script in <head>: that sets this same inline
  // style to avoid a flash of the wrong background before CSS loads, and
  // being inline it outranks the stylesheet's `:root[data-theme]` rule, so it
  // has to be kept in sync here too or a toggle click would stop taking effect.
  document.documentElement.style.colorScheme = theme
  // Icon shows the mode a click switches *to*.
  themeIconUse.setAttribute('href', theme === 'dark' ? '#sun-icon' : '#moon-icon')
  themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')
}

let currentTheme: Theme = (localStorage.getItem('theme') as Theme | null) ?? (systemTheme.matches ? 'dark' : 'light')
applyTheme(currentTheme)

themeToggle.addEventListener('click', () => {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark'
  localStorage.setItem('theme', currentTheme)
  applyTheme(currentTheme)
})

// Follow OS changes live, but only until the user picks a theme explicitly.
systemTheme.addEventListener('change', (e) => {
  if (localStorage.getItem('theme')) return
  currentTheme = e.matches ? 'dark' : 'light'
  applyTheme(currentTheme)
})

// ── Copy buttons (CodeBlock + InstallBox) ────────────────────────────────────
// Each `.copy-btn` copies the text of the nearest `pre`/`code` sibling in its
// own parent, so this works unmodified for both a CodeBlock's Shiki <pre> and
// InstallBox's inline install command.

document.querySelectorAll<HTMLButtonElement>('.copy-btn').forEach((button) => {
  const target = button.parentElement?.querySelector('pre, code')
  if (!target) return

  button.addEventListener('click', async () => {
    await navigator.clipboard.writeText(target.textContent ?? '')
    button.classList.add('copied')
    button.innerHTML = '<svg class="icon" role="presentation"><use href="#check-icon"></use></svg>'
    setTimeout(() => {
      button.classList.remove('copied')
      button.innerHTML = '<svg class="icon" role="presentation"><use href="#copy-icon"></use></svg>'
    }, 1600)
  })
})

// ── Smooth-scroll for same-page nav links ───────────────────────────────────
// Cross-page links (e.g. "examples.html#foo") are left to the browser; only
// bare "#id" hashes are intercepted here.

const mobileMenu = document.querySelector<HTMLDetailsElement>('#mobile-menu')

document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href')!.slice(1)
    const target = id ? document.getElementById(id) : null
    if (!target) return
    e.preventDefault()
    mobileMenu?.removeAttribute('open')
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    history.pushState(null, '', `#${id}`)
  })
})

// Closing the mobile menu when a cross-page link is tapped happens for free
// (the navigation unloads the page), so no extra handling is needed there.
