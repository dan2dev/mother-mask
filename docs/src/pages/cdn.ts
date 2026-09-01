import { CodeBlock } from '../components/CodeBlock.ts'

export function view() {
  return div(
    { className: 'page' },
    section(
      { id: 'cdn' },
      h1({ className: 'page-title' }, 'UMD / CDN'),
      CodeBlock('cdn-umd'),
      p({ style: { marginTop: '12px' } }, 'The global name is ', code('MotherMask'), '.'),
    ),
  )
}
