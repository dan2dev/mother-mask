# Documentation website

The [mother-mask documentation and live examples](https://dan2dev.github.io/mother-mask/)
are a static [Astro](https://astro.build) site. Every nav section is its own
page under `src/pages/` (`index.astro`, `quick-start.astro`, `examples.astro`,
`advanced-patterns.astro`, `editing.astro`, `decimals.astro`, `regional.astro`,
`patterns.astro`, `cdn.astro`, `api.astro`); each builds to the matching
`<name>.html` at the site root (`astro.config.mjs` sets `build.format: 'file'`
so URLs stay identical to before). `src/layouts/Layout.astro` renders the
shared header, sidebar, footer, icon sprite, and SEO/JSON-LD tags; `src/data/nav.ts`
is the single ordered list of pages that drives the sidebar, the mobile menu,
prev/next links, and JSON-LD breadcrumbs. Reusable page pieces (code blocks,
demo cards, the install box) live under `src/components/`. Code samples are
highlighted at build time by Astro's Shiki-powered `<Code>` component — no
client-side highlighting pass, no hand-escaped HTML in page source.

Demo bindings live one file per page under `src/scripts/demos/` (only for
pages with live `bind()`/`bindDecimal()` calls — index, examples, regional,
decimals, editing, advanced-patterns), sharing `$()`/`setHint()` helpers from
`src/scripts/hint.ts`. `src/scripts/chrome.ts` is the site-wide script loaded
on every page: theme toggle, in-page smooth scroll, and code/install-box copy
buttons. Styling is in `src/styles/global.css`.

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

Open the local URL printed by Astro. Content and demo changes reload during
development. If you change library source, rebuild the library, or run its
`bun run dev` command in another terminal to watch for changes.

## Build and preview

From `docs/`:

```bash
bun run build
bun run preview
```

The build runs `astro check` and writes the static site to `dist/`. Preview
serves that build locally; it is not a production server. `astro.config.mjs`
sets `site`/`base` for GitHub Pages' project path and reads the library's
package version directly in `Layout.astro` for the page and its structured
data — no build-time string replacement needed.

## Updating documentation

- Keep the root and package READMEs identical. From the repository root, run
  `cp README.md packages/mother-mask/README.md` after editing the root copy.
- Check API names, options, and defaults against `packages/mother-mask/src/`.
  Update visible snippets and their live bindings together, keeping each
  example's demo card and its `bind()`/`bindDecimal()` call in the matching
  `src/pages/<name>.astro` + `src/scripts/demos/<name>.ts` pair.
- Adding a page: create `src/pages/<name>.astro` using `Layout` (pass
  `current`, `title`, `description`) for the shared chrome and SEO/JSON-LD,
  add one entry to `src/data/nav.ts` (this alone updates the sidebar, mobile
  menu, and prev/next links on every page), and add the new URL to
  `public/sitemap.xml`. Give new demo inputs accessible labels and explain
  what an example demonstrates.
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
