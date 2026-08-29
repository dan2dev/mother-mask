import type { ApplyMaskOptions, MaskPattern, MaskResult, MaskTokens, TokenMatcher } from './types'
import { isDigitChar } from './chars'

/** A slot consumes one code point. Source/caret offsets remain UTF-16 DOM offsets. */
export interface Slot {
  match: (char: string) => boolean
  transform?: (char: string) => string
  maxLength: number
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

/**
 * One representative code point per script whose IME holds a provisional
 * draft that reads nothing like what it commits — Pinyin/Zhuyin or Cangjie
 * romanizations resolving to a Han character, Kana toggling into Kanji,
 * jamo assembling into a Hangul syllable. `bind()` must leave composition
 * alone there, or a live reformat mid-draft overwrites text the IME still
 * expects to revise (see `android-fast-typing.test.ts`'s "nihao" → "你" case).
 *
 * A custom token whose alphabet provably never matches any of these can't
 * ever receive that kind of draft: whatever such an IME assembles, this
 * mask's own data check would filter it out exactly the same way once
 * composition ends, so reformatting one instant early changes nothing.
 * Plain ASCII/Latin alphabets (e.g. an uppercase-transforming alphanumeric
 * token) fall in this safe case — see `hasComposingRisk` below.
 */
const COMPOSING_SCRIPT_PROBES = ['中', 'あ', 'ア', '가']

/** Whether a token's alphabet could ever accept one of {@link COMPOSING_SCRIPT_PROBES}. */
function mayAcceptComposedScript(match: TokenMatcher): boolean {
  const test = matcher(match)
  return COMPOSING_SCRIPT_PROBES.some((ch) => {
    try {
      return test(ch)
    } catch {
      // A predicate that throws on ordinary input isn't provably safe either way.
      return true
    }
  })
}

export function transformChar(char: string, slot: Slot): string {
  if (!slot.transform) return char
  const output = slot.transform(char)
  if (typeof output !== 'string' || Array.from(output).length !== 1) {
    throw new RangeError('A mask token transform must return exactly one Unicode code point')
  }
  return output
}

export interface LiteralToken {
  kind: 'literal'
  text: string
}

/**
 * Upper bound on a bounded quantifier's repeat count.
 *
 * A run is expanded to `max` real slots at compile time, so an unbounded
 * number here would let a one-line pattern allocate arbitrarily much. No
 * realistic field needs more, and anything larger is treated as malformed
 * (the braces stay literal text) rather than throwing, which keeps the
 * conservative "unknown brace sequences are literals" rule intact.
 */
const MAX_QUANTIFIER = 1000

/** A parsed `{n}` / `{min,max}` suffix; `end` indexes its closing brace. */
interface Quantifier {
  min: number
  max: number
  end: number
}

/**
 * Read a bounded quantifier whose `{` sits at `points[start]`.
 *
 * Only `{n}` and `{min,max}` with `1 <= min <= max <= MAX_QUANTIFIER` are
 * syntax; `{n,}`, `{,n}`, `{0}`, `{2,1}`, `{}` and anything non-numeric are
 * *not*, and return `undefined` so the caller leaves the braces as ordinary
 * literal characters — exactly how a mask containing them behaved before
 * quantifiers existed. No `*`, `+` or `?` forms are recognized at all.
 */
function parseQuantifier(points: string[], start: number): Quantifier | undefined {
  if (points[start] !== '{') return undefined
  let i = start + 1
  // -1 means "no digits here" or "over the cap"; both are malformed.
  const readCount = (): number => {
    let n = -1
    while (i < points.length && points[i] >= '0' && points[i] <= '9') {
      n = (n < 0 ? 0 : n) * 10 + (points[i].charCodeAt(0) - 48)
      i++
      if (n > MAX_QUANTIFIER) return -1
    }
    return n
  }
  const min = readCount()
  if (min < 1) return undefined
  let max = min
  if (points[i] === ',') {
    i++
    max = readCount()
    if (max < min) return undefined
  }
  if (points[i] !== '}') return undefined
  return { min, max, end: i }
}

export type MaskToken = LiteralToken | { kind: 'slots'; chars: Slot[] }

/**
 * A mask string pre-chewed into the lookups both passes need.
 *
 * "Run" throughout means one uninterrupted stretch of slot characters — the
 * segment a user thinks of as a single field ("999", "9999", …). Runs are
 * numbered in mask order; token indices index {@link CompiledMask.tokens}.
 */
export interface CompiledMask {
  maxLength: number
  parts: Array<Slot | LiteralToken>
  dataSlots: Slot[]
  literals: Array<{ text: string; offset: number }>
  hasEscapes: boolean
  /** Alternating literal / slot-run tokens, in mask order. */
  tokens: MaskToken[]
  /** Slot characters of each run (e.g. `["999", "999", "999", "99"]`). */
  runChars: Slot[][]
  /**
   * Fewest slots each run accepts before the literal after it may close it.
   *
   * `runChars[i].length` is the *maximum*; this is the minimum a bounded
   * quantifier declared (`9{1,2}` → `1`). A run with no quantifier — every
   * run in every pattern written before this syntax existed — has
   * `runMin[i] === runChars[i].length`, so "at minimum but short of maximum"
   * is vacuously impossible for it and nothing about fixed masks changes.
   */
  runMin: number[]
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
  const runMin: number[] = []
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
      // A quantifier is only syntax directly after an unescaped token, so an
      // escaped `\9{1,2}` keeps both the "9" and the braces as literal text.
      const quantifier = parseQuantifier(points, i + 1)
      const min = quantifier ? quantifier.min : 1
      const max = quantifier ? quantifier.max : 1
      if (quantifier) i = quantifier.end
      maxLength += slot.maxLength * max
      if (previous?.kind === 'slots') {
        for (let n = 0; n < max; n++) previous.chars.push(slot)
        runMin[runMin.length - 1] += min
      } else {
        const chars: Slot[] = []
        for (let n = 0; n < max; n++) chars.push(slot)
        runOfToken.push(runChars.length)
        runToken.push(tokens.length)
        runChars.push(chars)
        runMin.push(min)
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
    runMin,
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
  /**
   * Whether some custom token's alphabet could ever accept a genuine
   * candidate-IME script (see {@link mayAcceptComposedScript}). `bind()`
   * uses this — not merely "are there custom tokens at all" — to decide
   * whether composition must be deferred: an ASCII-only custom alphabet
   * (an uppercase-transforming alphanumeric token, say) can safely reformat
   * live during composition exactly like the built-ins do, since Android's
   * autocorrect otherwise wraps plain Latin typing in a composition session
   * that may never fire `compositionend` while the field has no word
   * boundaries to type through.
   */
  readonly hasComposingRisk: boolean

  constructor(tokens?: MaskTokens) {
    this.custom = !!tokens && Object.keys(tokens).length > 0
    let composingRisk = false
    for (const [key, definition] of Object.entries(tokens ?? {})) {
      if (key === '\\' || Array.from(key).length !== 1) {
        throw new RangeError('Mask token keys must be one Unicode code point other than backslash')
      }
      const object = typeof definition === 'object' && 'match' in definition
        ? definition : { match: definition }
      if (mayAcceptComposedScript(object.match)) composingRisk = true
      this.definitions.set(key, {
        match: matcher(object.match), transform: object.transform, maxLength: 2,
      })
    }
    this.hasComposingRisk = composingRisk
  }

  compile(mask: string): CompiledMask {
    const cached = this.cache.get(mask)
    if (cached) return cached
    const plan = compileMask(mask, this.definitions)
    if (this.cache.size >= 64) this.cache.delete(this.cache.keys().next().value!)
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

/** {@link getMaxLength} against an existing compiler — `bind()` reuses its own instead of validating and probing the tokens a second time. */
export function maskMaxLength(mask: MaskPattern, compiler: PatternCompiler): number {
  const patterns = Array.isArray(mask) ? mask : [mask]
  let max = 0
  for (const pattern of patterns) max = Math.max(max, compiler.compile(pattern).maxLength)
  return max
}

/** Maximum formatted UTF-16 length (custom slots allow two units). Infinity for a resolver. */
export function getMaxLength(mask: MaskPattern, options?: ApplyMaskOptions): number {
  if (options?.resolveMask) return Infinity
  return maskMaxLength(mask, options?.tokens ? new PatternCompiler(options.tokens) : defaultCompiler)
}
