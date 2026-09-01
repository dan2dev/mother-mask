/**
 * The site's icon sprite, and the `<use>` reference that draws from it.
 *
 * One `<symbol>` per icon, defined once per document inside the app shell, so a
 * repeated icon costs a 40-byte `<use>` rather than another copy of its path
 * data. `currentColor` throughout: an icon takes the color of whatever it sits
 * in, which is what makes the same sprite work in both themes.
 */

/**
 * An icon that inherits its color and size from the element around it.
 *
 * `class`, not `className`: an SVG element's `className` is a read-only
 * `SVGAnimatedString`, so Nuclo falls back to `setAttribute('className', …)`
 * and the DOM ends up carrying a stray, meaningless attribute beside the real
 * one. Naming the attribute directly avoids the round trip entirely.
 */
export function icon(id: IconId) {
  return svgSvg({ class: 'icon', role: 'presentation' }, useSvg({ href: `#${id}` }))
}

export type IconId =
  | 'github-icon'
  | 'npm-icon'
  | 'copy-icon'
  | 'check-icon'
  | 'sun-icon'
  | 'moon-icon'
  | 'menu-icon'
  | 'bolt-icon'
  | 'code-icon'
  | 'puzzle-icon'
  | 'heart-icon'
  | 'arrow-right-icon'
  | 'phone-icon'
  | 'card-icon'
  | 'calendar-icon'
  | 'currency-icon'

const stroke = (width: number | string, extra: Record<string, string> = {}) => ({
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': String(width),
  ...extra,
})

const round = { 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }

export function IconSprite() {
  return svgSvg(
    { class: 'icon-sprite', 'aria-hidden': 'true' },

    symbolSvg(
      { id: 'github-icon', viewBox: '0 0 19 19' },
      pathSvg({
        fill: 'currentColor',
        'fill-rule': 'evenodd',
        'clip-rule': 'evenodd',
        d: 'M9.356 1.85C5.05 1.85 1.57 5.356 1.57 9.694a7.84 7.84 0 0 0 5.324 7.44c.387.079.528-.168.528-.376 0-.182-.013-.805-.013-1.454-2.165.467-2.616-.935-2.616-.935-.349-.91-.864-1.143-.864-1.143-.71-.48.051-.48.051-.48.787.051 1.2.805 1.2.805.695 1.194 1.817.857 2.268.649.064-.507.27-.857.49-1.052-1.728-.182-3.545-.857-3.545-3.87 0-.857.31-1.558.8-2.104-.078-.195-.349-1 .077-2.078 0 0 .657-.208 2.14.805a7.5 7.5 0 0 1 1.946-.26c.657 0 1.328.092 1.946.26 1.483-1.013 2.14-.805 2.14-.805.426 1.078.155 1.883.078 2.078.502.546.799 1.247.799 2.104 0 3.013-1.818 3.675-3.558 3.87.284.247.528.714.528 1.454 0 1.052-.012 1.896-.012 2.156 0 .208.142.455.528.377a7.84 7.84 0 0 0 5.324-7.441c.013-4.338-3.48-7.844-7.773-7.844',
      }),
    ),

    symbolSvg(
      { id: 'npm-icon', viewBox: '0 0 18 7' },
      pathSvg({
        fill: 'currentColor',
        d: 'M0 0h18v6H9v1H5V6H0V0zM1 5h2V2h1v3h1V1H1V5zM6 1v5h2V5h2V1H6zM8 2h1v2H8V2zM11 1v4h2V2h1v3h1V2h1v3h1V1H11z',
      }),
    ),

    symbolSvg(
      { id: 'copy-icon', viewBox: '0 0 20 20' },
      pathSvg({
        ...stroke(1.35, round),
        d: 'M7.5 7.5h7.917c.92 0 1.666.746 1.666 1.667v7.916c0 .92-.746 1.667-1.666 1.667H7.5c-.92 0-1.667-.746-1.667-1.667V9.167c0-.92.746-1.667 1.667-1.667Z',
      }),
      pathSvg({
        ...stroke(1.35, round),
        d: 'M4.167 12.5H3.333c-.92 0-1.666-.746-1.666-1.667V3.333c0-.92.746-1.666 1.666-1.666h7.917c.92 0 1.667.746 1.667 1.666V4.167',
      }),
    ),

    symbolSvg(
      { id: 'check-icon', viewBox: '0 0 20 20' },
      pathSvg({ ...stroke(1.6, round), d: 'm4 10.5 3.5 3.5L16 5.5' }),
    ),

    symbolSvg(
      { id: 'sun-icon', viewBox: '0 0 20 20' },
      circleSvg({ cx: '10', cy: '10', r: '4', ...stroke(1.5) }),
      pathSvg({
        ...stroke(1.5, { 'stroke-linecap': 'round' }),
        d: 'M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M15.6 4.4l-1.4 1.4M5.8 14.2l-1.4 1.4M15.6 15.6l-1.4-1.4M5.8 5.8 4.4 4.4',
      }),
    ),

    symbolSvg(
      { id: 'moon-icon', viewBox: '0 0 20 20' },
      pathSvg({ ...stroke(1.5, round), d: 'M17 10.7A7 7 0 1 1 9.3 3a5.5 5.5 0 0 0 7.7 7.7Z' }),
    ),

    symbolSvg(
      { id: 'menu-icon', viewBox: '0 0 20 20' },
      pathSvg({ ...stroke(1.5, { 'stroke-linecap': 'round' }), d: 'M4 6.5h12M4 10h12M4 13.5h12' }),
    ),

    symbolSvg(
      { id: 'bolt-icon', viewBox: '0 0 20 20' },
      pathSvg({ ...stroke(1.5, round), d: 'M10.8 2 4 11.2h4.4L9.2 18l6.8-9.2h-4.4z' }),
    ),

    symbolSvg(
      { id: 'code-icon', viewBox: '0 0 20 20' },
      pathSvg({ ...stroke(1.5, round), d: 'm7 5.5-4.5 4.5L7 14.5M13 5.5l4.5 4.5-4.5 4.5' }),
    ),

    symbolSvg(
      { id: 'puzzle-icon', viewBox: '0 0 20 20' },
      pathSvg({
        ...stroke(1.5, { 'stroke-linejoin': 'round' }),
        d: 'M7.2 2.7h3.1a1 1 0 0 1 1 1.25 1.4 1.4 0 0 0 1.95 1.6c.55-.28 1.25.1 1.25.72v3.03a1 1 0 0 1-1.25 1 1.4 1.4 0 0 0-1.6 1.95c.28.55-.1 1.25-.72 1.25H7.9a1 1 0 0 1-1-1.25 1.4 1.4 0 0 0-1.95-1.6c-.55.28-1.25-.1-1.25-.72V6.87a1 1 0 0 1 1.25-1 1.4 1.4 0 0 0 1.6-1.95c-.28-.55.1-1.22.65-1.22Z',
      }),
    ),

    symbolSvg(
      { id: 'heart-icon', viewBox: '0 0 20 20' },
      pathSvg({
        ...stroke(1.5, round),
        d: 'M10 17.2S2.8 12.9 2.8 7.9a3.7 3.7 0 0 1 6.6-2.3l.6.7.6-.7a3.7 3.7 0 0 1 6.6 2.3c0 5-7.2 9.3-7.2 9.3Z',
      }),
    ),

    symbolSvg(
      { id: 'arrow-right-icon', viewBox: '0 0 20 20' },
      pathSvg({ ...stroke(1.6, round), d: 'M4 10h12m-4.5-4.5L16 10l-4.5 4.5' }),
    ),

    symbolSvg(
      { id: 'phone-icon', viewBox: '0 0 20 20' },
      pathSvg({
        ...stroke(1.5, round),
        d: 'M6.3 2.8 8 6.7 5.8 8.1c1.1 2.7 3.3 4.9 6 6l1.4-2.2 3.9 1.7-.8 3.1c-.2.7-.8 1.1-1.5 1-7-.9-12.5-6.4-13.4-13.4-.1-.7.3-1.3 1-1.5l3.1-.8.8.8Z',
      }),
    ),

    symbolSvg(
      { id: 'card-icon', viewBox: '0 0 20 20' },
      rectSvg({ x: '2.5', y: '4', width: '15', height: '12', rx: '2', ...stroke(1.5) }),
      pathSvg({ ...stroke(1.5, { 'stroke-linecap': 'round' }), d: 'M2.5 8h15M5.5 12.5h3' }),
    ),

    symbolSvg(
      { id: 'calendar-icon', viewBox: '0 0 20 20' },
      rectSvg({ x: '3', y: '4.5', width: '14', height: '13', rx: '2', ...stroke(1.5) }),
      pathSvg({ ...stroke(1.5, { 'stroke-linecap': 'round' }), d: 'M6.5 2.5v4M13.5 2.5v4M3 8.5h14' }),
    ),

    symbolSvg(
      { id: 'currency-icon', viewBox: '0 0 20 20' },
      circleSvg({ cx: '10', cy: '10', r: '7.5', ...stroke(1.5) }),
      pathSvg({
        ...stroke(1.35, { 'stroke-linecap': 'round' }),
        d: 'M12.5 6.8c-.6-.5-1.4-.8-2.4-.8-1.5 0-2.5.7-2.5 1.8 0 2.8 5.1 1.2 5.1 4.1 0 1.2-1 2-2.7 2-1 0-2-.3-2.7-.9M10 4.5v11',
      }),
    ),
  )
}
