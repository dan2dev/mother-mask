/**
 * Helpers shared by the live demos on every docs page.
 *
 * `createDemos()` binds masks and hands back a teardown, because the demos are
 * a documentation site's own use of the thing it documents: the pages tell
 * readers to call the disposer before an input is removed, so the site does it
 * too. Each `bind()` returns one, they are collected here, and the router calls
 * `teardown()` before it swaps a page out.
 */
import { bind, bindDecimal, type BindDecimalOptions, type BindOptions, type MaskPattern } from 'mother-mask'
import type { PageTeardown } from '../router/page.ts'

export const $ = <T extends HTMLElement>(id: string): T => document.querySelector<T>(`#${id}`)!

export interface HintState {
  text: string
  ok?: boolean
  error?: boolean
}

/** Update a demo's completeness hint. Formatting only — never validity. */
export function setHint(id: string, state: HintState): void {
  const element = document.querySelector(`#${id}`)
  if (!element) return
  element.textContent = state.text
  element.className = `hint${state.ok ? ' ok' : state.error ? ' error' : ''}`
}

/** Report "n of total", or a tick once the expected count is present. */
export function countHint(id: string, count: number, total: number, empty: string): void {
  setHint(id, count === 0 ? { text: empty } : count === total ? { text: '✓ complete', ok: true } : { text: `${count} / ${total}`, error: true })
}

export const digits = (value: string): number => value.replace(/\D/g, '').length
export const alphanumerics = (value: string): number => value.replace(/[^a-zA-Z0-9]/g, '').length

// Normalize accepted characters inside the mask so caret mapping stays intact.
export const uppercaseLetter = { match: /[a-z]/i, transform: (char: string) => char.toUpperCase() }
export const uppercaseAlphanumeric = { match: /[a-z0-9]/i, transform: (char: string) => char.toUpperCase() }

export interface Demos {
  /** `bind()` the input with this id, remembering how to dispose it. */
  mask: (id: string, pattern: MaskPattern, options?: BindOptions | ((value: string) => void)) => void
  /** `bindDecimal()` the input with this id, remembering how to dispose it. */
  decimal: (id: string, options?: BindDecimalOptions) => void
  teardown: PageTeardown
}

export function createDemos(): Demos {
  const disposers: Array<() => void> = []

  return {
    mask(id, pattern, options) {
      disposers.push(bind($(id), pattern, (options ?? null) as BindOptions | null))
    },
    decimal(id, options) {
      disposers.push(bindDecimal($(id), options ?? null))
    },
    teardown() {
      for (const dispose of disposers) dispose()
      disposers.length = 0
    },
  }
}
