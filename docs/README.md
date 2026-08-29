# Documentation website

The [mother-mask documentation and live examples](https://dan2dev.github.io/mother-mask/)
are a static Vite multi-page site. Each nav section is its own HTML file at the
`docs/` root (`index.html`, `quick-start.html`, `examples.html`,
`advanced-patterns.html`, `editing.html`, `decimals.html`, `regional.html`,
`patterns.html`, `cdn.html`, `api.html`); every page shares the same header,
sidebar, and footer markup. Demo bindings live one file per page under
`src/pages/`, sharing theme toggle, syntax highlighting, and helpers from
`src/common.ts`. Styling is in `src/style.css`. `vite.config.ts` lists every
page as a build entry point.

## Run locally

From the repository root, build the local library before starting the website.
The docs import its compiled package through `file:../packages/mother-mask`.
These commands use Bun, matching the GitHub Pages workflow:

```bash
cd packages/mother-mask
bun install --no-save
bun run build
cd ../../docs
bun install --no-save
bun run dev
```

Open the local URL printed by Vite. Content and demo changes reload during
development. If you change library source, rebuild the library, or run its
`bun run dev` command in another terminal to watch for changes.

## Build and preview

From `docs/`:

```bash
bun run build
bun run preview
```

The build runs TypeScript checks and writes the static site to `dist/`. Preview
serves that build locally; it is not a production server. The relative `base`
in `vite.config.ts` keeps asset links working under the GitHub Pages project path.
The same config injects the library's package version into the page and its
structured data during development and builds.

## Updating documentation

- Keep the root and package READMEs identical. From the repository root, run
  `cp README.md packages/mother-mask/README.md` after editing the root copy.
- Check API names, options, and defaults against `packages/mother-mask/src/`.
  Update visible snippets and their live bindings together, keeping each
  example's HTML and its `bind()`/`bindDecimal()` call in the same
  `src/pages/*.ts` file as the page it renders on.
- Adding a page: create `<name>.html` at the `docs/` root (copy an existing
  page's header/sidebar/footer chrome, including the SEO block: title,
  description, canonical, `og:*`/`twitter:*` tags including `og:image`, and
  the `WebPage` + `BreadcrumbList` JSON-LD scripts — update every URL and the
  breadcrumb's page name), add matching `<a>` links with the same `href` to
  both the desktop sidebar nav and the mobile menu nav on every page, add
  `<name>` to the `pages` list in `vite.config.ts`, and add a
  `src/pages/<name>.ts` entry script (even an empty `import '../common'` if
  the page has no live bindings). Update the `<nav class="page-nav">` prev/next
  links on the new page and on its now-adjacent neighbors so the reading order
  stays a chain, and add the new URL to `public/sitemap.xml`. Give new demo
  inputs accessible labels and explain what an example demonstrates.
- Every page must have exactly one `<h1>` (its own topic, not the site name) —
  it's a real ranking/accessibility signal, not just styling. Use the
  `page-title` class if it needs to render at section-heading size rather than
  hero size; don't reach for `<h2>` just to get a smaller heading.
- `public/og-image.png` (1200×630) is the shared social preview image for
  every page; `public/favicon.svg` is the tab icon. Regenerate `og-image.png`
  by rendering an HTML mockup with headless Chrome
  (`--headless --window-size=1200,630 --screenshot=out.png`) rather than
  hand-editing the PNG.
- Formatting is not validation. Demo hints report completeness, not valid dates,
  checksums, card networks, or identifiers.
- Use custom-token transforms for case conversion instead of rewriting the
  bound input in an `onChange` callback.
- Build the package and docs, then check any changed examples. Run `make test`
  from the repository root for the library suite; see
  [the repository guide](../REPOSITORY.md) for real-browser checks.

## Deployment

[Publish to NPM](../.github/workflows/publish.yml) passes its newly published tag
to [Deploy docs](../.github/workflows/deploy-docs.yml), which builds the library
and website from that exact tag, uploads `docs/dist`, and deploys it to GitHub
Pages. The docs workflow can also be run manually for a selected ref. Do not
commit generated `dist/` files.
