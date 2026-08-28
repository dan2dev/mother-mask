# Documentation website

The [mother-mask documentation and live examples](https://dan2dev.github.io/mother-mask/)
are a static Vite site. Content and code snippets live in `index.html`, demo
bindings in `src/main.ts`, and styling in `src/style.css`.

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
  Update visible snippets and their live bindings together.
- Add section links to both the desktop sidebar and mobile menu. Give new
  demo inputs accessible labels and explain what an example demonstrates.
- Formatting is not validation. Demo hints report completeness, not valid dates,
  checksums, card networks, or identifiers.
- Use custom-token transforms for case conversion instead of rewriting the
  bound input in an `onChange` callback.
- Build the package and docs, then check any changed examples. Run `make test`
  from the repository root for the library suite; see
  [the repository guide](../REPOSITORY.md) for real-browser checks.

## Deployment

[Deploy docs](../.github/workflows/deploy-docs.yml) builds the library and website,
uploads `docs/dist`, and deploys to GitHub Pages on pushes to `main` or manual
workflow dispatch. Do not commit generated `dist/` files. Website-only edits do
not require an npm release.
