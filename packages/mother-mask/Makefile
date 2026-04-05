.PHONY: help publish release-patch release-minor release-major bump-version version show-version ensure-clean

# BUMP can be: patch | minor | major  (default: patch)
BUMP    ?= patch
PKG_FILE := package.json

# ── Default ───────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "Release / Publish targets:"
	@echo "  make publish            -> test, build, commit, bump PATCH, publish, tag, push"
	@echo "  make publish BUMP=minor -> bump MINOR"
	@echo "  make publish BUMP=major -> bump MAJOR"
	@echo "  make release-patch      -> alias for publish BUMP=patch"
	@echo "  make release-minor      -> alias for publish BUMP=minor"
	@echo "  make release-major      -> alias for publish BUMP=major"
	@echo ""
	@echo "Other:"
	@echo "  make version            -> show current version"
	@echo "  make ensure-clean       -> abort if working tree is dirty"
	@echo ""

# ── Helpers ───────────────────────────────────────────────────────────────────

# Bump version in package.json without invoking npm workspace resolution.
bump-version:
	@node -e '\
	  const fs = require("node:fs"); \
	  const pkgPath = process.argv[1]; \
	  const bump    = process.argv[2]; \
	  const pkg     = JSON.parse(fs.readFileSync(pkgPath, "utf8")); \
	  const parts   = pkg.version.split(".").map(Number); \
	  if (parts.length !== 3 || parts.some(Number.isNaN)) { \
	    console.error("Unsupported version format: " + pkg.version); process.exit(1); \
	  } \
	  if      (bump === "patch") { parts[2] += 1; } \
	  else if (bump === "minor") { parts[1] += 1; parts[2] = 0; } \
	  else if (bump === "major") { parts[0] += 1; parts[1] = 0; parts[2] = 0; } \
	  else { console.error("Unsupported bump type: " + bump); process.exit(1); } \
	  pkg.version = parts.join("."); \
	  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, "  ") + "\n"); \
	  console.log(pkg.version); \
	' "$(PKG_FILE)" "$(BUMP)"

version:
	@node -e 'console.log(JSON.parse(require("fs").readFileSync("$(PKG_FILE)","utf8")).version)'

show-version: version

# Standalone safety check — use before publish if you want to enforce a clean tree.
ensure-clean:
	@if ! git diff --quiet -- ':!*lock*' || ! git diff --cached --quiet -- ':!*lock*'; then \
	  echo ""; \
	  echo "  Working tree is not clean."; \
	  echo "  Commit or stash changes before publishing."; \
	  echo ""; \
	  exit 1; \
	fi

# ── Publish ───────────────────────────────────────────────────────────────────
# Workflow:
#   1. Run full test suite
#   2. Build (ESM + CJS + UMD + types)
#   3. Verify npm login
#   4. Stage all pending changes (respects .gitignore)
#   5. Bump version in package.json
#   6. Publish to npm registry
#   7. Commit staged changes + version bump as a single release commit
#   8. Create annotated tag v<version>  (skip if already exists)
#   9. Push commit + tag
publish:
	@echo ""
	@echo "==> Running tests"
	@pnpm test
	@echo "==> Building"
	@pnpm build
	@echo "==> Verifying npm login"
	@if ! npm whoami > /dev/null 2>&1; then \
	  npm login || { echo "ERROR: npm login failed."; exit 1; }; \
	fi
	@echo "==> Staging pending changes"
	@git add -A
	@echo "==> Bumping $(BUMP) version"
	@new_version=$$($(MAKE) --no-print-directory bump-version BUMP=$(BUMP)); \
	  echo "==> New version: $$new_version"; \
	  echo "==> Publishing to npm"; \
	  pnpm publish --no-git-checks; \
	  echo "==> Committing release"; \
	  git add $(PKG_FILE); \
	  git commit -m "chore: release v$$new_version"; \
	  echo "==> Tagging"; \
	  if git rev-parse -q --verify "refs/tags/v$$new_version" > /dev/null 2>&1; then \
	    echo "    Tag v$$new_version already exists — skipping"; \
	  else \
	    git tag -a "v$$new_version" -m "Release v$$new_version"; \
	    echo "    Created tag v$$new_version"; \
	  fi; \
	  echo "==> Pushing commit + tag"; \
	  git push --follow-tags
	@echo ""
	@echo "==> Done. Package published."
	@echo ""

# ── Convenience aliases ───────────────────────────────────────────────────────
release-patch:
	@$(MAKE) publish BUMP=patch

release-minor:
	@$(MAKE) publish BUMP=minor

release-major:
	@$(MAKE) publish BUMP=major
