import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const libraryRoot = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
let sandbox
let packed

before(async () => {
  sandbox = await mkdtemp(join(tmpdir(), 'mother-mask-package-'))
  const result = JSON.parse(execFileSync('npm', [
    'pack', libraryRoot, '--ignore-scripts', '--json', '--workspaces=false', '--pack-destination', sandbox,
  ], { encoding: 'utf8' }))
  // npm versions return either an array or a map keyed by package name.
  packed = Array.isArray(result) ? result[0] : result['mother-mask']
  assert.ok(packed?.filename, 'npm pack did not return the package metadata')
})

after(async () => { if (sandbox) await rm(sandbox, { recursive: true, force: true }) })

async function consumer(name, withReact = false) {
  const directory = join(sandbox, name)
  const target = join(directory, 'node_modules/mother-mask')
  await mkdir(target, { recursive: true })
  execFileSync('tar', ['-xzf', join(sandbox, packed.filename), '--strip-components=1', '-C', target])
  if (withReact) {
    for (const dependency of ['react', 'react-dom', '@types/react', '@types/react-dom', 'csstype']) {
      const destination = join(directory, 'node_modules', dependency)
      await mkdir(dirname(destination), { recursive: true })
      const resolveFrom = dependency === 'csstype' ? createRequire(require.resolve('@types/react/package.json')) : require
      await symlink(await realpath(dirname(resolveFrom.resolve(`${dependency}/package.json`))), destination, 'dir')
    }
  }
  return directory
}

async function run(directory, name, source) {
  const path = join(directory, name)
  await writeFile(path, source)
  return execFileSync(process.execPath, [path], { cwd: directory, encoding: 'utf8' })
}

async function typecheck(directory, source) {
  // NodeNext resolves .mts through "import" and .cts through "require".
  await writeFile(join(directory, 'consumer.mts'), source)
  await writeFile(join(directory, 'consumer.cts'), source)
  await writeFile(join(directory, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext',
      strict: true, noEmit: true, types: [], lib: ['ES2022', 'DOM'],
    },
    include: ['consumer.mts', 'consumer.cts'],
  }))
  execFileSync(join(libraryRoot, 'node_modules/.bin/tsc'), ['-p', join(directory, 'tsconfig.json')], { encoding: 'utf8' })
}

test('tarball includes both entry points, declarations, and optional React metadata', async () => {
  const files = new Set(packed.files.map(file => file.path))
  for (const file of ['mother-mask.mjs', 'mother-mask.cjs', 'mother-mask.umd.js', 'mother-mask.d.mts', 'mother-mask.d.cts', 'react.mjs', 'react.cjs', 'react.d.mts', 'react.d.cts']) {
    assert.ok(files.has(`dist/${file}`), `Missing dist/${file}`)
  }
  const directory = await consumer('metadata')
  const pkg = JSON.parse(await readFile(join(directory, 'node_modules/mother-mask/package.json'), 'utf8'))
  assert.equal(pkg.peerDependencies.react, '^19.2.0')
  assert.equal(pkg.peerDependenciesMeta.react.optional, true)
  assert.equal(pkg.dependencies?.react, undefined)
  assert.equal(pkg.exports['./react'].import.default, './dist/react.mjs')
  assert.equal(pkg.exports['./react'].require.default, './dist/react.cjs')
  for (const file of ['react.mjs', 'react.cjs']) {
    assert.match(await readFile(join(directory, 'node_modules/mother-mask/dist', file), 'utf8'), /^['"]use client['"];?/)
  }
})

test('core ESM, CommonJS, UMD, and types work without React installed', async () => {
  const directory = await consumer('core-only')
  await run(directory, 'core.mjs', `
    import assert from 'node:assert/strict'
    import { createRequire } from 'node:module'
    import * as core from 'mother-mask'
    const require = createRequire(import.meta.url)
    assert.throws(() => require.resolve('react'), { code: 'MODULE_NOT_FOUND' })
    for (const api of [core, require('mother-mask')]) {
      assert.equal(api.process('123456', '999-999'), '123-456')
      assert.equal(api.processDecimal('1234.5'), '1,234.5')
      assert.ok(!('InputMask' in api))
      assert.ok(!('InputDecimal' in api))
    }
  `)
  await run(directory, 'umd.cjs', `
    const assert = require('node:assert/strict')
    const { readFileSync } = require('node:fs')
    const { dirname, join } = require('node:path')
    const { runInNewContext } = require('node:vm')
    const context = {}
    const entry = join(dirname(require.resolve('mother-mask/package.json')), 'dist/mother-mask.umd.js')
    runInNewContext(readFileSync(entry, 'utf8'), context)
    assert.equal(context.MotherMask.process('123456', '999-999'), '123-456')
    assert.ok(!('InputMask' in context.MotherMask))
  `)
  await typecheck(directory, `
    import { bind, process, formatDecimalValue } from 'mother-mask'
    import type { BindOptions, DecimalMaskOptions } from 'mother-mask'
    const options: BindOptions = { eager: false }
    const decimals: DecimalMaskOptions = { decimalPlaces: 2 }
    const formatted: string = process('123', '999', options)
    const amount: string = formatDecimalValue(12.5, decimals)
    const cleanup: () => void = bind(document.createElement('input'), '999')
  `)
})

test('React ESM and CommonJS alias every core export and support server rendering', async () => {
  const directory = await consumer('react-runtime', true)
  await run(directory, 'react.mjs', `
    import assert from 'node:assert/strict'
    import { createRequire } from 'node:module'
    import { createElement } from 'react'
    import { renderToString } from 'react-dom/server'
    import * as core from 'mother-mask'
    import * as react from 'mother-mask/react'
    const require = createRequire(import.meta.url)
    for (const [base, entry] of [[core, react], [require('mother-mask'), require('mother-mask/react')]]) {
      for (const name of Object.keys(base)) assert.equal(entry[name], base[name], name)
      assert.deepEqual(Object.keys(entry).filter(name => !(name in base)).sort(), ['InputDecimal', 'InputMask'])
      assert.equal(typeof entry.InputMask, 'function')
      assert.equal(typeof entry.InputDecimal, 'function')
      assert.match(renderToString(createElement(entry.InputMask, { mask: '999-999', defaultValue: '123456' })), /123-456/)
      assert.match(renderToString(createElement(entry.InputDecimal, { defaultValue: '1234.5' })), /1,234.5/)
    }
  `)
})

test('React import and require declarations expose core types and component props', async () => {
  const directory = await consumer('react-types', true)
  await typecheck(directory, `
    import { createElement, createRef } from 'react'
    import * as api from 'mother-mask/react'
    import type { InputMaskProps, InputDecimalProps, BindOptions, DecimalMaskOptions, MaskPattern, MaskResult } from 'mother-mask/react'
    const coreAlias: typeof import('mother-mask') = api
    const mask: MaskPattern = ['999', '999-999']
    const options: BindOptions = { eager: true }
    const decimals: DecimalMaskOptions = { decimalPlaces: 2 }
    const result: MaskResult = api.applyMask('123', mask)
    const patternProps: InputMaskProps = { mask, options, value: '', onValueChange: value => value.toUpperCase(), ref: createRef<HTMLInputElement>() }
    const decimalProps: InputDecimalProps = { options: decimals, value: '', onValueChange: (value, numeric) => value + numeric.toFixed(2) }
    createElement(api.InputMask, patternProps)
    createElement(api.InputDecimal, decimalProps)
    // @ts-expect-error Controlled values preserve editable text, not numbers.
    const invalid: InputDecimalProps = { value: 12 }
  `)
})
