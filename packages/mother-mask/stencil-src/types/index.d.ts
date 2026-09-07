/** Used to manually set the base path where component assets can be found. */
export declare function setAssetPath(path: string): void
/** Resolve a path relative to where component assets can be found. */
export declare function getAssetPath(path: string): string
/** Set a nonce value that corresponds to an application's CSP, applied to dynamically created script/style tags. */
export declare function setNonce(nonce: string): void
export interface SetPlatformOptions {
  raf?: (callback: FrameRequestCallback) => number
  ael?: (
    el: EventTarget,
    eventName: string,
    listener: EventListenerOrEventListenerObject,
    options: boolean | AddEventListenerOptions,
  ) => void
  rel?: (
    el: EventTarget,
    eventName: string,
    listener: EventListenerOrEventListenerObject,
    options: boolean | AddEventListenerOptions,
  ) => void
}
export declare function setPlatformOptions(opts: SetPlatformOptions): void
