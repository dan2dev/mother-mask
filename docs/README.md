# Documentation website

The [mother-mask documentation and live examples](https://dan2dev.github.io/mother-mask/)
are built with [Nuclo](https://nuclo.dev) and Vite. Every page is prerendered
to a real HTML file at build time and then hydrated in the browser, so the site
is a single-page app for anyone browsing it and a plain folder of static files
for everyone and everything else — crawlers, link previews, readers with
JavaScript off, and any host that can serve a directory.

## How a page gets to the browser

1. `vite build` bundles the client from `index.html` + `src/main.ts` into
   `dist/`, leaving the shell with its hashed script and stylesheet in
   `dist/index.html`.
2. `vite build --ssr src/entry-server.ts` builds the same app for Node into
   `.ssr/`.
3. `prerender.ts` renders every route in `src/router/routes.ts` with
   `renderToString()`, drops each one into that shell, and writes
   `index.html`, `quick-start.html`, `api.html`, … plus `404.html` and
   `sitemap.xml`.
4. In the browser, `src/main.ts` builds the same tree from the same
   `createApp()` and calls Nuclo's `hydrate()`, which adopts the prerendered
   nodes instead of replacing them. Nothing re-renders on load.
5. From then on `src/router/router.ts` handles navigation: it swaps the page
   inside `<main>`, updates the `<head>`, and leaves the browser alone for
   anything that is not a plain left click on a link this site owns.

`bun run build` runs all four steps and typechecks in between.

## Layout

| Path | What lives there |
| --- | --- |
| `src/router/routes.ts` | The one list of pages — URL, nav label, title, description, sitemap weight |
| `src/router/router.ts` | Client-side navigation: link interception, history, scroll, focus |
| `src/router/head.ts` | Per-route `<head>`, serialized by the build and applied by the router |
| `src/router/url.ts` | Base path and the pathname → route mapping |
| `src/app.ts` | The shell (header, sidebar, `<main>`, footer), used by both renderers |
| `src/pages/*.ts` | One module per page: `view()` for markup, `setup()` for live demos |
| `src/content/snippets.ts` | Every code sample on the site |
| `src/components/`, `src/demos/`, `src/lib/` | Shared pieces, demo bindings, theme + copy behaviour |
| `vite/` | Build-time plugins: highlighted snippets, package size, dev routing |
| `src/styles/global.css` | All styling |

## Run locally

Build the library first — the docs import its compiled package through
`file:../packages/mother-mask`, and the homepage measures its gzipped size:

```bash
cd packages/mother-mask && bun install --no-save && bun run build
```

Then, from `docs/`:

```bash
bun install --no-save && bun run dev
```

The dev server is client-rendered only; nothing is prerendered there, which
`main.ts` detects and handles by rendering instead of hydrating. To exercise the
real thing — prerendered HTML, hydration, the generated sitemap — build and
preview:

```bash
bun run build && bun run preview
```

Bun is the supported runtime: `prerender.ts` runs under it, and it is what the
deploy workflow uses.

## Adding a page

1. Create `src/pages/<name>.ts` exporting `view()`, and `setup()` if it has
   live `bind()` demos.
2. Add one entry to `ROUTES` in `src/router/routes.ts`. That alone registers
   the route, gives it a sidebar and mobile-menu link, wires prev/next, writes
   its `<head>`, emits its HTML file, and adds it to `sitemap.xml`.

A page's `view()` returns a single `<div class="page">`. Everything it renders
must be isomorphic — Nuclo builders only, no `document`, no bound inputs. Those
belong in `setup()`, which the router calls once the page is in the DOM and
whose return value it calls on the way out.

## SEO

The site is prerendered, which is most of the work: every URL answers with a
complete document, so nothing depends on a crawler running JavaScript. On top
of that:

- **`src/router/routes.ts` owns each page's title and description.** They are
  unique per page, and the build fails loudly on a missing one because the same
  entry drives the file, the sitemap and the `<head>`.
- **Each page carries `TechArticle` + `WebPage` + `BreadcrumbList` structured
  data**, generated in `src/router/head.ts`; the home page instead describes the
  library itself as `SoftwareSourceCode`, and every other page's `about` points
  back at that one node. The 404 page gets none — it asks not to be indexed.
- **`lastmod` and `dateModified` come from git**, per page, via
  `vite/plugin-page-dates.ts`. A page whose history cannot supply a date gets no
  date rather than the build date: a `lastmod` that changes on every deploy
  carries no information and teaches crawlers to ignore the field. This is why
  the deploy workflow checks out with `fetch-depth: 0`.
- **Prose sections are linkable.** `SectionHeading` gives each one a slug id and
  a `#` link that appears on hover or keyboard focus, so readers can share a
  section and search engines can offer a jump to it. Demo cards get an id too
  (`examples.html#cnpj`). Passing an explicit id keeps a published anchor
  working after a heading is reworded.
- **One `<h1>` per page, no skipped heading levels**, every image has `alt`, and
  canonical URLs point at the `.html` file so `/` and `/index.html` do not
  compete.
- No web fonts, one stylesheet, one deferred module — nothing blocks the first
  paint but the CSS.

## Writing content

- Keep the root and package READMEs identical. From the repository root, run
  `cp README.md packages/mother-mask/README.md` after editing the root copy.
- Check API names, options, and defaults against `packages/mother-mask/src/`.
- Code samples live in `src/content/snippets.ts` and are highlighted at build
  time by Shiki (`vite/plugin-snippets.ts`) — there is no highlighter in the
  browser bundle. A snippet whose key starts with `ex-` is the code for the
  demo input with that id, so `ExampleCard` finds it without being told; keep
  it in step with the matching `bind()` call in the page's `setup()`.
- Token colors come from the site's own CSS variables. `src/styles/code-theme.ts`
  maps each Shiki scope group to a `tk-*` class, and global.css points those at
  `--accent`, `--text-dim`, and friends — so the theme toggle needs no second
  palette, and changing a brand color changes the code samples with it.
- Every page must have exactly one `<h1>` (its own topic, not the site name) —
  it's a real ranking/accessibility signal, not just styling. Use the
  `page-title` class if it needs to render at section-heading size rather than
  hero size; don't reach for `<h2>` just to get a smaller heading.
- `public/og-image.png` (1200×630) is the shared social preview image for every
  page and is rendered from `public/og-image-source.svg`. Keep the SVG/ICO/16px/32px
  favicon set, Apple touch icon, and 192px/512px manifest icons in sync with
  `public/mother-mask-logo.svg`.
- Formatting is not validation. Demo hints report completeness, not valid dates,
  checksums, card networks, or identifiers.
- Use custom-token transforms for case conversion instead of rewriting the
  bound input in an `onChange` callback.
- Build the package and docs, then check any changed examples. Run `make test`
  from the repository root for the library suite; see
  [the repository guide](../REPOSITORY.md) for real-browser checks.

## Nuclo notes

Three things about the version currently pinned (0.2.30) shape the code here.
All three are invisible on a fresh `render()` and only show up once markup is
hydrated, which is worth knowing before reaching for any of these patterns:

- **A state-dependent attribute is applied but never removed.** A value that
  becomes `undefined` leaves the previous one in place, so `aria-current` would
  accumulate on every page it visited. It is spelled `'page'` / `'false'`
  instead — both valid ARIA — in `src/components/aria-current.ts`.
- **A state-dependent `className` cannot drop a class the server rendered.**
  `initReactiveClassName` records whatever class an element already carries as
  permanent "static" classes, and hydration runs after the prerendered class is
  in the DOM — so on a hydrated element the first value is merged into every
  later one and can never come off. The home-vs-docs layout switch therefore
  lives on `body.home-page`, set imperatively by the router, rather than on
  `.layout` itself.
- **An SVG element's `className` is a read-only `SVGAnimatedString`**, so Nuclo
  falls back to `setAttribute('className', …)` and the element ends up with a
  stray attribute next to the real one. SVG attributes here are named `class`.

`nuclo@0.2.31` is skipped: its published tarball is missing every ESM artifact,
including the package's own main entry.

## Deployment

[Publish to NPM](../.github/workflows/publish.yml) passes its newly published tag
to [Deploy docs](../.github/workflows/deploy-docs.yml), which builds the library
and website from that exact tag, uploads `docs/dist`, and deploys it to GitHub
Pages. The docs workflow can also be run manually for a selected ref. Do not
commit generated `dist/` files.

Nothing in the output needs a server or a rewrite rule: the deployed folder is
one HTML file per URL, plus `404.html` for anything else. A host that serves
`404.html` for unknown paths (GitHub Pages does) also gets working deep links
for the extensionless spelling of a page — the router resolves `…/api` to the
API page and corrects the address bar to `…/api.html`.
