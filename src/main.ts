import Simple from "./simple";
// import "setimmediate";

export module MotherMask {
  const MASKED = "masked";
  export function process(value: string, pattern: string | string[]): string {
    return Simple.process(value, pattern);
  }
  export function bind(
    input: HTMLInputElement | HTMLElement | Element,
    pattern: string | string[],
    callback: ((value: string) => void) | null = null): void {
    const masked = input.getAttribute(MASKED);
    if (masked === null) {
      let strPattern: string = "";
      if (Array.isArray(pattern)) {
        strPattern = pattern.join("|");
      } else {
        strPattern = pattern;
      }
      input.setAttribute(MASKED, strPattern);
      Simple.bind(input, pattern, callback);
    }
  }
}
if (window !== undefined) {
  (window as any).MotherMask = MotherMask;
}
export default MotherMask;
