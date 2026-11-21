.PHONY: help install up build test test-e2e test-stress test-memory dev publish release-patch release-minor release-major

PKG := packages/mother-mask
E2E := e2e

# ── Default ───────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "mother-mask workspace"
	@echo ""
	@echo "  install              Install all dependencies"
	@echo "  up                   Upgrade all dependencies to latest"
	@echo "  build                Build the library"
	@echo "  test                 Run tests with coverage"
	@echo "  test-e2e             Run Playwright browser tests (real Chrome, desktop + mobile)"
	@echo "  test-stress          Race/timing stress only: burst typing, select-replace, IME"
	@echo "  test-memory          Leak checks only: forced GC, retained heap + DOM nodes"
	@echo "  dev                  Watch mode (build on change)"
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

# `make up` (same block in the mono, nuclo and mother-mask Makefiles): bump every
# package.json in this repo and its submodules (new untracked ones too; ignored
# ones skipped) to the latest versions their peers allow, then reinstall wherever
# a lockfile lives. Hold a dep back with a .ncurc.yml next to its package.json.
UP_SKIP ?=
up:
	@pkgs=$$(for r in . $$(git submodule --quiet foreach --recursive 'echo $$displaypath'); do \
		case " $(UP_SKIP) " in (*" $$r "*) continue;; esac; \
		git -C $$r ls-files -co --exclude-standard ':(glob)**/package.json' | sed "s|^|$$r/|; s|^\./||"; \
	done | xargs -n1 dirname); failed=; \
	for d in $$pkgs; do echo "==> $$d"; (cd $$d && bunx npm-check-updates@23 -u --peer) || failed="$$failed $$d"; done; \
	for d in $$pkgs; do (cd $$d && \
		if [ -f bun.lock ] || [ -f bun.lockb ]; then bun install; \
		elif [ -f pnpm-lock.yaml ]; then pnpm install; \
		elif [ -f yarn.lock ]; then yarn install; \
		elif [ -f package-lock.json ]; then npm install; fi) || failed="$$failed $$d"; done; \
	[ -z "$$failed" ] || { echo "make up failed in:$$failed"; exit 1; }

# ── Dev ───────────────────────────────────────────────────────────────────────
build:
	cd $(PKG) && pnpm build

test:
	cd $(PKG) && pnpm test

test-e2e:
	cd $(PKG) && pnpm build
	cd $(E2E) && bun install && bunx playwright install --with-deps chromium && bunx playwright test

# Everything that can only fail under real browser timing: keystrokes arriving
# faster than frames, select-and-replace against a pending default action, and
# IME composition sessions that never end.
test-stress:
	cd $(PKG) && pnpm build
	cd $(E2E) && bun install && bunx playwright install --with-deps chromium && \
		bunx playwright test stress fast-typing speed-matrix select-replace-race android-composition

# Forced-GC heap, DOM node and listener measurements. Chromium only — these
# metrics come over CDP and have no cross-browser equivalent.
test-memory:
	cd $(PKG) && pnpm build
	cd $(E2E) && bun install && bunx playwright install --with-deps chromium && \
		bunx playwright test memory

dev:
	cd $(PKG) && pnpm dev

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
