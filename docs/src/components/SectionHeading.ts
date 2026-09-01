/**
 * A section heading that can be linked to.
 *
 * Documentation gets read in fragments: someone wants the paragraph about
 * `resolveMask`, not the page it lives on. A heading with a stable id is what
 * makes that possible — it gives readers a URL to share, gives the site's own
 * cross-references somewhere to point, and is what search engines use to offer
 * a jump straight to the relevant section rather than the top of the page.
 *
 * The `#` beside the heading is how a reader discovers the link exists; it is
 * invisible until the heading is hovered or the link is focused, so it costs
 * the layout nothing and stays reachable from the keyboard.
 *
 * Ids are derived from the heading text so they read well and stay stable as
 * the page is edited around them. Pass one explicitly to keep a URL working
 * after a heading is reworded — a published anchor is a promise.
 */
export function SectionHeading(text: string, id: string = slugify(text)) {
  return h2(
    { id, className: 'section-heading' },
    text,
    a({ className: 'heading-anchor', href: `#${id}`, 'aria-label': `Link to “${text}”` }, '#'),
  )
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
