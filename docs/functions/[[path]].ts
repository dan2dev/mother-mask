/**
 * Cloudflare Pages Function — SSR catch-all.
 *
 * Cloudflare only invokes this for requests that don't match a static file
 * already present in the deployed output (`dist`) — `public/_routes.json`
 * spells out which paths those are, so every real asset (hashed JS/CSS,
 * favicons, sitemap.xml, ...) is served directly by Pages and never reaches
 * this handler. Everything else (every page route, and unknown paths for the
 * 404 fallback) is rendered here with the same `appFetch` the Vite dev-mode
 * SSR middleware uses (vite/plugin-ssr-dev.ts) — see src/app-handler.ts.
 *
 * Deploy with: `bun run build && wrangler pages deploy dist` (run from
 * docs/ — Wrangler picks up this functions/ directory from the project root,
 * separately from the deploy output path).
 */
import { appFetch, buildProdTransform, type ViteManifest } from '../src/app-handler.ts'

interface Env {
  ASSETS: { fetch(input: Request | string): Promise<Response> }
}

// Cached for the lifetime of the isolate — the manifest is static per deployment.
let transformPromise: Promise<(html: string) => string> | null = null

function getTransform(env: Env, origin: string): Promise<(html: string) => string> {
  if (!transformPromise) {
    transformPromise = env.ASSETS.fetch(`${origin}/.vite/manifest.json`)
      .then((res) => res.json() as Promise<ViteManifest>)
      .then((manifest) => buildProdTransform(manifest))
  }
  return transformPromise
}

export const onRequest = async (context: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = context
  const transform = await getTransform(env, new URL(request.url).origin)
  return appFetch(request, transform)
}
