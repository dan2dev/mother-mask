// Shared chrome: syntax highlighting, theme toggle, and in-page smooth scroll.
// Every page's entry script imports this first.
//
// style.css is linked directly from each page's <head> (not imported here) so
// it loads as a real render-blocking <link>, in dev too — importing it from
// JS makes Vite's dev server inject it via a script-created <style> tag
// instead, which paints the raw unstyled HTML first and pops the CSS in
// after, flashing on every hard navigation between pages.
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('typescript', typescript)

document.querySelectorAll<HTMLElement>('pre code, code.snippet, .install-box code').forEach((block) => {
  hljs.highlightElement(block)
})

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

// ── Hint helper ──────────────────────────────────────────────────────────────

export function setHint(id: string, state: { text: string; ok?: boolean; error?: boolean }) {
  const el = document.querySelector(`#${id}`)
  if (!el) return
  el.textContent = state.text
  el.className = `hint${state.ok ? ' ok' : state.error ? ' error' : ''}`
}

export const $ = <T extends HTMLElement>(id: string) => document.querySelector<T>(`#${id}`)!

// Normalize accepted characters inside the mask so caret mapping stays intact.
export const uppercaseLetter = { match: /[a-z]/i, transform: (char: string) => char.toUpperCase() }
export const uppercaseAlphanumeric = { match: /[a-z0-9]/i, transform: (char: string) => char.toUpperCase() }

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
