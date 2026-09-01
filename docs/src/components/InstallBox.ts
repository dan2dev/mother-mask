import { CopyButton } from './CodeBlock.ts'

export function InstallBox(command = 'npm install mother-mask') {
  return div({ className: 'install-box', id: 'install' }, code({ id: 'install-cmd' }, command), CopyButton('Copy install command'))
}
