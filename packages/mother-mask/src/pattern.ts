import type { ApplyMaskOptions, MaskPattern, MaskResult, MaskTokens, TokenMatcher } from './types'

/** A slot consumes one code point. Source/caret offsets remain UTF-16 DOM offsets. */
export interface Slot {
  match: (char: string) => boolean
  transform?: (char: string) => string
  maxLength: number
}

function isDigitChar(ch: string): boolean {
  return ch >= '0' && ch <= '9'
}

function isLetterChar(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')
}

function isDataChar(ch: string): boolean {
  return isDigitChar(ch) || isLetterChar(ch)
}

const builtins: ReadonlyArray<readonly [string, Slot]> = [
  ['9', { match: isDigitChar, maxLength: 1 }],
  ['Z', { match: isLetterChar, maxLength: 1 }],
  ['A', { match: isDataChar, maxLength: 1 }],
]

function matcher(match: TokenMatcher): (char: string) => boolean {
  if (typeof match === 'function') return match
  // Private, stateless copy. Never mutate a caller's RegExp (even a frozen one).
  const regex = new RegExp(match.source, match.flags.replace(/[gy]/g, ''))
  return (char) => regex.test(char)
}

export function transformChar(char: string, slot: Slot): string {
  if (!slot.transform) return char
  const output = slot.transform(char)
  if (typeof output !== 'string' || Array.from(output).length !== 1) {
    throw new RangeError('A mask token transform must return exactly one Unicode code point')
  }
  return output
}

export type MaskToken = { kind: 'literal'; text: string } | { kind: 'slots'; chars: Slot[] }

/**
 * A mask string pre-chewed into the lookups both passes need.
 *
 * "Run" throughout means one uninterrupted stretch of slot characters — the
 * segment a user thinks of as a single field ("999", "9999", …). Runs are
 * numbered in mask order; token indices index {@link CompiledMask.tokens}.
 */
export interface CompiledMask {
  maxLength: number
  parts: Array<Slot | { kind: 'literal'; text: string }>
  dataSlots: Slot[]
  literals: Array<{ text: string; offset: number }>
  hasEscapes: boolean
  /** Alternating literal / slot-run tokens, in mask order. */
  tokens: MaskToken[]
  /** Slot characters of each run (e.g. `["999", "999", "999", "99"]`). */
  runChars: Slot[][]
  /** Index into a flat, run-concatenated slot array where each run starts. */
  runOffset: number[]
  /** Token index of the literal directly before run `i`, or `-1` at the mask start. */
  literalBeforeRun: number[]
  /** Total slot capacity of runs `i..end`; `capacityFromRun[runCount]` is `0`. */
  capacityFromRun: number[]
  /** For each token, the run it *is* (`-1` for literals). */
  runOfToken: number[]
  /** For each literal token, the run directly before it (`-1` when it opens the mask). */
  runBeforeLiteral: number[]
  /** For each literal token, the run directly after it (`-1` when it closes the mask). */
  runAfterLiteral: number[]
  /** Total number of slots in the mask. */
  totalSlots: number
}

/**
 * Split a mask into alternating literal and slot-run tokens (e.g. "99/99/9999"
 * → slots"99", literal"/", slots"99", literal"/", slots"9999") and derive the
 * run/literal adjacency both passes rely on.
 */
function compileMask(mask: string, definitions: Map<string, Slot>): CompiledMask {
  const tokens: MaskToken[] = []
  const runOfToken: number[] = []
  const runChars: Slot[][] = []
  const runToken: number[] = []

  const points = Array.from(mask)
  let maxLength = 0
  let hasEscapes = false
  for (let i = 0; i < points.length; i++) {
    let ch = points[i]
    let escaped = false
    if (ch === '\\' && (points[i + 1] === '\\' || definitions.has(points[i + 1]))) {
      ch = points[++i]
      escaped = true
      hasEscapes = true
    }
    const slot = escaped ? undefined : definitions.get(ch)
    const previous = tokens[tokens.length - 1]
    if (slot) {
      maxLength += slot.maxLength
      if (previous?.kind === 'slots') previous.chars.push(slot)
      else {
        const chars = [slot]
        runOfToken.push(runChars.length)
        runToken.push(tokens.length)
        runChars.push(chars)
        tokens.push({ kind: 'slots', chars })
      }
    } else {
      maxLength += ch.length
      if (previous?.kind === 'literal') previous.text += ch
      else {
        runOfToken.push(-1)
        tokens.push({ kind: 'literal', text: ch })
      }
    }
  }

  const runCount = runChars.length
  const runOffset: number[] = new Array(runCount)
  const literalBeforeRun: number[] = new Array(runCount)
  const capacityFromRun: number[] = new Array(runCount + 1)
  const runBeforeLiteral: number[] = new Array(tokens.length).fill(-1)
  const runAfterLiteral: number[] = new Array(tokens.length).fill(-1)

  let offset = 0
  for (let r = 0; r < runCount; r++) {
    runOffset[r] = offset
    offset += runChars[r].length
    // Tokens alternate, so the token just before a run is always a literal
    // when it exists at all.
    literalBeforeRun[r] = runToken[r] > 0 ? runToken[r] - 1 : -1
  }

  capacityFromRun[runCount] = 0
  for (let r = runCount - 1; r >= 0; r--) {
    capacityFromRun[r] = capacityFromRun[r + 1] + runChars[r].length
  }

  for (let t = 0; t < tokens.length; t++) {
    if (tokens[t].kind !== 'literal') continue
    runBeforeLiteral[t] = t > 0 ? runOfToken[t - 1] : -1
    runAfterLiteral[t] = t + 1 < tokens.length ? runOfToken[t + 1] : -1
  }

  const parts: CompiledMask['parts'] = []
  const literals: CompiledMask['literals'] = []
  const dataSlots = new Set<Slot>()
  for (let t = 0; t < tokens.length; t++) {
    const token = tokens[t]
    if (token.kind === 'literal') {
      parts.push(token)
      literals.push({ text: token.text, offset: runAfterLiteral[t] < 0 ? offset : runOffset[runAfterLiteral[t]] })
    } else {
      for (const slot of token.chars) {
        parts.push(slot)
        dataSlots.add(slot)
      }
    }
  }

  const compiled: CompiledMask = {
    maxLength,
    hasEscapes,
    dataSlots: [...dataSlots],
    literals,
    parts,
    tokens,
    runChars,
    runOffset,
    literalBeforeRun,
    capacityFromRun,
    runOfToken,
    runBeforeLiteral,
    runAfterLiteral,
    totalSlots: offset,
  }
  return compiled
}

/** Bounded per-operation/binding cache. No formatted values or callbacks in global caches. */
export class PatternCompiler {
  private readonly definitions = new Map(builtins)
  private readonly cache = new Map<string, CompiledMask>()
  private readonly custom: boolean

  constructor(tokens?: MaskTokens) {
    this.custom = !!tokens && Object.keys(tokens).length > 0
    for (const key of Object.keys(tokens ?? {})) {
      const definition = tokens![key]
      if (key === '\\' || Array.from(key).length !== 1) {
        throw new RangeError('Mask token keys must be one Unicode code point other than backslash')
      }
      const object = typeof definition === 'object' && 'match' in definition
        ? definition : { match: definition }
      this.definitions.set(key, {
        match: matcher(object.match), transform: object.transform, maxLength: 2,
      })
    }
  }

  compile(mask: string): CompiledMask {
    const cached = this.cache.get(mask)
    if (cached) return cached
    const plan = compileMask(mask, this.definitions)
    if (this.cache.size === 64) this.cache.delete(this.cache.keys().next().value!)
    this.cache.set(mask, plan)
    return plan
  }

  isData(char: string, plan?: CompiledMask): boolean {
    if (plan && (this.custom || plan.hasEscapes)) {
      return plan.dataSlots.some((slot) => slot.match(char))
    }
    for (const slot of this.definitions.values()) if (slot.match(char)) return true
    return false
  }

  /** Candidate stream from the fallback alphabet, without transformer side effects. */
  data(value: string, caret: number, plans?: CompiledMask[], readLiterals = true): MaskResult & { afterLiteral: boolean } {
    let output = ''
    let source = 0
    let outputCaret = 0
    let count = 0
    let lastLiteralOffset = -1
    let afterLiteral = false
    let slots: Slot[] | undefined
    const literals: CompiledMask['literals'] = []
    if (plans) {
      const unique = new Set<Slot>()
      for (const plan of plans) {
        for (const slot of plan.dataSlots) unique.add(slot)
        if (readLiterals) for (const literal of plan.literals) literals.push(literal)
      }
      slots = [...unique]
    }
    const hasEscapes = plans?.some((plan) => plan.hasEscapes)
    while (source < value.length) {
      // Complete literal runs at their data boundary are formatting, even
      // when a literal itself could match a slot (e.g. an escaped "A").
      const literal = lastLiteralOffset !== count && literals?.find((part) =>
        (part.offset === count || hasEscapes) && value.startsWith(part.text, source))
      if (literal) {
        if (source < caret) afterLiteral = true
        source += literal.text.length
        lastLiteralOffset = count
        continue
      }
      const char = String.fromCodePoint(value.codePointAt(source)!)
      const start = source
      source += char.length
      if (!(slots ? slots.some((slot) => slot.match(char)) : this.isData(char))) {
        if (start < caret && literals?.some((part) => value.startsWith(part.text, start))) afterLiteral = true
        continue
      }
      output += char
      count++
      if (source <= caret) {
        outputCaret = output.length
        afterLiteral = false
      }
    }
    return { value: output, caret: outputCaret, afterLiteral }
  }

  resolve(value: string, mask: MaskPattern, readLiterals = true): CompiledMask {
    if (!Array.isArray(mask)) return this.compile(mask)
    const plans = mask.map((pattern) => this.compile(pattern))
    const count = Array.from(this.data(value, 0,
      this.custom || plans.some((plan) => plan.hasEscapes) ? plans : undefined, readLiterals).value).length
    let i = 0
    while (i < plans.length - 1 && count > plans[i].totalSlots) i++
    return plans[i] ?? this.compile('')
  }
}

// Safe to share only the built-in alphabet; this instance never sees user callbacks.
export const defaultCompiler = new PatternCompiler()

/** Maximum formatted UTF-16 length (custom slots allow two units). Infinity for a resolver. */
export function getMaxLength(mask: MaskPattern, options?: ApplyMaskOptions): number {
  if (options?.resolveMask) return Infinity
  const compiler = options?.tokens ? new PatternCompiler(options.tokens) : defaultCompiler
  const patterns = Array.isArray(mask) ? mask : [mask]
  let max = 0
  for (const pattern of patterns) max = Math.max(max, compiler.compile(pattern).maxLength)
  return max
}
