/**
 * Serves `virtual:package-meta`: the library's version and the real gzipped
 * size of its published ESM bundle.
 *
 * The homepage advertises both, and neither can be measured in a browser — the
 * size comes from gzipping `packages/mother-mask/dist/mother-mask.mjs` at
 * level 9, which needs `node:zlib` and the built artifact on disk. Computing it
 * here means the number is always the current build's, with no string
 * replacement step and nothing to update by hand at release time.
 *
 * Build the library before the docs; the deploy workflow already does.
 */
import { gzipSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

const VIRTUAL_ID = 'virtual:package-meta'
const RESOLVED_ID = '\0virtual:package-meta'

const PACKAGE_DIR = resolve(import.meta.dirname, '../../packages/mother-mask')

interface PackageJson {
  name: string
  version: string
  module: string
}

function measure(): string {
  const pkg = JSON.parse(readFileSync(resolve(PACKAGE_DIR, 'package.json'), 'utf8')) as PackageJson
  const artifact = pkg.module.replace(/^\.\//, '')

  let bundle: Buffer
  try {
    bundle = readFileSync(resolve(PACKAGE_DIR, artifact))
  } catch {
    throw new Error(
      `Cannot measure ${pkg.name}: ${artifact} is missing. Build the library first ` +
        `(cd packages/mother-mask && bun run build).`,
    )
  }

  const bytes = gzipSync(bundle, { level: 9 }).byteLength

  return [
    `export const packageVersion = ${JSON.stringify(pkg.version)}`,
    `export const bundleGzipBytes = ${bytes}`,
    `export const bundleGzipSize = ${JSON.stringify(`${(bytes / 1000).toFixed(1)} kB`)}`,
    `export const bundleArtifact = ${JSON.stringify(artifact)}`,
  ].join('\n')
}

export function packageMetaPlugin(): Plugin {
  return {
    name: 'mother-mask-docs:package-meta',
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined
    },
    load(id) {
      return id === RESOLVED_ID ? measure() : undefined
    },
  }
}
