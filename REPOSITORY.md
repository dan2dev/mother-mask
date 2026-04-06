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
make test       # tests + coverage
make build      # ESM + CJS + UMD
make dev        # watch mode
make lint       # lint package sources
make up         # upgrade dependencies in the package
```

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
