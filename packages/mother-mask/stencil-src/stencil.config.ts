import type { Config } from '@stencil/core'

export const config: Config = {
  namespace: 'mother-mask-stencil',
  outputTargets: [
    {
      type: 'dist-custom-elements',
      dir: '../dist/stencil',
      customElementsExportBehavior: 'auto-define-custom-elements',
      externalRuntime: false,
      // Stencil's own declaration emit resolves back through mother-mask's
      // declaration source maps to the original .ts sources and mirrors
      // that whole tree (including local machine paths) into dist/types —
      // see the note in package.json's "build" script. Hand-written types
      // in `types/*.d.ts`, copied in by that same script, replace this.
      generateTypeDeclarations: false,
    },
  ],
}
