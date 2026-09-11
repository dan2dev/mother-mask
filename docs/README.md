# Documentation website

The [mother-mask documentation and live examples](https://mother-mask.dan2.dev/)
are built with [Nuclo](https://nuclo.dev) and Vite, and server-rendered on
every request — the same architecture as [nuclo's own docs
site](https://nuclo.dev), not a separate one this project invented. There is
no prerendering step and no `dist/*.html` file per page: a Cloudflare Pages
Function renders the requested route fresh for every request, the browser
`hydrate()`s onto that markup once, and from there it behaves as a
single-page app.

## How a page gets to the browser

1. `vite build` bundles the client — entry is `src/main.ts`, not an
   `index.html` (there isn't one) — into `dist/`, and writes
   `dist/.vite/manifest.json` mapping that entry to its real hashed output
   files.
2. A request arrives at `src/app-handler.ts`'s `appFetch()`: resolve the URL
   to a route (`src/router/url.ts`, `src/router/routes.ts`), render it with
   `renderToString()` (`src/entry-server.ts`, unchanged from the old
   prerendering pipeline — it was always a pure per-route function), and drop
   the result into an HTML template string, using the manifest to inject the
   real `<script>`/`<link>` tags.
3. Three different callers invoke that same `appFetch()`, unchanged: Vite's
   dev server (`vite/plugin-ssr-dev.ts`, so `bun run dev` server-renders too,
   no separate prerendering path to fall out of sync with), and — in
   production — the Cloudflare Pages Function (`functions/[[path]].ts`).
4. In the browser, `src/main.ts` builds the same tree from the same
   `createApp()` and calls Nuclo's `hydrate()`, which adopts the
   server-rendered nodes instead of replacing them. Nothing re-renders on
   load — and unlike prerendering, there's no "wrong file got served" case to
   detect, since the server just rendered exactly the route the request
   named.
5. From then on `src/router/router.ts` handles navigation: it swaps the page
   inside `<main>`, updates the `<head>`, and leaves the browser alone for
   anything that is not a plain left click on a link this site owns.

`bun run build` runs `bun run generate` (see Writing content and SEO below —
the git-derived page dates, the bundle-size stats, and the Shiki-highlighted
snippets, each written to a real file under `src/generated/` rather than
computed per-request), typechecks, then `vite build`, then writes
`dist/sitemap.xml`.

## Layout

| Path | What lives there |
| --- | --- |
| `src/router/routes.ts` | The one list of pages — URL, nav label, title, description, sitemap weight |
| `src/router/router.ts` | Client-side navigation: link interception, history, scroll, focus |
| `src/router/head.ts` | Per-route `<head>`, serialized by the build and applied by the router |
| `src/router/url.ts` | Base path and the pathname → route mapping |
| `src/app.ts` | The shell (header, sidebar, `<main>`, footer), used by both renderers |
| `src/app-handler.ts` | The shared per-request handler — resolves a URL to a route, renders it, fills in the HTML template |
| `src/entry-server.ts` | `renderRoute()`: one route in, `{ head, html, bodyClass }` out — called per request now, not once per route at build time |
| `functions/[[path]].ts` | The Cloudflare Pages Function — thin wrapper around `appFetch()` for production |
| `src/pages/*.ts` | One module per page: `view()` for markup, `setup()` for live demos |
| `src/content/snippets.ts` | Every code sample on the site |
| `src/generated/` | Build output committed to the repo and refreshed by `bun run build`: page dates, package/bundle-size stats, highlighted snippets — see `scripts/` |
| `src/components/`, `src/demos/`, `src/lib/` | Shared pieces, demo bindings, theme + copy behaviour |
| `scripts/` | Build-time-only generators: page dates, package meta, highlighted snippets, sitemap |
| `vite/` | Vite plugins: the dev-mode SSR middleware (`plugin-ssr-dev.ts`) |
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

The dev server server-renders too (`vite/plugin-ssr-dev.ts`), so `bun run dev`
already exercises the real request → route → render → hydrate path, not a
client-only stand-in. To check the actual production path — the real
Cloudflare Pages Function, the real static-asset routing in
`public/_routes.json`, the generated sitemap — build and preview with
Wrangler's local runtime instead of Vite's:

```bash
bun run preview
```

(`preview` runs `bun run build` then `wrangler pages dev dist` — Miniflare, not
a guess at what Cloudflare will do.)

Bun is the supported runtime: every `scripts/*.ts` generator runs under it, and
it is what the deploy workflow uses.

## Adding a page

1. Create `src/pages/<name>.ts` exporting `view()`, and `setup()` if it has
   live `bind()` demos.
2. Add one entry to `ROUTES` in `src/router/routes.ts`. That alone registers
   the route, gives it a sidebar and mobile-menu link, wires prev/next, writes
   its `<head>`, makes it renderable by `appFetch()`, and adds it to
   `sitemap.xml`.

A page's `view()` returns a single `<div class="page">`. Everything it renders
must be isomorphic — Nuclo builders only, no `document`, no bound inputs. Those
belong in `setup()`, which the router calls once the page is in the DOM and
whose return value it calls on the way out.

## SEO

The site is server-rendered, which is most of the work: every URL answers with
a complete document (real HTTP status included — a genuinely unknown path gets
a real `404`, not a `200` with "not found" text), so nothing depends on a
crawler running JavaScript. On top of that:

- **`src/router/routes.ts` owns each page's title and description.** They are
  unique per page, and the build fails loudly on a missing one because the same
  entry drives the file, the sitemap and the `<head>`.
- **Each page carries `TechArticle` + `WebPage` + `BreadcrumbList` structured
  data**, generated in `src/router/head.ts`; the home page instead describes the
  library itself as `SoftwareSourceCode`, and every other page's `about` points
  back at that one node. The 404 page gets none — it asks not to be indexed.
- **`lastmod` and `dateModified` come from git**, per page, via
  `scripts/update-page-dates.ts` (writes `src/generated/page-dates.ts`, read by
  both `src/router/head.ts` and `scripts/build-sitemap.ts`). A page whose
  history cannot supply a date gets no date rather than the build date: a
  `lastmod` that changes on every deploy carries no information and teaches
  crawlers to ignore the field. This is why the deploy workflow checks out
  with `fetch-depth: 0`.
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
  time by Shiki (`scripts/build-snippets.ts`, writing `src/generated/snippets/`)
  — there is no highlighter in the browser bundle, and none in the Cloudflare
  Function either. A snippet whose key starts with `ex-` is the code for the
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

## Framework code examples

The header's **Code examples** dropdown selects Vanilla JS or a framework for
all integration samples. The preference is restored after hydration and survives
navigation and reloads. Only highlighted code changes; live demos continue using
the raw binders and keep their current inputs.

`src/content/frameworks.ts` owns the choices. `scripts/framework-samples.ts`
adapts each demo's existing snippet into its framework API, preserving masks,
options, and callback behavior. New `ex-` snippets must use the supported
literal bind format or provide an explicit mapping there; unsupported samples
fail the build. Pattern notation, shared core types, and install commands
remain framework-neutral. `scripts/build-snippets.ts` writes a separate
highlighted file per adapter (`src/generated/snippets/<adapter>.ts`),
lazy-`import()`ed by `src/lib/framework.ts` on selection, so the site never
loads a framework runtime for its demos.

Run `bun run test` in `docs/` to check adapter coverage and sample contracts.

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
  permanent "static" classes, and hydration runs after the server-rendered
  class is in the DOM — so on a hydrated element the first value is merged into every
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
and website from that exact tag and deploys `docs/dist` to Cloudflare with
[wrangler-action](https://github.com/cloudflare/wrangler-action). The docs
workflow can also be run manually for a selected ref. Do not commit generated
`dist/` files (unlike `src/generated/` — see Layout above — `dist/` is a full
build output, gitignored as always).

The site is a **Cloudflare Pages** project (`docs/wrangler.jsonc`'s
`pages_build_output_dir`), not a static-assets Worker — the same pattern
[nuclo's own docs site](https://nuclo.dev) uses. `functions/[[path]].ts` is a
catch-all Pages Function that Cloudflare auto-discovers from this project
root; `public/_routes.json` tells it which paths are real static files
(hashed JS/CSS under `/assets/*`, the manifest, favicons, `sitemap.xml`, …)
that should skip the Function entirely and be served directly — free and
unlimited, per Cloudflare's own static-asset billing — versus which paths
(everything else: every page route, and any unknown path) should invoke it
for a per-request render. See "How a page gets to the browser" above for what
happens inside the Function.

This project used to be a Workers static-assets deployment prerendering every
route to its own `dist/*.html` file, with a small `worker.ts` shim patching a
gap in Cloudflare's `html_handling` config (`/` had no exact asset match under
`html_handling: "none"`, so it 404'd at the HTTP level until hydration
papered over it). Moving to per-request SSR removes that whole class of
problem — the server always renders exactly the route a request names, so
there's no "wrong file got served, fix it up client-side" case left to have a
bug in.

Deploying needs a `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` set as
repository secrets, and — once — the `mother-mask.dan2.dev` custom domain
attached to the `mother-mask` Pages project (**Pages custom domains are
attached differently from a Worker's `routes` config** — either in the
Cloudflare dashboard under the project's Custom domains tab, or via
`wrangler pages deployment domain add`; there's no `routes`/`custom_domain`
block in `wrangler.jsonc` for Pages the way the old Workers setup had).
