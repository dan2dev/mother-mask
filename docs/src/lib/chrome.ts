/**
 * Behaviour that belongs to the page rather than to any one route: copy
 * buttons and in-page anchor scrolling.
 *
 * Both are bound once, on `document`, and dispatch by walking up from the
 * event target. A per-element listener would have to be re-attached after every
 * client-side navigation — these do not, because the listener never moves.
 */

/** Close the mobile menu; a navigation used to do this by unloading the page. */
export function closeMobileMenu(): void {
  document.querySelector<HTMLDetailsElement>('#mobile-menu')?.removeAttribute('open')
}

const COPY_RESET_MS = 1600

function iconMarkup(id: string): string {
  return `<svg class="icon" role="presentation"><use href="#${id}"></use></svg>`
}

function initCopyButtons(): void {
  document.addEventListener('click', async (event) => {
    const target = event.target as Element | null
    const button = target?.closest<HTMLButtonElement>('.copy-btn')
    if (!button) return

    // A copy button sits next to the thing it copies: a code block's <pre>, or
    // the install box's <code>.
    const source = button.parentElement?.querySelector('pre, code')
    if (!source) return

    try {
      await navigator.clipboard.writeText(source.textContent ?? '')
    } catch {
      return // Denied permission or an insecure context: leave the button alone.
    }

    button.classList.add('copied')
    button.innerHTML = iconMarkup('check-icon')
    setTimeout(() => {
      button.classList.remove('copied')
      button.innerHTML = iconMarkup('copy-icon')
    }, COPY_RESET_MS)
  })
}

/**
 * Smooth-scroll bare `#id` links. Cross-page links that happen to carry a hash
 * (`examples.html#foo`) belong to the router, which handles the hash once the
 * new page exists.
 */
function initAnchorScroll(): void {
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

    const anchor = (event.target as Element | null)?.closest('a')
    const href = anchor?.getAttribute('href')
    if (!href?.startsWith('#') || href.length < 2) return

    const target = document.getElementById(href.slice(1))
    if (!target) return

    event.preventDefault()
    closeMobileMenu()
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    history.pushState(null, '', href)
  })
}

export function initChrome(): void {
  initCopyButtons()
  initAnchorScroll()
}
