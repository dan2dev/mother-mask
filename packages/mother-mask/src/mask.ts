/**
 * Mask pattern — a single pattern string or an array ordered from shortest to longest.
 * `9` matches a digit, `Z` matches a letter, anything else is a literal character.
 *
 * @example
 * '(99) 99999-9999'
 * ['(99) 9999-9999', '(99) 99999-9999']
 */
export type MaskPattern = string | string[]

const numberRegex = /\D/
const letterRegex = /[a-zA-Z]/

function isDigit(ch: string): boolean {
  return !numberRegex.test(ch)
}

function isLetter(ch: string): boolean {
  return letterRegex.test(ch)
}

enum CharType {
  NUMBER,
  LETTER,
}

/** Low-level mask processor. Tracks caret position after masking. */
export class Mask {
  /** Caret position after `process()` runs. */
  caret: number

  private readonly _mask: string
  private readonly _value: string

  private _maskPos = -1
  private _maskChar: string | CharType = ''
  private _valuePos = -1
  private _valueChar = ''

  constructor(value: string, mask: string, caret = 0) {
    this._value = value
    this._mask = mask
    this.caret = caret
  }

  /** Apply the mask to the value and return the masked string. */
  process(): string {
    if (!this._value) return ''

    let output = ''
    const pending: string[] = []

    while (this._nextMaskChar()) {
      if (typeof this._maskChar === 'string') {
        pending.push(this._maskChar)
      } else if (this._nextValueChar(this._maskChar) && this._valueChar) {
        while (pending.length > 0) {
          if (this._maskPos <= this.caret + 1 && this._maskPos >= this.caret) {
            this.caret++
          }
          output += pending.shift()
        }
        output += this._valueChar
      }
    }

    return output
  }

  private _nextMaskChar(): boolean {
    this._maskPos++
    if (this._maskPos > this._mask.length) return false

    const ch = this._mask.charAt(this._maskPos)
    if (ch === '9') {
      this._maskChar = CharType.NUMBER
    } else if (ch === 'Z') {
      this._maskChar = CharType.LETTER
    } else {
      this._maskChar = ch
    }
    return true
  }

  private _nextValueChar(type: CharType): boolean {
    this._valuePos++
    if (this._valuePos > this._value.length) return false

    const ch = this._value.charAt(this._valuePos)
    this._valueChar = ch

    if (type === CharType.NUMBER && isDigit(ch)) return true
    if (type === CharType.LETTER && isLetter(ch)) return true

    return this._nextValueChar(type)
  }
}

/** Select the right mask string for the current value length. */
function resolveMask(value: string, mask: MaskPattern): string {
  if (!Array.isArray(mask)) return mask

  let i = 0
  while (i < mask.length - 1 && value.length > mask[i].length) {
    i++
  }
  return mask[i]
}

/** Maximum allowed input length for the given mask. */
export function getMaxLength(mask: MaskPattern): number {
  if (Array.isArray(mask)) return Math.max(...mask.map((m) => m.length))
  return mask.length
}

/** Build a `Mask` instance, resolving array patterns by value length. */
export function buildMask(value: string, mask: MaskPattern, caret = 0): Mask {
  return new Mask(value, resolveMask(value, mask), caret)
}

/** Apply a mask pattern to a raw value string and return the masked result. */
export function process(value: string, mask: MaskPattern): string {
  return buildMask(value, mask).process()
}
