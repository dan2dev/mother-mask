// Shared helpers for the live demo bindings under src/scripts/demos/.

export const $ = <T extends HTMLElement>(id: string) => document.querySelector<T>(`#${id}`)!

export function setHint(id: string, state: { text: string; ok?: boolean; error?: boolean }) {
  const el = document.querySelector(`#${id}`)
  if (!el) return
  el.textContent = state.text
  el.className = `hint${state.ok ? ' ok' : state.error ? ' error' : ''}`
}

// Normalize accepted characters inside the mask so caret mapping stays intact.
export const uppercaseLetter = { match: /[a-z]/i, transform: (char: string) => char.toUpperCase() }
export const uppercaseAlphanumeric = { match: /[a-z0-9]/i, transform: (char: string) => char.toUpperCase() }
