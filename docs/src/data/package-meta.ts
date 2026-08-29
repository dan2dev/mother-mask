import { gzipSync } from 'node:zlib'
import pkg from '../../../packages/mother-mask/package.json'
import minifiedBundle from '../../../packages/mother-mask/dist/mother-mask.mjs?raw'

const moduleEntry = pkg.module.replace(/^\.\//, '')

if (moduleEntry !== 'dist/mother-mask.mjs') {
  throw new Error(`Update the bundle-size import for ${pkg.name}: package.json now declares ${pkg.module}`)
}

export const packageVersion = pkg.version
export const bundleGzipBytes = gzipSync(minifiedBundle, { level: 9 }).byteLength
export const bundleGzipSize = `${(bundleGzipBytes / 1000).toFixed(1)} kB`
export const bundleArtifact = moduleEntry
