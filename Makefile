.PHONY: help install up build test dev lint publish release-patch release-minor release-major

PKG := packages/mother-mask

# ── Default ───────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "mother-mask workspace"
	@echo ""
	@echo "  install              Install all dependencies"
	@echo "  up                   Upgrade all dependencies to latest"
	@echo "  build                Build the library"
	@echo "  test                 Run tests with coverage"
	@echo "  dev                  Watch mode (build on change)"
	@echo "  lint                 Lint source files"
	@echo ""
	@echo "  publish              Bump PATCH, publish, commit, tag, push"
	@echo "  publish BUMP=minor   Bump MINOR"
	@echo "  publish BUMP=major   Bump MAJOR"
	@echo "  release-patch        Alias for publish BUMP=patch"
	@echo "  release-minor        Alias for publish BUMP=minor"
	@echo "  release-major        Alias for publish BUMP=major"
	@echo ""

# ── Workspace ─────────────────────────────────────────────────────────────────
install:
	cd $(PKG) && pnpm install

up:
	cd $(PKG) && pnpm up --latest

# ── Dev ───────────────────────────────────────────────────────────────────────
build:
	cd $(PKG) && pnpm build

test:
	cd $(PKG) && pnpm test

dev:
	cd $(PKG) && pnpm dev

lint:
	cd $(PKG) && pnpm lint

# ── Publish ───────────────────────────────────────────────────────────────────
BUMP ?= patch

publish:
	@$(MAKE) --no-print-directory -C $(PKG) publish BUMP=$(BUMP)

release-patch:
	@$(MAKE) publish BUMP=patch

release-minor:
	@$(MAKE) publish BUMP=minor

release-major:
	@$(MAKE) publish BUMP=major
