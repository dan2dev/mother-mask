# mother-mask workspace

Monorepo for [mother-mask](https://www.npmjs.com/package/mother-mask) and related projects.

## Structure

```
mother-mask/
├── packages/
│   └── mother-mask/   # published npm package
├── Makefile           # workspace-level commands
└── .gitignore
```

## Quick start

```bash
make install   # install all dependencies
make test      # run tests
make build     # build the library
make dev       # watch mode
```

## Publish

```bash
make publish              # bump patch → publish
make publish BUMP=minor
make publish BUMP=major
```

See [`packages/mother-mask/README.md`](packages/mother-mask/README.md) for full documentation.
