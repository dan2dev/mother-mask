# Repository

Monorepo for the [`mother-mask`](https://www.npmjs.com/package/mother-mask) npm package.

End-user documentation (install, usage, API) lives in [`packages/mother-mask/README.md`](packages/mother-mask/README.md).

## Layout

```
mother-mask/
├── packages/mother-mask/   # published npm package (source + build)
├── examples/basic-examples/ # runnable examples (optional)
├── Makefile                 # workspace-level commands
└── package.json             # pnpm workspace root (private)
```

## Development

From the repository root:

```bash
make install    # install dependencies (pnpm in packages/mother-mask)
make test       # unit tests + coverage (jsdom)
make build      # ESM + CJS + UMD
make dev        # watch mode
make up         # upgrade dependencies in the package
```

### Browser tests

`make test` runs in jsdom, which models event *order* but not real browser
timing. Anything that can only fail because keystrokes outrun frames needs a
real engine:

```bash
make test-e2e      # everything, desktop + mobile Chromium
make test-stress   # race/timing only: burst typing, select-replace, IME
make test-memory   # leak only: forced GC, retained heap / DOM nodes
```

These download a Chromium on first run and are not wired into CI, so run them
locally before touching `bind()`, `bindDecimal()`, or the masking passes.

Note when writing them: select-all must be sent as `ControlOrMeta+a`. On macOS
`Control+A` is "move to start of line", so a test using it silently exercises
a caret-at-0 insert instead of a replace, and passes for the wrong reason.

## Publish

Runs **tests** and **build**, then bumps the version, publishes to npm, commits, tags, and pushes (see `packages/mother-mask/Makefile`).

```bash
make publish              # bump patch (default)
make publish BUMP=minor
make publish BUMP=major
```

Aliases: `make release-patch`, `make release-minor`, `make release-major`.

## License

MIT — [Danilo Celestino de Castro](https://github.com/dan2dev)
