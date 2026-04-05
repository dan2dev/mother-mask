/**
 * Mask pattern — a single pattern string or an array ordered from shortest to longest.
 * `9` matches a digit, `Z` matches a letter, `A` matches alphanumeric (digit or letter),
 * anything else is a literal character.
 *
 * @example
 * '(99) 99999-9999'
 * ['(99) 9999-9999', '(99) 99999-9999']
 * 'AA.AAA.AAA/AAAA-99'  // CNPJ alfanumérico
 */
export type MaskPattern = string | string[]

/** Result of applying a mask to a value. */
export interface MaskResult {
  readonly value: string
  readonly caret: number
}

/** Options for {@link bind}. */
export interface BindOptions {
  /** Fires with the masked value after paste or keyboard-driven changes. */
  onChange?: (value: string) => void
}
