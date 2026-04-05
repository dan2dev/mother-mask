let cachedIsIos: boolean | undefined

/** True when the runtime looks like iOS Safari / WebKit (affects key event choice in {@link bind}). */
export function isIos(): boolean {
  if (cachedIsIos !== undefined) return cachedIsIos
  cachedIsIos =
    typeof navigator !== 'undefined' && /iPad|iPhone|iPod/i.test(navigator.userAgent)
  return cachedIsIos
}
