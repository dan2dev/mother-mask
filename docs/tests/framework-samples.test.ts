import { describe, expect, test } from 'bun:test'
import { FRAMEWORKS } from '../src/content/frameworks.ts'
import { snippets, type SnippetName } from '../src/content/snippets.ts'
import { demoField, frameworkSamples } from '../vite/framework-samples.ts'

const demoNames = (Object.keys(snippets) as SnippetName[]).filter((name) => name.startsWith('ex-'))

describe('framework examples', () => {
  for (const { id } of FRAMEWORKS) {
    if (id === 'vanilla') continue
    test(`${id} preserves every live demo's mask and options`, () => {
      const variants = frameworkSamples(id)
      for (const name of demoNames) {
        const field = demoField(name)
        const source = variants[name]!.code
        expect(source).toContain(`mother-mask/${id}`)
        if (field.mask) expect(source).toContain(field.mask)
        expect(source).toContain(field.options)
        expect(source).not.toContain('updateOutputs(')
        // Standalone examples must bring along any custom token declarations.
        if (field.options.includes('uppercaseLetter')) expect(source).toContain('const uppercaseLetter =')
        if (field.options.includes('uppercaseAlphanumeric')) expect(source).toContain('const uppercaseAlphanumeric =')
      }
      expect(variants['ex-raw']!.code).toContain("replace(/\\D/g, '')")
      expect(variants['ex-decimal-callback']!.code).toMatch(/numericValue|numeric-(?:value-)?change/)
      expect(variants['patterns-escapes']!.code).toContain("'\\\\A-999999'")
    })
  }

  test('adapters use their own public callback contracts', () => {
    expect(frameworkSamples('react')['ex-cpf']!.code).toContain('onValueChange=')
    expect(frameworkSamples('qwik')['ex-cpf']!.code).toContain('onValueChange$=')
    expect(frameworkSamples('vue')['ex-cpf']!.code).toContain('v-mother-mask=')
    expect(frameworkSamples('angular')['ex-cpf']!.code).toContain('[(value)]="value"')
    expect(frameworkSamples('svelte')['ex-cpf']!.code).toContain('use:motherMask=')
    expect(frameworkSamples('solid')['ex-cpf']!.code).toContain('use:motherMask=')
    expect(frameworkSamples('alpine')['ex-cpf']!.code).not.toContain('x-model')
    expect(frameworkSamples('ember')['ex-cpf']!.code).toContain('{{maskInput this.mask')
    expect(frameworkSamples('stencil')['ex-cpf']!.code).toContain("import 'mother-mask/stencil/mask-input'")
  })

  test('custom element configuration targets hosts after ids transfer', () => {
    for (const id of ['lit', 'stencil', 'web-components'] as const) {
      const source = frameworkSamples(id)['ex-usd']!.code
      expect(source).toContain('[data-field="0"]')
      expect(source).not.toContain("getElementById('field-0')")
    }
  })

  test('pure helpers stay inside single-file component script blocks', () => {
    for (const id of ['vue', 'svelte', 'lit', 'alpine', 'knockout', 'riot'] as const) {
      const source = frameworkSamples(id)['decimals-helpers']!.code
      const helperPosition = source.indexOf('import { formatDecimalValue')
      expect(helperPosition).toBeGreaterThan(source.indexOf('<script'))
      expect(helperPosition).toBeLessThan(source.indexOf('</script>'))
    }
  })
})

// Parse the generated TypeScript/JSX and inline module scripts, independently
// of the string-preservation assertions above. Framework compilers handle the
// remaining Vue/Svelte/Glimmer template syntax in their consuming apps.
test('generated script samples have valid syntax', () => {
  const ts = new Bun.Transpiler({ loader: 'ts' })
  const tsx = new Bun.Transpiler({ loader: 'tsx' })
  for (const { id } of FRAMEWORKS) {
    if (id === 'vanilla' || id === 'ember') continue
    for (const [name, sample] of Object.entries(frameworkSamples(id))) {
      // The integration guide retains the README's framework-specific setup.
      if (name === 'framework-guide') continue
      const script = /<script[^>]*>([\s\S]*?)<\/script>/.exec(sample.code)?.[1]
      if (script) expect(() => ts.transformSync(script)).not.toThrow()
      else expect(() => (sample.lang === 'tsx' ? tsx : ts).transformSync(sample.code)).not.toThrow()
    }
  }
})
