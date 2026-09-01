/**
 * Facts about the published site that both the browser bundle and the
 * prerenderer need, and that must not drift between them.
 */

/**
 * Path the site is deployed under, always with both slashes. GitHub Pages
 * serves a project site from a subdirectory, so this is not `/`.
 *
 * Read by vite.config.ts (as Vite's `base`, which is what fills
 * `import.meta.env.BASE_URL` for the client) and by prerender.ts. One value,
 * so a move to another path or another host is a one-line change.
 */
export const BASE_PATH = '/mother-mask/'

/** Production origin + project path. Always ends in a slash. */
export const SITE_URL = 'https://dan2dev.github.io/mother-mask/'

export const SITE_NAME = 'mother-mask'

export const AUTHOR = {
  name: 'Danilo Celestino de Castro',
  url: 'https://github.com/dan2dev',
} as const

export const REPO_URL = 'https://github.com/dan2dev/mother-mask'
export const NPM_URL = 'https://www.npmjs.com/package/mother-mask'

/** The framework this site is built with, credited in the footer. */
export const NUCLO_URL = 'https://nuclo.dev/'

/** Shared 1200x630 social card, rendered from public/og-image-source.svg. */
export const SOCIAL_IMAGE = `${SITE_URL}og-image.png`
export const SOCIAL_IMAGE_ALT = 'mother-mask — TypeScript input masks without the rough edges'

export const THEME_COLOR = '#18152a'
