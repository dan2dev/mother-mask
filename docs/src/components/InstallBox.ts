import { CopyButton } from './CodeBlock.ts'

// `id` defaults cover the common single-instance case; pass a suffix when a
// page renders more than one install box (e.g. the hero and the CTA banner)
// so ids stay unique.
export function InstallBox(command = 'npm install mother-mask', idSuffix = '') {
  return div(
    { className: 'install-box', id: `install${idSuffix}` },
    code({ id: `install-cmd${idSuffix}` }, command),
    CopyButton('Copy install command'),
  )
}
