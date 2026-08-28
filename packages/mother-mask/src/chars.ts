/** Shared by the mask-pattern engine and the decimal engine, which both need to spot ASCII digits. */
export function isDigitChar(ch: string): boolean {
  return ch >= '0' && ch <= '9'
}
